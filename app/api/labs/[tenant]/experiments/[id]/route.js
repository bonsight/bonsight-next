import { isAuthorizedForTenant, getCurrentLabsUser } from '@/lib/labs/auth';
import { getExperiment, setExperimentSupervisors, TASK_TRACKING_KINDS } from '@/lib/labs/experiments';
import { getUserById } from '@/lib/labs/users';

export async function GET(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const user = await getCurrentLabsUser(tenant);
  if (!user) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  const experiment = await getExperiment(tenant, id);
  if (!experiment) return Response.json({ error: 'Experimento no encontrado.' }, { status: 404 });

  // Director ve todo. Supervisor solo si está asignado a este proyecto. Registrador solo si
  // tiene al menos una prueba asignada — y en ese caso, solo ve SUS pruebas (y las ejecuciones
  // de esas pruebas), no las del resto del equipo.
  if (user.role === 'Supervisor') {
    if (!experiment.meta.supervisorIds?.includes(user.id)) {
      return Response.json({ error: 'No tenés acceso a este proyecto.' }, { status: 403 });
    }
  } else if (user.role === 'Registrador' && TASK_TRACKING_KINDS.includes(experiment.meta.projectKind)) {
    const visibleTasks = experiment.tasks.filter((t) => t.responsable === user.id);
    if (visibleTasks.length === 0) {
      return Response.json({ error: 'No tenés acceso a este proyecto.' }, { status: 403 });
    }
    experiment.tasks = visibleTasks;
    experiment.partidas = []; // presupuesto: cosa de Director/Supervisor únicamente
    experiment.civilMetrics = null; // métricas/alertas agregadas del proyecto: idem
    experiment.civilAlerts = [];
    experiment.documents = [];
    const visibleTaskIds = new Set(visibleTasks.map((t) => t.id));
    experiment.feedback = experiment.feedback.filter((f) => f.targetType === 'tarea' && visibleTaskIds.has(f.targetId));
  } else if (user.role === 'Registrador') {
    const visibleTests = experiment.tests.filter((t) => t.registradorIds?.includes(user.id));
    if (visibleTests.length === 0) {
      return Response.json({ error: 'No tenés acceso a este proyecto.' }, { status: 403 });
    }
    const visibleTestIds = new Set(visibleTests.map((t) => t.id));
    experiment.tests = visibleTests;
    experiment.executions = experiment.executions.filter((e) => visibleTestIds.has(e.testId));
    const visibleExecutionIds = new Set(experiment.executions.map((e) => e.id));
    experiment.feedback = experiment.feedback.filter((f) => (
      f.targetType === 'proyecto'
      || (f.targetType === 'prueba' && visibleTestIds.has(f.targetId))
      || (f.targetType === 'aporte' && visibleExecutionIds.has(f.targetId))
      || (!f.targetType) // feedback viejo, previo a este modelo — se trata como "proyecto general"
    ));
    experiment.documents = []; // documentación del proyecto: cosa de Director/Supervisor únicamente
  }

  return Response.json(experiment);
}

// Reasignar Supervisores de un proyecto ya creado — solo el Director.
export async function PATCH(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const user = await getCurrentLabsUser(tenant);
  if (!user || user.role !== 'Director') {
    return Response.json({ error: 'Solo un Director puede reasignar Supervisores.' }, { status: 403 });
  }
  const { supervisorIds } = await req.json();
  const ids = Array.isArray(supervisorIds) ? supervisorIds : [];
  const supervisors = await Promise.all(ids.map((sid) => getUserById(tenant, sid)));
  const validSupervisorIds = supervisors.filter((u) => u?.role === 'Supervisor').map((u) => u.id);
  try {
    const meta = await setExperimentSupervisors(tenant, id, validSupervisorIds);
    return Response.json({ ok: true, meta });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo actualizar.' }, { status: 400 });
  }
}
