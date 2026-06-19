import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const key = (tenant) => `kai:${tenant}:learnings`;

const SIMILARITY_THRESHOLD = 0.78;

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Normalized edit-distance similarity (0–1). O(n·m) — fine for short strings.
function editDistance(s1, s2) {
  const len1 = s1.length, len2 = s2.length;
  const row = Array.from({ length: len2 + 1 }, (_, j) => j);
  for (let i = 1; i <= len1; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= len2; j++) {
      const tmp = row[j];
      row[j] = s1[i - 1] === s2[j - 1]
        ? prev
        : 1 + Math.min(prev, row[j - 1], row[j]);
      prev = tmp;
    }
  }
  return row[len2];
}

function stringSimilarity(a, b) {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  if (s1 === s2) return 1;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1;
  return (maxLen - editDistance(s1, s2)) / maxLen;
}

function isSemanticallyDuplicate(candidate, existing) {
  // Exact match (already in original code) or high string similarity in same area
  if (candidate.toLowerCase() === existing.content.toLowerCase()) return true;
  if (stringSimilarity(candidate, existing.content) >= SIMILARITY_THRESHOLD) return true;
  return false;
}

export async function addLearning(tenant, { content, impact = 'medio', confidence = 0.7, area = null, source = 'conversación', conversationId = null }) {
  const learning = {
    id: generateId(),
    content,
    impact,      // 'alto' | 'medio' | 'bajo'
    confidence,  // 0–1
    area,        // 'negocio' | 'operaciones' | 'tecnología' | 'finanzas' | 'marketing' | 'personas'
    source,      // 'conversación' | 'documento' | 'aria'
    conversationId: conversationId ?? null,
    createdAt: new Date().toISOString(),
  };
  const current = (await kv.get(key(tenant))) ?? [];
  const isDupe = current.some((l) => isSemanticallyDuplicate(content, l));
  if (isDupe) return null;
  await kv.set(key(tenant), [learning, ...current]);
  return learning;
}

export async function listLearnings(tenant) {
  return (await kv.get(key(tenant))) ?? [];
}

export async function deleteLearning(tenant, id) {
  const all = (await kv.get(key(tenant))) ?? [];
  await kv.set(key(tenant), all.filter((l) => l.id !== id));
}

// One-shot deduplication of existing learnings in Redis.
// Keeps the first occurrence of each near-duplicate cluster (oldest = most canonical).
export async function deduplicateLearnings(tenant) {
  const all = (await kv.get(key(tenant))) ?? [];
  // Process in reverse-chronological order (newest first already) — keep first, drop later dupes
  const kept = [];
  for (const l of all) {
    const isDupe = kept.some((k) => isSemanticallyDuplicate(l.content, k));
    if (!isDupe) kept.push(l);
  }
  await kv.set(key(tenant), kept);
  return { removed: all.length - kept.length, kept: kept.length, total_before: all.length };
}
