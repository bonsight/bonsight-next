import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const REGISTRY_KEY = 'labs:tenants';
const metaKey = (t) => `labs:${t}:meta`;

// Tipos de proyecto que existen en Labs — 'seguimiento' es el genérico tipo Basecamp
// (Cronograma + Documentación + Historia, sin Presupuesto) para clientes que no son obra
// civil pero igual necesitan seguimiento de tareas.
export const PROJECT_KINDS = [
  { id: 'experimental', label: 'Experimental' },
  { id: 'civil', label: 'Civil' },
  { id: 'seguimiento', label: 'Seguimiento' },
];

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

// allowedProjectKinds vacío/ausente = sin restricción (todos los tipos disponibles) — así
// los tenants que ya existían antes de esto no pierden acceso a nada.
export async function updateTenant(slug, { allowedProjectKinds }) {
  const meta = await getTenantMeta(slug);
  if (!meta) throw new Error('Tenant no encontrado.');
  const next = { ...meta };
  if (allowedProjectKinds !== undefined) {
    next.allowedProjectKinds = Array.isArray(allowedProjectKinds)
      ? allowedProjectKinds.filter((k) => PROJECT_KINDS.some((p) => p.id === k))
      : null;
  }
  await kv.set(metaKey(slug), next);
  return next;
}

export async function listTenants() {
  const slugs = await listTenantSlugs();
  const metas = await Promise.all(slugs.map((s) => getTenantMeta(s)));
  return metas.filter(Boolean);
}
