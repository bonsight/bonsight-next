import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// Formalizar = después de subir sus commits, el desarrollador los agrupa en Kai, elige las tareas
// que resuelven y valida el resumen y la descripción que propone Kai. Queda acá (no en el mensaje
// del commit, que no se reescribe una vez subido) y es lo que Kai usa para saber qué código se
// hizo para cada tarea.
const key = (tenant, projectId) => `kainext:${tenant}:commit_formalizations:${projectId}`;
const MAX_RECORDS = 1000;

const parse = (r) => (typeof r === 'string' ? JSON.parse(r) : r);

export async function listFormalizations(tenant, projectId, limit = MAX_RECORDS) {
  const rows = await kv.lrange(key(tenant, projectId), 0, Math.min(limit, MAX_RECORDS) - 1);
  return rows.map(parse);
}

export async function addFormalization(tenant, projectId, record) {
  const full = {
    id: `cf_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    ...record,
  };
  await kv.lpush(key(tenant, projectId), JSON.stringify(full));
  await kv.ltrim(key(tenant, projectId), 0, MAX_RECORDS - 1);
  return full;
}

// sha completo → formalización que lo incluye (la más reciente gana).
export function formalizationBySha(records) {
  const map = new Map();
  for (const r of [...records].reverse()) {
    for (const c of r.commits ?? []) map.set(c.sha, r);
  }
  return map;
}
