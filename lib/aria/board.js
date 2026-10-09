import {
  queryDatabasePages,
  getNotionPageRaw,
  updateNotionPageProperties,
  createNotionPage,
  archiveNotionPage,
  pageToFields,
} from '@/lib/aria/notion';

// IDs fijos del workspace de Notion — ver aria-notion-estructura-fase1.md
export const TAREAS_DB_ID = '1b2b75c3-a460-8194-b8c8-000bd4af69cd';
export const PROYECTOS_DB_ID = '1b1b75c3-a460-8058-8321-000b215ebe26';
export const TALENTO_DB_ID = '1b1b75c3-a460-80bf-87ba-000b641b8dd4';
export const SPRINTS_DB_ID = '46603fcc-975e-4743-ba60-1a102a49fac4';
export const INICIATIVAS_DB_ID = '253b0e9d-6b6d-4d61-84fc-cf5b78f50702';
// Corregido — el valor anterior era el id de "database" (pre-migración a multi-data-source),
// no el de "data source" real que exige /data_sources/*; confirmado en vivo al construir
// Proyecto de Desarrollo (ver lib/kaiNext/projectsNotion.js).
export const CLIENTES_DB_ID = '1b1b75c3-a460-801d-ba83-000b389f36e6';
// Base nueva, creada para Proyecto de Desarrollo (Kai Next) — Nombre/Iniciativa/Fase/
// Fecha inicio/Fecha fin. Tareas tiene ahora una relación "Épica" hacia acá.
export const EPICAS_DB_ID = 'c6b2da14-2077-466e-84c0-8069e00982f2';

// Cliente "Bonsight" en la tabla de Clientes (Tipo de Cliente: Interno) — workshops
// internos del equipo cuelgan sus Proyectos/Iniciativas nuevos de este cliente.
export const BONSIGHT_CLIENTE_ID = '3aab75c3-a460-81bc-a046-e3d3a1a06c5e';

export const STATUS_COLUMNS = [
  { id: 'Backlog', name: 'Backlog' },
  { id: 'Not started', name: 'Por hacer' },
  { id: 'In progress', name: 'En curso' },
  { id: 'In Review', name: 'En revisión' },
  { id: 'Done', name: 'Hecho' },
];

// Separado del orden de columnas a propósito — "sin status" en Notion debería caer en
// "Por hacer" (lo de siempre), no en Backlog, que ahora ocupa el primer lugar visual.
const DEFAULT_STATUS = 'Not started';

export const TASK_TYPES = ['Desarrollo', 'Soporte', 'Bug', 'Mejora', 'Reunión'];
export const SEVERITIES = ['Crítica', 'Alta', 'Media', 'Baja'];

// ── Sprints (base real de Notion — Sprint/Estado/Fechas/rollups) ────────────

function sprintFromPage(page) {
  const { fields } = pageToFields(page);
  const title = fields['Sprint'] ?? 'Sprint';
  const numberMatch = /#(\d+)/.exec(title);
  return {
    id: page.id,
    title,
    number: numberMatch ? Number(numberMatch[1]) : null,
    status: fields['Estado'] ?? 'Planificado',
    objetivo: fields['Objetivo'] ?? null,
    startDate: fields['Fecha inicio'] ?? null,
    endDate: fields['Fecha fin'] ?? null,
    committedHours: fields['Horas comprometidas'] ?? null,
    loggedHours: fields['Horas registradas'] ?? null,
    totalTasks: fields['Tareas totales'] ?? null,
    // null = sprint legado, de antes de que existiera Sprints por proyecto — ver plan en
    // /Users/itriagor/.claude/plans/serene-spinning-mochi.md. Nunca se reasignan a mano.
    proyectoId: fields['Proyecto']?.[0] ?? null,
  };
}

// Sin proyectoId: sprints LEGADO (sin esa relación) — es lo que sigue viendo el tablero
// universal de siempre, nunca un sprint nuevo creado dentro de un Proyecto de Desarrollo. Con
// proyectoId: solo los sprints de ESE proyecto — numeración y "sprint activo" quedan acotados
// a su propio ciclo, independientes de cualquier otro proyecto.
export async function listSprints(token, proyectoId) {
  const pages = await queryDatabasePages(token, SPRINTS_DB_ID, proyectoId
    ? { filter: { property: 'Proyecto', relation: { contains: proyectoId } } }
    : {});
  const sprints = pages.map(sprintFromPage);
  return (proyectoId ? sprints : sprints.filter((s) => !s.proyectoId)).sort((a, b) => (b.number ?? 0) - (a.number ?? 0));
}

// Búsqueda puntual por id (no "el activo") — a propósito NO pasa por listSprints (que sin
// proyectoId filtra a solo legado, para proteger el tablero universal): quien ya tiene un
// sprintId concreto necesita encontrarlo exista o no una relación a Proyecto, sea legado o de
// un Proyecto de Desarrollo puntual.
async function getSprintById(token, sprintId) {
  const page = await getNotionPageRaw(token, sprintId);
  if (!page) return null;
  return sprintFromPage(page);
}

// Cuando no se pide un sprint puntual: el "En curso" gana siempre; si no hay
// ninguno, el "Planificado" más reciente por fecha de inicio.
function resolveDefaultSprint(sprints) {
  const activos = sprints.filter((s) => s.status !== 'Cerrado');
  const enCurso = activos.find((s) => s.status === 'En curso');
  if (enCurso) return enCurso;
  const planificados = [...activos].sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''));
  return planificados[0] ?? null;
}

export async function createSprint(token, { startDate, endDate, objetivo, proyectoId }) {
  if (!startDate || !endDate) throw new Error('Fecha de inicio y fin son requeridas.');
  const sprints = await listSprints(token, proyectoId);
  const number = Math.max(0, ...sprints.map((s) => s.number ?? 0)) + 1;

  const properties = {
    Sprint: { title: [{ text: { content: `Sprint #${number}` } }] },
    Estado: { select: { name: 'Planificado' } },
    'Fecha inicio': { date: { start: startDate } },
    'Fecha fin': { date: { start: endDate } },
  };
  if (objetivo?.trim()) properties['Objetivo'] = { rich_text: [{ text: { content: objetivo.trim() } }] };
  if (proyectoId) properties['Proyecto'] = { relation: [{ id: proyectoId }] };

  const page = await createNotionPage(token, SPRINTS_DB_ID, properties);
  return sprintFromPage(page);
}

export async function closeSprintPlanning(token, sprintId) {
  await updateNotionPageProperties(token, sprintId, { Estado: { select: { name: 'En curso' } } });
}

export async function updateSprintDates(token, sprintId, { startDate, endDate }) {
  if (!startDate || !endDate) throw new Error('Fecha de inicio y fin son requeridas.');
  await updateNotionPageProperties(token, sprintId, {
    'Fecha inicio': { date: { start: startDate } },
    'Fecha fin': { date: { start: endDate } },
  });
}

export async function closeSprint(token, sprintId) {
  await updateNotionPageProperties(token, sprintId, { Estado: { select: { name: 'Cerrado' } } });
}

// Foto de las métricas al momento del cierre — "compromiso real" (lo planificado) se
// mide aparte de "lo que se coló" (Fuera de plan), nunca mezclados en el mismo %.
export function computeSprintMetrics(sprint, tasks) {
  const summarize = (list) => ({ total: list.length, completadas: list.filter((t) => t.status === 'Done').length });

  const committed = tasks.filter((t) => !t.outOfPlan);
  const scopeCreep = tasks.filter((t) => t.outOfPlan);

  const byType = {};
  for (const type of TASK_TYPES) {
    const list = tasks.filter((t) => t.taskType === type);
    if (list.length) byType[type] = summarize(list);
  }

  const byResponsable = {};
  for (const t of tasks) {
    const key = t.responsableName ?? 'Sin responsable';
    byResponsable[key] ??= { total: 0, completadas: 0 };
    byResponsable[key].total++;
    if (t.status === 'Done') byResponsable[key].completadas++;
  }

  const byCliente = {};
  for (const t of tasks) {
    const key = t.clienteName ?? 'Sin cliente';
    byCliente[key] ??= { total: 0, completadas: 0 };
    byCliente[key].total++;
    if (t.status === 'Done') byCliente[key].completadas++;
  }

  return {
    sprintId: sprint.id,
    sprintTitle: sprint.title,
    closedAt: new Date().toISOString(),
    committed: summarize(committed),
    scopeCreep: summarize(scopeCreep),
    committedHours: sprint.committedHours,
    loggedHours: sprint.loggedHours,
    byType,
    byResponsable,
    byCliente,
  };
}

// ── Lectura estructurada de Tareas ───────────────────────────────────────────

// De "Sprint #4 (creada, 27 jul 2026)\n→ Sprint #5 (movida, 27 jul 2026)" saca el
// título del sprint anterior al actual (el penúltimo mencionado), si hay alguno.
function previousSprintFromHistory(historyText) {
  if (!historyText) return null;
  const titles = [...historyText.matchAll(/^(?:→ )?(.+?) \(/gm)].map((m) => m[1]);
  return titles.length > 1 ? titles[titles.length - 2] : null;
}

// Exportada (antes privada) — Proyecto de Desarrollo (Kai Next) la reusa tal cual para listar
// las tareas de una Épica, mismo shape que ya consume el tablero de Sprints.
export function taskFromPage(page, talentoMap, proyectosMap, iniciativasMap) {
  const { fields } = pageToFields(page);
  const responsableId = fields['Responsable (Talento)']?.[0] ?? null;
  const proyectoId = fields['Proyectos']?.[0] ?? null;
  const iniciativaId = fields['Iniciativa']?.[0] ?? null;
  const epicaId = fields['Épica']?.[0] ?? null;
  const responsable = responsableId ? talentoMap.get(responsableId) : null;
  const proyecto = proyectoId ? proyectosMap.get(proyectoId) : null;

  return {
    id: page.id,
    url: page.url,
    title: fields['TASK'] ?? 'Sin título',
    status: fields['Status'] ?? DEFAULT_STATUS,
    priority: fields['Prioridad'] ?? null,
    taskType: fields['Tipo de Tarea'] ?? null,
    severity: fields['Severidad'] ?? null,
    origen: fields['Origen'] ?? null,
    dueDate: fields['Finalizado'] ?? null,
    outOfPlan: !!fields['Fuera de plan'],
    // "Inicio" es de solo lectura desde acá en adelante — se fija una vez al crear la tarea
    // y nunca se vuelve a tocar. Lo que sí se edita y se valida contra el sprint es
    // "Inicio comprometido (sprint actual)", que Aria resetea sola cada vez que la tarea
    // cambia de sprint (ver addExistingTask) — así nadie tiene que corregirlo a mano.
    startDate: fields['Inicio'] ?? null,
    committedStartDate: fields['Inicio comprometido (sprint actual)'] ?? null,
    draggedCount: fields['Veces arrastrada'] ?? null,
    estimatedHours: fields['Estimación'] ?? null,
    actualHours: fields['Tiempo dedicado (hrs)'] ?? null,
    // "Necesidad" es el campo de texto libre que ya existía en la base para describir la
    // tarea — se reusa como descripción en vez de crear una propiedad nueva en Notion.
    description: fields['Necesidad'] || null,
    responsableId,
    responsableName: responsable?.name ?? null,
    tipoColaborador: responsable?.tipo ?? null,
    proyectoId,
    proyectoName: proyecto?.name ?? null,
    clienteName: proyecto?.clienteName ?? null,
    iniciativaId,
    iniciativaName: iniciativaId ? iniciativasMap.get(iniciativaId)?.name ?? null : null,
    epicaId,
    parentId: fields['Parent item']?.[0] ?? null,
    parentName: null,
    sprintIds: fields['Sprint'] ?? [],
    childIds: fields['Sub-item'] ?? [],
    children: [],
    childrenDoneCount: 0,
    childrenPct: null,
    previousSprintTitle: previousSprintFromHistory(fields['Historial de Sprints']),
  };
}

function pageTitleText(page) {
  const titleProp = Object.values(page.properties ?? {}).find((p) => p.type === 'title');
  return (titleProp?.title ?? []).map((t) => t.plain_text ?? '').join('') || 'Sin título';
}

// Resuelve el nombre del padre de cada subtarea — usa el título ya cargado si el
// padre también está en el tablero, si no hace un GET puntual de esa página sola
// (no fuerza a traer el padre completo al tablero).
async function resolveParentNames(token, tasks) {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const missingIds = [...new Set(tasks.map((t) => t.parentId).filter((id) => id && !byId.has(id)))];

  const missingPages = await Promise.all(missingIds.map((id) => getNotionPageRaw(token, id)));
  const missingTitles = new Map();
  missingIds.forEach((id, i) => {
    const page = missingPages[i];
    if (page) missingTitles.set(id, pageToFields(page).fields['TASK'] ?? 'Sin título');
  });

  for (const task of tasks) {
    if (!task.parentId) continue;
    task.parentName = byId.get(task.parentId)?.title ?? missingTitles.get(task.parentId) ?? null;
  }
}

// Resuelve título + estado de cada subtarea (propiedad nativa "Sub-item" de Notion, ya
// existía en la base — acá solo la leemos) para mostrar "N subtareas" y el % completado
// (hijos en Done / total) en la card. Mismo patrón que resolveParentNames: usa el título/
// estado ya cargado si la subtarea también está en el tablero actual, si no hace un GET
// puntual (puede pertenecer a otro sprint o no tener sprint asignado).
async function resolveChildren(token, tasks) {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const allChildIds = [...new Set(tasks.flatMap((t) => t.childIds))];
  const missingIds = allChildIds.filter((id) => !byId.has(id));

  const missingPages = await Promise.all(missingIds.map((id) => getNotionPageRaw(token, id)));
  const missingInfo = new Map();
  missingIds.forEach((id, i) => {
    const page = missingPages[i];
    if (page) {
      const { fields } = pageToFields(page);
      missingInfo.set(id, { title: fields['TASK'] ?? 'Sin título', status: fields['Status'] ?? null });
    }
  });

  for (const task of tasks) {
    if (!task.childIds.length) continue;
    task.children = task.childIds.map((id) => {
      const local = byId.get(id);
      if (local) return { id, title: local.title, status: local.status };
      const info = missingInfo.get(id);
      return { id, title: info?.title ?? 'Sin título', status: info?.status ?? null };
    });
    task.childrenDoneCount = task.children.filter((c) => c.status === 'Done').length;
    task.childrenPct = Math.round((task.childrenDoneCount / task.children.length) * 100);
  }
}

// Cliente vive en una base aparte que Aria no toca directamente (fuera del
// alcance mínimo del doc original) — se resuelve vía la relación "Cliente" que
// cada Proyecto ya tiene, y si el integration no tiene acceso a esa base
// simplemente no se muestra (no rompe el tablero).
async function resolveClienteNames(token, proyectosMap) {
  const clienteIds = [...new Set([...proyectosMap.values()].map((p) => p.clienteId).filter(Boolean))];
  if (!clienteIds.length) return;

  const pages = await Promise.all(clienteIds.map((id) => getNotionPageRaw(token, id).catch(() => null)));
  const nameById = new Map();
  clienteIds.forEach((id, i) => {
    const page = pages[i];
    if (page) nameById.set(id, pageTitleText(page));
  });

  for (const proyecto of proyectosMap.values()) {
    if (proyecto.clienteId) proyecto.clienteName = nameById.get(proyecto.clienteId) ?? null;
  }
}

export async function loadTalentoMap(token) {
  const pages = await queryDatabasePages(token, TALENTO_DB_ID);
  const map = new Map();
  for (const page of pages) {
    const { fields } = pageToFields(page);
    map.set(page.id, {
      id: page.id,
      name: fields['Nombre Apellido'] ?? 'Sin nombre',
      tipo: fields['Tipo de Colaborador'] ?? null,
    });
  }
  return map;
}

export async function loadProyectosMap(token) {
  const pages = await queryDatabasePages(token, PROYECTOS_DB_ID);
  const map = new Map();
  for (const page of pages) {
    const { fields } = pageToFields(page);
    map.set(page.id, {
      id: page.id,
      name: fields['Proyecto'] ?? 'Sin nombre',
      clienteId: fields['Cliente']?.[0] ?? null,
      clienteName: null,
    });
  }
  await resolveClienteNames(token, map);
  return map;
}

export async function loadIniciativasMap(token) {
  const pages = await queryDatabasePages(token, INICIATIVAS_DB_ID);
  const map = new Map();
  for (const page of pages) {
    const { fields } = pageToFields(page);
    map.set(page.id, { id: page.id, name: fields['Iniciativa'] ?? 'Sin nombre', proyectoId: fields['Proyecto']?.[0] ?? null });
  }
  return map;
}

export async function getBoardData(token, { sprintId, sprintNumber, proyectoId } = {}) {
  const [sprints, talentoMap, proyectosMap, iniciativasMap] = await Promise.all([
    listSprints(token, proyectoId),
    loadTalentoMap(token),
    loadProyectosMap(token),
    loadIniciativasMap(token),
  ]);

  let sprint;
  if (sprintId) sprint = sprints.find((s) => s.id === sprintId) ?? null;
  else if (sprintNumber) sprint = sprints.find((s) => s.number === Number(sprintNumber)) ?? null;
  else sprint = resolveDefaultSprint(sprints);

  const shared = {
    sprints,
    columns: STATUS_COLUMNS,
    typeColumns: TASK_TYPES,
    talento: [...talentoMap.values()],
    proyectos: [...proyectosMap.values()],
    iniciativas: [...iniciativasMap.values()],
  };

  if (!sprint) return { sprint: null, tasks: [], ...shared };

  const pages = await queryDatabasePages(token, TAREAS_DB_ID, {
    filter: { property: 'Sprint', relation: { contains: sprint.id } },
  });

  const tasks = pages.map((page) => taskFromPage(page, talentoMap, proyectosMap, iniciativasMap));
  await Promise.all([resolveParentNames(token, tasks), resolveChildren(token, tasks)]);

  return { sprint, tasks, ...shared };
}

// Para el reporte de cliente (ver generators/sprintClientReport.js): tareas de VARIOS
// sprints a la vez, no el tablero en vivo de uno solo. No filtra por cliente acá — cada
// tarea ya trae clienteName resuelto, y quien llama decide qué hacer con eso.
export async function getTasksForSprints(token, sprintIds) {
  if (!sprintIds?.length) return [];
  const [talentoMap, proyectosMap, iniciativasMap] = await Promise.all([
    loadTalentoMap(token),
    loadProyectosMap(token),
    loadIniciativasMap(token),
  ]);
  const pages = await queryDatabasePages(token, TAREAS_DB_ID, {
    filter: { or: sprintIds.map((id) => ({ property: 'Sprint', relation: { contains: id } })) },
  });
  const tasks = pages.map((page) => taskFromPage(page, talentoMap, proyectosMap, iniciativasMap));
  await resolveParentNames(token, tasks);
  return tasks;
}

// Estado general del período para el reporte de cliente — deliberadamente NO lo decide la
// IA (un semáforo "a ojo" es lo más fácil de romper la confianza en el reporte si no está
// bien fundado). Cronograma: qué % de lo trabajado en el período se terminó. Calidad: si
// quedó algo de severidad alta/crítica sin resolver. Alcance y Riesgos no se calculan acá
// todavía — no hay una señal confiable para eso, mejor omitirlos que inventar un color.
export function computeReportHealth(tasks) {
  const total = tasks.length;
  const completadas = tasks.filter((t) => t.status === 'Done').length;
  const pctCompletado = total ? completadas / total : 1;
  const cronograma = pctCompletado >= 0.85 ? 'good' : pctCompletado >= 0.6 ? 'warning' : 'critical';

  const openTasks = tasks.filter((t) => t.status !== 'Done');
  const hasCritica = openTasks.some((t) => t.severity === 'Crítica');
  const hasAlta = openTasks.some((t) => t.severity === 'Alta');
  const calidad = hasCritica ? 'critical' : hasAlta ? 'warning' : 'good';

  return { cronograma, calidad };
}

// "Tasa de arrastre" para el reporte de cliente — promedio/máximo de "Veces arrastrada"
// (fórmula de Notion que cuenta cuántas veces se movió una tarea de sprint), general y
// desglosado por responsable y por sprint. Mismo patrón de reduce que byResponsable/byCliente
// en computeSprintMetrics, pero acumulando un promedio en vez de un ratio de completadas —
// por eso no comparte la misma función `summarize`. `sprints` es opcional: sin esa lista
// bySprint queda vacío (no hay forma de resolver id → título del sprint).
export function computeDragStats(tasks, sprints = []) {
  const sprintTitleById = new Map(sprints.map((s) => [s.id, s.title]));

  const summarize = (list) => {
    const withCount = list.filter((t) => t.draggedCount != null);
    const sum = withCount.reduce((s, t) => s + t.draggedCount, 0);
    return {
      total: list.length,
      promedio: withCount.length ? Math.round((sum / withCount.length) * 10) / 10 : 0,
      maximo: withCount.length ? Math.max(...withCount.map((t) => t.draggedCount)) : 0,
    };
  };

  const groupBy = (keyFn) => {
    const groups = {};
    for (const t of tasks) {
      const key = keyFn(t);
      groups[key] ??= [];
      groups[key].push(t);
    }
    return Object.fromEntries(Object.entries(groups).map(([k, list]) => [k, summarize(list)]));
  };

  return {
    general: summarize(tasks),
    byResponsable: groupBy((t) => t.responsableName ?? 'Sin responsable'),
    bySprint: sprints.length ? groupBy((t) => sprintTitleById.get(t.sprintIds?.[0]) ?? 'Sin sprint') : {},
  };
}

// Lista de clientes con al menos un Proyecto — para el selector del reporte. No hay
// endpoint dedicado a "listar clientes" hoy; se deriva de los Proyectos ya cargados (mismo
// camino que resuelve clienteName en cada tarea).
export async function listClientesConProyectos(token) {
  const proyectosMap = await loadProyectosMap(token);
  const names = [...new Set([...proyectosMap.values()].map((p) => p.clienteName).filter(Boolean))];
  return names.sort((a, b) => a.localeCompare(b, 'es'));
}

export async function searchTareas(token, query) {
  const [pages, proyectosMap] = await Promise.all([
    queryDatabasePages(token, TAREAS_DB_ID, {
      filter: { property: 'TASK', title: { contains: query } },
      page_size: 20,
    }),
    loadProyectosMap(token),
  ]);
  return pages.map((page) => {
    const { fields } = pageToFields(page);
    const proyectoId = fields['Proyectos']?.[0] ?? null;
    const proyecto = proyectoId ? proyectosMap.get(proyectoId) : null;
    return {
      id: page.id,
      title: fields['TASK'] ?? 'Sin título',
      status: fields['Status'] ?? null,
      proyectoName: proyecto?.name ?? null,
      clienteName: proyecto?.clienteName ?? null,
    };
  });
}

// actualHours es opcional salvo que status sea "Done" — moverla a Hecho sin haber cargado
// horas reales (ni antes ni en este mismo pedido) está bloqueado acá, no solo en el cliente,
// para que ningún otro camino (futuras tools de Aria, llamadas directas a la API) se lo salte.
export async function moveTask(token, pageId, status, actualHours) {
  if (!STATUS_COLUMNS.some((c) => c.id === status)) throw new Error(`Estado inválido: ${status}`);

  const properties = { Status: { status: { name: status } } };
  let page = null;
  const loadPage = async () => { if (!page) page = await getNotionPageRaw(token, pageId); return page; };

  // Tareas en Backlog pueden no tener agenda ni estimación todavía (import masivo de historias,
  // ver createTask) — al salir de Backlog recién se exige que ya estén completas, para que
  // ninguna tarea avance "a ciegas" al resto del tablero.
  if (status !== 'Backlog') {
    const fields = pageToFields(await loadPage()).fields;
    const missing = [];
    if (!fields['Inicio']) missing.push('fecha de inicio');
    if (!fields['Finalizado']) missing.push('fecha de fin');
    if (fields['Estimación'] == null) missing.push('estimación de horas');
    if (missing.length) throw new Error(`Completá ${missing.join(', ')} antes de sacar esta tarea de Backlog.`);
  }

  if (status === 'Done') {
    let hours = actualHours === '' || actualHours == null ? null : Number(actualHours);
    if (hours == null) {
      hours = pageToFields(await loadPage()).fields['Tiempo dedicado (hrs)'] ?? null;
    }
    if (hours == null) throw new Error('Cargá las horas reales antes de marcar la tarea como Hecho.');
    properties['Tiempo dedicado (hrs)'] = { number: hours };
  }

  await updateNotionPageProperties(token, pageId, properties);
}

export async function updateTaskResponsable(token, pageId, responsableId) {
  await updateNotionPageProperties(token, pageId, {
    'Responsable (Talento)': { relation: responsableId ? [{ id: responsableId }] : [] },
  });
}

// Horas reales trabajadas — solo tiene sentido cargarlas cuando la tarea ya está en "Hecho"
// (el input en la tarjeta se oculta hasta ese momento, esto es el resguardo del servidor).
export async function updateTaskActualHours(token, pageId, actualHours) {
  await updateNotionPageProperties(token, pageId, {
    'Tiempo dedicado (hrs)': { number: actualHours === '' || actualHours == null ? null : Number(actualHours) },
  });
}

// title/description llegan por separado (dos ediciones inline distintas en la tarjeta) — solo
// se toca la propiedad que vino definida, así una no pisa a la otra. Descripción reusa
// "Necesidad" (rich_text que ya existía en la base) en vez de una propiedad nueva.
export async function updateTaskDetails(token, pageId, { title, description, taskType, priority, severity }) {
  const properties = {};
  if (title !== undefined) {
    if (!title?.trim()) throw new Error('El título no puede quedar vacío.');
    properties.TASK = { title: [{ text: { content: title.trim() } }] };
  }
  if (description !== undefined) {
    properties['Necesidad'] = { rich_text: description ? [{ text: { content: description } }] : [] };
  }
  if (taskType !== undefined) properties['Tipo de Tarea'] = taskType ? { select: { name: taskType } } : { select: null };
  if (priority !== undefined) properties['Prioridad'] = priority ? { select: { name: priority } } : { select: null };
  if (severity !== undefined) properties['Severidad'] = severity ? { select: { name: severity } } : { select: null };
  if (Object.keys(properties).length === 0) return;
  await updateNotionPageProperties(token, pageId, properties);
}

// "Inicio comprometido (sprint actual)"/Finalizado tienen que caer dentro del rango del
// sprint al que pertenece la tarea — bloqueo duro, no solo aviso (decisión del usuario). El
// date input del cliente ya lo acota con min/max, esto es el resguardo del lado del servidor.
// "Inicio" (histórico, se fija una sola vez al crear la tarea) NO participa acá — por eso el
// mensaje habla de "compromiso en el sprint actual" y no de "el inicio de la tarea".
function validateWithinSprint(sprint, startDate, endDate) {
  if (startDate && endDate && startDate > endDate) {
    throw new Error('La fecha de inicio no puede ser posterior a la de fin.');
  }
  if (sprint.startDate && sprint.endDate) {
    if (startDate && (startDate < sprint.startDate || startDate > sprint.endDate)) {
      throw new Error(`La fecha de compromiso de esta tarea en el sprint actual está fuera de rango (${sprint.startDate} – ${sprint.endDate}) — ajustala o dejá que Aria la vuelva a comprometer al moverla de sprint.`);
    }
    if (endDate && (endDate < sprint.startDate || endDate > sprint.endDate)) {
      throw new Error(`El fin tiene que estar dentro del sprint (${sprint.startDate} – ${sprint.endDate}).`);
    }
  }
}

// startDate acá es el valor del mismo input de fecha que ya existía en la tarjeta — antes
// escribía "Inicio", ahora escribe "Inicio comprometido (sprint actual)" (el que se valida
// contra el sprint). "Inicio" no se vuelve a tocar después de creada la tarea.
export async function updateTaskSchedule(token, pageId, sprintId, { startDate, endDate, estimatedHours }) {
  const sprint = await getSprintById(token, sprintId);
  if (!sprint) throw new Error('Ese sprint ya no existe.');
  validateWithinSprint(sprint, startDate || null, endDate || null);

  const properties = {
    'Inicio comprometido (sprint actual)': { date: startDate ? { start: startDate } : null },
    Finalizado: { date: endDate ? { start: endDate } : null },
    'Estimación': { number: estimatedHours === '' || estimatedHours == null ? null : Number(estimatedHours) },
  };
  await updateNotionPageProperties(token, pageId, properties);
}

async function requireSprint(token, sprintId) {
  if (!sprintId) throw new Error('No hay un sprint seleccionado.');
  const sprint = await getSprintById(token, sprintId);
  if (!sprint) throw new Error('Ese sprint ya no existe.');
  if (sprint.status === 'Cerrado') throw new Error('Este sprint está cerrado — no se le pueden agregar tareas.');
  return sprint;
}

function formatShortDate(date = new Date()) {
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');
}

export async function createTask(token, sprintId, { title, status, proyectoId, responsableId, priority, taskType, severity, iniciativaId, epicaId, fase, parentId, startDate, endDate, estimatedHours, description }) {
  if (!title?.trim()) throw new Error('El título de la tarea es requerido.');
  const effectiveStatus = status && STATUS_COLUMNS.some((c) => c.id === status) ? status : DEFAULT_STATUS;
  // Validado también en el form (AddTaskForm, SprintBoardPresentation.jsx) — se repite acá
  // porque esta función es el único cuello de botella real antes de escribir en Notion, y el
  // form por sí solo no evita que una tarea quede sin agenda ni esfuerzo estimado. Excepción:
  // "Backlog" es justamente la columna para tareas sin planificar todavía (import masivo de
  // historias, por ejemplo) — ahí no se exige nada de esto; se exige recién al salir de Backlog
  // (ver moveTask).
  if (effectiveStatus !== 'Backlog') {
    if (!startDate) throw new Error('La fecha de inicio es requerida.');
    if (!endDate) throw new Error('La fecha de fin es requerida.');
    if (estimatedHours === '' || estimatedHours == null) throw new Error('La estimación de horas es requerida.');
  }
  // sprintId es opcional: una tarea de Épica (Proyecto de Desarrollo) puede crearse sin sprint
  // (backlog) y jalarse a un sprint después vía addExistingTask — el resto del tablero de
  // Sprints sigue exigiendo sprintId en su propio flujo de creación, esto no lo afecta.
  const sprint = sprintId ? await requireSprint(token, sprintId) : null;
  if (sprint) validateWithinSprint(sprint, startDate || null, endDate || null);

  const properties = {
    TASK: { title: [{ text: { content: title.trim() } }] },
    Status: { status: { name: effectiveStatus } },
    Origen: { select: { name: 'Creada por Aria' } },
  };
  if (sprint) {
    properties['Sprint'] = { relation: [{ id: sprint.id }] };
    properties['Historial de Sprints'] = { rich_text: [{ text: { content: `${sprint.title} (creada, ${formatShortDate()})` } }] };
  }
  if (proyectoId) properties['Proyectos'] = { relation: [{ id: proyectoId }] };
  if (responsableId) properties['Responsable (Talento)'] = { relation: [{ id: responsableId }] };
  if (priority) properties['Prioridad'] = { select: { name: priority } };
  if (taskType) properties['Tipo de Tarea'] = { select: { name: taskType } };
  if (severity) properties['Severidad'] = { select: { name: severity } };
  if (iniciativaId) properties['Iniciativa'] = { relation: [{ id: iniciativaId }] };
  if (epicaId) properties['Épica'] = { relation: [{ id: epicaId }] };
  if (fase) properties['Fase'] = { select: { name: fase } };
  if (parentId) properties['Parent item'] = { relation: [{ id: parentId }] };
  // El día de creación "Inicio" e "Inicio comprometido (sprint actual)" arrancan iguales —
  // todavía no hay historial de arrastre que los haga divergir (eso empieza en
  // addExistingTask, la primera vez que la tarea cambia de sprint).
  if (startDate) {
    properties['Inicio'] = { date: { start: startDate } };
    properties['Inicio comprometido (sprint actual)'] = { date: { start: startDate } };
  }
  if (endDate) properties['Finalizado'] = { date: { start: endDate } };
  if (estimatedHours !== '' && estimatedHours != null) properties['Estimación'] = { number: Number(estimatedHours) };
  if (description?.trim()) properties['Necesidad'] = { rich_text: [{ text: { content: description.trim() } }] };
  if (sprint && sprint.status === 'En curso') properties['Fuera de plan'] = { checkbox: true };

  const page = await createNotionPage(token, TAREAS_DB_ID, properties);
  return page.id;
}

export async function createProyecto(token, { name, clienteId }) {
  if (!name?.trim()) throw new Error('El nombre del proyecto es requerido.');
  const properties = {
    Proyecto: { title: [{ text: { content: name.trim() } }] },
  };
  if (clienteId) properties['Cliente'] = { relation: [{ id: clienteId }] };
  const page = await createNotionPage(token, PROYECTOS_DB_ID, properties);
  return page.id;
}

export async function createIniciativa(token, { name, proyectoId }) {
  if (!name?.trim()) throw new Error('El nombre de la iniciativa es requerido.');
  if (!proyectoId) throw new Error('La iniciativa necesita un proyecto.');
  const properties = {
    Iniciativa: { title: [{ text: { content: name.trim() } }] },
    Proyecto: { relation: [{ id: proyectoId }] },
  };
  const page = await createNotionPage(token, INICIATIVAS_DB_ID, properties);
  return page.id;
}

// Usado por la carga masiva (carga un documento → resumen ejecutivo) — solo completa el
// Objetivo si la Iniciativa todavía no tenía uno propio, nunca lo pisa.
export async function updateIniciativaObjetivo(token, iniciativaId, objetivo) {
  if (!objetivo?.trim()) return;
  const page = await getNotionPageRaw(token, iniciativaId);
  const current = pageToFields(page).fields['Objetivo'];
  if (current?.trim()) return;
  await updateNotionPageProperties(token, iniciativaId, {
    Objetivo: { rich_text: [{ text: { content: objetivo.trim() } }] },
  });
}

export async function renameIniciativa(token, iniciativaId, name) {
  if (!name?.trim()) throw new Error('El nombre de la iniciativa es requerido.');
  await updateNotionPageProperties(token, iniciativaId, {
    Iniciativa: { title: [{ text: { content: name.trim() } }] },
  });
}

// Soft delete (archiva en Notion, recuperable desde la papelera) — bloqueado si todavía tiene
// épicas, para no dejar épicas/tareas huérfanas sin que nadie lo note.
export async function deleteIniciativa(token, iniciativaId) {
  const epicas = await listEpicasByIniciativa(token, iniciativaId);
  if (epicas.length > 0) {
    throw new Error(`Esta iniciativa todavía tiene ${epicas.length} épica${epicas.length !== 1 ? 's' : ''} — movélas o eliminalas antes de borrarla.`);
  }
  await archiveNotionPage(token, iniciativaId);
}

export async function addExistingTask(token, sprintId, pageId) {
  const sprint = await requireSprint(token, sprintId);

  const current = await getNotionPageRaw(token, pageId);
  const currentHistory = current ? pageToFields(current).fields['Historial de Sprints'] ?? '' : '';
  const historyEntry = `${sprint.title} (movida, ${formatShortDate()})`;
  const nextHistory = currentHistory ? `${currentHistory}\n→ ${historyEntry}` : historyEntry;

  const properties = {
    Sprint: { relation: [{ id: sprint.id }] },
    'Fuera de plan': { checkbox: sprint.status === 'En curso' },
    'Historial de Sprints': { rich_text: [{ text: { content: nextHistory } }] },
    // Recompromete la tarea al sprint destino automáticamente — sin esto quedaría con la
    // fecha comprometida del sprint anterior (o null), y validateWithinSprint la rechazaría
    // apenas alguien intente tocarla. Mismo punto único donde cambia la relación Sprint.
    'Inicio comprometido (sprint actual)': { date: sprint.startDate ? { start: sprint.startDate } : null },
  };
  await updateNotionPageProperties(token, pageId, properties);
}

export async function removeTask(token, pageId) {
  await updateNotionPageProperties(token, pageId, {
    Sprint: { relation: [] },
    'Fuera de plan': { checkbox: false },
  });
}

// ── Proyecto de Desarrollo (Kai Next) — Clientes real + Épicas ──────────────
// Ver lib/kaiNext/projectsNotion.js y plan en /Users/itriagor/.claude/plans/serene-spinning-mochi.md.
// Reusa Proyectos/Iniciativas/Tareas tal cual (createProyecto/createIniciativa/createTask ya
// existían) — lo único nuevo acá es Clientes real (antes solo se derivaba de Proyectos) y Épicas.

export const FASE_OPTIONS = ['Preparación', 'Análisis', 'Diseño', 'Desarrollo', 'Pruebas', 'Producción', 'Monitoreo y Cierre'];
export const FASE_COLORS = {
  'Preparación': '#9CA3AF', 'Análisis': '#A47148', 'Diseño': '#A78BFA', 'Desarrollo': '#60A5FA',
  'Pruebas': '#FBBF24', 'Producción': '#34D399', 'Monitoreo y Cierre': '#6B7280',
};

export async function listClientesReal(token) {
  const pages = await queryDatabasePages(token, CLIENTES_DB_ID);
  return pages
    .map((page) => {
      const { fields } = pageToFields(page);
      return {
        id: page.id,
        name: fields['Empresa'] ?? 'Sin nombre',
        estado: fields['Estado del Cliente'] ?? null,
        tipo: fields['Tipo de Cliente'] ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

function epicaFromPage(page) {
  const { fields } = pageToFields(page);
  return {
    id: page.id,
    name: fields['Nombre'] ?? 'Sin nombre',
    iniciativaId: fields['Iniciativa']?.[0] ?? null,
    fase: fields['Fase'] ?? null,
    startDate: fields['Fecha inicio'] ?? null,
    endDate: fields['Fecha fin'] ?? null,
    notas: fields['Notas'] ?? null,
  };
}

export async function getEpica(token, epicaId) {
  const page = await getNotionPageRaw(token, epicaId);
  return page ? epicaFromPage(page) : null;
}

export async function listEpicasByIniciativa(token, iniciativaId) {
  const pages = await queryDatabasePages(token, EPICAS_DB_ID, {
    filter: { property: 'Iniciativa', relation: { contains: iniciativaId } },
  });
  return pages.map(epicaFromPage);
}

// Para el roadmap — todas las épicas de varias iniciativas (todo el proyecto) a la vez.
export async function loadEpicasMap(token, iniciativaIds) {
  if (!iniciativaIds?.length) return new Map();
  const pages = await queryDatabasePages(token, EPICAS_DB_ID, {
    filter: { or: iniciativaIds.map((id) => ({ property: 'Iniciativa', relation: { contains: id } })) },
  });
  const map = new Map();
  for (const page of pages) {
    const epica = epicaFromPage(page);
    map.set(epica.id, epica);
  }
  return map;
}

export async function createEpica(token, { name, iniciativaId, fase, startDate, endDate, notas }) {
  if (!name?.trim()) throw new Error('El nombre de la épica es requerido.');
  if (!iniciativaId) throw new Error('La épica necesita una iniciativa.');
  const properties = {
    Nombre: { title: [{ text: { content: name.trim() } }] },
    Iniciativa: { relation: [{ id: iniciativaId }] },
  };
  if (fase && FASE_OPTIONS.includes(fase)) properties['Fase'] = { select: { name: fase } };
  if (startDate) properties['Fecha inicio'] = { date: { start: startDate } };
  if (endDate) properties['Fecha fin'] = { date: { start: endDate } };
  if (notas?.trim()) properties['Notas'] = { rich_text: [{ text: { content: notas.trim() } }] };
  const page = await createNotionPage(token, EPICAS_DB_ID, properties);
  return epicaFromPage(page);
}

export async function updateEpica(token, epicaId, { name, fase, startDate, endDate, notas }) {
  const properties = {};
  if (name !== undefined) {
    if (!name?.trim()) throw new Error('El nombre no puede quedar vacío.');
    properties['Nombre'] = { title: [{ text: { content: name.trim() } }] };
  }
  if (fase !== undefined) properties['Fase'] = fase && FASE_OPTIONS.includes(fase) ? { select: { name: fase } } : { select: null };
  if (startDate !== undefined) properties['Fecha inicio'] = { date: startDate ? { start: startDate } : null };
  if (endDate !== undefined) properties['Fecha fin'] = { date: endDate ? { start: endDate } : null };
  if (notas !== undefined) properties['Notas'] = notas?.trim() ? { rich_text: [{ text: { content: notas.trim() } }] } : { rich_text: [] };
  if (Object.keys(properties).length === 0) return;
  await updateNotionPageProperties(token, epicaId, properties);
}

export async function listTareasByEpica(token, epicaId) {
  const [pages, talentoMap, proyectosMap, iniciativasMap] = await Promise.all([
    queryDatabasePages(token, TAREAS_DB_ID, { filter: { property: 'Épica', relation: { contains: epicaId } } }),
    loadTalentoMap(token),
    loadProyectosMap(token),
    loadIniciativasMap(token),
  ]);
  return pages.map((page) => taskFromPage(page, talentoMap, proyectosMap, iniciativasMap));
}

// Todas las tareas de un Proyecto de Desarrollo, agregando por sus Iniciativas (no por relación a
// Proyectos — hay tareas creadas antes de que esa relación se empezara a setear, filtrar por
// Proyecto las dejaría afuera). Usado para el tab Tablero/Sprints y el rollup de cabecera.
export async function listTareasByIniciativas(token, iniciativaIds) {
  if (!iniciativaIds?.length) return [];
  const [pages, talentoMap, proyectosMap, iniciativasMap] = await Promise.all([
    queryDatabasePages(token, TAREAS_DB_ID, {
      filter: { or: iniciativaIds.map((id) => ({ property: 'Iniciativa', relation: { contains: id } })) },
    }),
    loadTalentoMap(token),
    loadProyectosMap(token),
    loadIniciativasMap(token),
  ]);
  return pages.map((page) => taskFromPage(page, talentoMap, proyectosMap, iniciativasMap));
}

// Fecha/estimación de una tarea sin pasar por un sprint (a diferencia de updateTaskSchedule, que
// exige un sprintId válido para acotar las fechas a su rango) — hace falta para completar una
// tarea en Backlog que todavía no tiene sprint asignado, antes de poder sacarla de esa columna
// (ver el candado en moveTask).
export async function updateTaskDatesAndHours(token, pageId, { startDate, endDate, estimatedHours }) {
  const properties = {
    Inicio: { date: startDate ? { start: startDate } : null },
    Finalizado: { date: endDate ? { start: endDate } : null },
    'Estimación': { number: estimatedHours === '' || estimatedHours == null ? null : Number(estimatedHours) },
  };
  await updateNotionPageProperties(token, pageId, properties);
}
