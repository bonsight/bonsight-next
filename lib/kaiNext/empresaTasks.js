import { Redis } from '@upstash/redis';
import { resolveTaskStatusChange } from '@/lib/kaiNext/projects';

// Tareas sueltas de una empresa: pendientes que no pertenecen a ningún proyecto (renovar un
// contrato, coordinar una auditoría…). Mismo formato de tarea que Proyectos (nombre,
// responsables, estado, fechas, horas) y siempre con revisión: una tarea terminada queda
// "En revisión" hasta que la valida un Director de la empresa o un Supervisor que no sea
// responsable de ella (ver resolveTaskStatusChange en lib/kaiNext/projects.js).
const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const tasksKey = (tenant, empresaId) => `kainext:${tenant}:empresa:${empresaId}:tasks`;
export const EMPRESA_TASK_STATUSES = ['todo', 'doing', 'review', 'done'];
export const EMPRESA_TASK_PRIORITIES = ['Alta', 'Media', 'Baja'];
const REVIEW_META = { requiresReview: true };

function generateId() {
  return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const cleanDate = (d) => (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d) ? d.slice(0, 10) : null);
const cleanHours = (h) => (h === '' || h === null || h === undefined || !Number.isFinite(Number(h)) ? null : Number(h));

export async function listEmpresaTasks(tenant, empresaId) {
  return (await kv.get(tasksKey(tenant, empresaId))) ?? [];
}

export async function createEmpresaTask(tenant, empresaId, input, { createdBy, canValidate, personId }) {
  const nombre = String(input.nombre || '').trim();
  if (!nombre) throw new Error('Escribe el nombre de la tarea.');
  const responsables = Array.isArray(input.responsables) ? input.responsables.filter((x) => typeof x === 'string') : [];
  const requested = EMPRESA_TASK_STATUSES.includes(input.status) ? input.status : 'todo';
  const resolved = resolveTaskStatusChange(REVIEW_META, { responsables }, requested, { canValidate, personId });
  if (resolved.error) throw new Error(resolved.error);
  const now = new Date().toISOString();
  const task = {
    id: generateId(),
    nombre: nombre.slice(0, 200),
    descripcion: String(input.descripcion || '').trim().slice(0, 4000),
    responsables,
    status: resolved.status,
    prioridad: EMPRESA_TASK_PRIORITIES.includes(input.prioridad) ? input.prioridad : 'Media',
    fechaInicio: cleanDate(input.fechaInicio),
    fechaFin: cleanDate(input.fechaFin),
    estimatedHours: cleanHours(input.estimatedHours),
    actualHours: cleanHours(input.actualHours),
    createdBy: createdBy ?? null,
    createdAt: now,
    updatedAt: now,
  };
  const list = await listEmpresaTasks(tenant, empresaId);
  await kv.set(tasksKey(tenant, empresaId), [task, ...list]);
  return task;
}

// Lo que puede cambiar quien no gestiona (responsable): estado, horas reales, descripción y su
// lugar en el tablero (order, ver lib/kaiNext/dragOrder.js).
const OWN_FIELDS = ['status', 'actualHours', 'descripcion', 'order'];

export async function updateEmpresaTask(tenant, empresaId, taskId, patch, { canManage, canValidate, personId, actor }) {
  const list = await listEmpresaTasks(tenant, empresaId);
  const idx = list.findIndex((t) => t.id === taskId);
  if (idx === -1) throw new Error('Tarea no encontrada.');
  const task = list[idx];
  const isResponsible = !!personId && task.responsables?.includes(personId);
  if (!canManage && !isResponsible) throw new Error('Solo puedes actualizar tus propias tareas.');
  const allowed = canManage ? null : new Set(OWN_FIELDS);
  const next = { ...task };
  const set = (field, value) => { if (patch[field] !== undefined && (!allowed || allowed.has(field))) next[field] = value; };

  set('nombre', String(patch.nombre ?? '').trim().slice(0, 200) || task.nombre);
  set('descripcion', String(patch.descripcion ?? '').trim().slice(0, 4000));
  set('responsables', Array.isArray(patch.responsables) ? patch.responsables.filter((x) => typeof x === 'string') : task.responsables);
  set('prioridad', EMPRESA_TASK_PRIORITIES.includes(patch.prioridad) ? patch.prioridad : task.prioridad);
  set('fechaInicio', cleanDate(patch.fechaInicio));
  set('fechaFin', cleanDate(patch.fechaFin));
  set('estimatedHours', cleanHours(patch.estimatedHours));
  set('actualHours', cleanHours(patch.actualHours));
  set('order', Number.isFinite(Number(patch.order)) && patch.order !== null ? Number(patch.order) : task.order ?? null);
  let sentToReview = false;
  let validated = false;
  if (patch.status !== undefined && patch.status !== task.status) {
    const resolved = resolveTaskStatusChange(REVIEW_META, next, patch.status, { canValidate, personId });
    if (resolved.error) throw new Error(resolved.error);
    next.status = resolved.status;
    sentToReview = resolved.status === 'review' && patch.status !== 'review';
    if (task.status === 'review' && next.status === 'done') { next.validatedBy = actor; next.validatedAt = new Date().toISOString(); validated = true; }
  }
  next.updatedAt = new Date().toISOString();
  list[idx] = next;
  await kv.set(tasksKey(tenant, empresaId), list);
  const addedResponsables = (next.responsables ?? []).filter((r) => !(task.responsables ?? []).includes(r));
  return { task: next, sentToReview, enteredReview: next.status === 'review' && task.status !== 'review', validated, addedResponsables };
}

export async function deleteEmpresaTask(tenant, empresaId, taskId) {
  const list = await listEmpresaTasks(tenant, empresaId);
  if (!list.some((t) => t.id === taskId)) throw new Error('Tarea no encontrada.');
  await kv.set(tasksKey(tenant, empresaId), list.filter((t) => t.id !== taskId));
}
