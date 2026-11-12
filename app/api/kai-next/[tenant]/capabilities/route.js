import { isAuthorizedForTenant, getCurrentKaiNextAccess } from '@/lib/kaiNext/auth';
import { getCurrentTenantUser } from '@/lib/kai/tenantAuth';

// Rollout por PERSONA, no por tenant (ver lib/kaiNext/capabilities.js) — la config real vive en
// access.kaiNextSections/kaiNextCapabilities de cada tenant-user (se edita desde su fila en
// Equipo, no acá). Este endpoint solo resuelve y devuelve el acceso de QUIEN está pidiéndolo
// ahora mismo — se usa para decidir qué mostrar en la UI (nav, tiles, tools disponibles).
export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const [access, tenantUser] = await Promise.all([getCurrentKaiNextAccess(tenant), getCurrentTenantUser(tenant)]);
  // isAdmin decide si el menú muestra Admin (el equipo de Bonsight lo ve siempre por isTeamUser).
  return Response.json({ access, isAdmin: !!tenantUser?.access?.isAdmin });
}
