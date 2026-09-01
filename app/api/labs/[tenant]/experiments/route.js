import { isAuthorizedForTenant, getCurrentLabsUser } from '@/lib/labs/auth';
import { listExperimentsForUser, createExperiment, summarizeExperiment } from '@/lib/labs/experiments';
import { getUserById } from '@/lib/labs/users';

export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const user = await getCurrentLabsUser(tenant);
  if (!user) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  const experiments = await listExperimentsForUser(tenant, user);
  const enriched = await Promise.all(experiments.map((m) => summarizeExperiment(tenant, m)));
  return Response.json({ experiments: enriched });
}

export async function POST(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const user = await getCurrentLabsUser(tenant);
  if (!user) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  if (user.role !== 'Director') {
    return Response.json({ error: 'Solo un Director puede crear proyectos.' }, { status: 403 });
  }

  const {
    name, purpose, hypothesis, successCriteria, supervisorIds, code, type, hasBudget, budgetAmount, budgetCurrency,
    projectKind, fechaInicioProyecto, fechaFinProyecto, tasks, partidas,
  } = await req.json();
  if (!name?.trim()) return Response.json({ error: 'El nombre es requerido.' }, { status: 400 });

  const ids = Array.isArray(supervisorIds) ? supervisorIds : [];
  const supervisors = await Promise.all(ids.map((id) => getUserById(tenant, id)));
  const validSupervisorIds = supervisors.filter((u) => u?.role === 'Supervisor').map((u) => u.id);

  // Tareas iniciales (import de Excel, proyecto civil) — el responsable tiene que ser un
  // Supervisor o Registrador real del roster, nunca texto libre ni Director.
  let validTasks = [];
  if (projectKind === 'civil' && Array.isArray(tasks)) {
    const responsableIds = [...new Set(tasks.map((t) => t.responsable).filter(Boolean))];
    const responsables = await Promise.all(responsableIds.map((id) => getUserById(tenant, id)));
    const validResponsableIds = new Set(responsables.filter((u) => u?.role === 'Supervisor' || u?.role === 'Registrador').map((u) => u.id));
    validTasks = tasks.map((t) => ({ ...t, responsable: validResponsableIds.has(t.responsable) ? t.responsable : null }));
  }

  const meta = await createExperiment(tenant, {
    name, purpose, hypothesis, successCriteria, supervisorIds: validSupervisorIds,
    code, type, hasBudget, budgetAmount, budgetCurrency,
    projectKind, fechaInicioProyecto, fechaFinProyecto,
    tasks: validTasks, partidas: projectKind === 'civil' ? partidas : undefined,
  });
  return Response.json({ ok: true, meta });
}
