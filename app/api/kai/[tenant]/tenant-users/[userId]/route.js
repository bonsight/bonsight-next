import { isKaiAuthorized } from '@/lib/kai/auth';
import {
  updateTenantUser, deleteTenantUser, resetTenantUserCredentials, setTenantUserCredentials, sanitizeTenantUser,
} from '@/lib/kai/tenantUsers';

export async function PATCH(req, { params }) {
  const { tenant, userId } = await params;
  if (!(await isKaiAuthorized())) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const { firstName, lastName, cargo, email, active, access, resetCredentials, setCredentials } = await req.json();
  try {
    if (resetCredentials) {
      const user = await resetTenantUserCredentials(tenant, userId);
      return Response.json({ ok: true, user: sanitizeTenantUser(user, { includeCredentials: true }) });
    }
    if (setCredentials) {
      const user = await setTenantUserCredentials(tenant, userId, setCredentials);
      return Response.json({ ok: true, user: sanitizeTenantUser(user, { includeCredentials: true }) });
    }
    const user = await updateTenantUser(tenant, userId, { firstName, lastName, cargo, email, active, access });
    return Response.json({ ok: true, user: sanitizeTenantUser(user, { includeCredentials: true }) });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo actualizar.' }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  const { tenant, userId } = await params;
  if (!(await isKaiAuthorized())) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  await deleteTenantUser(tenant, userId);
  return Response.json({ ok: true });
}
