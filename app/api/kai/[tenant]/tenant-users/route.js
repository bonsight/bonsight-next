import { canManageTenantTeam } from '@/lib/kaiNext/auth';
import { listTenantUsers, createTenantUser, sanitizeTenantUser } from '@/lib/kai/tenantUsers';

export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await canManageTenantTeam(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const users = await listTenantUsers(tenant);
  return Response.json({ users: users.map((u) => sanitizeTenantUser(u)) });
}

export async function POST(req, { params }) {
  const { tenant } = await params;
  if (!(await canManageTenantTeam(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const { firstName, lastName, cargo, email, access, timezone } = await req.json();
  try {
    const user = await createTenantUser(tenant, { firstName, lastName, cargo, email, access, timezone });
    return Response.json({ ok: true, user: sanitizeTenantUser(user) });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo crear.' }, { status: 400 });
  }
}
