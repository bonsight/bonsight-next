import { isBonsightTeamAuthorized, getCurrentTeamUser } from '@/lib/team/auth';
import { getCurrentTenantUser } from '@/lib/kai/tenantAuth';

// MVP: gateado solo al equipo interno de Bonsight (isBonsightTeamAuthorized). `access.kaiNext`
// ya se chequea acá para no tener que tocar este archivo cuando se habilite por persona más
// adelante — hoy ningún registro del roster tiene ese flag en true, así que el OR es inerte.
//
// Si ADEMÁS hay una sesión de tenant activa (alguien de equipo se logueó explícito como un
// tenant-user puntual, ej. para probar qué ve un cliente), esa identidad más específica manda —
// antes la de equipo ganaba siempre sin mirar si también había una sesión de tenant, dejando a
// esa persona actuando con permisos de equipo aunque la pantalla ya mostrara el nombre correcto
// (ver getCurrentKaiNextIdentity más abajo, mismo criterio).
export async function isAuthorizedForTenant(tenant) {
  const user = await getCurrentTenantUser(tenant);
  if (user) return !!user?.access?.kaiNext;
  return await isBonsightTeamAuthorized();
}

// Rollout por secciones/capacidades — ver lib/kaiNext/capabilities.js. Es por PERSONA, no por
// tenant: cada tenant-user trae su propio access.kaiNextSections/kaiNextCapabilities (el admin
// los edita desde la fila de esa persona en Equipo, no desde un toggle único del cliente). El
// equipo de Bonsight (team user) nunca queda restringido por esto — solo aplica a personas del
// cliente (tenant users).
export async function getCurrentKaiNextAccess(tenant) {
  const user = await getCurrentTenantUser(tenant);
  if (user) {
    return {
      sections: user?.access?.kaiNextSections ?? [],
      capabilities: user?.access?.kaiNextCapabilities ?? [],
    };
  }
  if (await isBonsightTeamAuthorized()) return { sections: [], capabilities: [] };
  return { sections: [], capabilities: [] };
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
  // Misma prioridad que isAuthorizedForTenant: una sesión de tenant activa (login explícito como
  // ese usuario) gana sobre la sesión global de equipo, en vez de ignorarla por completo.
  const [teamUser, user] = await Promise.all([getCurrentTeamUser(), getCurrentTenantUser(tenant)]);
  if (user) {
    return {
      isTeamUser: false,
      personId: user.id ?? null,
      personName: user.name || user.email || 'Alguien',
      personEmail: user.email ?? null,
      chatOwnerId: user.id ?? null,
      access: {
        sections: user?.access?.kaiNextSections ?? [],
        capabilities: user?.access?.kaiNextCapabilities ?? [],
      },
    };
  }
  if (teamUser) {
    return {
      isTeamUser: true,
      personId: null,
      personName: teamUser.name || 'Equipo Bonsight',
      personEmail: null, // el roster de equipo interno (lib/team/auth.js) no tiene email
      chatOwnerId: `team:${teamUser.id}`,
      access: { sections: [], capabilities: [] },
    };
  }
  return {
    isTeamUser: false,
    personId: null,
    personName: null,
    personEmail: null,
    chatOwnerId: null,
    access: { sections: [], capabilities: [] },
  };
}
