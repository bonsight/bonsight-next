import { isAuthorizedForTenant } from '@/lib/aria/auth';
import { isBonsightTeamAuthorized } from '@/lib/team/auth';
import { getCurrentTenantUser } from '@/lib/kai/tenantAuth';
import { listInvestigations, createInvestigation } from '@/lib/aria/memory';

// El owner ya no viene del query param que mandaba el cliente (?usr=..., fácil de falsear) —
// se deriva acá de la sesión real. Un admin de Bonsight ve todo el tenant sin filtrar ('ALL');
// una persona del cliente solo ve las suyas.
async function resolveOwner(tenant) {
  if (await isBonsightTeamAuthorized()) return 'ALL';
  const user = await getCurrentTenantUser(tenant);
  return user?.id;
}

export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const owner = await resolveOwner(tenant);
  const investigations = await listInvestigations(tenant, owner);
  return Response.json({ investigations });
}

export async function POST(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const owner = await resolveOwner(tenant);
  const { id, meta } = await createInvestigation(tenant, owner === 'ALL' ? undefined : owner);
  return Response.json({ id, meta });
}
