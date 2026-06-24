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
    tags: [],
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

export async function deleteInvestigation(businessId, id) {
  await Promise.all([
    kv.del(investigationMetaKey(businessId, id)),
    kv.del(investigationMessagesKey(businessId, id)),
    kv.zrem(investigationsIndexKey(businessId), id),
  ]);
  return { ok: true };
}

export async function searchArchivedInvestigations(businessId, query) {
  const all = await listInvestigations(businessId);
  const archived = all.filter((inv) => inv.estado === 'archivada');
  if (!archived.length) return [];

  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (!words.length) return [];

  const scored = archived
    .map((inv) => {
      const haystack = [
        inv.titulo,
        inv.area,
        inv.resumen_sesion,
        ...(inv.entities ?? []),
        ...(inv.tags ?? []),
        ...(inv.nuevos_insights ?? []),
        ...(inv.decisiones_confirmadas ?? []),
        ...(inv.preguntas_abiertas ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const score = words.reduce((acc, w) => acc + (haystack.includes(w) ? 1 : 0), 0);
      return { inv, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return scored.map(({ inv, score }) => ({
    id: inv.id,
    title: inv.titulo,
    emoji: inv.emoji ?? '🔍',
    date: new Date(inv.updatedAt || inv.createdAt).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
    }),
    tags: inv.tags ?? [],
    entities: inv.entities ?? [],
    summary: inv.resumen_sesion || '',
    area: inv.area ?? 'General',
    insights: inv.nuevos_insights ?? [],
    decisions: inv.decisiones_confirmadas ?? [],
    relevance: score >= 3 ? 'high' : score >= 2 ? 'medium' : 'low',
  }));
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
