import { isAuthorizedForTenant, getCurrentLabsUser } from '@/lib/labs/auth';
import { updateUser, changeUserPassword, sanitizeUser } from '@/lib/labs/users';

// Autoservicio: cualquier usuario logueado puede cambiar SU PROPIO nombre/email/contraseña —
// a diferencia de /users/[userId] (admin-only, cualquier campo y sin pedir la contraseña
// actual), acá solo se toca la propia cuenta del usuario autenticado (nunca rol ni otra
// persona). El cambio de contraseña es su propia rama porque pide currentPassword, algo que
// no aplica a name/email.
export async function PATCH(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const currentUser = await getCurrentLabsUser(tenant);
  if (!currentUser) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  const { name, email, currentPassword, newPassword } = await req.json();

  try {
    if (newPassword !== undefined) {
      const user = await changeUserPassword(tenant, currentUser.id, { currentPassword, newPassword });
      return Response.json({ ok: true, user: sanitizeUser(user) });
    }
    if (name !== undefined && !name?.trim()) {
      return Response.json({ error: 'El nombre no puede estar vacío.' }, { status: 400 });
    }
    const user = await updateUser(tenant, currentUser.id, { name, email });
    return Response.json({ ok: true, user: sanitizeUser(user) });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo actualizar.' }, { status: 400 });
  }
}
