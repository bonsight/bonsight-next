import { createHash } from 'crypto';
import { cookies } from 'next/headers';
import { getTenantMeta } from '@/lib/kai/tenants';
import { isBonsightTeamAuthorized } from '@/lib/team/auth';

// Login único de Bonsight (lib/team/auth.js) — reemplaza ARIA_ACCESS_CODE como puerta de /admin.
export async function isAuthorized() {
  return isBonsightTeamAuthorized();
}

export async function isAuthorizedForTenant(tenant) {
  if (await isBonsightTeamAuthorized()) return true;
  const cookieStore = await cookies();
  // Per-tenant cookie
  const meta = await getTenantMeta(tenant);
  if (!meta?.accessCode) return true;
  const tenantExpected = createHash('sha256').update(meta.accessCode).digest('hex');
  return cookieStore.get(`aria_auth_${tenant}`)?.value === tenantExpected;
}
