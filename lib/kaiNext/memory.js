import { Redis } from '@upstash/redis';
import { deepMerge } from '@/lib/shared/deepMerge';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// Namespace Redis propio (kainext:) — separado a propósito del de Kai actual (kai:). No es el
// Business Profile de Kai legacy ni su schema: es un blob chico y nuevo, pensado solo para lo
// que el MVP necesita recordar entre conversaciones.
const memoryKey = (tenant) => `kainext:${tenant}:memory`;

export const EMPTY_MEMORY = { facts: {}, updatedAt: null };

export async function getKaiNextMemory(tenant) {
  return (await kv.get(memoryKey(tenant))) ?? EMPTY_MEMORY;
}

export async function updateKaiNextMemory(tenant, updates) {
  const current = await getKaiNextMemory(tenant);
  const merged = { ...deepMerge(current, updates), updatedAt: new Date().toISOString() };
  await kv.set(memoryKey(tenant), merged);
  return merged;
}

export function formatMemoryForPrompt(memory) {
  const entries = Object.entries(memory?.facts ?? {});
  if (!entries.length) return 'Sin datos guardados todavía.';
  return entries.map(([k, v]) => `- ${k}: ${v}`).join('\n');
}
