import { isAuthorizedForTenant, getCurrentLabsUser } from '@/lib/labs/auth';
import { getExperimentMeta, updateTask, deleteTask, projectInactiveMessage } from '@/lib/labs/experiments';
import { getUserById } from '@/lib/labs/users';

// Editar/reasignar una tarea (fase, nombre, responsable, fechas, link a partida): mismo
// permiso que crearla — Director o Supervisor asignado al proyecto.
export async function PATCH(req, { params }) {
  const { tenant, id, taskId } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const user = await getCurrentLabsUser(tenant);
  if (!user) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  const meta = await getExperimentMeta(tenant, id);
  if (!meta) return Response.json({ error: 'Experimento no encontrado.' }, { status: 404 });

  const isSupervisorOnProject = user.role === 'Supervisor' && meta.supervisorIds?.includes(user.id);
  if (user.role !== 'Director' && !isSupervisorOnProject) {
    return Response.json({ error: 'Solo el Director o un Supervisor asignado a este proyecto puede editar tareas.' }, { status: 403 });
  }
  const inactiveMsg = projectInactiveMessage(meta);
  if (inactiveMsg) return Response.json({ error: inactiveMsg }, { status: 409 });

  const patch = await req.json();
  if (patch.responsables !== undefined) {
    const ids = [...new Set(Array.isArray(patch.responsables) ? patch.responsables.filter(Boolean) : [])];
    const users = await Promise.all(ids.map((rid) => getUserById(tenant, rid)));
    const validResponsables = users.filter((u) => u && u.active !== false).map((u) => u.id);
    if (validResponsables.length !== ids.length) {
      return Response.json({ error: 'El responsable tiene que ser una persona activa del equipo.' }, { status: 400 });
    }
    patch.responsables = validResponsables;
  }

  try {
    const task = await updateTask(tenant, id, taskId, patch);
    return Response.json({ ok: true, task });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo actualizar la tarea.' }, { status: 400 });
  }
}

// Mismo permiso que editar — Director o Supervisor asignado al proyecto.
export async function DELETE(req, { params }) {
  const { tenant, id, taskId } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const user = await getCurrentLabsUser(tenant);
  if (!user) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  const meta = await getExperimentMeta(tenant, id);
  if (!meta) return Response.json({ error: 'Experimento no encontrado.' }, { status: 404 });

  const isSupervisorOnProject = user.role === 'Supervisor' && meta.supervisorIds?.includes(user.id);
  if (user.role !== 'Director' && !isSupervisorOnProject) {
    return Response.json({ error: 'Solo el Director o un Supervisor asignado a este proyecto puede eliminar tareas.' }, { status: 403 });
  }
  const inactiveMsg = projectInactiveMessage(meta);
  if (inactiveMsg) return Response.json({ error: inactiveMsg }, { status: 409 });

  try {
    await deleteTask(tenant, id, taskId);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo eliminar la tarea.' }, { status: 400 });
  }
}
