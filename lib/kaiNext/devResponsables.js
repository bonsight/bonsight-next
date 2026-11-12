import { listTenantUsers } from '@/lib/kai/tenantUsers';

// Responsables y colaboradores de Proyectos de Desarrollo: personas del Equipo de Kai (roster del
// tenant), guardadas por su id. Antes vivían en la base Talento de Notion y se enlazaban por
// nombre; findTalentoMatch queda solo para la migración desde Notion.
const ROSTER_PREFIX = 'roster:';

function normalizeName(name) {
  return String(name ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

// Exacto primero. Si no, mismo apellido final y un primer nombre que sea abreviatura del otro
// (Rafa/Rafael). Un nombre suelto ("Jhon") nunca se enlaza por aproximación.
export function findTalentoMatch(name, talentoList) {
  const target = normalizeName(name);
  if (!target) return null;
  const exact = talentoList.find((t) => normalizeName(t.name) === target);
  if (exact) return exact;
  const parts = target.split(' ');
  if (parts.length < 2) return null;
  return talentoList.find((t) => {
    const other = normalizeName(t.name).split(' ');
    if (other.length < 2 || other.at(-1) !== parts.at(-1)) return false;
    const [shorter, longer] = [parts[0], other[0]].sort((a, b) => a.length - b.length);
    return shorter.length >= 3 && longer.startsWith(shorter);
  }) ?? null;
}

export async function listEquipoOptions(tenant) {
  const users = await listTenantUsers(tenant);
  return users
    .filter((u) => u.active !== false && u.name?.trim())
    .map((u) => ({ id: u.id, name: u.name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

// Valida que el id sea de alguien del Equipo. Acepta el formato viejo "roster:<id>".
export async function resolveResponsableId(tenant, value) {
  if (!value) return null;
  const id = String(value).startsWith(ROSTER_PREFIX) ? String(value).slice(ROSTER_PREFIX.length) : String(value);
  const users = await listTenantUsers(tenant);
  if (!users.some((u) => u.id === id)) throw new Error('Esa persona no está en el equipo.');
  return id;
}

export async function resolveColaboradorIds(tenant, values) {
  const users = new Set((await listTenantUsers(tenant)).map((u) => u.id));
  return [...new Set((values ?? []).map((v) => (String(v).startsWith(ROSTER_PREFIX) ? String(v).slice(ROSTER_PREFIX.length) : String(v))))]
    .filter((id) => users.has(id));
}
