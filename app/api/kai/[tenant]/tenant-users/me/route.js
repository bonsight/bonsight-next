import { getCurrentTenantUser, logoutTenantSession } from '@/lib/kai/tenantAuth';
import { changeTenantUserPassword, sanitizeTenantUser, setTenantUserNotifyEmail } from '@/lib/kai/tenantUsers';

// Autoservicio de la propia cuenta — compartido por Kai y Aria (mismo tenant-user, ver
// lib/kai/tenantUsers.js). Solo la propia contraseña (pidiendo la actual) y los avisos por correo;
// nunca acceso ni rol.
export async function GET(req, { params }) {
  const { tenant } = await params;
  const currentUser = await getCurrentTenantUser(tenant);
  if (!currentUser) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  return Response.json({ notifyEmail: currentUser.notifyEmail !== false, email: currentUser.email ?? null });
}

export async function PATCH(req, { params }) {
  const { tenant } = await params;
  const currentUser = await getCurrentTenantUser(tenant);
  if (!currentUser) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (typeof body.notifyEmail === 'boolean') {
    try {
      const user = await setTenantUserNotifyEmail(tenant, currentUser.id, body.notifyEmail);
      return Response.json({ ok: true, notifyEmail: user.notifyEmail !== false });
    } catch (err) {
      return Response.json({ error: err.message || 'No se pudo actualizar.' }, { status: 400 });
    }
  }
  const { currentPassword, newPassword } = body;
  try {
    const user = await changeTenantUserPassword(tenant, currentUser.id, { currentPassword, newPassword });
    return Response.json({ ok: true, user: sanitizeTenantUser(user) });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo actualizar.' }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  const { tenant } = await params;
  await logoutTenantSession(tenant);
  return Response.json({ ok: true });
}
