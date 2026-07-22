import {
  queryDatabasePages,
  getNotionPageRaw,
  updateNotionPageProperties,
  createNotionPage,
  pageToFields,
} from '@/lib/aria/notion';

// IDs fijos del workspace de Notion — ver aria-notion-estructura-fase1.md
export const TAREAS_DB_ID = '1b2b75c3-a460-8194-b8c8-000bd4af69cd';
export const PROYECTOS_DB_ID = '1b1b75c3-a460-8058-8321-000b215ebe26';
export const TALENTO_DB_ID = '1b1b75c3-a460-80bf-87ba-000b641b8dd4';
export const SPRINTS_DB_ID = '46603fcc-975e-4743-ba60-1a102a49fac4';
export const INICIATIVAS_DB_ID = '253b0e9d-6b6d-4d61-84fc-cf5b78f50702';

export const STATUS_COLUMNS = [
  { id: 'Not started', name: 'Por hacer' },
  { id: 'In progress', name: 'En curso' },
  { id: 'In Review', name: 'En revisión' },
  { id: 'Done', name: 'Hecho' },
];

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
  };
}

export async function listSprints(token) {
  const pages = await queryDatabasePages(token, SPRINTS_DB_ID);
  return pages.map(sprintFromPage).sort((a, b) => (b.number ?? 0) - (a.number ?? 0));
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

export async function createSprint(token, { startDate, endDate, objetivo }) {
  if (!startDate || !endDate) throw new Error('Fecha de inicio y fin son requeridas.');
  const sprints = await listSprints(token);
  const number = Math.max(0, ...sprints.map((s) => s.number ?? 0)) + 1;

  const properties = {
    Sprint: { title: [{ text: { content: `Sprint #${number}` } }] },
    Estado: { select: { name: 'Planificado' } },
    'Fecha inicio': { date: { start: startDate } },
    'Fecha fin': { date: { start: endDate } },
  };
  if (objetivo?.trim()) properties['Objetivo'] = { rich_text: [{ text: { content: objetivo.trim() } }] };

  const page = await createNotionPage(token, SPRINTS_DB_ID, properties);
  return sprintFromPage(page);
}

export async function closeSprintPlanning(token, sprintId) {
  await updateNotionPageProperties(token, sprintId, { Estado: { select: { name: 'En curso' } } });
}

// ── Lectura estructurada de Tareas ───────────────────────────────────────────

function taskFromPage(page, talentoMap, proyectosMap, iniciativasMap) {
  const { fields } = pageToFields(page);
  const responsableId = fields['Responsable (Talento)']?.[0] ?? null;
  const proyectoId = fields['Proyectos']?.[0] ?? null;
  const iniciativaId = fields['Iniciativa']?.[0] ?? null;
  const responsable = responsableId ? talentoMap.get(responsableId) : null;
  const proyecto = proyectoId ? proyectosMap.get(proyectoId) : null;

  return {
    id: page.id,
    url: page.url,
    title: fields['TASK'] ?? 'Sin título',
    status: fields['Status'] ?? STATUS_COLUMNS[0].id,
    priority: fields['Prioridad'] ?? null,
    taskType: fields['Tipo de Tarea'] ?? null,
    severity: fields['Severidad'] ?? null,
    origen: fields['Origen'] ?? null,
    dueDate: fields['Finalizado'] ?? null,
    outOfPlan: !!fields['Fuera de plan'],
    responsableId,
    responsableName: responsable?.name ?? null,
    tipoColaborador: responsable?.tipo ?? null,
    proyectoId,
    proyectoName: proyecto?.name ?? null,
    clienteName: proyecto?.clienteName ?? null,
    iniciativaId,
    iniciativaName: iniciativaId ? iniciativasMap.get(iniciativaId)?.name ?? null : null,
    parentId: fields['Parent item']?.[0] ?? null,
    parentName: null,
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

async function loadTalentoMap(token) {
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

async function loadProyectosMap(token) {
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

async function loadIniciativasMap(token) {
  const pages = await queryDatabasePages(token, INICIATIVAS_DB_ID);
  const map = new Map();
  for (const page of pages) {
    const { fields } = pageToFields(page);
    map.set(page.id, { id: page.id, name: fields['Iniciativa'] ?? 'Sin nombre', proyectoId: fields['Proyecto']?.[0] ?? null });
  }
  return map;
}

export async function getBoardData(token, { sprintId, sprintNumber } = {}) {
  const [sprints, talentoMap, proyectosMap, iniciativasMap] = await Promise.all([
    listSprints(token),
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
  await resolveParentNames(token, tasks);

  return { sprint, tasks, ...shared };
}

export async function searchTareas(token, query) {
  const pages = await queryDatabasePages(token, TAREAS_DB_ID, {
    filter: { property: 'TASK', title: { contains: query } },
    page_size: 20,
  });
  return pages.map((page) => {
    const { fields } = pageToFields(page);
    return { id: page.id, title: fields['TASK'] ?? 'Sin título', status: fields['Status'] ?? null };
  });
}

export async function moveTask(token, pageId, status) {
  if (!STATUS_COLUMNS.some((c) => c.id === status)) throw new Error(`Estado inválido: ${status}`);
  await updateNotionPageProperties(token, pageId, { Status: { status: { name: status } } });
}

async function requireSprint(token, sprintId) {
  if (!sprintId) throw new Error('No hay un sprint seleccionado.');
  const sprints = await listSprints(token);
  const sprint = sprints.find((s) => s.id === sprintId);
  if (!sprint) throw new Error('Ese sprint ya no existe.');
  return sprint;
}

export async function createTask(token, sprintId, { title, status, proyectoId, responsableId, priority, taskType, severity, iniciativaId }) {
  if (!title?.trim()) throw new Error('El título de la tarea es requerido.');
  const sprint = await requireSprint(token, sprintId);

  const properties = {
    TASK: { title: [{ text: { content: title.trim() } }] },
    Status: { status: { name: status && STATUS_COLUMNS.some((c) => c.id === status) ? status : STATUS_COLUMNS[0].id } },
    Origen: { select: { name: 'Creada por Aria' } },
    Sprint: { relation: [{ id: sprint.id }] },
  };
  if (proyectoId) properties['Proyectos'] = { relation: [{ id: proyectoId }] };
  if (responsableId) properties['Responsable (Talento)'] = { relation: [{ id: responsableId }] };
  if (priority) properties['Prioridad'] = { select: { name: priority } };
  if (taskType) properties['Tipo de Tarea'] = { select: { name: taskType } };
  if (severity) properties['Severidad'] = { select: { name: severity } };
  if (iniciativaId) properties['Iniciativa'] = { relation: [{ id: iniciativaId }] };
  if (sprint.status === 'En curso') properties['Fuera de plan'] = { checkbox: true };

  const page = await createNotionPage(token, TAREAS_DB_ID, properties);
  return page.id;
}

export async function addExistingTask(token, sprintId, pageId) {
  const sprint = await requireSprint(token, sprintId);

  const properties = { Sprint: { relation: [{ id: sprint.id }] } };
  if (sprint.status === 'En curso') properties['Fuera de plan'] = { checkbox: true };
  await updateNotionPageProperties(token, pageId, properties);
}

export async function removeTask(token, pageId) {
  await updateNotionPageProperties(token, pageId, {
    Sprint: { relation: [] },
    'Fuera de plan': { checkbox: false },
  });
}
