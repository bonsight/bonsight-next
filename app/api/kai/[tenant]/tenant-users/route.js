import { isKaiAuthorized } from '@/lib/kai/auth';
import { listTenantUsers, createTenantUser, sanitizeTenantUser } from '@/lib/kai/tenantUsers';

export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isKaiAuthorized())) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const users = await listTenantUsers(tenant);
  return Response.json({ users: users.map((u) => sanitizeTenantUser(u, { includeCredentials: true })) });
}

export async function POST(req, { params }) {
  const { tenant } = await params;
  if (!(await isKaiAuthorized())) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const { firstName, lastName, cargo, email, access } = await req.json();
  try {
    const user = await createTenantUser(tenant, { firstName, lastName, cargo, email, access });
    return Response.json({ ok: true, user: sanitizeTenantUser(user, { includeCredentials: true }) });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo crear.' }, { status: 400 });
  }
}
