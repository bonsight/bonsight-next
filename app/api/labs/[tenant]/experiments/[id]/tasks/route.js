import { isAuthorizedForTenant, getCurrentLabsUser } from '@/lib/labs/auth';
import { getExperimentMeta, addTask, projectInactiveMessage } from '@/lib/labs/experiments';
import { getUserById } from '@/lib/labs/users';

// Crear una tarea: Director, o Supervisor asignado a este proyecto (mismo criterio que crear
// Pruebas en un proyecto experimental). El responsable tiene que ser Supervisor o Registrador
// del roster — nunca Director, nunca texto libre.
export async function POST(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const user = await getCurrentLabsUser(tenant);
  if (!user) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  const meta = await getExperimentMeta(tenant, id);
  if (!meta) return Response.json({ error: 'Experimento no encontrado.' }, { status: 404 });

  const isSupervisorOnProject = user.role === 'Supervisor' && meta.supervisorIds?.includes(user.id);
  if (user.role !== 'Director' && !isSupervisorOnProject) {
    return Response.json({ error: 'Solo el Director o un Supervisor asignado a este proyecto puede crear tareas.' }, { status: 403 });
  }
  const inactiveMsg = projectInactiveMessage(meta);
  if (inactiveMsg) return Response.json({ error: inactiveMsg }, { status: 409 });

  const { fase, nombre, responsable, fechaInicio, fechaFin, duracionDias, partidaId } = await req.json();

  let validResponsable = null;
  if (responsable) {
    const u = await getUserById(tenant, responsable);
    if (!u || (u.role !== 'Supervisor' && u.role !== 'Registrador')) {
      return Response.json({ error: 'El responsable tiene que ser un Supervisor o Registrador del equipo.' }, { status: 400 });
    }
    validResponsable = u.id;
  }

  try {
    const task = await addTask(tenant, id, { fase, nombre, responsable: validResponsable, fechaInicio, fechaFin, duracionDias, partidaId });
    return Response.json({ ok: true, task });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo crear la tarea.' }, { status: 400 });
  }
}
