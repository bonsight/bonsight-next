import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const key = (tenant, sprintId) => `aria:${tenant}:sprint_metrics:${sprintId}`;

// Foto congelada al momento del cierre — no se recalcula sola después, así la review
// de un sprint no cambia si alguien toca una tarea días más tarde.
export async function saveSprintMetrics(tenant, sprintId, metrics) {
  await kv.set(key(tenant, sprintId), metrics);
}

export async function getSprintMetrics(tenant, sprintId) {
  return kv.get(key(tenant, sprintId));
}
