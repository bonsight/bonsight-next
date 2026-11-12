import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getProjectMeta, supervisesProject, isProjectMember } from '@/lib/kaiNext/projects';
import {
  STATUS_COLUMNS, listTasks, getTask, moveTask, reorderTask, updateTaskDatesAndHours, updateTaskResponsable, updateTaskColaboradores,
  assignTaskToSprint, assignTasksToSprint, updateTaskDetails, updateTaskActualHours, deleteTask, createTask,
} from '@/lib/kaiNext/devStore';
import { isOwnDevTask, canDeleteOwnDevTask } from '@/lib/kaiNext/devOwnership';
import { listEquipoOptions, resolveResponsableId, resolveColaboradorIds } from '@/lib/kaiNext/devResponsables';
import { logProjectAction } from '@/lib/kaiNext/audit';

// Lo que un Team member puede hacer en los proyectos donde está asignado, siempre sobre SUS tareas
// (ver isOwnDevTask): ejecutar el trabajo y sumarlas al sprint. Crear subtareas puede en cualquier
// tarea (crear no es editar). Borrar, solo lo que creó y no empezó. Reasignar personas o mover
// tareas entre sprints en bloque sigue siendo del Supervisor del proyecto.
const EXECUTION_ACTIONS = new Set(['move_task', 'reorder_task', 'update_schedule', 'update_task_details', 'update_actual_hours', 'create_subtask', 'assign_sprint', 'remove_task']);

async function gate(tenant, id) {
  if (!(await isAuthorizedForTenant(tenant))) return { error: 'No autorizado.', status: 401 };
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) return { error: 'Proyectos no está habilitado para tu usuario.', status: 403 };
  const meta = await getProjectMeta(tenant, id);
  if (!meta || meta.projectKind !== 'desarrollo') return { error: 'Proyecto no encontrado.', status: 404 };
  if (!isProjectMember(identity, meta)) return { error: 'No tienes acceso a este proyecto.', status: 403 };
  return { identity, meta };
}

// Tablero de TODO el proyecto (todas las iniciativas): alimenta los tabs Tablero y Sprints.
export async function GET(req, { params }) {
  const { tenant, id } = await params;
  const g = await gate(tenant, id);
  if (g.error) return Response.json({ error: g.error }, { status: g.status });
  try {
    const [tasks, equipo] = await Promise.all([listTasks(tenant, id), listEquipoOptions(tenant)]);
    return Response.json({
      tasks,
      // Antes eran las fichas de Talento (Notion); ahora es el mismo Equipo de Kai.
      talento: equipo,
      equipo,
      columns: STATUS_COLUMNS,
      me: { personId: g.identity.personId ?? null, supervises: supervisesProject(g.identity, g.meta) },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}

export async function PATCH(req, { params }) {
  const { tenant, id } = await params;
  const g = await gate(tenant, id);
  if (g.error) return Response.json({ error: g.error }, { status: g.status });
  const { identity, meta } = g;

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }
  const { action, pageId } = body;

  const supervises = supervisesProject(identity, meta);
  if (!supervises && !EXECUTION_ACTIONS.has(action)) {
    return Response.json({ error: 'No tienes permiso para hacer esto en este proyecto.' }, { status: 403 });
  }

  if (action === 'move_tasks_sprint') {
    if (!Array.isArray(body.pageIds) || !body.pageIds.length || !body.sprintId) {
      return Response.json({ error: 'pageIds y sprintId son requeridos.' }, { status: 400 });
    }
    try {
      const result = await assignTasksToSprint(tenant, id, body.sprintId, body.pageIds);
      return Response.json({ ok: true, moveResult: result });
    } catch (err) {
      return Response.json({ error: err.message }, { status: 400 });
    }
  }

  if (!pageId) return Response.json({ error: 'pageId es requerido.' }, { status: 400 });
  const task = await getTask(tenant, id, pageId);
  if (!task) return Response.json({ error: 'Tarea no encontrada.' }, { status: 404 });

  // Fuera de crear subtareas, un Team member solo actúa sobre sus tareas.
  if (!supervises && action !== 'create_subtask') {
    if (action === 'remove_task') {
      if (!canDeleteOwnDevTask(task, identity.personId)) {
        return Response.json({ error: 'Solo puedes borrar tareas que creaste y que todavía no empiezan.' }, { status: 403 });
      }
    } else if (!isOwnDevTask(task, identity.personId)) {
      return Response.json({ error: 'Solo puedes cambiar tus propias tareas.' }, { status: 403 });
    }
  }

  try {
    if (action === 'move_task') {
      await moveTask(tenant, id, pageId, body.status, body.actualHours, body.order);
    } else if (action === 'reorder_task') {
      if (typeof body.order !== 'number') return Response.json({ error: 'order es requerido.' }, { status: 400 });
      await reorderTask(tenant, id, pageId, body.order);
    } else if (action === 'update_schedule') {
      await updateTaskDatesAndHours(tenant, id, pageId, { startDate: body.startDate, endDate: body.endDate, estimatedHours: body.estimatedHours });
    } else if (action === 'update_responsable') {
      await updateTaskResponsable(tenant, id, pageId, await resolveResponsableId(tenant, body.responsableId));
    } else if (action === 'update_colaboradores') {
      await updateTaskColaboradores(tenant, id, pageId, await resolveColaboradorIds(tenant, body.colaboradorIds));
    } else if (action === 'assign_sprint') {
      if (!body.sprintId) return Response.json({ error: 'sprintId es requerido.' }, { status: 400 });
      await assignTaskToSprint(tenant, id, body.sprintId, pageId);
    } else if (action === 'update_task_details') {
      // Nombre, tipo, prioridad y severidad los define el Supervisor; de lo suyo, un Team member
      // cambia la descripción y los entregables.
      await updateTaskDetails(tenant, id, pageId, supervises ? {
        title: body.title, description: body.description,
        taskType: body.taskType, priority: body.priority, severity: body.severity,
        entregables: body.entregables,
      } : { description: body.description, entregables: body.entregables });
    } else if (action === 'update_actual_hours') {
      await updateTaskActualHours(tenant, id, pageId, body.actualHours);
    } else if (action === 'remove_task') {
      await deleteTask(tenant, id, pageId);
      await logProjectAction(tenant, identity, { project: meta, action: 'Borró una tarea', detail: task.title });
    } else if (action === 'create_subtask') {
      // pageId es la tarea PADRE. La subtarea nace en Backlog (sin exigir fechas ni estimación) y
      // hereda el sprint del padre si sigue abierto.
      if (!body.title?.trim()) return Response.json({ error: 'El título es requerido.' }, { status: 400 });
      const payload = {
        title: body.title, status: 'Backlog', parentId: pageId,
        iniciativaId: task.iniciativaId, epicaId: task.epicaId, fase: task.fase,
        createdBy: identity.personId ?? null,
      };
      try {
        await createTask(tenant, id, { ...payload, sprintId: task.sprintId });
      } catch (e) {
        if (task.sprintId && /cerrado/i.test(e.message || '')) await createTask(tenant, id, payload);
        else throw e;
      }
    } else {
      return Response.json({ error: 'Acción inválida.' }, { status: 400 });
    }
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
