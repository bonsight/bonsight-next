import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const key = (tenant) => `kai:${tenant}:known_participants`;

export function normalizeId(name) {
  return String(name)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function extractNameFromMessage(text) {
  if (!text || typeof text !== 'string') return null;
  const clean = text
    .replace(/^(soy|me llamo|mi nombre es|hola[,\s]*soy|buenas[,\s]*soy)\s+/i, '')
    .replace(/[,;.!?]\s*[\s\S]+$/, '')
    .trim();
  if (
    clean.length >= 2 &&
    clean.length <= 50 &&
    /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]/i.test(clean) &&
    !clean.includes('?') &&
    clean.split(/\s+/).length <= 5
  ) {
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  return null;
}

export async function getKnownParticipants(tenant) {
  return (await kv.get(key(tenant))) ?? [];
}

export async function addOrUpdateKnownParticipant(tenant, { name, role }) {
  const existing = await getKnownParticipants(tenant);
  const id = normalizeId(name);
  const idx = existing.findIndex((p) => p.id === id);
  const entry = { id, name, role: role ?? null };
  const updated = idx >= 0
    ? existing.map((p, i) => (i === idx ? { ...p, ...entry } : p))
    : [...existing, entry];
  await kv.set(key(tenant), updated);
}

// Called from regenerateAllArtifacts to keep the store in sync.
// Deduplicates by first name — keeps the most complete (longest) name.
export async function syncKnownParticipants(tenant, participants) {
  if (!participants?.length) return;

  // Group all names by normalized first name, keep the longest/most complete one
  const byFirstName = new Map();
  for (const p of participants) {
    const name = p.participant ?? p.name;
    if (!name) continue;
    const firstKey = name.split(/\s+/)[0].toLowerCase();
    const existing = byFirstName.get(firstKey);
    if (!existing || name.length > existing.name.length) {
      byFirstName.set(firstKey, {
        id:   normalizeId(name),
        name,
        role: p.role ?? existing?.role ?? null,
      });
    } else if (!existing.role && p.role) {
      existing.role = p.role;
    }
  }

  await kv.set(key(tenant), [...byFirstName.values()]);
}

// Returns array of matches (empty if none)
export function findParticipantMatches(knownParticipants, inputName) {
  if (!inputName || !knownParticipants?.length) return [];
  const inputFirst = inputName.split(/\s+/)[0].toLowerCase();
  return knownParticipants.filter(
    (p) => p.name.split(/\s+/)[0].toLowerCase() === inputFirst
  );
}
