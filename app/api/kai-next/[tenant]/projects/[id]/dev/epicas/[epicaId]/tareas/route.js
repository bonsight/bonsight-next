import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getProjectMeta, isProjectMember } from '@/lib/kaiNext/projects';
import { getEpica, listTasksByEpica, createTask } from '@/lib/kaiNext/devStore';
import { resolveResponsableId, resolveColaboradorIds } from '@/lib/kaiNext/devResponsables';

async function gate(tenant, id) {
  if (!(await isAuthorizedForTenant(tenant))) return { error: 'No autorizado.', status: 401 };
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) return { error: 'Proyectos no está habilitado para tu usuario.', status: 403 };
  const meta = await getProjectMeta(tenant, id);
  if (!meta || meta.projectKind !== 'desarrollo') return { error: 'Proyecto no encontrado.', status: 404 };
  // Cualquier persona del equipo del proyecto (Director, Supervisor o Team member).
  if (!isProjectMember(identity, meta)) return { error: 'No tienes acceso a este proyecto.', status: 403 };
  return { identity, meta };
}

export async function GET(req, { params }) {
  const { tenant, id, epicaId } = await params;
  const g = await gate(tenant, id);
  if (g.error) return Response.json({ error: g.error }, { status: g.status });
  try {
    return Response.json({ tareas: await listTasksByEpica(tenant, id, epicaId) });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}

// Crea una historia dentro de la épica. El sprint es opcional: puede quedar en backlog y pasar a
// un sprint después desde el tablero.
export async function POST(req, { params }) {
  const { tenant, id, epicaId } = await params;
  const g = await gate(tenant, id);
  if (g.error) return Response.json({ error: g.error }, { status: g.status });

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }
  const {
    sprintId, title, fase, startDate, endDate, estimatedHours, responsableId, colaboradorIds,
    taskType, priority, severity, description,
  } = body;

  try {
    // La iniciativa sale de la épica real, nunca del formulario.
    const epica = await getEpica(tenant, id, epicaId);
    if (!epica) return Response.json({ error: 'Épica no encontrada.' }, { status: 404 });
    const task = await createTask(tenant, id, {
      sprintId, title, iniciativaId: epica.iniciativaId, epicaId, fase, startDate, endDate, estimatedHours,
      responsableId: await resolveResponsableId(tenant, responsableId),
      colaboradorIds: await resolveColaboradorIds(tenant, colaboradorIds),
      taskType, priority, severity, description,
      createdBy: g.identity.personId ?? null,
    });
    return Response.json({ id: task.id });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
