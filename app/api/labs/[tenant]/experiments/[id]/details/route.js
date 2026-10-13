import { isAuthorizedForTenant, getCurrentLabsUser } from '@/lib/labs/auth';
import { updateProjectDetails, getProjectDetailsHistory, getExperimentMeta } from '@/lib/labs/experiments';

// Código, tipo y presupuesto — y su historial de cambios — son consultables y editables por el
// Director, o por un Supervisor asignado a ESTE proyecto puntual (mismo criterio que crear
// pruebas/gestionar tareas — ver requireDirectorOrSupervisor en otras routes de experiments).
async function requireDirectorOrAssignedSupervisor(tenant, id) {
  if (!(await isAuthorizedForTenant(tenant))) return { error: Response.json({ error: 'No autorizado.' }, { status: 401 }) };
  const user = await getCurrentLabsUser(tenant);
  if (!user) return { error: Response.json({ error: 'No autorizado.' }, { status: 401 }) };
  if (user.role === 'Director') return { user };
  const meta = await getExperimentMeta(tenant, id);
  if (user.role === 'Supervisor' && meta?.supervisorIds?.includes(user.id)) return { user };
  return { error: Response.json({ error: 'Solo un Director, o un Supervisor asignado a este proyecto, puede ver o editar estos datos.' }, { status: 403 }) };
}

export async function GET(req, { params }) {
  const { tenant, id } = await params;
  const { error } = await requireDirectorOrAssignedSupervisor(tenant, id);
  if (error) return error;
  const history = await getProjectDetailsHistory(tenant, id);
  return Response.json({ history });
}

export async function PATCH(req, { params }) {
  const { tenant, id } = await params;
  const { error, user } = await requireDirectorOrAssignedSupervisor(tenant, id);
  if (error) return error;

  const { code, type, hasBudget, budgetAmount, budgetCurrency, status, purpose, hypothesis, successCriteria } = await req.json();
  try {
    const { meta } = await updateProjectDetails(tenant, id, { code, type, hasBudget, budgetAmount, budgetCurrency, status, purpose, hypothesis, successCriteria }, user.name);
    return Response.json({ ok: true, meta });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo actualizar.' }, { status: 400 });
  }
}
