import { isAuthorizedForTenant } from '@/lib/kaiNext/auth';
import { listTenantUsers, sanitizeTenantUser } from '@/lib/kai/tenantUsers';

// Roster del tenant para pickers de Kai Next (Supervisores/Responsables de Proyectos) — mismo
// roster que ya comparten Kai y Aria (lib/kai/tenantUsers.js), sin credenciales.
export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const users = await listTenantUsers(tenant);
  return Response.json({ people: users.map((u) => sanitizeTenantUser(u)) });
}
