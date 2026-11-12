import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getProjectMeta, getTasksList, setTaskStatus, projectInactiveMessage, supervisesProject, isOwnTask } from '@/lib/kaiNext/projects';

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

  if (!supervisesProject(identity, meta)) {
    const tasks = await getTasksList(tenant, id);
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !isOwnTask(task, identity.personId)) {
      return Response.json({ error: 'Solo puedes actualizar tus propias tareas.' }, { status: 403 });
    }
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }

  try {
    const task = await setTaskStatus(tenant, id, taskId, body.status, identity.personName ?? 'Alguien', body.order);
    return Response.json({ task });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
