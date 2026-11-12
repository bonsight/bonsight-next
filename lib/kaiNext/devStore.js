import { Redis } from '@upstash/redis';
import { randomBytes } from 'crypto';
import { listTenantUsers } from '@/lib/kai/tenantUsers';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// Proyectos de Desarrollo viven en Kai (Redis), ya no en Notion. Cada colección es un hash por
// proyecto (campo = id, valor = el objeto), así dos personas moviendo tareas distintas al mismo
// tiempo no se pisan entre sí, como pasaría con una lista que se lee, se cambia y se reescribe.
// Lo migrado desde Notion conserva su id original (UUID de Notion): así siguen funcionando las
// referencias que ya apuntaban a esos ids (commits formalizados, reuniones, creadores).
const k = (tenant, projectId, col) => `kainext:${tenant}:dev:${projectId}:${col}`;

export const STATUS_COLUMNS = [
  { id: 'Backlog', name: 'Backlog' },
  { id: 'Not started', name: 'Por hacer' },
  { id: 'In progress', name: 'En curso' },
  { id: 'In Review', name: 'En revisión' },
  { id: 'Done', name: 'Hecho' },
];
const STATUS_IDS = new Set(STATUS_COLUMNS.map((c) => c.id));
const DEFAULT_STATUS = 'Not started';
export const TASK_TYPES = ['Desarrollo', 'Soporte', 'Bug', 'Mejora', 'Reunión'];
export const SEVERITIES = ['Crítica', 'Alta', 'Media', 'Baja'];
export const FASE_OPTIONS = ['Preparación', 'Análisis', 'Diseño', 'Desarrollo', 'Pruebas', 'Producción', 'Monitoreo y Cierre'];
export const FASE_COLORS = {
  'Preparación': '#9CA3AF', 'Análisis': '#A47148', 'Diseño': '#A78BFA', 'Desarrollo': '#60A5FA',
  'Pruebas': '#FBBF24', 'Producción': '#34D399', 'Monitoreo y Cierre': '#6B7280',
};

const newId = (prefix) => `${prefix}_${Date.now().toString(36)}${randomBytes(4).toString('hex')}`;
const now = () => new Date().toISOString();
const clean = (s) => (typeof s === 'string' ? s.trim() : s);
const numOrNull = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));

async function all(tenant, projectId, col) {
  const h = await kv.hgetall(k(tenant, projectId, col));
  return h ? Object.values(h) : [];
}
async function one(tenant, projectId, col, id) {
  if (!id) return null;
  return (await kv.hget(k(tenant, projectId, col), id)) ?? null;
}
async function put(tenant, projectId, col, obj) {
  await kv.hset(k(tenant, projectId, col), { [obj.id]: obj });
  return obj;
}
async function del(tenant, projectId, col, id) {
  await kv.hdel(k(tenant, projectId, col), id);
}

// Escritura masiva (migración): en tandas para no armar un pedido gigante.
export async function putMany(tenant, projectId, col, objs) {
  for (let i = 0; i < objs.length; i += 50) {
    const chunk = Object.fromEntries(objs.slice(i, i + 50).map((o) => [o.id, o]));
    if (Object.keys(chunk).length) await kv.hset(k(tenant, projectId, col), chunk);
  }
}

export async function hasDevData(tenant, projectId) {
  const counts = await Promise.all(['iniciativas', 'tasks', 'sprints'].map((c) => kv.hlen(k(tenant, projectId, c))));
  return counts.some((n) => n > 0);
}

export async function clearDevData(tenant, projectId) {
  await kv.del(...['iniciativas', 'epicas', 'tasks', 'sprints'].map((c) => k(tenant, projectId, c)));
}

function checkRange(startDate, endDate, label = 'La fecha de fin no puede ser anterior a la de inicio.') {
  if (startDate && endDate && endDate < startDate) throw new Error(label);
}

// ── Iniciativas ──────────────────────────────────────────────────────────────

export async function listIniciativas(tenant, projectId) {
  const list = await all(tenant, projectId, 'iniciativas');
  return list.sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));
}

export async function createIniciativa(tenant, projectId, { name, startDate, endDate, objetivo }) {
  if (!clean(name)) throw new Error('El nombre de la iniciativa es requerido.');
  checkRange(startDate, endDate);
  return put(tenant, projectId, 'iniciativas', {
    id: newId('ini'), name: clean(name), objetivo: clean(objetivo) || '', estado: null,
    startDate: startDate || null, endDate: endDate || null, createdAt: now(),
  });
}

export async function updateIniciativa(tenant, projectId, id, patch) {
  const ini = await one(tenant, projectId, 'iniciativas', id);
  if (!ini) throw new Error('Iniciativa no encontrada.');
  const next = { ...ini };
  if (patch.name !== undefined) {
    if (!clean(patch.name)) throw new Error('El nombre de la iniciativa es requerido.');
    next.name = clean(patch.name);
  }
  if (patch.startDate !== undefined) next.startDate = patch.startDate || null;
  if (patch.endDate !== undefined) next.endDate = patch.endDate || null;
  checkRange(next.startDate, next.endDate);
  return put(tenant, projectId, 'iniciativas', next);
}

// La carga con Kai solo completa el objetivo si la iniciativa no tenía uno, nunca lo pisa.
export async function setIniciativaObjetivoIfEmpty(tenant, projectId, id, objetivo) {
  const ini = await one(tenant, projectId, 'iniciativas', id);
  if (!ini || !clean(objetivo) || clean(ini.objetivo)) return;
  await put(tenant, projectId, 'iniciativas', { ...ini, objetivo: clean(objetivo) });
}

export async function deleteIniciativa(tenant, projectId, id) {
  const epicas = (await all(tenant, projectId, 'epicas')).filter((e) => e.iniciativaId === id);
  if (epicas.length) {
    throw new Error(`Esta iniciativa todavía tiene ${epicas.length} épica${epicas.length !== 1 ? 's' : ''}. Muévelas o elimínalas antes de borrarla.`);
  }
  await del(tenant, projectId, 'iniciativas', id);
}

// ── Épicas ───────────────────────────────────────────────────────────────────

export async function listEpicas(tenant, projectId, iniciativaId) {
  const list = await all(tenant, projectId, 'epicas');
  return (iniciativaId ? list.filter((e) => e.iniciativaId === iniciativaId) : list)
    .sort((a, b) => (a.startDate ?? '9999').localeCompare(b.startDate ?? '9999') || (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));
}

export async function getEpica(tenant, projectId, id) {
  return one(tenant, projectId, 'epicas', id);
}

export async function createEpica(tenant, projectId, { name, iniciativaId, fase, startDate, endDate, notas }) {
  if (!clean(name)) throw new Error('El nombre de la épica es requerido.');
  if (!iniciativaId || !(await one(tenant, projectId, 'iniciativas', iniciativaId))) throw new Error('La épica necesita una iniciativa de este proyecto.');
  checkRange(startDate, endDate);
  return put(tenant, projectId, 'epicas', {
    id: newId('epi'), name: clean(name), iniciativaId,
    fase: FASE_OPTIONS.includes(fase) ? fase : null,
    startDate: startDate || null, endDate: endDate || null,
    notas: clean(notas) || null, entregables: [], createdAt: now(),
  });
}

export async function updateEpica(tenant, projectId, id, patch) {
  const epica = await one(tenant, projectId, 'epicas', id);
  if (!epica) throw new Error('Épica no encontrada.');
  const next = { ...epica };
  if (patch.name !== undefined) {
    if (!clean(patch.name)) throw new Error('El nombre no puede quedar vacío.');
    next.name = clean(patch.name);
  }
  if (patch.fase !== undefined) next.fase = FASE_OPTIONS.includes(patch.fase) ? patch.fase : null;
  if (patch.startDate !== undefined) next.startDate = patch.startDate || null;
  if (patch.endDate !== undefined) next.endDate = patch.endDate || null;
  if (patch.notas !== undefined) next.notas = clean(patch.notas) || null;
  if (patch.entregables !== undefined) next.entregables = Array.isArray(patch.entregables) ? patch.entregables : [];
  checkRange(next.startDate, next.endDate);
  return put(tenant, projectId, 'epicas', next);
}

export async function deleteEpica(tenant, projectId, id) {
  const tareas = (await all(tenant, projectId, 'tasks')).filter((t) => t.epicaId === id);
  if (tareas.length) {
    throw new Error(`Esta épica todavía tiene ${tareas.length} historia${tareas.length !== 1 ? 's' : ''}. Muévelas o elimínalas antes de borrarla.`);
  }
  await del(tenant, projectId, 'epicas', id);
}

// Para el Roadmap: iniciativas con sus épicas.
export async function getRoadmap(tenant, projectId) {
  const [iniciativas, epicas] = await Promise.all([listIniciativas(tenant, projectId), listEpicas(tenant, projectId)]);
  return { iniciativas: iniciativas.map((ini) => ({ ...ini, epicas: epicas.filter((e) => e.iniciativaId === ini.id) })) };
}

// ── Sprints ──────────────────────────────────────────────────────────────────

function sprintWithTotals(sprint, tasks) {
  const mine = tasks.filter((t) => t.sprintId === sprint.id);
  const sum = (field) => mine.reduce((s, t) => s + (Number(t[field]) || 0), 0);
  return { ...sprint, committedHours: sum('estimatedHours'), loggedHours: sum('actualHours'), totalTasks: mine.length };
}

export async function listSprints(tenant, projectId, rawTasks) {
  const [sprints, tasks] = await Promise.all([
    all(tenant, projectId, 'sprints'),
    rawTasks ? Promise.resolve(rawTasks) : all(tenant, projectId, 'tasks'),
  ]);
  return sprints.map((s) => sprintWithTotals(s, tasks)).sort((a, b) => (b.number ?? 0) - (a.number ?? 0));
}

export async function getSprint(tenant, projectId, id) {
  return one(tenant, projectId, 'sprints', id);
}

// Cuando no se pide uno puntual: el "En curso" gana; si no hay, el "Planificado" más reciente.
function resolveDefaultSprint(sprints) {
  const activos = sprints.filter((s) => s.status !== 'Cerrado');
  return activos.find((s) => s.status === 'En curso')
    ?? [...activos].sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''))[0]
    ?? null;
}

export async function createSprint(tenant, projectId, { startDate, endDate, objetivo }) {
  if (!startDate || !endDate) throw new Error('Fecha de inicio y fin son requeridas.');
  checkRange(startDate, endDate);
  const sprints = await all(tenant, projectId, 'sprints');
  const number = Math.max(0, ...sprints.map((s) => s.number ?? 0)) + 1;
  return put(tenant, projectId, 'sprints', {
    id: newId('spr'), number, title: `Sprint #${number}`, status: 'Planificado',
    objetivo: clean(objetivo) || null, startDate, endDate, createdAt: now(),
  });
}

async function setSprintFields(tenant, projectId, id, fields) {
  const sprint = await one(tenant, projectId, 'sprints', id);
  if (!sprint) throw new Error('Ese sprint ya no existe.');
  return put(tenant, projectId, 'sprints', { ...sprint, ...fields });
}

export const closeSprintPlanning = (tenant, projectId, id) => setSprintFields(tenant, projectId, id, { status: 'En curso' });
export const closeSprint = (tenant, projectId, id) => setSprintFields(tenant, projectId, id, { status: 'Cerrado', closedAt: now() });
export async function updateSprintDates(tenant, projectId, id, { startDate, endDate }) {
  if (!startDate || !endDate) throw new Error('Fecha de inicio y fin son requeridas.');
  checkRange(startDate, endDate);
  return setSprintFields(tenant, projectId, id, { startDate, endDate });
}

// ── Tareas ───────────────────────────────────────────────────────────────────

// Lo que guarda Redis → lo que consumen las pantallas (mismo formato que antes daba Notion):
// nombres de personas desde el Equipo de Kai, hijos y padre resueltos, historial de sprints.
async function enrich(tenant, projectId, rawTasks, { iniciativas, sprints } = {}) {
  const [users, inis, sprs] = await Promise.all([
    listTenantUsers(tenant),
    iniciativas ? Promise.resolve(iniciativas) : all(tenant, projectId, 'iniciativas'),
    sprints ? Promise.resolve(sprints) : all(tenant, projectId, 'sprints'),
  ]);
  const userName = new Map(users.map((u) => [u.id, u.name || u.email || 'Sin nombre']));
  const iniName = new Map(inis.map((i) => [i.id, i.name]));
  const sprintTitle = new Map(sprs.map((s) => [s.id, s.title]));
  const byId = new Map(rawTasks.map((t) => [t.id, t]));
  const childrenOf = new Map();
  for (const t of rawTasks) {
    if (!t.parentId) continue;
    if (!childrenOf.has(t.parentId)) childrenOf.set(t.parentId, []);
    childrenOf.get(t.parentId).push(t);
  }
  return rawTasks.map((t) => {
    const children = (childrenOf.get(t.id) ?? []).map((c) => ({ id: c.id, title: c.title, status: c.status }));
    const doneChildren = children.filter((c) => c.status === 'Done').length;
    const history = t.sprintHistory ?? [];
    const colaboradorIds = t.colaboradorIds ?? [];
    return {
      ...t,
      url: null,
      dueDate: t.endDate ?? null,
      responsableName: t.responsableId ? userName.get(t.responsableId) ?? t.responsableLegacyName ?? null : t.responsableLegacyName ?? null,
      colaboradorIds,
      colaboradores: [
        ...colaboradorIds.map((id) => ({ id, name: userName.get(id) })).filter((c) => c.name),
        ...(t.colaboradoresLegacyNames ?? []).map((name) => ({ id: `legacy:${name}`, name })),
      ],
      iniciativaName: t.iniciativaId ? iniName.get(t.iniciativaId) ?? null : null,
      parentName: t.parentId ? byId.get(t.parentId)?.title ?? null : null,
      sprintIds: t.sprintId ? [t.sprintId] : [],
      childIds: children.map((c) => c.id),
      children,
      childrenDoneCount: doneChildren,
      childrenPct: children.length ? Math.round((doneChildren / children.length) * 100) : null,
      previousSprintTitle: history.length > 1 ? sprintTitle.get(history[history.length - 2].sprintId) ?? history[history.length - 2].title ?? null : null,
      draggedCount: t.draggedCount ?? 0,
    };
  });
}

export async function listTasks(tenant, projectId) {
  return enrich(tenant, projectId, await all(tenant, projectId, 'tasks'));
}

export async function listTasksByEpica(tenant, projectId, epicaId) {
  const raw = await all(tenant, projectId, 'tasks');
  const enriched = await enrich(tenant, projectId, raw);
  return enriched.filter((t) => t.epicaId === epicaId);
}

export async function getTask(tenant, projectId, id) {
  return one(tenant, projectId, 'tasks', id);
}

// Tablero de un sprint (o el activo), con la lista de sprints del proyecto.
export async function getBoardData(tenant, projectId, { sprintId, sprintNumber } = {}) {
  const [raw, iniciativas, rawSprints] = await Promise.all([
    all(tenant, projectId, 'tasks'), all(tenant, projectId, 'iniciativas'), all(tenant, projectId, 'sprints'),
  ]);
  const sprints = rawSprints.map((s) => sprintWithTotals(s, raw)).sort((a, b) => (b.number ?? 0) - (a.number ?? 0));
  let sprint;
  if (sprintId) sprint = sprints.find((s) => s.id === sprintId) ?? null;
  else if (sprintNumber) sprint = sprints.find((s) => s.number === Number(sprintNumber)) ?? null;
  else sprint = resolveDefaultSprint(sprints);
  const shared = { sprints, columns: STATUS_COLUMNS, typeColumns: TASK_TYPES, iniciativas };
  if (!sprint) return { sprint: null, tasks: [], ...shared };
  const tasks = await enrich(tenant, projectId, raw, { iniciativas, sprints: rawSprints });
  return { sprint, tasks: tasks.filter((t) => t.sprintId === sprint.id), ...shared };
}

// Fechas de compromiso dentro del rango del sprint: bloqueo duro, igual que antes.
function validateWithinSprint(sprint, startDate, endDate) {
  if (startDate && endDate && startDate > endDate) throw new Error('La fecha de inicio no puede ser posterior a la de fin.');
  if (!sprint?.startDate || !sprint?.endDate) return;
  if (startDate && (startDate < sprint.startDate || startDate > sprint.endDate)) {
    throw new Error(`La fecha de compromiso de esta tarea en el sprint actual está fuera de rango (${sprint.startDate} – ${sprint.endDate}). Ajústala o vuelve a asignarla al sprint.`);
  }
  if (endDate && (endDate < sprint.startDate || endDate > sprint.endDate)) {
    throw new Error(`El fin tiene que estar dentro del sprint (${sprint.startDate} – ${sprint.endDate}).`);
  }
}

async function openSprint(tenant, projectId, sprintId) {
  if (!sprintId) throw new Error('No hay un sprint seleccionado.');
  const sprint = await one(tenant, projectId, 'sprints', sprintId);
  if (!sprint) throw new Error('Ese sprint ya no existe.');
  if (sprint.status === 'Cerrado') throw new Error('Este sprint está cerrado: no se le pueden agregar tareas.');
  return sprint;
}

async function requireTask(tenant, projectId, id) {
  const task = await one(tenant, projectId, 'tasks', id);
  if (!task) throw new Error('Tarea no encontrada.');
  return task;
}

export async function createTask(tenant, projectId, {
  sprintId, title, status, responsableId, colaboradorIds, priority, taskType, severity,
  iniciativaId, epicaId, fase, parentId, startDate, endDate, estimatedHours, description, order, createdBy, origen,
}) {
  if (!clean(title)) throw new Error('El título de la tarea es requerido.');
  const effectiveStatus = STATUS_IDS.has(status) ? status : DEFAULT_STATUS;
  // Backlog es para lo que todavía no se planifica; fuera de ahí, agenda y esfuerzo son obligatorios.
  if (effectiveStatus !== 'Backlog') {
    if (!startDate) throw new Error('La fecha de inicio es requerida.');
    if (!endDate) throw new Error('La fecha de fin es requerida.');
    if (numOrNull(estimatedHours) == null) throw new Error('La estimación de horas es requerida.');
  }
  const sprint = sprintId ? await openSprint(tenant, projectId, sprintId) : null;
  if (sprint) validateWithinSprint(sprint, startDate || null, endDate || null);
  const at = now();
  return put(tenant, projectId, 'tasks', {
    id: newId('tsk'),
    title: clean(title),
    status: effectiveStatus,
    priority: priority || null,
    taskType: taskType || null,
    severity: severity || null,
    origen: origen || 'Kai',
    description: clean(description) || null,
    entregables: [],
    responsableId: responsableId || null,
    colaboradorIds: [...new Set(colaboradorIds ?? [])].filter((id) => id && id !== responsableId),
    iniciativaId: iniciativaId || null,
    epicaId: epicaId || null,
    fase: fase || null,
    parentId: parentId || null,
    sprintId: sprint?.id ?? null,
    sprintHistory: sprint ? [{ sprintId: sprint.id, title: sprint.title, action: 'creada', at }] : [],
    draggedCount: 0,
    outOfPlan: sprint?.status === 'En curso',
    startDate: startDate || null,
    committedStartDate: startDate || null,
    endDate: endDate || null,
    estimatedHours: numOrNull(estimatedHours),
    actualHours: null,
    order: typeof order === 'number' && !Number.isNaN(order) ? order : null,
    createdBy: createdBy || null,
    createdAt: at,
    updatedAt: at,
  });
}

async function save(tenant, projectId, task, fields) {
  return put(tenant, projectId, 'tasks', { ...task, ...fields, updatedAt: now() });
}

export async function moveTask(tenant, projectId, id, status, actualHours, order) {
  if (!STATUS_IDS.has(status)) throw new Error(`Estado inválido: ${status}`);
  const task = await requireTask(tenant, projectId, id);
  const fields = { status };
  if (order !== undefined && order !== null) fields.order = order;
  if (status !== 'Backlog') {
    const missing = [];
    if (!task.startDate) missing.push('fecha de inicio');
    if (!task.endDate) missing.push('fecha de fin');
    if (task.estimatedHours == null) missing.push('estimación de horas');
    if (missing.length) throw new Error(`Completa ${missing.join(', ')} antes de sacar esta tarea de Backlog.`);
  }
  if (status === 'Done') {
    const children = (await all(tenant, projectId, 'tasks')).filter((t) => t.parentId === id);
    if (children.some((c) => c.status !== 'Done')) {
      throw new Error('Esta tarea tiene subtareas sin terminar. Márcalas como Hecho antes de cerrar la tarea padre.');
    }
    const hours = numOrNull(actualHours) ?? task.actualHours;
    if (hours == null) throw new Error('Carga las horas reales antes de marcar la tarea como Hecho.');
    fields.actualHours = hours;
  }
  return save(tenant, projectId, task, fields);
}

export async function reorderTask(tenant, projectId, id, order) {
  if (typeof order !== 'number' || Number.isNaN(order)) throw new Error('order debe ser un número.');
  return save(tenant, projectId, await requireTask(tenant, projectId, id), { order });
}

export async function updateTaskResponsable(tenant, projectId, id, responsableId) {
  const task = await requireTask(tenant, projectId, id);
  return save(tenant, projectId, task, {
    responsableId: responsableId || null,
    responsableLegacyName: null,
    colaboradorIds: (task.colaboradorIds ?? []).filter((c) => c !== responsableId),
  });
}

export async function updateTaskColaboradores(tenant, projectId, id, colaboradorIds) {
  const task = await requireTask(tenant, projectId, id);
  return save(tenant, projectId, task, {
    colaboradorIds: [...new Set(colaboradorIds ?? [])].filter((c) => c && c !== task.responsableId),
    colaboradoresLegacyNames: [],
  });
}

export async function updateTaskActualHours(tenant, projectId, id, actualHours) {
  return save(tenant, projectId, await requireTask(tenant, projectId, id), { actualHours: numOrNull(actualHours) });
}

export async function updateTaskDetails(tenant, projectId, id, { title, description, taskType, priority, severity, entregables }) {
  const task = await requireTask(tenant, projectId, id);
  const fields = {};
  if (title !== undefined) {
    if (!clean(title)) throw new Error('El título no puede quedar vacío.');
    fields.title = clean(title);
  }
  if (description !== undefined) fields.description = description || null;
  if (taskType !== undefined) fields.taskType = taskType || null;
  if (priority !== undefined) fields.priority = priority || null;
  if (severity !== undefined) fields.severity = severity || null;
  if (entregables !== undefined) fields.entregables = Array.isArray(entregables) ? entregables : [];
  if (!Object.keys(fields).length) return task;
  return save(tenant, projectId, task, fields);
}

// Dentro de un sprint: la fecha comprometida y el fin tienen que caer en su rango.
export async function updateTaskSchedule(tenant, projectId, id, sprintId, { startDate, endDate, estimatedHours }) {
  const sprint = await getSprint(tenant, projectId, sprintId);
  if (!sprint) throw new Error('Ese sprint ya no existe.');
  validateWithinSprint(sprint, startDate || null, endDate || null);
  return save(tenant, projectId, await requireTask(tenant, projectId, id), {
    committedStartDate: startDate || null, endDate: endDate || null, estimatedHours: numOrNull(estimatedHours),
  });
}

// Sin sprint (por ejemplo, completar una tarea en Backlog antes de sacarla de ahí).
export async function updateTaskDatesAndHours(tenant, projectId, id, { startDate, endDate, estimatedHours }) {
  if (startDate && endDate && startDate > endDate) throw new Error('La fecha de inicio no puede ser posterior a la de fin.');
  return save(tenant, projectId, await requireTask(tenant, projectId, id), {
    startDate: startDate || null, endDate: endDate || null, estimatedHours: numOrNull(estimatedHours),
  });
}

// Pasar una tarea a un sprint. Si venía de otro, cuenta como arrastre. La fecha comprometida se
// reinicia al inicio del sprint destino, y si el sprint ya está en curso, entra "fuera de plan".
export async function assignTaskToSprint(tenant, projectId, sprintId, id) {
  const [sprint, task] = await Promise.all([openSprint(tenant, projectId, sprintId), requireTask(tenant, projectId, id)]);
  if (task.sprintId === sprint.id) return task;
  return save(tenant, projectId, task, {
    sprintId: sprint.id,
    outOfPlan: sprint.status === 'En curso',
    committedStartDate: sprint.startDate ?? null,
    draggedCount: (task.draggedCount ?? 0) + (task.sprintId ? 1 : 0),
    sprintHistory: [...(task.sprintHistory ?? []), { sprintId: sprint.id, title: sprint.title, action: 'movida', at: now() }],
  });
}

export async function assignTasksToSprint(tenant, projectId, sprintId, ids) {
  const results = await Promise.allSettled(ids.map((id) => assignTaskToSprint(tenant, projectId, sprintId, id)));
  const failed = results
    .map((r, i) => (r.status === 'rejected' ? { pageId: ids[i], error: r.reason?.message ?? 'Error desconocido' } : null))
    .filter(Boolean);
  return { moved: ids.length - failed.length, failed };
}

// Borra la tarea. Sus subtareas no se pierden: quedan como tareas sueltas de la misma épica.
export async function deleteTask(tenant, projectId, id) {
  const task = await requireTask(tenant, projectId, id);
  const children = (await all(tenant, projectId, 'tasks')).filter((t) => t.parentId === id);
  for (const c of children) await save(tenant, projectId, c, { parentId: null });
  await del(tenant, projectId, 'tasks', id);
  return task;
}

// Métricas de cierre de un sprint (foto congelada al cerrar). Mismo cálculo que antes.
export function computeSprintMetrics(sprint, tasks) {
  const summarize = (list) => ({ total: list.length, completadas: list.filter((t) => t.status === 'Done').length });
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
  return {
    sprintId: sprint.id,
    sprintTitle: sprint.title,
    closedAt: now(),
    committed: summarize(tasks.filter((t) => !t.outOfPlan)),
    scopeCreep: summarize(tasks.filter((t) => t.outOfPlan)),
    committedHours: sprint.committedHours,
    loggedHours: sprint.loggedHours,
    byType,
    byResponsable,
    byCliente: {},
  };
}
