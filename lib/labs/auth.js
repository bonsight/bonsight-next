import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

export async function isLabsAdminAuthorized() {
  const expected = createHash('sha256').update(process.env.LABS_ACCESS_CODE || '').digest('hex');
  const cookieStore = await cookies();
  return cookieStore.get('labs_auth')?.value === expected;
}

// El código de tenant se comparte entre todo el equipo del cliente (Registrador, Supervisor,
// Director) — no hay login por persona. Cada quien elige nombre+rol una vez adentro (ver
// experiments.js / join), y esa identidad se guarda en el navegador, no atrás de esta cookie.
export async function isTenantAuthorized(tenant, accessCode) {
  if (await isLabsAdminAuthorized()) return true;
  if (!accessCode) return false;
  const cookieStore = await cookies();
  const expected = createHash('sha256').update(accessCode).digest('hex');
  return cookieStore.get(`labs_auth_${tenant}`)?.value === expected;
}

// Para routes que no tienen el accessCode a mano — lo carga desde la meta del tenant.
export async function isAuthorizedForTenant(tenant) {
  if (await isLabsAdminAuthorized()) return true;
  const { getTenantMeta } = await import('@/lib/labs/tenants');
  const meta = await getTenantMeta(tenant);
  if (!meta?.accessCode) return false;
  return isTenantAuthorized(tenant, meta.accessCode);
}

// ── Sesión por persona (Registrador/Supervisor/Director) ───────────────────
// Reemplaza el auto-declare libre: cada persona entra con SU código individual
// (asignado por el admin en lib/labs/users.js), y el cookie que identifica quién
// es va firmado — así nadie puede editarlo a mano para hacerse pasar por Director.
function sessionSecret() {
  return process.env.LABS_ACCESS_CODE || '';
}

export function signLabsUser(tenant, userId) {
  const sig = createHmac('sha256', sessionSecret()).update(`${tenant}:${userId}`).digest('hex');
  return `${userId}.${sig}`;
}

export function verifyLabsUserToken(tenant, token) {
  if (!token) return null;
  const [userId, sig] = String(token).split('.');
  if (!userId || !sig) return null;
  const expected = createHmac('sha256', sessionSecret()).update(`${tenant}:${userId}`).digest('hex');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return userId;
}

// Relee siempre desde Redis (no solo del cookie) — así un cambio de rol o una
// desactivación hecha por el admin aplica en el próximo request, no recién cuando
// la persona vuelve a entrar su código.
export async function getCurrentLabsUser(tenant) {
  const cookieStore = await cookies();
  const token = cookieStore.get(`labs_user_${tenant}`)?.value;
  const userId = verifyLabsUserToken(tenant, token);
  if (!userId) return null;
  const { getUserById } = await import('@/lib/labs/users');
  return getUserById(tenant, userId);
}
