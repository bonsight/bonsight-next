import { isAuthorizedForTenant } from '@/lib/aria/auth';
import { getIntelligenceSources } from '@/lib/kai/intelligenceSources';
import { getBoardData, searchTareas, moveTask, createTask, addExistingTask, removeTask, createSprint, closeSprintPlanning } from '@/lib/aria/board';

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
    } else {
      throw new Error(`Acción desconocida: ${action}`);
    }

    const data = await getBoardData(token, { sprintId: viewedSprintId });
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo actualizar el tablero.' }, { status: 400 });
  }
}
