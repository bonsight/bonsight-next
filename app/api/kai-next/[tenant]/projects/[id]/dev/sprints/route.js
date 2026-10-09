import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getProjectMeta, resolveProjectAccessLevel } from '@/lib/kaiNext/projects';
import { getNotionToken } from '@/lib/kaiNext/projectsNotion';
import { getBoardData, createSprint, closeSprintPlanning, closeSprint, updateSprintDates, computeSprintMetrics } from '@/lib/aria/board';
import { saveSprintMetrics, getSprintMetrics } from '@/lib/aria/sprintMetrics';

// Ciclo de vida del sprint de ESTE proyecto (crear/cerrar planificación/cerrar) — a diferencia de
// app/api/kai-next/[tenant]/board/route.js (el tablero universal, que sigue intacto y solo ve
// sprints legado sin Proyecto asignado), acá el proyectoId lo inyecta el servidor siempre, nunca
// el body, así no hay forma de crear/ver un sprint de otro proyecto desde esta ruta. Las acciones
// sobre tareas (move_task, assign_sprint, etc.) siguen viviendo en dev/board/route.js — no se
// duplican acá, ver /Users/itriagor/.claude/plans/serene-spinning-mochi.md.

async function loadMeta(tenant, id) {
  const meta = await getProjectMeta(tenant, id);
  if (!meta || meta.projectKind !== 'desarrollo') return null;
  return meta;
}

export async function GET(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) {
    return Response.json({ error: 'Proyectos no está habilitado para tu usuario.' }, { status: 403 });
  }

  const meta = await loadMeta(tenant, id);
  if (!meta) return Response.json({ error: 'Proyecto no encontrado.' }, { status: 404 });

  const token = await getNotionToken(tenant);
  if (!token) return Response.json({ error: 'Notion no está conectado para este tenant.' }, { status: 400 });

  try {
    const data = await getBoardData(token, { proyectoId: meta.notionProyectoId });
    if (data.sprint?.status === 'Cerrado') {
      data.metrics = await getSprintMetrics(tenant, data.sprint.id);
    }
    return Response.json(data);
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
    return Response.json({ error: 'No tenés permiso para editar sprints en este proyecto.' }, { status: 403 });
  }

  const meta = await loadMeta(tenant, id);
  if (!meta) return Response.json({ error: 'Proyecto no encontrado.' }, { status: 404 });

  const token = await getNotionToken(tenant);
  if (!token) return Response.json({ error: 'Notion no está conectado para este tenant.' }, { status: 400 });

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }
  const { action, sprintId, ...p } = body;

  try {
    if (action === 'create_sprint') {
      await createSprint(token, { startDate: p.startDate, endDate: p.endDate, objetivo: p.objetivo, proyectoId: meta.notionProyectoId });
    } else if (action === 'close_planning') {
      if (!sprintId) throw new Error('sprintId es requerido.');
      await closeSprintPlanning(token, sprintId);
    } else if (action === 'close_sprint') {
      if (!sprintId) throw new Error('sprintId es requerido.');
      const before = await getBoardData(token, { sprintId, proyectoId: meta.notionProyectoId });
      if (!before.sprint) throw new Error('Ese sprint ya no existe.');
      const metrics = computeSprintMetrics(before.sprint, before.tasks);
      await saveSprintMetrics(tenant, sprintId, metrics);
      await closeSprint(token, sprintId);
    } else if (action === 'update_sprint_dates') {
      if (!sprintId) throw new Error('sprintId es requerido.');
      await updateSprintDates(token, sprintId, { startDate: p.startDate, endDate: p.endDate });
    } else {
      return Response.json({ error: 'Acción inválida.' }, { status: 400 });
    }

    const data = await getBoardData(token, { proyectoId: meta.notionProyectoId });
    if (data.sprint?.status === 'Cerrado') {
      data.metrics = await getSprintMetrics(tenant, data.sprint.id);
    }
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
