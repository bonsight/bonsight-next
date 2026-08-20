import { createHash } from 'crypto';
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
