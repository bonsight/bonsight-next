import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const REGISTRY_KEY = 'labs:tenants';
const metaKey = (t) => `labs:${t}:meta`;

export async function listTenantSlugs() {
  return (await kv.get(REGISTRY_KEY)) ?? [];
}

function generateAccessCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part()}-${part()}`;
}

export async function createTenant({ name, slug }) {
  const slugs = await listTenantSlugs();
  if (slugs.includes(slug)) throw new Error(`Tenant '${slug}' ya existe en Labs`);
  const meta = { name, slug, accessCode: generateAccessCode(), createdAt: new Date().toISOString() };
  await Promise.all([
    kv.set(metaKey(slug), meta),
    kv.set(REGISTRY_KEY, [...slugs, slug]),
  ]);
  return meta;
}

export async function getTenantMeta(slug) {
  return kv.get(metaKey(slug));
}

export async function listTenants() {
  const slugs = await listTenantSlugs();
  const metas = await Promise.all(slugs.map((s) => getTenantMeta(s)));
  return metas.filter(Boolean);
}
