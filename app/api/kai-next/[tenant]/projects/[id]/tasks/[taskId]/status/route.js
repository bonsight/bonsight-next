import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getProjectMeta, getTasksList, setTaskStatus, projectInactiveMessage, supervisesProject, isOwnTask, resolveTaskStatusChange } from '@/lib/kaiNext/projects';

// Un Supervisor del proyecto mueve cualquier tarea; el resto, solo las suyas (ver isOwnTask).
export async function PATCH(req, { params }) {
  const { tenant, id, taskId } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) {
    return Response.json({ error: 'Proyectos no está habilitado para tu usuario.' }, { status: 403 });
  }
  const meta = await getProjectMeta(tenant, id);
  if (!meta) return Response.json({ error: 'Proyecto no encontrado.' }, { status: 404 });
  const inactive = projectInactiveMessage(meta);
  if (inactive) return Response.json({ error: inactive }, { status: 400 });

  const supervises = supervisesProject(identity, meta);
  const task = (await getTasksList(tenant, id)).find((t) => t.id === taskId);
  if (!task) return Response.json({ error: 'Tarea no encontrada.' }, { status: 404 });
  if (!supervises && !isOwnTask(task, identity.personId)) {
    return Response.json({ error: 'Solo puedes actualizar tus propias tareas.' }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }

  try {
    // En proyectos con revisión, pasar a Hecho lo valida un Director o Supervisor del proyecto
    // que no sea responsable de la tarea; si lo pide otro, queda En revisión.
    const resolved = resolveTaskStatusChange(meta, task, body.status, { canValidate: supervises, personId: identity.personId });
    if (resolved.error) return Response.json({ error: resolved.error }, { status: 403 });
    const updated = await setTaskStatus(tenant, id, taskId, resolved.status, identity.personName ?? 'Alguien', body.order);
    return Response.json({ task: updated, sentToReview: resolved.status === 'review' && body.status !== 'review' });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
