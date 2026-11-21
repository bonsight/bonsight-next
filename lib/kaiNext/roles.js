import { Redis } from '@upstash/redis';
import { KAI_NEXT_SECTIONS, PROJECT_ROLES, PROJECT_ROLE_CAPS, NO_CAPABILITIES } from '@/lib/kaiNext/capabilities';

// Roles por tenant: cada tenant define los suyos (Sesuveca: Director/Supervisor/Registrador;
// Bonsight: Founder/Líder/Agile Coach/Desarrollador). Un rol es una PLANTILLA de lo que la
// persona puede hacer: al asignarlo se copian sus secciones/capacidades al access de la persona,
// que es lo que ya leen todas las rutas (ver lib/kaiNext/capabilities.js). Después se puede
// ajustar persona por persona; quien queda ajustada a mano (roleCustomized) deja de recibir los
// cambios que se le hagan al rol.
//
// El rol NO decide qué empresas ve la persona — eso son sus empresaIds (lib/kaiNext/empresas.js).
//
// admin: null (no entra al Admin) | 'team' (solo Equipo y Empresas) | 'full' (todo el Admin).
const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const rolesKey = (tenant) => `kai:${tenant}:roles`;

export const ADMIN_SCOPES = ['team', 'full'];
export const ALL_SECTION_IDS = KAI_NEXT_SECTIONS.map((s) => s.id);
export const ALL_CAPABILITY_IDS = KAI_NEXT_SECTIONS.flatMap((s) => s.capabilities.map((c) => c.id));

// Lo que tiene un tenant que nunca configuró roles: los tres niveles fijos de siempre. No se
// guardan en Redis hasta que alguien edite o cree un rol.
export function defaultRoles() {
  return PROJECT_ROLES.map((r) => ({
    id: r.id,
    name: r.label,
    description: r.description,
    active: true,
    sections: [...ALL_SECTION_IDS],
    capabilities: ALL_CAPABILITY_IDS.filter((c) => !PROJECT_ROLE_CAPS.includes(c) || r.caps.includes(c)),
    admin: null,
  }));
}

function generateId() {
  return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function normalize(role) {
  const sections = (role.sections ?? []).filter((s) => ALL_SECTION_IDS.includes(s));
  const capabilities = (role.capabilities ?? []).filter((c) => ALL_CAPABILITY_IDS.includes(c));
  return {
    ...role,
    name: String(role.name || '').trim().replace(/\s+/g, ' ').slice(0, 40),
    description: String(role.description || '').trim().slice(0, 200) || null,
    active: role.active !== false,
    sections,
    capabilities,
    admin: ADMIN_SCOPES.includes(role.admin) ? role.admin : null,
  };
}

export async function listRoles(tenant) {
  const stored = await kv.get(rolesKey(tenant));
  return Array.isArray(stored) && stored.length ? stored : defaultRoles();
}

export async function getRole(tenant, id) {
  return (await listRoles(tenant)).find((r) => r.id === id) ?? null;
}

function validate(role, list) {
  if (!role.name) throw new Error('El nombre del rol es requerido.');
  if (!role.sections.length) throw new Error('El rol tiene que tener al menos una sección.');
  if (list.some((r) => r.id !== role.id && r.name.toLowerCase() === role.name.toLowerCase())) {
    throw new Error('Ya existe un rol con ese nombre.');
  }
}

export async function createRole(tenant, input) {
  const list = await listRoles(tenant);
  const role = normalize({ ...input, id: generateId(), createdAt: new Date().toISOString() });
  validate(role, list);
  await kv.set(rolesKey(tenant), [...list, role]);
  return role;
}

export async function updateRole(tenant, id, input) {
  const list = await listRoles(tenant);
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error('Rol no encontrado.');
  const changes = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined));
  const role = normalize({ ...list[idx], ...changes, id });
  validate(role, list);
  list[idx] = role;
  await kv.set(rolesKey(tenant), list);
  return role;
}

// Lo que se escribe en tenantUser.access al asignar un rol. Una lista vacía de capacidades
// significa "sin restricción" en capabilities.js, por eso un rol sin ninguna guarda
// NO_CAPABILITIES — si no, terminaría con acceso total.
export function accessFromRole(role) {
  return {
    kaiNextSections: [...role.sections],
    kaiNextCapabilities: role.capabilities.length ? [...role.capabilities] : [NO_CAPABILITIES],
    isAdmin: !!role.admin,
    adminScope: role.admin,
  };
}

// ¿El access de la persona sigue siendo exactamente el del rol? Si no, quedó ajustada a mano.
export function matchesRole(access, role) {
  if (!role) return false;
  const want = accessFromRole(role);
  const same = (a = [], b = []) => a.length === b.length && [...a].sort().join() === [...b].sort().join();
  return same(access?.kaiNextSections, want.kaiNextSections)
    && same(access?.kaiNextCapabilities, want.kaiNextCapabilities)
    && !!access?.isAdmin === want.isAdmin
    && (access?.adminScope ?? null) === (want.adminScope ?? null);
}
