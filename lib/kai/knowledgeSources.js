import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const sourcesKey   = (t)     => `kai:${t}:knowledge_sources`;
const metaKey      = (t, id) => `kai:${t}:knowledge_source:${id}:meta`;
const contentKey   = (t, id) => `kai:${t}:knowledge_source:${id}:content`;
const rawKey       = (t, id) => `kai:${t}:knowledge_source:${id}:raw`;
const digestKey    = (t)     => `kai:${t}:knowledge:digest`;

const MAX_DIGEST_CHARS = 40000; // ~10k tokens

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export async function addSource(tenant, { sourceType, name, url = null, rawText = null, createdBy = 'admin', extraMeta = {} }) {
  const id = generateId();
  const meta = {
    id,
    sourceType,
    name,
    url,
    status: 'pending',
    createdAt: new Date().toISOString(),
    processedAt: null,
    lastError: null,
    createdBy,
    tokenEstimate: null,
    ...extraMeta,
  };
  const ops = [
    kv.zadd(sourcesKey(tenant), { score: Date.now(), member: id }),
    kv.set(metaKey(tenant, id), meta),
  ];
  if (rawText) ops.push(kv.set(rawKey(tenant, id), rawText));
  await Promise.all(ops);
  return meta;
}

export async function getSourceRaw(tenant, id) {
  return kv.get(rawKey(tenant, id));
}

export async function getSource(tenant, id) {
  return kv.get(metaKey(tenant, id));
}

export async function listSources(tenant) {
  const ids = await kv.zrange(sourcesKey(tenant), 0, -1, { rev: true });
  if (!ids.length) return [];
  const metas = await Promise.all(ids.map((id) => kv.get(metaKey(tenant, id))));
  return metas.filter(Boolean);
}

export async function updateSourceMeta(tenant, id, updates) {
  const meta = await getSource(tenant, id);
  if (!meta) return null;
  const updated = { ...meta, ...updates };
  await kv.set(metaKey(tenant, id), updated);
  return updated;
}

export async function saveSourceContent(tenant, id, content) {
  await kv.set(contentKey(tenant, id), content);
}

export async function getSourceContent(tenant, id) {
  return kv.get(contentKey(tenant, id));
}

export async function deleteSource(tenant, id) {
  await Promise.all([
    kv.zrem(sourcesKey(tenant), id),
    kv.del(metaKey(tenant, id)),
    kv.del(contentKey(tenant, id)),
    kv.del(rawKey(tenant, id)),
  ]);
}

export async function getKnowledgeDigest(tenant) {
  return kv.get(digestKey(tenant));
}

export async function rebuildDigest(tenant, consolidateFn = null) {
  const sources = await listSources(tenant);
  const ready = sources.filter((s) => s.status === 'ready');

  if (!ready.length) {
    await kv.del(digestKey(tenant));
    return null;
  }

  const contents = await Promise.all(ready.map((s) => getSourceContent(tenant, s.id)));

  const parts = ready
    .map((s, i) => {
      const content = contents[i];
      if (!content) return null;
      const date = s.processedAt
        ? new Date(s.processedAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })
        : null;
      return `[Fuente: ${s.name}${date ? ` · ${date}` : ''}]\n${content}`;
    })
    .filter(Boolean);

  let digest = parts.join('\n\n---\n\n');

  if (digest.length > MAX_DIGEST_CHARS) {
    if (consolidateFn) {
      digest = await consolidateFn(digest);
    } else {
      digest = digest.slice(0, MAX_DIGEST_CHARS);
    }
  }

  await kv.set(digestKey(tenant), digest);
  return digest;
}
