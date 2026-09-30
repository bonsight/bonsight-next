import { isBonsightTeamAuthorized } from '@/lib/team/auth';
import { getCurrentTenantUser } from '@/lib/kai/tenantAuth';

export async function isAuthorized() {
  return isBonsightTeamAuthorized();
}

// Mismo roster que Kai (lib/kai/tenantUsers.js) — `access.aria` decide si esta persona puede
// entrar a Aria específicamente.
export async function isAuthorizedForTenant(tenant) {
  if (await isBonsightTeamAuthorized()) return true;
  const user = await getCurrentTenantUser(tenant);
  return !!user?.access?.aria;
}
