import { isAuthorizedForTenant } from '@/lib/labs/auth';
import { validateExecution } from '@/lib/labs/experiments';

export async function POST(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const { executionId, by, note } = await req.json();
  if (!executionId || !by?.trim()) {
    return Response.json({ error: 'executionId y by son requeridos.' }, { status: 400 });
  }
  try {
    const execution = await validateExecution(tenant, id, executionId, { by, note });
    return Response.json({ ok: true, execution });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo validar.' }, { status: 400 });
  }
}
