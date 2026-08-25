import { isAuthorizedForTenant, getCurrentLabsUser } from '@/lib/labs/auth';
import { getExperiment, setExperimentSupervisors } from '@/lib/labs/experiments';
import { getUserById } from '@/lib/labs/users';

export async function GET(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const experiment = await getExperiment(tenant, id);
  if (!experiment) return Response.json({ error: 'Experimento no encontrado.' }, { status: 404 });
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
