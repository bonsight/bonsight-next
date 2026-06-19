import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const REGISTRY_KEY = 'kai:tenants';
const metaKey = (t) => `kai:${t}:meta`;
const profileKey = (t) => `kai:${t}:profile`;

export const EMPTY_PROFILE = {
  general: { industry: '', model: '', country: '', size: '', digitalMaturity: '' },
  objectives: { shortTerm: [], mediumTerm: [], longTerm: [] },
  pains: [],
  risks: [],
  opportunities: [],
  stakeholders: [],
  kpis: [],
};

export async function listTenantSlugs() {
  return (await kv.get(REGISTRY_KEY)) ?? [];
}

function generateAccessCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part()}-${part()}`;
}

export async function createTenant({ name, slug, country = '', industry = '', status = 'active' }) {
  const slugs = await listTenantSlugs();
  if (slugs.includes(slug)) throw new Error(`Tenant '${slug}' ya existe`);
  const meta = { name, slug, country, industry, status, accessCode: generateAccessCode(), createdAt: new Date().toISOString() };
  await Promise.all([
    kv.set(metaKey(slug), meta),
    kv.set(profileKey(slug), EMPTY_PROFILE),
    kv.set(REGISTRY_KEY, [...slugs, slug]),
  ]);
  return meta;
}

export async function getTenantMeta(slug) {
  return kv.get(metaKey(slug));
}

export async function getBusinessProfile(slug) {
  return (await kv.get(profileKey(slug))) ?? EMPTY_PROFILE;
}

export async function updateBusinessProfile(slug, updates) {
  const current = await getBusinessProfile(slug);
  const merged = deepMerge(current, updates);
  await kv.set(profileKey(slug), merged);
  return merged;
}

export async function getAllTenantsMeta() {
  const slugs = await listTenantSlugs();
  if (!slugs.length) return [];
  return (await Promise.all(slugs.map(getTenantMeta))).filter(Boolean);
}

function deepMerge(target, source) {
  const out = { ...target };
  for (const k of Object.keys(source ?? {})) {
    if (
      source[k] !== null &&
      typeof source[k] === 'object' &&
      !Array.isArray(source[k]) &&
      typeof target[k] === 'object' &&
      !Array.isArray(target[k])
    ) {
      out[k] = deepMerge(target[k], source[k]);
    } else {
      out[k] = source[k];
    }
  }
  return out;
}
