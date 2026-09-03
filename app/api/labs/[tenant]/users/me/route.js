import { isAuthorizedForTenant, getCurrentLabsUser } from '@/lib/labs/auth';
import { updateUser } from '@/lib/labs/users';

// Autoservicio: cualquier usuario logueado puede cambiar SU PROPIO nombre — a diferencia
// de /users/[userId] (admin-only, cualquier campo), acá solo se toca `name` y solo del
// usuario autenticado (no se puede editar rol ni a otra persona por acá).
export async function PATCH(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const currentUser = await getCurrentLabsUser(tenant);
  if (!currentUser) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) return Response.json({ error: 'El nombre no puede estar vacío.' }, { status: 400 });

  try {
    const user = await updateUser(tenant, currentUser.id, { name });
    return Response.json({ ok: true, user });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo actualizar el nombre.' }, { status: 400 });
  }
}
