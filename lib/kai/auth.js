import { isBonsightTeamAuthorized } from '@/lib/team/auth';
import { getCurrentTenantUser } from '@/lib/kai/tenantAuth';

// Login único de Bonsight (lib/team/auth.js) — reemplaza KAI_ACCESS_CODE como puerta de /admin.
export async function isKaiAuthorized() {
  return isBonsightTeamAuthorized();
}

// Sesión de una persona del cliente para ESTE tenant, con acceso habilitado a Kai
// específicamente (ver lib/kai/tenantUsers.js — el mismo roster también sirve Aria, el flag
// `access.kai` es lo que decide si esta persona entra a Kai).
export async function isTenantAuthorized(tenant) {
  const user = await getCurrentTenantUser(tenant);
  return !!user?.access?.kai;
}

export async function isKaiOrTenantAuthorized(tenant) {
  return (await isKaiAuthorized()) || (await isTenantAuthorized(tenant));
}

// Para routes que necesitan "¿esta persona puede tocar este tenant en Kai?" sin distinguir
// admin de Bonsight vs. cliente — mismo criterio que isKaiOrTenantAuthorized.
export async function isAuthorizedForTenant(tenant) {
  return isKaiOrTenantAuthorized(tenant);
}
