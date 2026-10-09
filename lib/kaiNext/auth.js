import { isBonsightTeamAuthorized, getCurrentTeamUser } from '@/lib/team/auth';
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
//
// `chatOwnerId` es un identificador aparte, solo para dueño de conversaciones de chat (ver
// lib/kaiNext/conversations.js) — a propósito NO reusa `personId` (que es siempre null para
// equipo Bonsight, por diseño: ese campo gatea visibilidad de Proyectos por tenant-user y no
// debe mezclarse con los ids del roster interno de Bonsight, de otro namespace). Prefijado con
// "team:" para que nunca choque con un id de tenant-user real.
export async function getCurrentKaiNextIdentity(tenant) {
  const teamUser = await getCurrentTeamUser();
  if (teamUser) {
    return {
      isTeamUser: true,
      personId: null,
      personName: teamUser.name || 'Equipo Bonsight',
      chatOwnerId: `team:${teamUser.id}`,
      access: { sections: [], capabilities: [] },
    };
  }
  const user = await getCurrentTenantUser(tenant);
  return {
    isTeamUser: false,
    personId: user?.id ?? null,
    personName: user ? (user.name || user.email || 'Alguien') : null,
    chatOwnerId: user?.id ?? null,
    access: {
      sections: user?.access?.kaiNextSections ?? [],
      capabilities: user?.access?.kaiNextCapabilities ?? [],
    },
  };
}
