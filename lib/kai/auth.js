import { createHash } from 'crypto';
import { cookies } from 'next/headers';

export async function isKaiAuthorized() {
  const expected = createHash('sha256').update(process.env.KAI_ACCESS_CODE || '').digest('hex');
  const cookieStore = await cookies();
  return cookieStore.get('kai_auth')?.value === expected;
}

export async function isTenantAuthorized(tenant, accessCode) {
  if (!accessCode) return true; // no access code set → open
  const cookieStore = await cookies();
  const expected = createHash('sha256').update(accessCode).digest('hex');
  return cookieStore.get(`kai_auth_${tenant}`)?.value === expected;
}

export async function isKaiOrTenantAuthorized(tenant, accessCode) {
  return (await isKaiAuthorized()) || (await isTenantAuthorized(tenant, accessCode));
}

// For routes that don't have accessCode at hand — loads it lazily from meta
export async function isAuthorizedForTenant(tenant) {
  if (await isKaiAuthorized()) return true;
  const { getTenantMeta } = await import('@/lib/kai/tenants');
  const meta = await getTenantMeta(tenant);
  if (!meta?.accessCode) return true; // tenant abierto (sin accessCode) → libre
  const cookieStore = await cookies();
  const tenantCookie = cookieStore.get(`kai_auth_${tenant}`)?.value;
  if (!tenantCookie) return false;
  const expected = createHash('sha256').update(meta.accessCode).digest('hex');
  return tenantCookie === expected;
}
