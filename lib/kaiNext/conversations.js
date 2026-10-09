import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// CRUD mínimo de chats para el MVP — sin checkpoints ni tracking de área (eso es de Kai
// legacy). Namespace Redis kainext: separado del de Kai/Aria.
const conversationsKey = (t) => `kainext:${t}:conversations`;
const messagesKey = (t, id) => `kainext:${t}:conversation:${id}:messages`;
const metaKey = (t, id) => `kainext:${t}:conversation:${id}:meta`;

// `activeRef` (opcional) = { type: 'learning'|'eje', refId, label } — viaja desde un activador
// de la página Empresa (ver KaiNextEmpresa.jsx, ?ref=...) para que el system prompt de esta
// conversación sepa qué ítem se está trabajando y pueda llamar mark_resolved si el usuario
// confirma que ya quedó resuelto. Ver lib/kai/resolutions.js.
export async function createConversation(tenant, owner, activeRef = null) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const meta = { id, title: 'Nuevo chat', owner: owner || null, createdAt: now, updatedAt: now, activeRef };
  await Promise.all([
    kv.set(metaKey(tenant, id), meta),
    kv.set(messagesKey(tenant, id), []),
    kv.zadd(conversationsKey(tenant), { score: Date.now(), member: id }),
  ]);
  return { id, meta };
}

export async function getConversation(tenant, id) {
  const [meta, messages] = await Promise.all([
    kv.get(metaKey(tenant, id)),
    kv.get(messagesKey(tenant, id)),
  ]);
  if (!meta) return null;
  return { meta, messages: messages ?? [] };
}

// Legado: antes de separar por persona, toda conversación se creaba con este owner fijo — se
// queda visible para todos (nadie pierde su historial viejo), pero una conversación NUEVA ya
// nace con el chatOwnerId real de quien la empieza (ver getCurrentKaiNextIdentity) y solo esa
// persona la ve de ahí en más. Mismo criterio que "legado queda, lo nuevo arranca scoped" ya
// usado para Sprints por proyecto.
const LEGACY_OWNER = 'bonsight-team';

// ownerId opcional: sin él, trae las últimas 50 conversaciones del tenant sin filtrar (compat
// con cualquier caller que todavía no resolvió identidad). Con él, filtra a las propias de esa
// persona + las legado compartidas.
export async function listConversations(tenant, ownerId) {
  const ids = await kv.zrange(conversationsKey(tenant), 0, -1, { rev: true });
  if (!ids.length) return [];
  const metas = await Promise.all(ids.map((id) => kv.get(metaKey(tenant, id))));
  const visible = metas.filter(Boolean).filter((m) => !ownerId || !m.owner || m.owner === ownerId || m.owner === LEGACY_OWNER);
  return visible.slice(0, 50);
}

export async function appendMessages(tenant, id, newMessages) {
  if (!id || !newMessages?.length) return;
  const existing = (await kv.get(messagesKey(tenant, id))) ?? [];
  await Promise.all([
    kv.set(messagesKey(tenant, id), [...existing, ...newMessages]),
    kv.zadd(conversationsKey(tenant), { score: Date.now(), member: id }),
  ]);
}

export async function deleteConversation(tenant, id) {
  await Promise.all([
    kv.zrem(conversationsKey(tenant), id),
    kv.del(metaKey(tenant, id)),
    kv.del(messagesKey(tenant, id)),
  ]);
}

export async function updateConversationTitle(tenant, id, title) {
  const current = (await kv.get(metaKey(tenant, id))) ?? { id };
  const meta = { ...current, title, updatedAt: new Date().toISOString() };
  await kv.set(metaKey(tenant, id), meta);
  return meta;
}
