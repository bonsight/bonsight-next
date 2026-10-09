import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getProjectMeta, resolveProjectAccessLevel } from '@/lib/kaiNext/projects';
import { getNotionToken, listTareasDelProyecto } from '@/lib/kaiNext/projectsNotion';
import {
  STATUS_COLUMNS, loadTalentoMap, moveTask, updateTaskDatesAndHours, updateTaskResponsable, addExistingTask,
  updateTaskDetails, updateTaskActualHours, removeTask,
} from '@/lib/aria/board';

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
    return Response.json({ error: 'No tenés permiso para editar tareas en este proyecto.' }, { status: 403 });
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
  if (!pageId) return Response.json({ error: 'pageId es requerido.' }, { status: 400 });

  try {
    if (action === 'move_task') {
      await moveTask(token, pageId, body.status, body.actualHours);
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
      });
    } else if (action === 'update_actual_hours') {
      await updateTaskActualHours(token, pageId, body.actualHours);
    } else if (action === 'remove_task') {
      await removeTask(token, pageId);
    } else {
      return Response.json({ error: 'Acción inválida.' }, { status: 400 });
    }
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
