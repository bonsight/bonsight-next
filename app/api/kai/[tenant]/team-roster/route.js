// Auth de Kai Next, no la de Kai legacy: el único consumidor es Reuniones de Kai Next, y una
// persona con access.kaiNext pero sin access.kai recibía 401 y el picker se quedaba sin equipo.
import { isAuthorizedForTenant } from '@/lib/kaiNext/auth';
import { listTenantUsers } from '@/lib/kai/tenantUsers';

// A diferencia de /api/kai/[tenant]/tenant-users (gateado con isKaiAuthorized, admin global, y
// que expone credenciales), este endpoint es de solo lectura y lo puede pegar cualquier sesión
// de ESTE tenant — pensado para pickers de invitados (ver Meetings en Kai Next), nunca expone
// más que nombre/email/cargo.
export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const users = await listTenantUsers(tenant);
  const roster = users
    .filter((u) => u.active !== false && u.email)
    .map((u) => ({ id: u.id, name: u.name, email: u.email, cargo: u.cargo ?? null, timezone: u.timezone ?? null }));
  return Response.json({ roster });
}
