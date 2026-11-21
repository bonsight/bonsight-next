import { Redis } from '@upstash/redis';

// Empresas: nivel opcional entre el tenant y sus proyectos (ej. Grupo Sesuveca → Induminorte,
// Labinorte…). Cada proyecto pertenece a una empresa (meta.empresaId) y cada persona tiene
// asignadas las suyas (tenantUser.empresaIds). El rol dice qué puede HACER; las empresas, qué
// puede VER — ser Director no da acceso a todas, hay que asignarlas.
//
// Es configurable por tenant: si un tenant no tiene empresas creadas, la capa no existe y nada
// cambia (getEmpresaScope devuelve null = sin restricción). El equipo interno de Bonsight
// (team user, sin personId) nunca queda restringido por empresa.
const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const empresasKey = (tenant) => `kai:${tenant}:empresas`;

// Colores en orden de creación — legibles sobre blanco y distinguibles entre sí. Se pueden
// cambiar después desde Admin › Empresas.
export const EMPRESA_COLORS = ['#0E7C5A', '#2F5FA8', '#7A3FB0', '#B45309', '#BE185D', '#0F766E', '#4D5BD6', '#A16207', '#64748B'];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function cleanName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ').slice(0, 60);
}

export async function listEmpresas(tenant) {
  return (await kv.get(empresasKey(tenant))) ?? [];
}

export async function hasEmpresas(tenant) {
  return (await listEmpresas(tenant)).length > 0;
}

export async function getEmpresa(tenant, id) {
  return (await listEmpresas(tenant)).find((e) => e.id === id) ?? null;
}

export async function createEmpresa(tenant, { name, color, description }) {
  const clean = cleanName(name);
  if (!clean) throw new Error('El nombre es requerido.');
  const list = await listEmpresas(tenant);
  if (list.some((e) => e.name.toLowerCase() === clean.toLowerCase())) {
    throw new Error('Ya existe una empresa con ese nombre.');
  }
  const empresa = {
    id: generateId(),
    name: clean,
    description: String(description || '').trim().slice(0, 200) || null,
    color: color || EMPRESA_COLORS[list.length % EMPRESA_COLORS.length],
    visible: true,
    createdAt: new Date().toISOString(),
  };
  await kv.set(empresasKey(tenant), [...list, empresa]);
  return empresa;
}

export async function updateEmpresa(tenant, id, { name, color, description, visible }) {
  const list = await listEmpresas(tenant);
  const idx = list.findIndex((e) => e.id === id);
  if (idx === -1) throw new Error('Empresa no encontrada.');
  const next = { ...list[idx] };
  if (name !== undefined) {
    const clean = cleanName(name);
    if (!clean) throw new Error('El nombre es requerido.');
    if (list.some((e) => e.id !== id && e.name.toLowerCase() === clean.toLowerCase())) {
      throw new Error('Ya existe una empresa con ese nombre.');
    }
    next.name = clean;
  }
  if (color !== undefined && /^#[0-9a-fA-F]{6}$/.test(color)) next.color = color;
  if (description !== undefined) next.description = String(description || '').trim().slice(0, 200) || null;
  if (visible !== undefined) next.visible = !!visible;
  list[idx] = next;
  await kv.set(empresasKey(tenant), list);
  return next;
}

// Solo se borra una empresa vacía — con proyectos o personas adentro, primero hay que moverlos,
// para que nadie pierda acceso ni un proyecto quede huérfano sin querer.
export async function deleteEmpresa(tenant, id, { projectCount = 0, peopleCount = 0 } = {}) {
  if (projectCount > 0) throw new Error('La empresa tiene proyectos: muévelos a otra empresa antes de eliminarla.');
  if (peopleCount > 0) throw new Error('La empresa tiene personas asignadas: quítasela antes de eliminarla.');
  const list = await listEmpresas(tenant);
  await kv.set(empresasKey(tenant), list.filter((e) => e.id !== id));
}

// Qué empresas puede ver una persona del cliente. null = sin restricción: tenant sin empresas,
// equipo de Bonsight sin tenant-user, o admin con acceso completo (quien configura todo, ve
// todo — ej. el Founder). Los admins de alcance 'team' (directores de Sesuveca) sí quedan
// limitados a sus empresas. Un array vacío = solo ve los proyectos que aún no tienen empresa.
export function empresaScopeFor(empresas, tenantUser) {
  if (!empresas?.length || !tenantUser) return null;
  if (tenantUser.access?.isAdmin && (tenantUser.access.adminScope || 'full') === 'full') return null;
  const valid = new Set(empresas.map((e) => e.id));
  return (tenantUser.empresaIds ?? []).filter((id) => valid.has(id));
}

export async function getEmpresaScope(tenant, tenantUser) {
  if (!tenantUser) return null;
  return empresaScopeFor(await listEmpresas(tenant), tenantUser);
}

// ¿Esta persona puede ver algo de la empresa del proyecto? Sin restricción → siempre sí. Un
// proyecto SIN empresa se rige solo por el rol, como antes de existir empresas: así activar la
// capa (crear la primera empresa) no esconde nada hasta que los proyectos se asignen. La
// empresa restringe solo a los proyectos que ya pertenecen a una.
export function empresaAllows(empresaIds, meta) {
  if (!Array.isArray(empresaIds)) return true;
  if (!meta?.empresaId) return true;
  return empresaIds.includes(meta.empresaId);
}
