import { Redis } from '@upstash/redis';
import { isCapabilityAllowed } from '@/lib/kaiNext/capabilities';
import { getDriveConfig, ensureSubfolder, uploadFile } from '@/lib/kaiNext/projectsDrive';

// Proyectos de Kai Next — inspirado en el producto Proyectos de Labs (`lib/labs/experiments.js`,
// internamente "Experiment" ahí) pero con datos y roster PROPIOS: no son los mismos registros
// de Labs (que vive bajo su propio roster/login separado), sino una reimplementación bajo el
// tenant/roster que ya comparten Kai y Aria (lib/kai/tenantUsers.js). Namespace `kainext:`
// porque "Proyectos" no existe en Kai Legacy bajo ninguna forma (ver criterio en
// lib/kaiNext/capabilities.js / analyses.js: kai: = ya existía en Legacy, kainext: = nuevo).
//
// Fase 1 (actual): solo projectKind='seguimiento' — Tareas + Historia, sin presupuesto/IA/Drive.
// Fases siguientes amplían este mismo archivo con tests/executions/feedback/reports/
// metaHistory/documents/partidas/gastos, mismo patrón que experiments.js.
const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const projectsIndexKey = (tenant) => `kainext:${tenant}:projects`;
const projectMetaKey = (tenant, id) => `kainext:${tenant}:project:${id}:meta`;
const tasksKey = (tenant, id) => `kainext:${tenant}:project:${id}:tasks`;
const eventsKey = (tenant, id) => `kainext:${tenant}:project:${id}:events`;
const partidasKey = (tenant, id) => `kainext:${tenant}:project:${id}:partidas`;
const gastosKey = (tenant, id) => `kainext:${tenant}:project:${id}:gastos`;
const documentsKey = (tenant, id) => `kainext:${tenant}:project:${id}:documents`;
const testsKey = (tenant, id) => `kainext:${tenant}:project:${id}:tests`;
const executionsKey = (tenant, id) => `kainext:${tenant}:project:${id}:executions`;

// 'civil' y 'seguimiento' comparten Cronograma — 'civil' suma Presupuesto encima (fases
// siguientes). 'experimental' no tiene tareas, tiene Pruebas/Ejecuciones (fase siguiente).
export const TASK_TRACKING_KINDS = ['civil', 'seguimiento'];
// 'desarrollo' es distinto a los otros 3: su contenido (Iniciativas/Épicas/Tareas) vive en
// Notion, no acá — ver lib/kaiNext/projectsNotion.js. El registro de acá es solo un puntero.
export const PROJECT_KINDS = ['experimental', 'civil', 'seguimiento', 'desarrollo'];
export const PROJECT_STATUSES = ['activo', 'pausado', 'completado'];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function taskResponsables(task) {
  return Array.isArray(task?.responsables) ? task.responsables : [];
}

function normName(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// Arma Tareas y Partidas iniciales (import de Excel) y linkea cada Tarea a su Partida por
// coincidencia de nombre — port directo de linkTasksToPartidas en lib/labs/experiments.js.
// El "ejecutado" de un Excel importado no tiene factura de respaldo — en vez de escribirlo
// directo en la partida (ejecutado siempre se deriva de sus gastos, ver applyGastosToPartidas),
// se crea un gasto sintético marcado `imported: true` para no perder el dato.
function linkTasksToPartidas(rawTasks, rawPartidas) {
  const now = new Date().toISOString();
  const gastos = [];
  const partidas = (Array.isArray(rawPartidas) ? rawPartidas : []).map((p) => {
    const cantidad = p.cantidad != null && p.cantidad !== '' ? Number(p.cantidad) : null;
    const precioUnitario = p.precioUnitario != null && p.precioUnitario !== '' ? Number(p.precioUnitario) : null;
    const partidaId = generateId();
    const ejecutadoImportado = p.ejecutado != null && p.ejecutado !== '' ? Number(p.ejecutado) : 0;
    if (ejecutadoImportado > 0) {
      gastos.push({
        id: generateId(),
        partidaId,
        monto: ejecutadoImportado,
        fecha: now,
        proveedor: p.proveedor || '',
        nota: 'Importado desde Excel — sin comprobante.',
        attachments: [],
        imported: true,
        createdBy: 'Importación',
        createdAt: now,
      });
    }
    return {
      id: partidaId,
      etapa: p.etapa || '',
      descripcion: p.descripcion || '',
      cantidad,
      unidad: p.unidad || '',
      precioUnitario,
      importe: p.importe != null && p.importe !== '' ? Number(p.importe) : (cantidad != null && precioUnitario != null ? cantidad * precioUnitario : 0),
      ejecutado: 0,
      proveedor: p.proveedor || '',
      comentarios: p.comentarios || '',
      origen: 'inicial',
      createdAt: now,
      updatedAt: now,
    };
  });
  const partidaByName = new Map(partidas.map((p) => [normName(p.descripcion), p.id]));

  const tasks = (Array.isArray(rawTasks) ? rawTasks : []).map((t) => ({
    id: generateId(),
    fase: t.fase || '',
    nombre: t.nombre || '',
    responsables: Array.isArray(t.responsables) ? t.responsables : [],
    fechaInicio: t.fechaInicio || null,
    fechaFin: t.fechaFin || null,
    duracionDias: t.duracionDias != null && t.duracionDias !== '' ? Number(t.duracionDias) : null,
    progreso: Number(t.progreso) >= 100 ? 100 : 0,
    status: Number(t.progreso) >= 100 ? 'done' : 'todo',
    partidaId: partidaByName.get(normName(t.nombre)) || null,
    createdAt: now,
    updatedAt: now,
  }));

  return { linkedTasks: tasks, linkedPartidas: partidas, linkedGastos: gastos };
}

// "Ejecutado" se deriva siempre de los gastos (cada uno con factura de respaldo opcional),
// nunca se guarda en la partida — así computeCivilMetrics/Breakdown/Alerts (que solo leen
// p.ejecutado) reciben partidas ya con el total correcto.
function applyGastosToPartidas(partidas, gastos) {
  const sums = new Map();
  for (const g of gastos) sums.set(g.partidaId, (sums.get(g.partidaId) || 0) + (g.monto || 0));
  return partidas.map((p) => ({ ...p, ejecutado: sums.get(p.id) || 0 }));
}

// Traduce los 3 roles jerárquicos de Labs (Director/Supervisor/Registrador) a las 2 capacidades
// que se suman en Kai Next — ver lib/kaiNext/capabilities.js. Team user = siempre Director-
// equivalente (igual que el resto de Kai Next). Vacío/ausente = sin restricción = Director-
// equivalente, mismo criterio que ya rige todo lo demás.
export function resolveProjectAccessLevel({ isTeamUser, access }) {
  const isDirectorLevel = !!isTeamUser || isCapabilityAllowed(access, 'proyectos_director');
  const isSupervisorLevel = isDirectorLevel || isCapabilityAllowed(access, 'proyectos_supervisor');
  return { isDirectorLevel, isSupervisorLevel };
}

export async function listProjects(tenant) {
  const ids = await kv.zrange(projectsIndexKey(tenant), 0, -1, { rev: true });
  if (!ids.length) return [];
  const metas = await Promise.all(ids.map((id) => kv.get(projectMetaKey(tenant, id))));
  return metas.filter(Boolean);
}

// Qué proyectos puede VER cada persona — traducción 1:1 de listExperimentsForUser de Labs.
// personId es el id del tenant-user actual (null para team user, que ya es Director-equivalente
// y por lo tanto ve todo sin necesitar figurar en ningún supervisorIds/responsables).
export async function listProjectsForPerson(tenant, { isDirectorLevel, isSupervisorLevel, personId }) {
  const all = await listProjects(tenant);
  if (isDirectorLevel) return all;
  if (isSupervisorLevel) return all.filter((m) => m.supervisorIds?.includes(personId));
  if (!personId) return [];

  const withVisibility = await Promise.all(
    all.map(async (m) => {
      if (TASK_TRACKING_KINDS.includes(m.projectKind)) {
        const tasks = (await kv.get(tasksKey(tenant, m.id))) ?? [];
        return tasks.some((t) => taskResponsables(t).includes(personId)) ? m : null;
      }
      const tests = (await kv.get(testsKey(tenant, m.id))) ?? [];
      return tests.some((t) => t.registradorIds?.includes(personId)) ? m : null;
    })
  );
  return withVisibility.filter(Boolean);
}

export async function createProject(tenant, {
  name, code, type, supervisorIds, projectKind, fechaInicioProyecto, fechaFinProyecto, tasks, partidas,
  purpose, hypothesis,
}) {
  const id = generateId();
  const now = Date.now();
  const kind = PROJECT_KINDS.includes(projectKind) ? projectKind : 'seguimiento';
  const isTaskTracking = TASK_TRACKING_KINDS.includes(kind);

  const { linkedTasks, linkedPartidas, linkedGastos } = isTaskTracking
    ? linkTasksToPartidas(tasks, kind === 'civil' ? partidas : [])
    : { linkedTasks: [], linkedPartidas: [], linkedGastos: [] };

  let fechaInicioFinal = fechaInicioProyecto || null;
  let fechaFinFinal = fechaFinProyecto || null;
  if (isTaskTracking && (!fechaInicioFinal || !fechaFinFinal) && linkedTasks.length) {
    const starts = linkedTasks.map((t) => t.fechaInicio).filter(Boolean).sort();
    const ends = linkedTasks.map((t) => t.fechaFin).filter(Boolean).sort();
    fechaInicioFinal = fechaInicioFinal || starts[0] || null;
    fechaFinFinal = fechaFinFinal || ends[ends.length - 1] || null;
  }

  const meta = {
    id,
    name: String(name || '').trim() || 'Proyecto sin título',
    code: code || '',
    type: type || '',
    supervisorIds: Array.isArray(supervisorIds) ? supervisorIds : [],
    projectKind: kind,
    fechaInicioProyecto: fechaInicioFinal,
    fechaFinProyecto: fechaFinFinal,
    purpose: kind === 'experimental' ? (purpose || '') : '',
    hypothesis: kind === 'experimental' ? (hypothesis || '') : '',
    status: 'activo',
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  };
  await Promise.all([
    kv.set(projectMetaKey(tenant, id), meta),
    kv.zadd(projectsIndexKey(tenant), { score: now, member: id }),
    kv.set(tasksKey(tenant, id), linkedTasks),
    kv.set(eventsKey(tenant, id), []),
    kv.set(partidasKey(tenant, id), linkedPartidas),
    kv.set(gastosKey(tenant, id), linkedGastos),
    kv.set(documentsKey(tenant, id), []),
    kv.set(testsKey(tenant, id), []),
    kv.set(executionsKey(tenant, id), []),
  ]);
  return meta;
}

// Puntero liviano para projectKind='desarrollo' — a diferencia de createProject, no crea
// ninguna de las keys de tasks/partidas/tests/documents (esta rama no las usa, su contenido
// vive en Notion vía lib/kaiNext/projectsNotion.js). El picker/capacidades/nivel de acceso
// siguen siendo los mismos que el resto de Proyectos.
export async function createDevProjectPointer(tenant, { name, notionProyectoId, notionClienteId, supervisorIds }) {
  const id = generateId();
  const now = Date.now();
  const meta = {
    id,
    name: String(name || '').trim() || 'Proyecto sin título',
    projectKind: 'desarrollo',
    notionProyectoId,
    notionClienteId,
    supervisorIds: Array.isArray(supervisorIds) ? supervisorIds : [],
    status: 'activo',
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  };
  await Promise.all([
    kv.set(projectMetaKey(tenant, id), meta),
    kv.zadd(projectsIndexKey(tenant), { score: now, member: id }),
  ]);
  return meta;
}

export async function getProjectMeta(tenant, id) {
  return kv.get(projectMetaKey(tenant, id));
}

export async function getProject(tenant, id) {
  const [meta, tasks, events, partidasRaw, gastos, documents, tests, executions] = await Promise.all([
    kv.get(projectMetaKey(tenant, id)),
    kv.get(tasksKey(tenant, id)),
    kv.get(eventsKey(tenant, id)),
    kv.get(partidasKey(tenant, id)),
    kv.get(gastosKey(tenant, id)),
    kv.get(documentsKey(tenant, id)),
    kv.get(testsKey(tenant, id)),
    kv.get(executionsKey(tenant, id)),
  ]);
  if (!meta) return null;
  const tasksList = tasks ?? [];
  const gastosList = gastos ?? [];
  const partidasList = applyGastosToPartidas(partidasRaw ?? [], gastosList);
  const civilMetrics = meta.projectKind === 'civil' ? computeCivilMetrics(tasksList, partidasList, meta) : null;
  const civilAlerts = civilMetrics ? computeCivilAlerts(tasksList, partidasList, civilMetrics) : [];
  return {
    meta, tasks: tasksList, events: events ?? [],
    partidas: partidasList, gastos: gastosList, civilMetrics, civilAlerts,
    documents: documents ?? [],
    tests: tests ?? [], executions: executions ?? [],
  };
}

// Pausar/completar bloquea de verdad la gestión (no es solo una etiqueta) — se chequea en las
// routes de tareas antes de crear/editar/eliminar, mismo criterio que projectInactiveMessage
// de Labs.
export function projectInactiveMessage(meta) {
  if (!meta.status || meta.status === 'activo') return null;
  const label = meta.status === 'pausado' ? 'pausado' : 'completado';
  return `Este proyecto está ${label} — reactivalo desde "Editar detalles" para poder gestionar tareas.`;
}

export async function updateProjectDetails(tenant, id, { code, type, status }) {
  const meta = await kv.get(projectMetaKey(tenant, id));
  if (!meta) throw new Error('Proyecto no encontrado.');
  const next = { ...meta, updatedAt: new Date().toISOString() };
  if (code !== undefined) next.code = code ?? '';
  if (type !== undefined) next.type = type ?? '';
  if (status !== undefined && PROJECT_STATUSES.includes(status)) next.status = status;
  await kv.set(projectMetaKey(tenant, id), next);
  return next;
}

export async function setProjectSupervisors(tenant, id, supervisorIds) {
  const meta = await kv.get(projectMetaKey(tenant, id));
  if (!meta) throw new Error('Proyecto no encontrado.');
  const next = { ...meta, supervisorIds: Array.isArray(supervisorIds) ? supervisorIds : [], updatedAt: new Date().toISOString() };
  await kv.set(projectMetaKey(tenant, id), next);
  return next;
}

async function touchProject(tenant, id) {
  const now = Date.now();
  const meta = await kv.get(projectMetaKey(tenant, id));
  if (meta) await kv.set(projectMetaKey(tenant, id), { ...meta, updatedAt: new Date(now).toISOString() });
  await kv.zadd(projectsIndexKey(tenant), { score: now, member: id });
}

// Historia — se agrega desde acá, nunca se escribe a mano.
export async function addEvent(tenant, id, event) {
  const events = (await kv.get(eventsKey(tenant, id))) ?? [];
  const entry = { id: generateId(), date: new Date().toISOString(), ...event };
  await kv.set(eventsKey(tenant, id), [entry, ...events]);
  return entry;
}

export async function getEvents(tenant, id) {
  return (await kv.get(eventsKey(tenant, id))) ?? [];
}

// ── Tareas (Cronograma) — civil/seguimiento ─────────────────────────────────

export async function getTasksList(tenant, id) {
  return (await kv.get(tasksKey(tenant, id))) ?? [];
}

export async function addTask(tenant, id, { fase, nombre, responsables, fechaInicio, fechaFin, duracionDias }) {
  if (!nombre?.trim()) throw new Error('El nombre de la tarea es requerido.');
  const tasks = await getTasksList(tenant, id);
  const now = new Date().toISOString();
  const task = {
    id: generateId(),
    fase: fase || '',
    nombre: nombre.trim(),
    responsables: Array.isArray(responsables) ? responsables : [],
    fechaInicio: fechaInicio || null,
    fechaFin: fechaFin || null,
    duracionDias: duracionDias != null && duracionDias !== '' ? Number(duracionDias) : null,
    progreso: 0,
    status: 'todo',
    createdAt: now,
    updatedAt: now,
  };
  await kv.set(tasksKey(tenant, id), [...tasks, task]);
  await touchProject(tenant, id);
  return task;
}

export async function updateTask(tenant, id, taskId, patch) {
  const tasks = await getTasksList(tenant, id);
  const idx = tasks.findIndex((t) => t.id === taskId);
  if (idx === -1) throw new Error('Tarea no encontrada.');
  const next = { ...tasks[idx] };
  for (const field of ['fase', 'nombre', 'responsables', 'fechaInicio', 'fechaFin', 'descripcion', 'prioridad']) {
    if (patch[field] !== undefined) next[field] = patch[field];
  }
  if (patch.duracionDias !== undefined) next.duracionDias = patch.duracionDias != null && patch.duracionDias !== '' ? Number(patch.duracionDias) : null;
  if (patch.estimatedHours !== undefined) next.estimatedHours = patch.estimatedHours != null && patch.estimatedHours !== '' ? Number(patch.estimatedHours) : null;
  if (patch.actualHours !== undefined) next.actualHours = patch.actualHours != null && patch.actualHours !== '' ? Number(patch.actualHours) : null;
  next.updatedAt = new Date().toISOString();
  tasks[idx] = next;
  await kv.set(tasksKey(tenant, id), tasks);
  await touchProject(tenant, id);
  return next;
}

export async function deleteTask(tenant, id, taskId) {
  const tasks = await getTasksList(tenant, id);
  const next = tasks.filter((t) => t.id !== taskId);
  if (next.length === tasks.length) throw new Error('Tarea no encontrada.');
  await kv.set(tasksKey(tenant, id), next);
  await touchProject(tenant, id);
}

const TASK_STATUSES = ['todo', 'doing', 'done'];
const TASK_STATUS_LABEL = { todo: 'Por hacer', doing: 'Haciendo', done: 'Terminado' };

export async function setTaskStatus(tenant, id, taskId, status, by) {
  if (!TASK_STATUSES.includes(status)) throw new Error('Estado inválido.');
  const tasks = await getTasksList(tenant, id);
  const idx = tasks.findIndex((t) => t.id === taskId);
  if (idx === -1) throw new Error('Tarea no encontrada.');
  const done = status === 'done';
  tasks[idx] = { ...tasks[idx], status, progreso: done ? 100 : 0, updatedAt: new Date().toISOString() };
  await kv.set(tasksKey(tenant, id), tasks);
  await addEvent(tenant, id, {
    type: 'tarea',
    actor: by,
    title: `${by} movió "${tasks[idx].nombre}" a ${TASK_STATUS_LABEL[status]}`,
    body: '',
  });
  await touchProject(tenant, id);
  return tasks[idx];
}

// ── Presupuesto (Partidas) — solo projectKind='civil' ───────────────────────

export async function getPartidasList(tenant, id) {
  return (await kv.get(partidasKey(tenant, id))) ?? [];
}

export async function addPartida(tenant, id, { etapa, descripcion, cantidad, unidad, precioUnitario, proveedor, comentarios }) {
  if (!descripcion?.trim()) throw new Error('La descripción de la partida es requerida.');
  const partidas = await getPartidasList(tenant, id);
  const now = new Date().toISOString();
  const cant = cantidad != null && cantidad !== '' ? Number(cantidad) : null;
  const precio = precioUnitario != null && precioUnitario !== '' ? Number(precioUnitario) : null;
  const partida = {
    id: generateId(),
    etapa: etapa || '',
    descripcion: descripcion.trim(),
    cantidad: cant,
    unidad: unidad || '',
    precioUnitario: precio,
    importe: cant != null && precio != null ? cant * precio : 0,
    ejecutado: 0,
    proveedor: proveedor || '',
    comentarios: comentarios || '',
    origen: 'agregada',
    createdAt: now,
    updatedAt: now,
  };
  await kv.set(partidasKey(tenant, id), [...partidas, partida]);
  await touchProject(tenant, id);
  return partida;
}

// `ejecutado` no es editable acá a propósito — se deriva siempre de los gastos.
export async function updatePartida(tenant, id, partidaId, patch) {
  const partidas = await getPartidasList(tenant, id);
  const idx = partidas.findIndex((p) => p.id === partidaId);
  if (idx === -1) throw new Error('Partida no encontrada.');
  const next = { ...partidas[idx] };
  for (const field of ['etapa', 'descripcion', 'unidad', 'proveedor', 'comentarios']) {
    if (patch[field] !== undefined) next[field] = patch[field];
  }
  for (const field of ['cantidad', 'precioUnitario']) {
    if (patch[field] !== undefined) next[field] = patch[field] != null && patch[field] !== '' ? Number(patch[field]) : null;
  }
  if (patch.cantidad !== undefined || patch.precioUnitario !== undefined) {
    next.importe = next.cantidad != null && next.precioUnitario != null ? next.cantidad * next.precioUnitario : next.importe;
  }
  next.updatedAt = new Date().toISOString();
  partidas[idx] = next;
  await kv.set(partidasKey(tenant, id), partidas);
  await touchProject(tenant, id);
  return next;
}

export async function deletePartida(tenant, id, partidaId) {
  const partidas = await getPartidasList(tenant, id);
  const next = partidas.filter((p) => p.id !== partidaId);
  if (next.length === partidas.length) throw new Error('Partida no encontrada.');
  const gastos = await getGastosList(tenant, id);
  await Promise.all([
    kv.set(partidasKey(tenant, id), next),
    kv.set(gastosKey(tenant, id), gastos.filter((g) => g.partidaId !== partidaId)),
  ]);
  await touchProject(tenant, id);
}

// ── Gastos (cada uno "respalda" lo ejecutado de su partida) ─────────────────
// Sin adjuntos/Drive todavía — eso llega en la fase de Documentos (Fase 3). Sin edición a
// propósito: si el monto está mal, se borra y se agrega de nuevo.

export async function getGastosList(tenant, id) {
  return (await kv.get(gastosKey(tenant, id))) ?? [];
}

export async function addGasto(tenant, id, { partidaId, monto, fecha, proveedor, nota, createdBy }) {
  const montoNum = monto != null && monto !== '' ? Number(monto) : NaN;
  if (!Number.isFinite(montoNum) || montoNum <= 0) throw new Error('El monto del gasto debe ser mayor a cero.');

  const [partidas, gastos] = await Promise.all([getPartidasList(tenant, id), getGastosList(tenant, id)]);
  const partida = partidas.find((p) => p.id === partidaId);
  if (!partida) throw new Error('Partida no encontrada.');

  const entry = {
    id: generateId(),
    partidaId,
    monto: montoNum,
    fecha: fecha || new Date().toISOString(),
    proveedor: proveedor || '',
    nota: nota || '',
    attachments: [],
    imported: false,
    createdBy,
    createdAt: new Date().toISOString(),
  };
  await kv.set(gastosKey(tenant, id), [entry, ...gastos]);
  await addEvent(tenant, id, {
    type: 'gasto',
    actor: createdBy,
    title: `${createdBy} agregó un gasto de ${montoNum.toLocaleString('es-PE')} en "${partida.descripcion}"`,
  });
  await touchProject(tenant, id);
  return entry;
}

export async function deleteGasto(tenant, id, gastoId) {
  const gastos = await getGastosList(tenant, id);
  await kv.set(gastosKey(tenant, id), gastos.filter((g) => g.id !== gastoId));
  await touchProject(tenant, id);
}

// ── Métricas y alertas civiles — siempre calculadas, nunca escritas a mano ──

export function computeCivilMetrics(tasks, partidas, meta) {
  const totalTareas = tasks.length;
  const tareasTerminadas = tasks.filter((t) => t.progreso >= 100).length;
  const pctTareas = totalTareas ? Math.round((tareasTerminadas / totalTareas) * 100) : 0;

  const totalImporte = partidas.reduce((s, p) => s + (p.importe || 0), 0);
  const totalEjecutado = partidas.reduce((s, p) => s + (p.ejecutado || 0), 0);
  const pctFinanciero = totalImporte ? Math.round((totalEjecutado / totalImporte) * 100) : 0;

  const partidasIniciales = partidas.filter((p) => p.origen !== 'agregada');
  const partidasAgregadas = partidas.filter((p) => p.origen === 'agregada');
  const totalImportePlanificado = partidasIniciales.reduce((s, p) => s + (p.importe || 0), 0);
  const totalImporteAgregado = partidasAgregadas.reduce((s, p) => s + (p.importe || 0), 0);
  const totalEjecutadoPlanificado = partidasIniciales.reduce((s, p) => s + (p.ejecutado || 0), 0);
  const totalEjecutadoAgregado = partidasAgregadas.reduce((s, p) => s + (p.ejecutado || 0), 0);

  let pctTiempo = 0;
  if (meta.fechaInicioProyecto && meta.fechaFinProyecto) {
    const start = new Date(meta.fechaInicioProyecto).getTime();
    const end = new Date(meta.fechaFinProyecto).getTime();
    if (end > start) {
      const now = Date.now();
      const elapsed = Math.min(end, Math.max(start, now)) - start;
      pctTiempo = Math.round((elapsed / (end - start)) * 100);
    }
  }

  return {
    totalTareas, tareasTerminadas, pctTareas, totalImporte, totalEjecutado, pctFinanciero, pctTiempo,
    totalImportePlanificado, totalImporteAgregado, totalEjecutadoPlanificado, totalEjecutadoAgregado,
  };
}

export function computeCivilReportBreakdown(tasks, partidas) {
  const byEtapa = [];
  for (const p of partidas) {
    const key = p.etapa || 'Sin etapa';
    let g = byEtapa.find((x) => x.etapa === key);
    if (!g) { g = { etapa: key, importe: 0, ejecutado: 0 }; byEtapa.push(g); }
    g.importe += p.importe || 0;
    g.ejecutado += p.ejecutado || 0;
  }
  const financialByEtapa = byEtapa.map((g) => ({ ...g, pct: g.importe ? Math.round((g.ejecutado / g.importe) * 100) : 0 }));

  const byFase = [];
  for (const t of tasks) {
    const key = t.fase || 'Sin fase';
    let g = byFase.find((x) => x.fase === key);
    if (!g) { g = { fase: key, total: 0, done: 0 }; byFase.push(g); }
    g.total += 1;
    if (t.progreso >= 100) g.done += 1;
  }
  const tasksByFase = byFase.map((g) => ({ ...g, pct: g.total ? Math.round((g.done / g.total) * 100) : 0 }));

  return { financialByEtapa, tasksByFase };
}

export function computeCivilAlerts(tasks, partidas, metrics) {
  const alerts = [];
  const now = Date.now();
  for (const t of tasks) {
    if (t.progreso < 100 && t.fechaFin && new Date(t.fechaFin).getTime() < now) {
      alerts.push({ type: 'tarea_vencida', taskId: t.id, message: `"${t.nombre}" venció el ${String(t.fechaFin).slice(0, 10)} sin terminar.` });
    }
  }
  for (const p of partidas) {
    if (p.importe > 0 && p.ejecutado > p.importe) {
      alerts.push({ type: 'sobrecosto', partidaId: p.id, message: `"${p.descripcion}" — ejecutado supera lo presupuestado.` });
    }
  }
  if (metrics.totalTareas > 0 && metrics.pctTiempo - metrics.pctTareas > 25) {
    alerts.push({ type: 'desvio_cronograma', message: `${metrics.pctTiempo}% del tiempo transcurrido vs. solo ${metrics.pctTareas}% de tareas terminadas.` });
  }
  return alerts;
}

// ── Documentación del proyecto — solo Director/Supervisor, no se analiza con IA, es solo
// almacenamiento + índice. Best-effort a Drive: si el tenant no conectó un repositorio o la
// subida falla, el archivo queda igual en Redis con su `data` en base64, nunca bloquea el
// guardado (mismo criterio que addProjectDocument de Labs).

// Perezoso — crea la carpeta "Documentación" del proyecto la primera vez que hace falta, no de
// antemano. Devuelve null si el tenant no conectó Drive, y quien llama simplemente no sube nada.
async function ensureProjectDocumentosFolder(tenant, meta) {
  if (meta.documentosFolderId) return meta.documentosFolderId;
  const driveConfig = await getDriveConfig(tenant);
  if (!driveConfig?.folderId) return null;

  const projectFolderId = meta.driveFolderId || await ensureSubfolder(driveConfig.folderId, meta.name);
  const documentosFolderId = await ensureSubfolder(projectFolderId, 'Documentación');

  const current = (await kv.get(projectMetaKey(tenant, meta.id))) ?? meta;
  await kv.set(projectMetaKey(tenant, meta.id), { ...current, driveFolderId: projectFolderId, documentosFolderId });
  return documentosFolderId;
}

export async function getDocumentsList(tenant, id) {
  return (await kv.get(documentsKey(tenant, id))) ?? [];
}

export async function addProjectDocument(tenant, id, { name, mimeType, data, category, uploadedBy }) {
  if (!name?.trim()) throw new Error('El nombre del archivo es requerido.');
  if (!data) throw new Error('El archivo es requerido.');

  const [meta, documents] = await Promise.all([kv.get(projectMetaKey(tenant, id)), getDocumentsList(tenant, id)]);
  if (!meta) throw new Error('Proyecto no encontrado.');

  const doc = {
    id: generateId(),
    name: name.trim(),
    mimeType: mimeType || 'application/octet-stream',
    category: category || 'Otro',
    uploadedBy,
    data,
    driveFileId: null,
    driveUrl: null,
    createdAt: new Date().toISOString(),
  };

  try {
    const folderId = await ensureProjectDocumentosFolder(tenant, meta);
    if (folderId) {
      const uploaded = await uploadFile(folderId, { name: doc.name, mimeType: doc.mimeType, data });
      doc.driveFileId = uploaded.id;
      doc.driveUrl = uploaded.webViewLink;
      delete doc.data;
    }
  } catch (err) {
    console.error(`[kai-next] no se pudo subir documento a Drive (${tenant}/${id}):`, err.message);
  }

  await kv.set(documentsKey(tenant, id), [doc, ...documents]);
  await addEvent(tenant, id, {
    type: 'documento',
    actor: uploadedBy,
    title: `${uploadedBy} subió un documento — ${doc.name}`,
    body: doc.category,
  });
  await touchProject(tenant, id);
  return doc;
}

export async function deleteProjectDocument(tenant, id, documentId) {
  const documents = await getDocumentsList(tenant, id);
  await kv.set(documentsKey(tenant, id), documents.filter((d) => d.id !== documentId));
  await touchProject(tenant, id);
}

// ── Pruebas + Ejecuciones — solo projectKind='experimental' ─────────────────
// A diferencia de Ficha (5 preguntas fijas), cada Prueba define su propio esquema de campos —
// ver lib/kaiNext/projectContribution.js para cómo se interpreta un aporte contra esos campos.

export async function getTests(tenant, id) {
  return (await kv.get(testsKey(tenant, id))) ?? [];
}

export async function createTest(tenant, id, { name, icon, fields, registradorIds }) {
  if (!name?.trim()) throw new Error('El nombre de la prueba es requerido.');
  if (!Array.isArray(fields) || !fields.length) throw new Error('La prueba necesita al menos un campo.');
  const tests = await getTests(tenant, id);
  const test = {
    id: generateId(),
    name: name.trim(),
    icon: icon || '🧪',
    fields: fields.map((f) => {
      const base = { key: f.key, label: f.label, type: f.type || 'text' };
      if (f.type === 'number' && f.operator && f.value != null && f.value !== '') {
        return { ...base, operator: f.operator, value: Number(f.value), unit: f.unit || '' };
      }
      return base;
    }),
    registradorIds: Array.isArray(registradorIds) ? registradorIds : [],
    driveFolderId: null,
    createdAt: new Date().toISOString(),
  };
  await kv.set(testsKey(tenant, id), [...tests, test]);
  await touchProject(tenant, id);
  return test;
}

export async function setTestRegistradores(tenant, id, testId, registradorIds) {
  const tests = await getTests(tenant, id);
  const idx = tests.findIndex((t) => t.id === testId);
  if (idx === -1) throw new Error('Prueba no encontrada.');
  tests[idx] = { ...tests[idx], registradorIds: Array.isArray(registradorIds) ? registradorIds : [] };
  await kv.set(testsKey(tenant, id), tests);
  await touchProject(tenant, id);
  return tests[idx];
}

// Perezoso, igual que ensureProjectDocumentosFolder — crea "Aportes" (si hace falta) y la
// subcarpeta de la prueba adentro, recién cuando hace falta subir algo.
async function ensureTestDriveFolder(tenant, id, meta, test) {
  if (test.driveFolderId) return test.driveFolderId;
  const driveConfig = await getDriveConfig(tenant);
  if (!driveConfig?.folderId) return null;

  const projectFolderId = meta.driveFolderId || await ensureSubfolder(driveConfig.folderId, meta.name);
  const aportesFolderId = meta.aportesFolderId || await ensureSubfolder(projectFolderId, 'Aportes');
  const testFolderId = await ensureSubfolder(aportesFolderId, test.name);

  const currentMeta = (await kv.get(projectMetaKey(tenant, id))) ?? meta;
  if (!currentMeta.driveFolderId || !currentMeta.aportesFolderId) {
    await kv.set(projectMetaKey(tenant, id), { ...currentMeta, driveFolderId: projectFolderId, aportesFolderId });
  }
  const tests = await getTests(tenant, id);
  await kv.set(testsKey(tenant, id), tests.map((t) => (t.id === test.id ? { ...t, driveFolderId: testFolderId } : t)));
  return testFolderId;
}

// Para la subida resumible de video (necesita la carpeta de Drive ANTES de que exista la
// ejecución, porque el navegador sube el archivo directo a Drive antes de mandar el aporte).
// Devuelve null si el tenant no tiene Drive conectado.
export async function getOrCreateTestDriveFolder(tenant, id, testId) {
  const [meta, tests] = await Promise.all([kv.get(projectMetaKey(tenant, id)), getTests(tenant, id)]);
  if (!meta) throw new Error('Proyecto no encontrado.');
  const test = tests.find((t) => t.id === testId);
  if (!test) throw new Error('Prueba no encontrada.');
  return ensureTestDriveFolder(tenant, id, meta, test);
}

export async function getExecutions(tenant, id) {
  return (await kv.get(executionsKey(tenant, id))) ?? [];
}

export async function addExecution(tenant, id, { testId, contributor, values, tag, evidence, missingFields, note }) {
  const [tests, executions, meta] = await Promise.all([getTests(tenant, id), getExecutions(tenant, id), kv.get(projectMetaKey(tenant, id))]);
  const test = tests.find((t) => t.id === testId);
  if (!test) throw new Error('Prueba no encontrada.');

  const cleanEvidence = Array.isArray(evidence) ? evidence : [];
  const execution = {
    id: generateId(),
    testId,
    contributor,
    values: values || {},
    tag: tag || 'referencia',
    evidence: cleanEvidence,
    missingFields: Array.isArray(missingFields) ? missingFields : [],
    note: note || '',
    createdAt: new Date().toISOString(),
  };

  // Best-effort a Drive — los videos ya llegan subidos (ver video-upload-url, van directo del
  // navegador a Drive) con driveFileId/driveUrl, así que no se vuelven a subir acá.
  const pending = cleanEvidence.filter((att) => att.data && !att.driveFileId);
  if (pending.length && meta) {
    try {
      const folderId = await ensureTestDriveFolder(tenant, id, meta, test);
      if (folderId) {
        const datePrefix = execution.createdAt.slice(0, 10);
        const uploaded = await Promise.all(
          pending.map((att, i) => uploadFile(folderId, {
            name: `${datePrefix}_${contributor}_${(att.name || `evidencia-${i + 1}`).trim()}`,
            mimeType: att.mimeType,
            data: att.data,
          }))
        );
        const uploadedById = new Map(pending.map((att, i) => [att, { driveFileId: uploaded[i].id, driveUrl: uploaded[i].webViewLink }]));
        execution.evidence = cleanEvidence.map((att) => (uploadedById.has(att) ? { ...att, ...uploadedById.get(att) } : att));
      }
    } catch (err) {
      console.error(`[kai-next] no se pudo subir evidencia a Drive (${tenant}/${id}):`, err.message);
    }
  }

  await kv.set(executionsKey(tenant, id), [...executions, execution]);
  await addEvent(tenant, id, {
    type: 'aporte',
    actor: contributor,
    title: `${contributor} aportó — ${test.name}`,
    body: note || Object.entries(values || {}).map(([k, v]) => `${k}: ${v}`).join(' · '),
  });
  await touchProject(tenant, id);
  return execution;
}

export async function validateExecution(tenant, id, executionId, { by, note }) {
  const [executions, tests] = await Promise.all([getExecutions(tenant, id), getTests(tenant, id)]);
  const idx = executions.findIndex((e) => e.id === executionId);
  if (idx === -1) throw new Error('Ejecución no encontrada.');
  executions[idx] = { ...executions[idx], validatedBy: by, validatedAt: new Date().toISOString(), validationNote: note || '' };
  await kv.set(executionsKey(tenant, id), executions);

  const test = tests.find((t) => t.id === executions[idx].testId);
  await addEvent(tenant, id, {
    type: 'validacion',
    actor: by,
    title: `${by} validó una ejecución${test ? ' — ' + test.name : ''}`,
    body: note || '',
  });
  await touchProject(tenant, id);
  return executions[idx];
}
