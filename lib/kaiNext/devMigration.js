import { queryDatabasePages, getNotionPageRaw, pageToFields } from '@/lib/aria/notion';
import {
  TAREAS_DB_ID, SPRINTS_DB_ID, INICIATIVAS_DB_ID, EPICAS_DB_ID, TALENTO_DB_ID,
} from '@/lib/aria/board';
import { listTenantUsers } from '@/lib/kai/tenantUsers';
import { findTalentoMatch } from '@/lib/kaiNext/devResponsables';
import { getDevTaskCreators } from '@/lib/kaiNext/devOwnership';
import { listProjects, markDevMigrated, createDevProjectPointer, importSeguimientoTasks } from '@/lib/kaiNext/projects';
import { saveSprintMetrics } from '@/lib/aria/sprintMetrics';
import {
  STATUS_COLUMNS, FASE_OPTIONS, putMany, hasDevData, clearDevData, computeSprintMetrics, listTasks, listSprints,
} from '@/lib/kaiNext/devStore';

// Migración de Proyectos de Desarrollo desde Notion a Kai. Se corre por proyecto y primero en
// seco: el informe dice cuánto se trae, qué personas de Talento no tienen par en el Equipo de
// Kai, qué tareas no tienen iniciativa y cómo queda la numeración de sprints. No escribe nada
// en Notion: Notion queda intacto como respaldo.
//
// Numeración (decisión de Rafa, opción B): cada proyecto cuenta sus propios sprints. Los
// sprints antiguos sin proyecto (#2–#9, que mezclaban proyectos) se copian a cada proyecto que
// tuvo tareas en ellos, y la numeración del proyecto es cronológica: antiguos + propios.

const STATUS_IDS = new Set(STATUS_COLUMNS.map((c) => c.id));
const SIN_INICIATIVA = 'Histórico (sin iniciativa)';

function parseEntregables(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const MONTHS = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, sept: 8, oct: 9, nov: 10, dic: 11 };
// "Sprint #4 (creada, 27 jul 2026)\n→ Sprint #5 (movida, 27 jul 2026)"
function parseHistory(text) {
  if (!text) return [];
  return [...text.matchAll(/^(?:→ )?(.+?) \((\w+), (\d{1,2}) (\w+)\.? (\d{4})\)/gm)].map((m) => {
    const month = MONTHS[m[4].toLowerCase().replace('.', '')];
    const at = month == null ? null : new Date(Date.UTC(Number(m[5]), month, Number(m[3]))).toISOString().slice(0, 10);
    return { title: m[1].trim(), action: m[2], at };
  });
}

async function queryAll(token, db, filter) {
  return queryDatabasePages(token, db, filter ? { filter } : {});
}

// Lee de Notion todo lo de un proyecto: iniciativas, épicas, tareas (por iniciativa, por relación
// directa al proyecto y las subtareas que cuelguen de ellas) y los sprints que tocaron.
async function readNotionProject(token, notionProyectoId) {
  const iniPages = await queryAll(token, INICIATIVAS_DB_ID, { property: 'Proyecto', relation: { contains: notionProyectoId } });
  const iniIds = iniPages.map((p) => p.id);
  const or = (prop, ids) => ({ or: ids.map((id) => ({ property: prop, relation: { contains: id } })) });
  const chunks = (ids) => Array.from({ length: Math.ceil(ids.length / 20) }, (_, i) => ids.slice(i * 20, i * 20 + 20));

  const epicaPages = (await Promise.all(chunks(iniIds).map((c) => queryAll(token, EPICAS_DB_ID, or('Iniciativa', c))))).flat();
  const byIni = (await Promise.all(chunks(iniIds).map((c) => queryAll(token, TAREAS_DB_ID, or('Iniciativa', c))))).flat();
  const byProject = await queryAll(token, TAREAS_DB_ID, { property: 'Proyectos', relation: { contains: notionProyectoId } });

  const taskPages = new Map();
  for (const p of [...byIni, ...byProject]) taskPages.set(p.id, p);
  // Subtareas que no tienen iniciativa ni proyecto propios pero cuelgan de una tarea del proyecto.
  let pending = [...taskPages.values()].flatMap((p) => pageToFields(p).fields['Sub-item'] ?? []).filter((id) => !taskPages.has(id));
  while (pending.length) {
    const fetched = (await Promise.all(pending.map((id) => getNotionPageRaw(token, id).catch(() => null)))).filter((p) => p && !p.archived && !p.in_trash);
    for (const p of fetched) taskPages.set(p.id, p);
    pending = fetched.flatMap((p) => pageToFields(p).fields['Sub-item'] ?? []).filter((id) => !taskPages.has(id));
  }

  const projectSprintPages = await queryAll(token, SPRINTS_DB_ID, { property: 'Proyecto', relation: { contains: notionProyectoId } });
  return { iniPages, epicaPages, taskPages: [...taskPages.values()], projectSprintPages };
}

export async function buildProjectMigration(tenant, token, meta, { legacySprintPages, talentoById, users }) {
  const { iniPages, epicaPages, taskPages, projectSprintPages } = await readNotionProject(token, meta.notionProyectoId);
  const report = { project: meta.name, projectId: meta.id, warnings: [] };
  report.cliente = await notionClienteName(token, meta.notionProyectoId);

  // Personas: Talento (Notion) → Equipo de Kai, por nombre.
  const personFor = new Map();
  const unmatched = new Map();
  const resolvePerson = (talentoId) => {
    if (!talentoId) return { id: null, legacyName: null };
    if (personFor.has(talentoId)) return personFor.get(talentoId);
    const talento = talentoById.get(talentoId);
    const user = talento ? users.find((u) => findTalentoMatch(u.name, [talento])) : null;
    const res = user ? { id: user.id, legacyName: null } : { id: null, legacyName: talento?.name ?? 'Persona desconocida' };
    if (!user) unmatched.set(talentoId, res.legacyName);
    personFor.set(talentoId, res);
    return res;
  };

  // Iniciativas y épicas, con sus ids de Notion.
  const iniciativas = iniPages.map((p) => {
    const f = pageToFields(p).fields;
    return {
      id: p.id, notionId: p.id, name: f['Iniciativa'] || 'Sin nombre', objetivo: f['Objetivo'] || '', estado: f['Estado'] ?? null,
      startDate: f['Fecha inicio'] ?? null, endDate: f['Fecha fin'] ?? null, createdAt: p.created_time,
    };
  });
  const iniIds = new Set(iniciativas.map((i) => i.id));
  const epicas = epicaPages.map((p) => {
    const f = pageToFields(p).fields;
    return {
      id: p.id, notionId: p.id, name: f['Nombre'] || 'Sin nombre', iniciativaId: f['Iniciativa']?.[0] ?? null,
      fase: FASE_OPTIONS.includes(f['Fase']) ? f['Fase'] : null, startDate: f['Fecha inicio'] ?? null, endDate: f['Fecha fin'] ?? null,
      notas: f['Notas'] || null, entregables: parseEntregables(f['Entregables']), createdAt: p.created_time,
    };
  });
  const epicaIds = new Set(epicas.map((e) => e.id));

  // Sprints: los propios del proyecto + los antiguos donde el proyecto tuvo tareas (hoy o en su
  // historial). Numeración cronológica por proyecto.
  const own = projectSprintPages.map((p) => ({ page: p, legacy: false }));
  const legacyByTitle = new Map(legacySprintPages.map((p) => [pageToFields(p).fields['Sprint'], p]));
  const ownByTitle = new Map(projectSprintPages.map((p) => [pageToFields(p).fields['Sprint'], p]));
  const usedLegacy = new Set();
  const taskFields = taskPages.map((p) => ({ page: p, f: pageToFields(p).fields }));
  // Una entrada del historial "Sprint #2" puede ser el #2 antiguo o el #2 propio: es el propio
  // si la entrada es del día en que ese sprint propio ya existía.
  const resolveHistoryTitle = (title, at) => {
    const ownPage = ownByTitle.get(title);
    if (ownPage && (!at || at >= ownPage.created_time.slice(0, 10))) return { page: ownPage, legacy: false };
    const legacyPage = legacyByTitle.get(title);
    if (legacyPage) return { page: legacyPage, legacy: true };
    return ownPage ? { page: ownPage, legacy: false } : null;
  };
  const legacyIds = new Set(legacySprintPages.map((p) => p.id));
  for (const { f } of taskFields) {
    for (const sid of f['Sprint'] ?? []) if (legacyIds.has(sid)) usedLegacy.add(sid);
    for (const h of parseHistory(f['Historial de Sprints'])) {
      const r = resolveHistoryTitle(h.title, h.at);
      if (r?.legacy) usedLegacy.add(r.page.id);
    }
  }
  const legacy = legacySprintPages.filter((p) => usedLegacy.has(p.id)).map((p) => ({ page: p, legacy: true }));
  const ordered = [...legacy, ...own].sort((a, b) => {
    const fa = pageToFields(a.page).fields; const fb = pageToFields(b.page).fields;
    return (fa['Fecha inicio'] ?? '').localeCompare(fb['Fecha inicio'] ?? '')
      || Number(b.legacy) - Number(a.legacy)
      || (fa['Sprint'] ?? '').localeCompare(fb['Sprint'] ?? '', 'es', { numeric: true });
  });
  // Copia por proyecto de un sprint antiguo: id propio para que sus métricas no choquen entre proyectos.
  const sprintIdFor = (page, isLegacy) => (isLegacy ? `${page.id}-${meta.id}` : page.id);
  const sprints = ordered.map(({ page, legacy: isLegacy }, i) => {
    const f = pageToFields(page).fields;
    const number = i + 1;
    return {
      id: sprintIdFor(page, isLegacy), notionId: page.id, number, title: `Sprint #${number}`, originalTitle: f['Sprint'] ?? null,
      legacy: isLegacy,
      // Los antiguos terminaron todos (el último, el 9 de octubre): sus copias quedan cerradas.
      status: isLegacy ? 'Cerrado' : (f['Estado'] ?? 'Planificado'),
      objetivo: f['Objetivo'] || null, startDate: f['Fecha inicio'] ?? null, endDate: f['Fecha fin'] ?? null, createdAt: page.created_time,
    };
  });
  const sprintByNotionId = new Map(ordered.map(({ page }, i) => [page.id, sprints[i]]));

  // Tareas.
  const includedIds = new Set(taskPages.map((p) => p.id));
  const creators = await getDevTaskCreators(tenant, [...includedIds]);
  let histIni = null;
  const tasks = taskFields.map(({ page, f }) => {
    const resp = resolvePerson(f['Responsable (Talento)']?.[0]);
    const colabs = (f['Colaboradores (Talento)'] ?? []).map(resolvePerson);
    let iniciativaId = f['Iniciativa']?.[0] ?? null;
    if (!iniIds.has(iniciativaId)) {
      if (!histIni) {
        histIni = { id: `hist-${meta.id}`, name: SIN_INICIATIVA, objetivo: 'Tareas traídas de Notion que no tenían iniciativa.', estado: null, startDate: null, endDate: null, createdAt: '0000' };
      }
      iniciativaId = histIni.id;
    }
    const sprint = (f['Sprint'] ?? []).map((sid) => sprintByNotionId.get(sid)).find(Boolean) ?? null;
    if ((f['Sprint'] ?? []).length && !sprint) report.warnings.push(`"${f['TASK']}" estaba en un sprint de otro proyecto; queda sin sprint.`);
    const history = parseHistory(f['Historial de Sprints']).map((h) => {
      const r = resolveHistoryTitle(h.title, h.at);
      const s = r ? sprintByNotionId.get(r.page.id) : null;
      return { sprintId: s?.id ?? null, title: s?.title ?? h.title, action: h.action, at: h.at };
    });
    if (!history.length && sprint) history.push({ sprintId: sprint.id, title: sprint.title, action: 'creada', at: page.created_time.slice(0, 10) });
    const status = STATUS_IDS.has(f['Status']) ? f['Status'] : 'Not started';
    return {
      id: page.id, notionId: page.id,
      title: f['TASK'] || 'Sin título', status,
      priority: f['Prioridad'] ?? null, taskType: f['Tipo de Tarea'] ?? null, severity: f['Severidad'] ?? null, origen: f['Origen'] ?? 'Notion',
      description: f['Necesidad'] || null, entregables: parseEntregables(f['Entregables']),
      responsableId: resp.id, responsableLegacyName: resp.legacyName,
      colaboradorIds: colabs.map((c) => c.id).filter((id) => id && id !== resp.id),
      colaboradoresLegacyNames: colabs.map((c) => c.legacyName).filter(Boolean),
      iniciativaId,
      epicaId: epicaIds.has(f['Épica']?.[0]) ? f['Épica'][0] : null,
      fase: f['Fase'] ?? null,
      parentId: includedIds.has(f['Parent item']?.[0]) ? f['Parent item'][0] : null,
      sprintId: sprint?.id ?? null,
      sprintHistory: history,
      draggedCount: Number(f['Veces arrastrada']) || 0,
      outOfPlan: !!f['Fuera de plan'],
      startDate: f['Inicio'] ?? null, committedStartDate: f['Inicio comprometido (sprint actual)'] ?? null, endDate: f['Finalizado'] ?? null,
      estimatedHours: f['Estimación'] ?? null, actualHours: f['Tiempo dedicado (hrs)'] ?? null,
      order: f['Order'] ?? null,
      createdBy: creators?.[page.id] ?? null,
      createdAt: page.created_time, updatedAt: page.last_edited_time,
    };
  });
  if (histIni) iniciativas.push(histIni);

  const sinEpica = tasks.filter((t) => !t.epicaId && !t.parentId).length;
  const abiertasEnCerrados = tasks.filter((t) => t.status !== 'Done' && sprints.find((s) => s.id === t.sprintId)?.legacy).length;
  if (abiertasEnCerrados) report.warnings.push(`${abiertasEnCerrados} tarea(s) sin terminar siguen en un sprint antiguo, que queda cerrado: habrá que pasarlas a un sprint vigente.`);
  Object.assign(report, {
    iniciativas: iniciativas.length,
    epicas: epicas.length,
    tareas: tasks.length,
    subtareas: tasks.filter((t) => t.parentId).length,
    tareasSinIniciativa: tasks.filter((t) => t.iniciativaId === histIni?.id).length,
    tareasSinEpica: sinEpica,
    personasSinPar: [...new Set(unmatched.values())],
    tareasConPersonaSinPar: tasks.filter((t) => t.responsableLegacyName || t.colaboradoresLegacyNames.length).length,
    sprints: sprints.map((s) => ({
      numero: s.number, antes: s.legacy ? `${s.originalTitle} (antiguo, compartido)` : s.originalTitle,
      fechas: `${s.startDate ?? '?'} → ${s.endDate ?? '?'}`, estado: s.status,
      tareas: tasks.filter((t) => t.sprintId === s.id).length,
    })),
  });
  return { report, data: { iniciativas, epicas, tasks, sprints } };
}

async function notionClienteName(token, notionProyectoId) {
  try {
    const proyecto = await getNotionPageRaw(token, notionProyectoId);
    const clienteId = proyecto ? pageToFields(proyecto).fields['Cliente']?.[0] : null;
    const cliente = clienteId ? await getNotionPageRaw(token, clienteId) : null;
    if (!cliente) return null;
    const f = pageToFields(cliente).fields;
    return f['Empresa'] || Object.values(cliente.properties ?? {}).find((v) => v.type === 'title')?.title?.map((t) => t.plain_text).join('') || null;
  } catch {
    return null;
  }
}

// Proyectos de Notion que no estaban en Kai y se traen igual, para no perder su historia.
const EXTRA_PROJECTS = [
  { notionProyectoId: '1b2b75c3-a460-8053-9107-da05aabb931e', name: 'Evolución Tecnológica - DEV', status: 'completado' },
];

// Tareas de desarrollo de "Infraestructura TI" en Notion: pasan al proyecto de Seguimiento del
// mismo nombre, en el mini proyecto "Histórico Notion".
const INFRA_TI_NOTION_ID = '1b8b75c3-a460-8023-9dac-feb70331dfb8';
const INFRA_TI_KAI_NAME = 'Infraestructura TI';
const HISTORICO = 'Histórico Notion';
const SEGUIMIENTO_STATUS = { Backlog: 'backlog', 'Not started': 'todo', 'In progress': 'doing', 'In Review': 'doing', Done: 'done' };

async function migrateInfraHistorico(tenant, token, { dryRun, users, talentoById }) {
  const target = (await listProjects(tenant)).find((p) => p.projectKind === 'seguimiento' && p.name?.trim().toLowerCase() === INFRA_TI_KAI_NAME.toLowerCase());
  if (!target) return { project: `${INFRA_TI_KAI_NAME} (Seguimiento)`, error: 'No encontré ese proyecto de Seguimiento en Kai.' };
  const pages = await queryAll(token, TAREAS_DB_ID, { property: 'Proyectos', relation: { contains: INFRA_TI_NOTION_ID } });
  const personId = (talentoId) => {
    const talento = talentoById.get(talentoId);
    return talento ? users.find((u) => findTalentoMatch(u.name, [talento]))?.id ?? null : null;
  };
  const tasks = pages.map((p) => {
    const f = pageToFields(p).fields;
    const ids = [f['Responsable (Talento)']?.[0], ...(f['Colaboradores (Talento)'] ?? [])].filter(Boolean).map(personId).filter(Boolean);
    return {
      notionId: p.id,
      nombre: f['TASK'] || 'Sin título',
      descripcion: f['Necesidad'] || '',
      prioridad: f['Prioridad'] ?? null,
      responsables: [...new Set(ids)],
      fechaInicio: f['Inicio'] ?? null,
      fechaFin: f['Finalizado'] ?? null,
      estimatedHours: f['Estimación'] ?? null,
      actualHours: f['Tiempo dedicado (hrs)'] ?? null,
      status: SEGUIMIENTO_STATUS[f['Status']] ?? 'todo',
      createdAt: p.created_time,
    };
  });
  const report = { project: `${INFRA_TI_KAI_NAME} (Seguimiento)`, projectId: target.id, tareasHistoricas: tasks.length, miniProyecto: HISTORICO };
  if (!dryRun) Object.assign(report, await importSeguimientoTasks(tenant, target.id, tasks, HISTORICO), { escrito: true });
  return report;
}

async function loadShared(token) {
  const [sprintPages, talentoPages] = await Promise.all([queryAll(token, SPRINTS_DB_ID), queryAll(token, TALENTO_DB_ID)]);
  const legacySprintPages = sprintPages.filter((p) => !(pageToFields(p).fields['Proyecto'] ?? []).length);
  const talentoById = new Map(talentoPages.map((p) => [p.id, { id: p.id, name: pageToFields(p).fields['Nombre Apellido'] ?? 'Sin nombre' }]));
  return { legacySprintPages, talentoById };
}

export async function runDevMigration(tenant, token, { dryRun = true, projectIds, overwrite = false } = {}) {
  const all = await listProjects(tenant);
  // Los proyectos extra se crean (cerrados) solo al escribir; en seco se simulan.
  const extras = [];
  for (const x of EXTRA_PROJECTS) {
    if (all.some((p) => p.notionProyectoId === x.notionProyectoId)) continue;
    extras.push(dryRun
      ? { id: `(nuevo) ${x.name}`, name: x.name, projectKind: 'desarrollo', notionProyectoId: x.notionProyectoId, status: x.status }
      : await createDevProjectPointer(tenant, { name: x.name, notionProyectoId: x.notionProyectoId, status: x.status, supervisorIds: [] }));
  }
  const projects = [...all, ...extras]
    .filter((p) => p.projectKind === 'desarrollo' && p.notionProyectoId && (!projectIds?.length || projectIds.includes(p.id)));
  const [shared, users] = await Promise.all([loadShared(token), listTenantUsers(tenant)]);
  const results = [];
  for (const meta of projects) {
    try {
      const { report, data } = await buildProjectMigration(tenant, token, meta, { ...shared, users });
      report.yaMigrado = !!meta.devMigratedAt;
      if (!dryRun) {
        if ((await hasDevData(tenant, meta.id)) && !overwrite) {
          report.escrito = false;
          report.warnings.push('Ya tenía datos en Kai: no se tocó (usa overwrite para reemplazarlos).');
        } else {
          await clearDevData(tenant, meta.id);
          await putMany(tenant, meta.id, 'iniciativas', data.iniciativas);
          await putMany(tenant, meta.id, 'epicas', data.epicas);
          await putMany(tenant, meta.id, 'sprints', data.sprints);
          await putMany(tenant, meta.id, 'tasks', data.tasks);
          // Métricas de cierre de las copias de sprints antiguos, calculadas solo con las tareas de
          // este proyecto (las de Notion mezclaban proyectos).
          const [enriched, sprintsWithTotals] = await Promise.all([listTasks(tenant, meta.id), listSprints(tenant, meta.id)]);
          for (const s of sprintsWithTotals.filter((x) => x.legacy)) {
            await saveSprintMetrics(tenant, s.id, computeSprintMetrics(s, enriched.filter((t) => t.sprintId === s.id)));
          }
          await markDevMigrated(tenant, meta.id, report.cliente && !meta.clienteName ? { clienteName: report.cliente } : {});
          report.escrito = true;
        }
      }
      results.push(report);
    } catch (err) {
      results.push({ project: meta.name, projectId: meta.id, error: err.message });
    }
  }
  if (!projectIds?.length) {
    try {
      results.push(await migrateInfraHistorico(tenant, token, { dryRun, users, talentoById: shared.talentoById }));
    } catch (err) {
      results.push({ project: `${INFRA_TI_KAI_NAME} (Seguimiento)`, error: err.message });
    }
  }
  return { dryRun, projects: results };
}

