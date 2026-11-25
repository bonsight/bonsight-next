import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { after } from 'next/server';
import { getProjectMeta, addTask, projectInactiveMessage, isProjectMember, supervisesProject, resolveTaskStatusChange, taskPeopleDiff, addEvent } from '@/lib/kaiNext/projects';
import { notifyTaskPeople } from '@/lib/kaiNext/notifications';

// Crear tareas: cualquier persona del equipo del proyecto (Director, Supervisor o Team member).
// Editar y borrar dependen de si la tarea es suya (ver [taskId]/route.js).
export async function POST(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) {
    return Response.json({ error: 'Proyectos no está habilitado para tu usuario.' }, { status: 403 });
  }

  const meta = await getProjectMeta(tenant, id);
  if (!meta) return Response.json({ error: 'Proyecto no encontrado.' }, { status: 404 });
  if (!isProjectMember(identity, meta)) {
    return Response.json({ error: 'No tienes permiso para crear tareas en este proyecto.' }, { status: 403 });
  }
  const inactive = projectInactiveMessage(meta);
  if (inactive) return Response.json({ error: inactive }, { status: 400 });

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }

  // Crear una tarea ya terminada tampoco se salta la revisión del proyecto.
  if (body.status) {
    const resolved = resolveTaskStatusChange(meta, { responsables: body.responsables ?? [] }, body.status, { canValidate: supervisesProject(identity, meta), personId: identity.personId });
    if (resolved.error) return Response.json({ error: resolved.error }, { status: 403 });
    body.status = resolved.status;
  }

  try {
    const task = await addTask(tenant, id, { ...body, createdBy: identity.personId ?? null });
    // Seguimiento: avisar a quien se sumó (menos quien la creó, que ya sabe).
    if (meta.projectKind === 'seguimiento') {
      const added = taskPeopleDiff(null, task).filter((a) => a.id !== identity.personId);
      if (added.length) {
        // Queda en la Historia y alimenta los Avisos de quien se sumó (sin correo extra: va aparte).
        await addEvent(tenant, id, {
          type: 'tarea', kind: 'personas', actor: identity.personName ?? 'Alguien', title: `${identity.personName ?? 'Alguien'} actualizó quiénes participan en "${task.nombre}"`,
          body: '', taskId: task.id, added,
        }, { notify: false }).catch(() => null);
        after(() => notifyTaskPeople(tenant, meta, task, added, { actorName: identity.personName ?? 'Alguien' }));
      }
    }
    return Response.json({ task });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
