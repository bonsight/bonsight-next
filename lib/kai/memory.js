import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const KEY_PREFIX = 'kai';

function conversationsKey(tenantId) {
  return `${KEY_PREFIX}:${tenantId}:conversations`;
}

function messagesKey(tenantId, id) {
  return `${KEY_PREFIX}:${tenantId}:conversation:${id}:messages`;
}

function metaKey(tenantId, id) {
  return `${KEY_PREFIX}:${tenantId}:conversation:${id}:meta`;
}

// owner: id de la persona (lib/kai/tenantUsers.js) que tuvo esta conversación — a diferencia
// de Aria, el chat de Kai no tiene un listado propio para el cliente (cada carga de página
// arranca charla nueva, sin resume), así que esto es solo atribución para el admin de Bonsight
// (ver ConversationsTab en TenantDetail.jsx), no un filtro de privacidad cliente-a-cliente.
export async function createConversation(tenantId, owner) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const meta = { id, title: 'Nueva consulta', owner: owner || null, createdAt: now, updatedAt: now };

  await Promise.all([
    kv.set(metaKey(tenantId, id), meta),
    kv.set(messagesKey(tenantId, id), []),
    kv.zadd(conversationsKey(tenantId), { score: Date.now(), member: id }),
  ]);

  return { id, meta };
}

export async function getConversation(tenantId, id) {
  const [meta, messages] = await Promise.all([
    kv.get(metaKey(tenantId, id)),
    kv.get(messagesKey(tenantId, id)),
  ]);
  if (!meta) return null;
  return { meta, messages: messages ?? [] };
}

export async function listConversations(tenantId) {
  const ids = await kv.zrange(conversationsKey(tenantId), 0, 19, { rev: true });
  if (!ids.length) return [];
  const metas = await Promise.all(ids.map((id) => kv.get(metaKey(tenantId, id))));
  return metas.filter(Boolean);
}

export async function appendMessages(tenantId, id, newMessages) {
  if (!id || !newMessages?.length) return;
  const existing = (await kv.get(messagesKey(tenantId, id))) ?? [];
  await Promise.all([
    kv.set(messagesKey(tenantId, id), [...existing, ...newMessages]),
    kv.zadd(conversationsKey(tenantId), { score: Date.now(), member: id }),
  ]);
}

export async function getConversationMessages(tenantId, id) {
  return (await kv.get(messagesKey(tenantId, id))) ?? [];
}

export async function updateMessageAt(tenantId, id, index, updates) {
  const messages = (await kv.get(messagesKey(tenantId, id))) ?? [];
  if (!messages[index]) throw new Error('Mensaje no encontrado.');
  messages[index] = { ...messages[index], ...updates };
  await kv.set(messagesKey(tenantId, id), messages);
  return messages[index];
}

export async function updateConversationTitle(tenantId, id, title) {
  const current = (await kv.get(metaKey(tenantId, id))) ?? { id };
  const meta = { ...current, title, updatedAt: new Date().toISOString() };
  await kv.set(metaKey(tenantId, id), meta);
  return meta;
}

export async function updateConversationMeta(tenantId, id, updates) {
  const current = (await kv.get(metaKey(tenantId, id))) ?? { id };
  await kv.set(metaKey(tenantId, id), { ...current, ...updates });
}

function checkpointKey(tenantId, id) {
  return `${KEY_PREFIX}:${tenantId}:conversation:${id}:checkpoint_summary`;
}

export async function saveConversationCheckpoint(tenantId, conversationId, checkpoint) {
  const key = checkpointKey(tenantId, conversationId);
  const existing = (await kv.get(key)) ?? { risks: [], opportunities: [], areas: [] };
  const risks        = [...new Set([...(existing.risks ?? []),        ...(checkpoint.risks ?? [])])];
  const opportunities = [...new Set([...(existing.opportunities ?? []), ...(checkpoint.opportunities ?? [])])];
  const areas        = [...new Set([...(existing.areas ?? []),        ...(checkpoint.area ? [checkpoint.area] : [])])];
  await kv.set(key, { risks, opportunities, areas });
}

export async function getConversationCheckpointSummary(tenantId, conversationId) {
  return await kv.get(checkpointKey(tenantId, conversationId));
}

export async function listAllConversations(tenantId) {
  const ids = await kv.zrange(conversationsKey(tenantId), 0, 199, { rev: true });
  if (!ids.length) return [];
  const metas = await Promise.all(ids.map((id) => kv.get(metaKey(tenantId, id))));
  return metas.filter(Boolean);
}
