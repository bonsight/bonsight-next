import { createHash } from 'crypto';
import { cookies } from 'next/headers';
import { getTenantMeta } from '@/lib/kai/tenants';

export async function isAuthorized() {
  const expected = createHash('sha256').update(process.env.ARIA_ACCESS_CODE || '').digest('hex');
  const cookieStore = await cookies();
  return cookieStore.get('aria_auth')?.value === expected;
}

export async function isAuthorizedForTenant(tenant) {
  const cookieStore = await cookies();
  // Global admin cookie
  const globalExpected = createHash('sha256').update(process.env.ARIA_ACCESS_CODE || '').digest('hex');
  if (cookieStore.get('aria_auth')?.value === globalExpected) return true;
  // Per-tenant cookie
  const meta = await getTenantMeta(tenant);
  if (!meta?.accessCode) return false;
  const tenantExpected = createHash('sha256').update(meta.accessCode).digest('hex');
  return cookieStore.get(`aria_auth_${tenant}`)?.value === tenantExpected;
}
