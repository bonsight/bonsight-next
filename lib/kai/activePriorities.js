import { Redis } from '@upstash/redis';

const kv = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
const key = (t) => `kai:${t}:active_priorities`;

export async function getActivePriorities(tenant) {
  return (await kv.get(key(tenant))) ?? [];
}

export async function setActivePriorities(tenant, priorities) {
  await kv.set(key(tenant), priorities);
  return priorities;
}
