import { isAuthorizedForTenant, getCurrentLabsUser } from '@/lib/labs/auth';
import { getExperimentMeta, setTestRegistradores, renameTest, deleteTest } from '@/lib/labs/experiments';
import { getUserById } from '@/lib/labs/users';

async function requireDirectorOrSupervisor(tenant, id) {
  const user = await getCurrentLabsUser(tenant);
  if (!user) return { error: Response.json({ error: 'No autorizado.' }, { status: 401 }) };
  const meta = await getExperimentMeta(tenant, id);
  if (!meta) return { error: Response.json({ error: 'Experimento no encontrado.' }, { status: 404 }) };
  const isSupervisorOnProject = user.role === 'Supervisor' && meta.supervisorIds?.includes(user.id);
  if (user.role !== 'Director' && !isSupervisorOnProject) {
    return { error: Response.json({ error: 'Solo el Director o un Supervisor asignado a este proyecto puede hacer esto.' }, { status: 403 }) };
  }
  return { user, meta };
}

// Reasignar Registradores de una prueba ya creada, o renombrarla — mismo permiso que crearla:
// el Director, o un Supervisor asignado a este proyecto. Body trae uno u otro campo (o ambos).
export async function PATCH(req, { params }) {
  const { tenant, id, testId } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const { error } = await requireDirectorOrSupervisor(tenant, id);
  if (error) return error;

  const body = await req.json();

  try {
    let test;
    if (body.name !== undefined) {
      test = await renameTest(tenant, id, testId, body.name);
    }
    if (body.registradorIds !== undefined) {
      const ids = Array.isArray(body.registradorIds) ? body.registradorIds : [];
      const registradores = await Promise.all(ids.map((rid) => getUserById(tenant, rid)));
      const validRegistradorIds = registradores.filter((u) => u?.role === 'Registrador').map((u) => u.id);
      test = await setTestRegistradores(tenant, id, testId, validRegistradorIds);
    }
    return Response.json({ ok: true, test });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo actualizar.' }, { status: 400 });
  }
}

// Borra la prueba (y en cascada sus ejecuciones, ver deleteTest) — mismo permiso que crearla.
export async function DELETE(req, { params }) {
  const { tenant, id, testId } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const { error } = await requireDirectorOrSupervisor(tenant, id);
  if (error) return error;

  try {
    await deleteTest(tenant, id, testId);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo eliminar.' }, { status: 400 });
  }
}
