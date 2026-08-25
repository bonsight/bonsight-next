import { isAuthorizedForTenant, getCurrentLabsUser } from '@/lib/labs/auth';
import { listExperiments, createExperiment } from '@/lib/labs/experiments';
import { getUserById } from '@/lib/labs/users';

export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const experiments = await listExperiments(tenant);
  return Response.json({ experiments });
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

  const { name, purpose, hypothesis, successCriteria, supervisorIds } = await req.json();
  if (!name?.trim()) return Response.json({ error: 'El nombre es requerido.' }, { status: 400 });

  const ids = Array.isArray(supervisorIds) ? supervisorIds : [];
  const supervisors = await Promise.all(ids.map((id) => getUserById(tenant, id)));
  const validSupervisorIds = supervisors.filter((u) => u?.role === 'Supervisor').map((u) => u.id);

  const meta = await createExperiment(tenant, { name, purpose, hypothesis, successCriteria, supervisorIds: validSupervisorIds });
  return Response.json({ ok: true, meta });
}
