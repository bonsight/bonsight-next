import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// "Sus" tareas en Proyectos de Desarrollo, para un Team member: las que tiene a cargo o en las
// que colabora, o las que creó y todavía no tienen responsable. Cada tarea guarda createdBy;
// este hash es el registro anterior (de cuando las tareas vivían en Notion) y solo lo lee la
// migración.
const creatorsKey = (tenant) => `kainext:${tenant}:dev_task_creators`;

// Una tarea "sin empezar" (un Team member puede borrarla si la creó él).
const NOT_STARTED = new Set(['Backlog', 'Not started']);

export async function getDevTaskCreators(tenant, pageIds) {
  const ids = [...new Set(pageIds)].filter(Boolean);
  if (!ids.length) return {};
  return (await kv.hmget(creatorsKey(tenant), ...ids)) ?? {};
}

export function isOwnDevTask({ responsableId, colaboradorIds = [], createdBy }, personId) {
  if (!personId) return false;
  if (responsableId === personId || colaboradorIds.includes(personId)) return true;
  return !responsableId && createdBy === personId;
}

export function canDeleteOwnDevTask({ status, actualHours, createdBy }, personId) {
  return !!personId && createdBy === personId && NOT_STARTED.has(status) && !(Number(actualHours) > 0);
}
