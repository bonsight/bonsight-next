import { isLabsAdminAuthorized } from '@/lib/labs/auth';
import { updateUser, deleteUser, resetUserCredentials, sanitizeUser } from '@/lib/labs/users';

export async function PATCH(req, { params }) {
  const { tenant, userId } = await params;
  if (!(await isLabsAdminAuthorized())) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const { name, role, active, email, resetCredentials } = await req.json();
  try {
    // Recuperación manual: nuevo código + borra usuario/contraseña, vuelve a quedar en
    // estado "primer login". No se combina con el resto de los campos en la misma llamada.
    if (resetCredentials) {
      const user = await resetUserCredentials(tenant, userId);
      return Response.json({ ok: true, user: sanitizeUser(user, { includeCredentials: true }) });
    }
    const user = await updateUser(tenant, userId, { name, role, active, email });
    return Response.json({ ok: true, user: sanitizeUser(user, { includeCredentials: true }) });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo actualizar.' }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  const { tenant, userId } = await params;
  if (!(await isLabsAdminAuthorized())) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  await deleteUser(tenant, userId);
  return Response.json({ ok: true });
}
