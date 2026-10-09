import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { validateExecution, resolveProjectAccessLevel } from '@/lib/kaiNext/projects';

export async function POST(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) {
    return Response.json({ error: 'Proyectos no está habilitado para tu usuario.' }, { status: 403 });
  }
  const { isSupervisorLevel } = resolveProjectAccessLevel(identity);
  if (!isSupervisorLevel) {
    return Response.json({ error: 'Solo un Supervisor o Director puede validar.' }, { status: 403 });
  }

  const { executionId, note } = await req.json();
  if (!executionId) return Response.json({ error: 'executionId es requerido.' }, { status: 400 });

  try {
    const execution = await validateExecution(tenant, id, executionId, { by: identity.personName ?? 'Alguien', note });
    return Response.json({ execution });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
