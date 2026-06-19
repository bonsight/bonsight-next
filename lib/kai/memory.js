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

export async function createConversation(tenantId) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const meta = { id, title: 'Nueva consulta', createdAt: now, updatedAt: now };

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

export async function updateConversationTitle(tenantId, id, title) {
  const current = (await kv.get(metaKey(tenantId, id))) ?? { id };
  const meta = { ...current, title, updatedAt: new Date().toISOString() };
  await kv.set(metaKey(tenantId, id), meta);
  return meta;
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
