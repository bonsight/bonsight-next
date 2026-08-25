import { isAuthorizedForTenant, getCurrentLabsUser } from '@/lib/labs/auth';
import { validateExecution } from '@/lib/labs/experiments';

export async function POST(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const user = await getCurrentLabsUser(tenant);
  if (!user || user.role === 'Registrador') {
    return Response.json({ error: 'Solo un Supervisor o Director puede validar.' }, { status: 403 });
  }
  const { executionId, note } = await req.json();
  if (!executionId) {
    return Response.json({ error: 'executionId es requerido.' }, { status: 400 });
  }
  try {
    const execution = await validateExecution(tenant, id, executionId, { by: user.name, note });
    return Response.json({ ok: true, execution });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo validar.' }, { status: 400 });
  }
}
