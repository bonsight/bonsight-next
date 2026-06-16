import { Redis } from '@upstash/redis';
import { CLIENT_PROFILE as DEFAULT_BONSIGHT_PROFILE } from './aria/clientProfile';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

function profileKey(tenantId) {
  return `business:${tenantId}:profile`;
}

function memoryKey(tenantId) {
  return `business:${tenantId}:memory`;
}

export async function getBusinessProfile(tenantId) {
  let profile = await kv.get(profileKey(tenantId));
  if (!profile && tenantId === 'bonsight') {
    profile = DEFAULT_BONSIGHT_PROFILE;
    await kv.set(profileKey(tenantId), profile);
  }
  return profile ?? null;
}

export async function setBusinessProfile(tenantId, data) {
  await kv.set(profileKey(tenantId), {
    ...data,
    tenantId,
    updatedAt: new Date().toISOString(),
  });
  return { ok: true };
}

export async function getBusinessMemory(tenantId) {
  return (await kv.get(memoryKey(tenantId))) ?? null;
}

export async function updateBusinessMemory(tenantId, updates) {
  const current = (await kv.get(memoryKey(tenantId))) ?? {};
  const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
  await kv.set(memoryKey(tenantId), updated);
  return { ok: true, memory: updated };
}
