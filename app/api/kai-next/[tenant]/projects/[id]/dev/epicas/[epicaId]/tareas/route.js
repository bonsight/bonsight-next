import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getProjectMeta, resolveProjectAccessLevel } from '@/lib/kaiNext/projects';
import { getNotionToken, listTareas } from '@/lib/kaiNext/projectsNotion';
import { createTask } from '@/lib/aria/board';

export async function GET(req, { params }) {
  const { tenant, epicaId } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) {
    return Response.json({ error: 'Proyectos no está habilitado para tu usuario.' }, { status: 403 });
  }

  const token = await getNotionToken(tenant);
  if (!token) return Response.json({ error: 'Notion no está conectado para este tenant.' }, { status: 400 });

  try {
    const tareas = await listTareas(token, epicaId);
    return Response.json({ tareas });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}

// Crea la tarea vía el mismo createTask que ya usa Sprints, con Iniciativa/Épica/Fase seteados
// de una — así la tarea aparece tanto en el Roadmap de este proyecto como en el tablero de
// Sprints normal, sin duplicar nada. El sprint es opcional acá: la tarea puede quedar en backlog
// (sin sprint) y jalarse a uno después desde el propio tablero de Sprints (addExistingTask).
export async function POST(req, { params }) {
  const { tenant, id, epicaId } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) {
    return Response.json({ error: 'Proyectos no está habilitado para tu usuario.' }, { status: 403 });
  }
  const { isSupervisorLevel } = resolveProjectAccessLevel(identity);
  if (!isSupervisorLevel) {
    return Response.json({ error: 'No tenés permiso para crear tareas en este proyecto.' }, { status: 403 });
  }

  const token = await getNotionToken(tenant);
  if (!token) return Response.json({ error: 'Notion no está conectado para este tenant.' }, { status: 400 });

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }
  const {
    sprintId, title, iniciativaId, fase, startDate, endDate, estimatedHours, responsableId,
    taskType, priority, severity, description,
  } = body;

  try {
    const meta = await getProjectMeta(tenant, id);
    const taskId = await createTask(token, sprintId, {
      title, iniciativaId, epicaId, fase, startDate, endDate, estimatedHours, responsableId,
      taskType, priority, severity, description,
      proyectoId: meta?.notionProyectoId,
    });
    return Response.json({ id: taskId });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
