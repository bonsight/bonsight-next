import { Redis } from '@upstash/redis';

const kv = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
const key = (tenant) => `kai:${tenant}:resolved_items`;

// Ledger separado y aditivo — no toca el shape de learnings.js ni de diagnosis.js. Un ítem
// (aprendizaje o eje estratégico) se identifica por { type, ref }: para aprendizajes, ref es
// el id estable de lib/kai/learnings.js; para ejes (que no tienen id — se regeneran enteros
// cada vez), ref es el título exacto, y generateDiagnosis() lo usa para no repetirlos.
export async function listResolvedRefs(tenant) {
  return (await kv.get(key(tenant))) ?? [];
}

export async function markResolved(tenant, { type, ref, note } = {}) {
  if (!type || !ref) return listResolvedRefs(tenant);
  const list = await listResolvedRefs(tenant);
  if (list.some((r) => r.type === type && r.ref === ref)) return list;
  const next = [...list, { type, ref, note: note ?? null, resolvedAt: new Date().toISOString() }];
  await kv.set(key(tenant), next);
  return next;
}

export function isResolved(resolvedList, type, ref) {
  return (resolvedList ?? []).some((r) => r.type === type && r.ref === ref);
}
