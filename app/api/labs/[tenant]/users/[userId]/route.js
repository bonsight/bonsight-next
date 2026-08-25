import { isLabsAdminAuthorized } from '@/lib/labs/auth';
import { updateUser, deleteUser } from '@/lib/labs/users';

export async function PATCH(req, { params }) {
  const { tenant, userId } = await params;
  if (!(await isLabsAdminAuthorized())) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const { name, role, active } = await req.json();
  try {
    const user = await updateUser(tenant, userId, { name, role, active });
    return Response.json({ ok: true, user });
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
