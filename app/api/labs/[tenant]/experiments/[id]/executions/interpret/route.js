import { isAuthorizedForTenant } from '@/lib/labs/auth';
import { getTests } from '@/lib/labs/experiments';
import { interpretContribution } from '@/lib/labs/contribution';

export async function POST(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const { testId, freeText, evidence } = await req.json();
  if (!testId || (!freeText?.trim() && !evidence?.length)) {
    return Response.json({ error: 'testId y freeText (o evidencia) son requeridos.' }, { status: 400 });
  }

  const tests = await getTests(tenant, id);
  const test = tests.find((t) => t.id === testId);
  if (!test) return Response.json({ error: 'Prueba no encontrada.' }, { status: 404 });

  try {
    const interpreted = await interpretContribution(test, freeText, evidence);
    return Response.json({ ok: true, ...interpreted });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo interpretar el aporte.' }, { status: 400 });
  }
}
