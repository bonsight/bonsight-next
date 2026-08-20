import { isAuthorizedForTenant } from '@/lib/labs/auth';
import { addExecution } from '@/lib/labs/experiments';

export async function POST(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const { testId, contributor, role, values, tag, evidence, missingFields, note } = await req.json();
  if (!testId || !contributor?.trim()) {
    return Response.json({ error: 'testId y contributor son requeridos.' }, { status: 400 });
  }
  try {
    const execution = await addExecution(tenant, id, { testId, contributor, role, values, tag, evidence, missingFields, note });
    return Response.json({ ok: true, execution });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo guardar el aporte.' }, { status: 400 });
  }
}
