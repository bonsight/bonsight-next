import { isAuthorizedForTenant } from '@/lib/aria/auth';
import { getIntelligenceSources } from '@/lib/kai/intelligenceSources';
import { getBoardData, searchTareas, moveTask, createTask, addExistingTask, removeTask, updateTaskResponsable, updateTaskSchedule, updateTaskDetails, createSprint, closeSprintPlanning, closeSprint, updateSprintDates, computeSprintMetrics } from '@/lib/aria/board';
import { saveSprintMetrics, getSprintMetrics } from '@/lib/aria/sprintMetrics';

async function getNotionToken(tenant) {
  const sources = await getIntelligenceSources(tenant);
  const notionSource = sources.find((s) => s.id === 'notion');
  if (!notionSource || notionSource.status !== 'active' || !notionSource.config?.integrationToken) return null;
  return notionSource.config.integrationToken;
}

export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const token = await getNotionToken(tenant);
  if (!token) {
    return Response.json({ error: 'Notion no está configurado para este tenant.' }, { status: 400 });
  }

  const sp = new URL(req.url).searchParams;
  const search = sp.get('search');

  try {
    if (search) {
      const results = await searchTareas(token, search);
      return Response.json({ results });
    }
    const data = await getBoardData(token, {
      sprintId: sp.get('sprintId') || undefined,
      sprintNumber: sp.get('sprintNumber') || undefined,
    });
    if (data.sprint?.status === 'Cerrado') {
      data.metrics = await getSprintMetrics(tenant, data.sprint.id);
    }
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo cargar el tablero.' }, { status: 400 });
  }
}

export async function PATCH(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const token = await getNotionToken(tenant);
  if (!token) {
    return Response.json({ error: 'Notion no está configurado para este tenant.' }, { status: 400 });
  }

  const { action, sprintId, ...p } = await req.json();
  // sprintId = el sprint que se está viendo en el tablero (lo manda el front en cada
  // request). La respuesta se queda anclada ahí salvo create_sprint, que define uno nuevo.
  let viewedSprintId = sprintId;

  try {
    if (action === 'create_sprint') {
      const sprint = await createSprint(token, { startDate: p.startDate, endDate: p.endDate, objetivo: p.objetivo });
      viewedSprintId = sprint.id;
    } else if (action === 'close_planning') {
      if (!sprintId) throw new Error('sprintId es requerido.');
      await closeSprintPlanning(token, sprintId);
    } else if (action === 'close_sprint') {
      if (!sprintId) throw new Error('sprintId es requerido.');
      const before = await getBoardData(token, { sprintId });
      if (!before.sprint) throw new Error('Ese sprint ya no existe.');
      const metrics = computeSprintMetrics(before.sprint, before.tasks);
      await saveSprintMetrics(tenant, sprintId, metrics);
      await closeSprint(token, sprintId);
    } else if (action === 'move_task') {
      if (!p.pageId || !p.status) throw new Error('pageId y status son requeridos.');
      await moveTask(token, p.pageId, p.status);
    } else if (action === 'create_task') {
      if (!sprintId) throw new Error('sprintId es requerido.');
      await createTask(token, sprintId, p);
    } else if (action === 'add_existing_task') {
      if (!p.pageId || !sprintId) throw new Error('pageId y sprintId son requeridos.');
      await addExistingTask(token, sprintId, p.pageId);
    } else if (action === 'move_task_sprint') {
      // Mueve la tarea a OTRO sprint (targetSprintId) sin cambiar el sprint que se está viendo.
      if (!p.pageId || !p.targetSprintId) throw new Error('pageId y targetSprintId son requeridos.');
      await addExistingTask(token, p.targetSprintId, p.pageId);
    } else if (action === 'remove_task') {
      if (!p.pageId) throw new Error('pageId es requerido.');
      await removeTask(token, p.pageId);
    } else if (action === 'update_task_responsable') {
      if (!p.pageId) throw new Error('pageId es requerido.');
      await updateTaskResponsable(token, p.pageId, p.responsableId || null);
    } else if (action === 'update_task_schedule') {
      if (!p.pageId || !sprintId) throw new Error('pageId y sprintId son requeridos.');
      await updateTaskSchedule(token, p.pageId, sprintId, { startDate: p.startDate || null, endDate: p.endDate || null, estimatedHours: p.estimatedHours });
    } else if (action === 'update_task_details') {
      if (!p.pageId) throw new Error('pageId es requerido.');
      await updateTaskDetails(token, p.pageId, { title: p.title, description: p.description });
    } else if (action === 'update_sprint_dates') {
      if (!sprintId) throw new Error('sprintId es requerido.');
      await updateSprintDates(token, sprintId, { startDate: p.startDate, endDate: p.endDate });
    } else {
      throw new Error(`Acción desconocida: ${action}`);
    }

    const data = await getBoardData(token, { sprintId: viewedSprintId });
    if (data.sprint?.status === 'Cerrado') {
      data.metrics = await getSprintMetrics(tenant, data.sprint.id);
    }
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo actualizar el tablero.' }, { status: 400 });
  }
}
