import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getProjectMeta, resolveProjectAccessLevel } from '@/lib/kaiNext/projects';
import { getNotionToken, listTareasDelProyecto } from '@/lib/kaiNext/projectsNotion';
import {
  STATUS_COLUMNS, loadTalentoMap, moveTask, updateTaskDatesAndHours, updateTaskResponsable, addExistingTask,
  addExistingTasks, updateTaskDetails, updateTaskActualHours, deleteTask, createTask, reorderTask,
} from '@/lib/aria/board';
import { getNotionPageRaw, pageToFields } from '@/lib/aria/notion';

// Tablero agregado de TODO el proyecto (todas las iniciativas) — a diferencia de EpicaTareas
// (lista plana por épica), esto alimenta el tab "Tablero" con drag-and-drop entre columnas de
// Status, igual criterio visual que el tablero real de Sprints pero sin tocar ese archivo ni su
// ruta — ver /Users/itriagor/.claude/plans/serene-spinning-mochi.md.
export async function GET(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) {
    return Response.json({ error: 'Proyectos no está habilitado para tu usuario.' }, { status: 403 });
  }

  const meta = await getProjectMeta(tenant, id);
  if (!meta || meta.projectKind !== 'desarrollo') return Response.json({ error: 'Proyecto no encontrado.' }, { status: 404 });

  const token = await getNotionToken(tenant);
  if (!token) return Response.json({ error: 'Notion no está conectado para este tenant.' }, { status: 400 });

  try {
    const [tasks, talentoMap] = await Promise.all([
      listTareasDelProyecto(token, meta.notionProyectoId),
      loadTalentoMap(token),
    ]);
    return Response.json({ tasks, talento: [...talentoMap.values()], columns: STATUS_COLUMNS });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}

export async function PATCH(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) {
    return Response.json({ error: 'Proyectos no está habilitado para tu usuario.' }, { status: 403 });
  }
  const { isSupervisorLevel } = resolveProjectAccessLevel(identity);
  if (!isSupervisorLevel) {
    return Response.json({ error: 'No tienes permiso para editar tareas en este proyecto.' }, { status: 403 });
  }

  const meta = await getProjectMeta(tenant, id);
  if (!meta || meta.projectKind !== 'desarrollo') return Response.json({ error: 'Proyecto no encontrado.' }, { status: 404 });

  const token = await getNotionToken(tenant);
  if (!token) return Response.json({ error: 'Notion no está conectado para este tenant.' }, { status: 400 });

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }
  const { action, pageId } = body;

  if (action === 'move_tasks_sprint') {
    if (!Array.isArray(body.pageIds) || !body.pageIds.length || !body.sprintId) {
      return Response.json({ error: 'pageIds y sprintId son requeridos.' }, { status: 400 });
    }
    try {
      const result = await addExistingTasks(token, body.sprintId, body.pageIds);
      return Response.json({ ok: true, moveResult: result });
    } catch (err) {
      return Response.json({ error: err.message }, { status: 400 });
    }
  }

  if (!pageId) return Response.json({ error: 'pageId es requerido.' }, { status: 400 });

  try {
    if (action === 'move_task') {
      await moveTask(token, pageId, body.status, body.actualHours, body.order);
    } else if (action === 'reorder_task') {
      if (typeof body.order !== 'number') return Response.json({ error: 'order es requerido.' }, { status: 400 });
      await reorderTask(token, pageId, body.order);
    } else if (action === 'update_schedule') {
      await updateTaskDatesAndHours(token, pageId, { startDate: body.startDate, endDate: body.endDate, estimatedHours: body.estimatedHours });
    } else if (action === 'update_responsable') {
      await updateTaskResponsable(token, pageId, body.responsableId || null);
    } else if (action === 'assign_sprint') {
      if (!body.sprintId) return Response.json({ error: 'sprintId es requerido.' }, { status: 400 });
      await addExistingTask(token, body.sprintId, pageId);
    } else if (action === 'update_task_details') {
      await updateTaskDetails(token, pageId, {
        title: body.title, description: body.description,
        taskType: body.taskType, priority: body.priority, severity: body.severity,
        entregables: body.entregables,
      });
    } else if (action === 'update_actual_hours') {
      await updateTaskActualHours(token, pageId, body.actualHours);
    } else if (action === 'remove_task') {
      await deleteTask(token, pageId);
    } else if (action === 'create_subtask') {
      // pageId acá es la tarea PADRE (mismo criterio que el resto de las acciones: pageId es a
      // qué apunta la acción). Arranca en Backlog — createTask no exige fecha/estimación como sí
      // lo hace moveTask al sacar algo de Backlog, así que un "+ agregar" solo con título no
      // queda en un estado inconsistente (Por hacer sin fechas). Hereda el sprint de la tarea
      // padre (si tiene uno) para que no quede huérfana de su sprint en el tablero.
      if (!body.title?.trim()) return Response.json({ error: 'El título es requerido.' }, { status: 400 });
      const parentPage = await getNotionPageRaw(token, pageId);
      const parentSprintId = parentPage ? (pageToFields(parentPage).fields['Sprint']?.[0] ?? null) : null;
      const subtaskPayload = {
        title: body.title, status: 'Backlog', parentId: pageId,
        proyectoId: body.proyectoId, iniciativaId: body.iniciativaId, epicaId: body.epicaId, fase: body.fase,
      };
      try {
        await createTask(token, parentSprintId, subtaskPayload);
      } catch (e) {
        // El sprint del padre puede estar cerrado — en ese caso la subtarea nace sin sprint
        // (como antes de esta regla) en vez de bloquear la creación por completo.
        if (parentSprintId && /cerrado/i.test(e.message || '')) {
          await createTask(token, null, subtaskPayload);
        } else {
          throw e;
        }
      }
    } else {
      return Response.json({ error: 'Acción inválida.' }, { status: 400 });
    }
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
