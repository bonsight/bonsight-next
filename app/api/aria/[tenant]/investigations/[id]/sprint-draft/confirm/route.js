import { isAuthorizedForTenant } from '@/lib/aria/auth';
import { getIntelligenceSources } from '@/lib/kai/intelligenceSources';
import { createProyecto, createIniciativa, createTask, createSprint, BONSIGHT_CLIENTE_ID } from '@/lib/aria/board';

async function getNotionToken(tenant) {
  const sources = await getIntelligenceSources(tenant);
  const notionSource = sources.find((s) => s.id === 'notion');
  if (!notionSource || notionSource.status !== 'active' || !notionSource.config?.integrationToken) return null;
  return notionSource.config.integrationToken;
}

// Confirma UNA agrupación: crea Proyecto/Iniciativa si son nuevos, crea el sprint
// destino si hace falta uno nuevo, y crea las tareas incluidas — nada de esto pasa
// hasta este único punto de escritura real.
export async function POST(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const token = await getNotionToken(tenant);
  if (!token) {
    return Response.json({ error: 'Notion no está configurado para este tenant.' }, { status: 400 });
  }

  const { proyecto, iniciativa, tasks, sprintId, createNewSprint } = await req.json();

  try {
    let targetSprintId = sprintId;
    if (createNewSprint) {
      const today = new Date();
      const end = new Date(today.getTime() + 13 * 24 * 60 * 60 * 1000);
      const iso = (d) => d.toISOString().slice(0, 10);
      const sprint = await createSprint(token, { startDate: iso(today), endDate: iso(end) });
      targetSprintId = sprint.id;
    }
    if (!targetSprintId) throw new Error('Falta el sprint destino.');

    let proyectoId = proyecto?.id ?? null;
    if (!proyectoId) {
      if (!proyecto?.name?.trim()) throw new Error('Falta el nombre del proyecto nuevo.');
      proyectoId = await createProyecto(token, { name: proyecto.name, clienteId: BONSIGHT_CLIENTE_ID });
    }

    let iniciativaId = iniciativa?.id ?? null;
    if (!iniciativaId) {
      if (!iniciativa?.name?.trim()) throw new Error('Falta el nombre de la iniciativa nueva.');
      iniciativaId = await createIniciativa(token, { name: iniciativa.name, proyectoId });
    }

    const taskIds = [];
    for (const t of tasks ?? []) {
      if (!t.title?.trim()) continue;
      const taskId = await createTask(token, targetSprintId, {
        title: t.title,
        priority: t.priority,
        responsableId: t.responsableId || undefined,
        proyectoId,
        iniciativaId,
      });
      taskIds.push(taskId);
    }

    return Response.json({ ok: true, sprintId: targetSprintId, proyectoId, iniciativaId, taskIds });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo confirmar la agrupación.' }, { status: 400 });
  }
}
