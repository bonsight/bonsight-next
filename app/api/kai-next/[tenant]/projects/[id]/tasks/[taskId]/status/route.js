import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getProjectMeta, getTasksList, setTaskStatus, projectInactiveMessage, resolveProjectAccessLevel } from '@/lib/kaiNext/projects';

// A diferencia de crear/editar/eliminar (solo Supervisor/Director), togglear el status SÍ lo
// puede hacer un Registrador — pero solo de SUS propias tareas, igual que setTaskStatus en Labs.
export async function PATCH(req, { params }) {
  const { tenant, id, taskId } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) {
    return Response.json({ error: 'Proyectos no está habilitado para tu usuario.' }, { status: 403 });
  }
  const { isSupervisorLevel } = resolveProjectAccessLevel(identity);

  const meta = await getProjectMeta(tenant, id);
  if (!meta) return Response.json({ error: 'Proyecto no encontrado.' }, { status: 404 });
  const inactive = projectInactiveMessage(meta);
  if (inactive) return Response.json({ error: inactive }, { status: 400 });

  if (!isSupervisorLevel) {
    const tasks = await getTasksList(tenant, id);
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !(task.responsables ?? []).includes(identity.personId)) {
      return Response.json({ error: 'Solo podés actualizar tus propias tareas.' }, { status: 403 });
    }
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }

  try {
    const task = await setTaskStatus(tenant, id, taskId, body.status, identity.personName ?? 'Alguien');
    return Response.json({ task });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
