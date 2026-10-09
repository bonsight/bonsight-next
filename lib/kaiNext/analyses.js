import { Redis } from '@upstash/redis';

const kv = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });

// Índice liviano para la galería de "Análisis" — el payload completo de present_analysis vive
// en el mensaje de la conversación (igual que Aria guarda `presentation` en el mensaje, ver
// lib/aria/memory.js), acá solo se indexa lo necesario para listar sin tener que releer todas
// las conversaciones enteras cada vez. Namespace propio (kainext:), no toca datos de Aria.
const indexKey = (tenant) => `kainext:${tenant}:analyses`;
const entryKey = (tenant, id) => `kainext:${tenant}:analysis:${id}`;

export async function indexAnalysis(tenant, { conversationId, messageIndex, viewId, summary, createdAt }) {
  const id = `${conversationId}:${messageIndex}`;
  const entry = { id, conversationId, messageIndex, viewId: viewId || null, summary: summary || null, createdAt };
  await Promise.all([
    kv.set(entryKey(tenant, id), entry),
    kv.zadd(indexKey(tenant), { score: new Date(createdAt).getTime(), member: id }),
  ]);
  return entry;
}

export async function listAnalyses(tenant, limit = 50) {
  const ids = await kv.zrange(indexKey(tenant), 0, limit - 1, { rev: true });
  if (!ids.length) return [];
  const entries = await Promise.all(ids.map((id) => kv.get(entryKey(tenant, id))));
  return entries.filter(Boolean);
}

export async function deleteAnalysisIndexEntry(tenant, id) {
  await Promise.all([
    kv.zrem(indexKey(tenant), id),
    kv.del(entryKey(tenant, id)),
  ]);
}

// Cuando se borra una conversación entera (ver deleteConversation), cualquier análisis indexado
// que apuntara a ella queda huérfano — se limpia acá para que la galería no muestre links rotos.
export async function deleteAnalysesForConversation(tenant, conversationId) {
  const all = await listAnalyses(tenant, 1000);
  const orphaned = all.filter((a) => a.conversationId === conversationId);
  await Promise.all(orphaned.map((a) => deleteAnalysisIndexEntry(tenant, a.id)));
}
