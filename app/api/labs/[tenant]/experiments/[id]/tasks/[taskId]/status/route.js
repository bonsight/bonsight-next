import { isAuthorizedForTenant, getCurrentLabsUser } from '@/lib/labs/auth';
import { getExperimentMeta, getTasksList, setTaskStatus } from '@/lib/labs/experiments';

// Mover una tarea en el Canvas (Por hacer/Haciendo/Terminado) — mismo criterio de permisos
// que el toggle de progreso en Lista/Gantt: el responsable de la tarea, o Director/Supervisor
// del proyecto.
export async function PATCH(req, { params }) {
  const { tenant, id, taskId } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const user = await getCurrentLabsUser(tenant);
  if (!user) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  const meta = await getExperimentMeta(tenant, id);
  if (!meta) return Response.json({ error: 'Experimento no encontrado.' }, { status: 404 });

  const isSupervisorOnProject = user.role === 'Supervisor' && meta.supervisorIds?.includes(user.id);
  if (user.role !== 'Director' && !isSupervisorOnProject) {
    const tasks = await getTasksList(tenant, id);
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.responsable !== user.id) {
      return Response.json({ error: 'Solo el responsable de esta tarea, o el Director/Supervisor del proyecto, puede moverla.' }, { status: 403 });
    }
  }

  const { status } = await req.json();
  try {
    const task = await setTaskStatus(tenant, id, taskId, status, user.name);
    return Response.json({ ok: true, task });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo actualizar el estado.' }, { status: 400 });
  }
}
