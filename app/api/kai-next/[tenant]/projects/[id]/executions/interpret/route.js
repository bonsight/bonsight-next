import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getTests } from '@/lib/kaiNext/projects';
import { interpretContribution } from '@/lib/kaiNext/projectContribution';

export async function POST(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) {
    return Response.json({ error: 'Proyectos no está habilitado para tu usuario.' }, { status: 403 });
  }

  const { testId, freeText, evidence } = await req.json();
  if (!testId || (!freeText?.trim() && !evidence?.length)) {
    return Response.json({ error: 'testId y freeText (o evidencia) son requeridos.' }, { status: 400 });
  }

  const tests = await getTests(tenant, id);
  const test = tests.find((t) => t.id === testId);
  if (!test) return Response.json({ error: 'Prueba no encontrada.' }, { status: 404 });

  try {
    const interpreted = await interpretContribution(tenant, test, freeText, evidence);
    return Response.json(interpreted);
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo interpretar el aporte.' }, { status: 400 });
  }
}
