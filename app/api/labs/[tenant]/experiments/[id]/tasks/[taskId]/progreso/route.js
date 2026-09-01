import { isAuthorizedForTenant, getCurrentLabsUser } from '@/lib/labs/auth';
import { getExperimentMeta, getTasksList, setTaskProgreso, projectInactiveMessage } from '@/lib/labs/experiments';

// Actualizar % de avance: el responsable de ESA tarea (Supervisor o Registrador), o el
// Director/Supervisor del proyecto (supervisión, mismo criterio que validar un aporte).
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
      return Response.json({ error: 'Solo el responsable de esta tarea, o el Director/Supervisor del proyecto, puede actualizar el avance.' }, { status: 403 });
    }
  }

  const inactiveMsg = projectInactiveMessage(meta);
  if (inactiveMsg) return Response.json({ error: inactiveMsg }, { status: 409 });

  const { progreso } = await req.json();
  try {
    const task = await setTaskProgreso(tenant, id, taskId, progreso, user.name);
    return Response.json({ ok: true, task });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo actualizar el avance.' }, { status: 400 });
  }
}
