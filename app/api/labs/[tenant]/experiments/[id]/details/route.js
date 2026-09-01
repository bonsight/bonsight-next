import { isAuthorizedForTenant, getCurrentLabsUser } from '@/lib/labs/auth';
import { updateProjectDetails, getProjectDetailsHistory } from '@/lib/labs/experiments';

// Código, tipo y presupuesto — y su historial de cambios — son consultables y editables
// SOLO por el Director. A diferencia de supervisorIds/registradorIds, acá no hay excepción
// para Supervisor.
async function requireDirector(tenant) {
  if (!(await isAuthorizedForTenant(tenant))) return { error: Response.json({ error: 'No autorizado.' }, { status: 401 }) };
  const user = await getCurrentLabsUser(tenant);
  if (!user || user.role !== 'Director') {
    return { error: Response.json({ error: 'Solo un Director puede ver o editar estos datos.' }, { status: 403 }) };
  }
  return { user };
}

export async function GET(req, { params }) {
  const { tenant, id } = await params;
  const { error } = await requireDirector(tenant);
  if (error) return error;
  const history = await getProjectDetailsHistory(tenant, id);
  return Response.json({ history });
}

export async function PATCH(req, { params }) {
  const { tenant, id } = await params;
  const { error, user } = await requireDirector(tenant);
  if (error) return error;

  const { code, type, hasBudget, budgetAmount, budgetCurrency, status } = await req.json();
  try {
    const { meta } = await updateProjectDetails(tenant, id, { code, type, hasBudget, budgetAmount, budgetCurrency, status }, user.name);
    return Response.json({ ok: true, meta });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo actualizar.' }, { status: 400 });
  }
}
