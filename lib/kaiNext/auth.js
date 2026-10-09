import { isBonsightTeamAuthorized } from '@/lib/team/auth';
import { getCurrentTenantUser } from '@/lib/kai/tenantAuth';

// MVP: gateado solo al equipo interno de Bonsight (isBonsightTeamAuthorized). `access.kaiNext`
// ya se chequea acá para no tener que tocar este archivo cuando se habilite por persona más
// adelante — hoy ningún registro del roster tiene ese flag en true, así que el OR es inerte.
export async function isAuthorizedForTenant(tenant) {
  if (await isBonsightTeamAuthorized()) return true;
  const user = await getCurrentTenantUser(tenant);
  return !!user?.access?.kaiNext;
}

// Rollout por secciones/capacidades — ver lib/kaiNext/capabilities.js. Es por PERSONA, no por
// tenant: cada tenant-user trae su propio access.kaiNextSections/kaiNextCapabilities (el admin
// los edita desde la fila de esa persona en Equipo, no desde un toggle único del cliente). El
// equipo de Bonsight (team user) nunca queda restringido por esto — solo aplica a personas del
// cliente (tenant users).
export async function getCurrentKaiNextAccess(tenant) {
  if (await isBonsightTeamAuthorized()) return { sections: [], capabilities: [] };
  const user = await getCurrentTenantUser(tenant);
  return {
    sections: user?.access?.kaiNextSections ?? [],
    capabilities: user?.access?.kaiNextCapabilities ?? [],
  };
}

// Igual que getCurrentKaiNextAccess pero además trae isTeamUser/personId — lo necesitan features
// con visibilidad por PERSONA (no solo on/off por capacidad), como Proyectos: para saber si un
// proyecto es "mío" hace falta el id real del tenant-user actual, no solo su access.
export async function getCurrentKaiNextIdentity(tenant) {
  const isTeamUser = await isBonsightTeamAuthorized();
  if (isTeamUser) return { isTeamUser: true, personId: null, personName: 'Equipo Bonsight', access: { sections: [], capabilities: [] } };
  const user = await getCurrentTenantUser(tenant);
  return {
    isTeamUser: false,
    personId: user?.id ?? null,
    personName: user ? (user.name || user.email || 'Alguien') : null,
    access: {
      sections: user?.access?.kaiNextSections ?? [],
      capabilities: user?.access?.kaiNextCapabilities ?? [],
    },
  };
}
