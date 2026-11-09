import { listTenantUsers, getTenantUserById } from '@/lib/kai/tenantUsers';
import { createTalento, reloadTalentoMap } from '@/lib/aria/board';

// Responsables de Proyectos de Desarrollo: el selector muestra el equipo del tenant (roster en
// Redis), pero la tarea sigue guardando una relación a la base Talento de Notion, que también
// lee Aria. Los dos registros no comparten ID, así que se enlazan por nombre. Quien todavía no
// exista en Talento viaja como `roster:<id>` y recibe su registro al asignarlo por primera vez.
const ROSTER_PREFIX = 'roster:';

function normalizeName(name) {
  return String(name ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

// Exacto primero. Si no, mismo apellido final y un primer nombre que sea abreviatura del otro
// (Rafa/Rafael). Un nombre suelto en Talento ("Jhon") nunca se enlaza por aproximación: sin
// apellido no hay forma de saber si es la misma persona.
function findTalentoMatch(name, talentoList) {
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

export async function listEquipoOptions(tenant, talentoEntries) {
  const talento = [...talentoEntries];
  const users = await listTenantUsers(tenant);
  return users
    .filter((u) => u.active !== false && u.name?.trim())
    .map((u) => ({ id: findTalentoMatch(u.name, talento)?.id ?? `${ROSTER_PREFIX}${u.id}`, name: u.name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

// Convierte el valor del selector en el ID de Talento que se guarda en la tarea. Relee Talento
// sin caché antes de crear, para no duplicar a alguien que se agregó hace unos segundos.
export async function resolveResponsableId(tenant, token, value) {
  if (!value || !String(value).startsWith(ROSTER_PREFIX)) return value || null;
  const user = await getTenantUserById(tenant, String(value).slice(ROSTER_PREFIX.length));
  if (!user) throw new Error('Esa persona ya no está en el equipo.');
  const talentoMap = await reloadTalentoMap(token);
  const match = findTalentoMatch(user.name, [...talentoMap.values()]);
  return match ? match.id : createTalento(token, user.name);
}

// En serie a propósito: dos personas nuevas en paralelo releerían Talento al mismo tiempo.
export async function resolveColaboradorIds(tenant, token, values) {
  const ids = [];
  for (const value of new Set(values ?? [])) {
    const id = await resolveResponsableId(tenant, token, value);
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}
