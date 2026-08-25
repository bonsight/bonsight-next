import { isAuthorizedForTenant, getCurrentLabsUser } from '@/lib/labs/auth';
import { getExperimentMeta, setTestRegistradores } from '@/lib/labs/experiments';
import { getUserById } from '@/lib/labs/users';

// Reasignar Registradores de una prueba ya creada — mismo permiso que crearla:
// el Director, o un Supervisor asignado a este proyecto.
export async function PATCH(req, { params }) {
  const { tenant, id, testId } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const user = await getCurrentLabsUser(tenant);
  if (!user) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  const meta = await getExperimentMeta(tenant, id);
  if (!meta) return Response.json({ error: 'Experimento no encontrado.' }, { status: 404 });

  const isSupervisorOnProject = user.role === 'Supervisor' && meta.supervisorIds?.includes(user.id);
  if (user.role !== 'Director' && !isSupervisorOnProject) {
    return Response.json({ error: 'Solo el Director o un Supervisor asignado a este proyecto puede reasignar Registradores.' }, { status: 403 });
  }

  const { registradorIds } = await req.json();
  const ids = Array.isArray(registradorIds) ? registradorIds : [];
  const registradores = await Promise.all(ids.map((rid) => getUserById(tenant, rid)));
  const validRegistradorIds = registradores.filter((u) => u?.role === 'Registrador').map((u) => u.id);

  try {
    const test = await setTestRegistradores(tenant, id, testId, validRegistradorIds);
    return Response.json({ ok: true, test });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo actualizar.' }, { status: 400 });
  }
}
