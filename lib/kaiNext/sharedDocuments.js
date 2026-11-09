import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// Documentos generados en un chat privado que su dueño decide compartir. El índice guarda solo
// metadatos y cada documento va en su propia clave, porque un Excel puede pesar mucho.
const indexKey = (tenant) => `kainext:${tenant}:shared_documents`;
const documentKey = (tenant, id) => `kainext:${tenant}:shared_document:${id}`;

const shareKey = (conversationId, title, format) => `${conversationId}:${format}:${title}`;

async function listIndex(tenant) {
  return (await kv.get(indexKey(tenant))) ?? [];
}

function isVisibleTo(share, identity) {
  if (share.sharedById && share.sharedById === identity.chatOwnerId) return false;
  if (share.audience.type === 'team') return true;
  return !!identity.personId && share.audience.personIds.includes(identity.personId);
}

export async function listSharesForConversation(tenant, conversationId) {
  return (await listIndex(tenant)).filter((s) => s.conversationId === conversationId);
}

// Compartir de nuevo el mismo documento cambia a quién llega, no crea una copia.
export async function saveShare(tenant, { conversationId, document, audience, identity }) {
  const index = await listIndex(tenant);
  const key = shareKey(conversationId, document.title, document.format);
  const existing = index.find((s) => s.key === key);
  const now = new Date().toISOString();
  const share = {
    id: existing?.id ?? crypto.randomUUID(),
    key,
    conversationId,
    title: document.title,
    format: document.format,
    audience,
    sharedById: identity.chatOwnerId,
    sharedByName: identity.personName,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await kv.set(documentKey(tenant, share.id), document);
  await kv.set(indexKey(tenant), [share, ...index.filter((s) => s.id !== share.id)]);
  return share;
}

export async function removeShare(tenant, id, identity) {
  const index = await listIndex(tenant);
  const share = index.find((s) => s.id === id);
  if (!share) throw new Error('Ese documento ya no está compartido.');
  if (share.sharedById !== identity.chatOwnerId) throw new Error('Solo quien compartió el documento puede dejar de compartirlo.');
  await Promise.all([
    kv.set(indexKey(tenant), index.filter((s) => s.id !== id)),
    kv.del(documentKey(tenant, id)),
  ]);
}

export async function listSharesVisibleTo(tenant, identity) {
  if (!identity.chatOwnerId) return [];
  return (await listIndex(tenant)).filter((s) => isVisibleTo(s, identity));
}

export async function getVisibleSharedDocument(tenant, id, identity) {
  const share = (await listIndex(tenant)).find((s) => s.id === id);
  if (!share || !isVisibleTo(share, identity)) return null;
  const document = await kv.get(documentKey(tenant, id));
  return document ? { share, document } : null;
}
