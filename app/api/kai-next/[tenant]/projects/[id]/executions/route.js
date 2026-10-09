import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getProjectMeta, getTests, addExecution, projectInactiveMessage, resolveProjectAccessLevel } from '@/lib/kaiNext/projects';

export async function POST(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) {
    return Response.json({ error: 'Proyectos no está habilitado para tu usuario.' }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }
  const { testId } = body;
  if (!testId) return Response.json({ error: 'testId es requerido.' }, { status: 400 });

  const { isSupervisorLevel } = resolveProjectAccessLevel(identity);
  if (!isSupervisorLevel) {
    const tests = await getTests(tenant, id);
    const test = tests.find((t) => t.id === testId);
    if (!test?.registradorIds?.includes(identity.personId)) {
      return Response.json({ error: 'No estás asignado a esta prueba.' }, { status: 403 });
    }
  }

  const meta = await getProjectMeta(tenant, id);
  if (!meta) return Response.json({ error: 'Proyecto no encontrado.' }, { status: 404 });
  const inactive = projectInactiveMessage(meta);
  if (inactive) return Response.json({ error: inactive }, { status: 400 });

  try {
    // contributor viene SIEMPRE de la sesión verificada, nunca del body.
    const execution = await addExecution(tenant, id, { ...body, contributor: identity.personName ?? 'Alguien' });
    return Response.json({ execution });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
