import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { logProjectAction } from '@/lib/kaiNext/audit';
import {
  getProjectMeta, getTasksList, updateTask, deleteTask, projectInactiveMessage,
  supervisesProject, isOwnTask, canDeleteOwnTask, OWN_TASK_FIELDS,
} from '@/lib/kaiNext/projects';

// Un Supervisor del proyecto edita y borra cualquier tarea. El resto (Team members, responsables
// de una tarea sin estar en el equipo, o un Supervisor de otro proyecto) solo edita SUS tareas, y solo los campos de ejecución
// (OWN_TASK_FIELDS); borra solo las que creó y todavía no empezó.
async function guard(tenant, id, taskId) {
  if (!(await isAuthorizedForTenant(tenant))) return { error: Response.json({ error: 'No autorizado.' }, { status: 401 }) };
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) {
    return { error: Response.json({ error: 'Proyectos no está habilitado para tu usuario.' }, { status: 403 }) };
  }
  const meta = await getProjectMeta(tenant, id);
  if (!meta) return { error: Response.json({ error: 'Proyecto no encontrado.' }, { status: 404 }) };
  const inactive = projectInactiveMessage(meta);
  if (inactive) return { error: Response.json({ error: inactive }, { status: 400 }) };
  if (supervisesProject(identity, meta)) return { identity, meta, supervises: true };
  const task = (await getTasksList(tenant, id)).find((t) => t.id === taskId);
  if (!task) return { error: Response.json({ error: 'Tarea no encontrada.' }, { status: 404 }) };
  return { identity, meta, supervises: false, task };
}

export async function PATCH(req, { params }) {
  const { tenant, id, taskId } = await params;
  const g = await guard(tenant, id, taskId);
  if (g.error) return g.error;

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }

  let patch = body;
  if (!g.supervises) {
    if (!isOwnTask(g.task, g.identity.personId)) {
      return Response.json({ error: 'Solo puedes editar tus propias tareas.' }, { status: 403 });
    }
    // El panel manda la ficha completa: nombre, responsables, mini proyecto, prioridad y tipología
    // se ignoran (en pantalla van bloqueados) y solo se aplican los campos de ejecución.
    patch = Object.fromEntries(OWN_TASK_FIELDS.filter((k) => body?.[k] !== undefined).map((k) => [k, body[k]]));
    if (!Object.keys(patch).length) return Response.json({ error: 'Nada que puedas cambiar en esta tarea.' }, { status: 400 });
  }

  try {
    const task = await updateTask(tenant, id, taskId, patch);
    return Response.json({ task });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  const { tenant, id, taskId } = await params;
  const g = await guard(tenant, id, taskId);
  if (g.error) return g.error;
  if (!g.supervises && !canDeleteOwnTask(g.task, g.identity.personId)) {
    return Response.json({ error: 'Solo puedes borrar tareas que creaste y que todavía no empiezan.' }, { status: 403 });
  }

  try {
    const task = await deleteTask(tenant, id, taskId);
    await logProjectAction(tenant, g.identity, { project: g.meta, action: 'Borró una tarea', detail: task.nombre });
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
