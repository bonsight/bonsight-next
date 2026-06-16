import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const KEY_PREFIX = 'aria';
export const BUSINESS_ID = 'bonsight';

function investigationsIndexKey(businessId) {
  return `${KEY_PREFIX}:${businessId}:investigations`;
}

function investigationMetaKey(businessId, id) {
  return `${KEY_PREFIX}:${businessId}:investigation:${id}:meta`;
}

function investigationMessagesKey(businessId, id) {
  return `${KEY_PREFIX}:${businessId}:investigation:${id}:messages`;
}

function metricsKey(businessId) {
  return `${KEY_PREFIX}:${businessId}:metrics`;
}

const METRICS_HISTORY_LIMIT = 2000;

function defaultMeta(id) {
  const now = new Date().toISOString();
  return {
    id,
    titulo: 'Nueva investigación',
    emoji: '🔍',
    area: 'General',
    estado: 'abierta',
    resumen_sesion: '',
    nuevos_insights: [],
    decisiones_confirmadas: [],
    preguntas_abiertas: [],
    objetivos_actualizados: [],
    sugerencia_proxima_sesion: '',
    createdAt: now,
    updatedAt: now,
  };
}

export async function listInvestigations(businessId) {
  const ids = await kv.zrange(investigationsIndexKey(businessId), 0, -1, { rev: true });
  if (!ids.length) return [];
  const metas = await Promise.all(ids.map((id) => kv.get(investigationMetaKey(businessId, id))));
  return metas.filter(Boolean);
}

export async function createInvestigation(businessId) {
  const id = crypto.randomUUID();
  const meta = defaultMeta(id);

  await Promise.all([
    kv.set(investigationMetaKey(businessId, id), meta),
    kv.set(investigationMessagesKey(businessId, id), []),
    kv.zadd(investigationsIndexKey(businessId), { score: Date.now(), member: id }),
  ]);

  return { id, meta };
}

export async function getInvestigation(businessId, id) {
  const [meta, messages] = await Promise.all([
    kv.get(investigationMetaKey(businessId, id)),
    kv.get(investigationMessagesKey(businessId, id)),
  ]);
  if (!meta) return null;
  return { meta, messages: messages ?? [] };
}

export async function getInvestigationMeta(businessId, id) {
  if (!id) return null;
  return (await kv.get(investigationMetaKey(businessId, id))) ?? null;
}

export async function updateInvestigationMeta(businessId, id, updates) {
  if (!id) return { ok: false, error: 'Missing investigation id' };

  const current = (await kv.get(investigationMetaKey(businessId, id))) ?? defaultMeta(id);
  const meta = { ...current, ...updates, id, updatedAt: new Date().toISOString() };

  await Promise.all([
    kv.set(investigationMetaKey(businessId, id), meta),
    kv.zadd(investigationsIndexKey(businessId), { score: Date.now(), member: id }),
  ]);

  return { ok: true, meta };
}

export async function appendInvestigationMessages(businessId, id, newMessages) {
  if (!id || !newMessages?.length) return;

  const [existing, meta] = await Promise.all([
    kv.get(investigationMessagesKey(businessId, id)),
    kv.get(investigationMetaKey(businessId, id)),
  ]);

  const updatedMessages = [...(existing ?? []), ...newMessages];
  const now = Date.now();

  await Promise.all([
    kv.set(investigationMessagesKey(businessId, id), updatedMessages),
    kv.zadd(investigationsIndexKey(businessId), { score: now, member: id }),
    meta ? kv.set(investigationMetaKey(businessId, id), { ...meta, updatedAt: new Date(now).toISOString() }) : Promise.resolve(),
  ]);
}

export async function recordAriaMetrics(businessId, metric) {
  try {
    const key = metricsKey(businessId);
    const entry = { ...metric, timestamp: new Date().toISOString() };
    await kv.lpush(key, entry);
    await kv.ltrim(key, 0, METRICS_HISTORY_LIMIT - 1);
    return { ok: true };
  } catch (err) {
    console.error('Aria metrics record error:', err);
    return { ok: false, error: err.message };
  }
}
