import { isAuthorizedForTenant, getCurrentLabsUser } from '@/lib/labs/auth';
import { addExecution, getTests } from '@/lib/labs/experiments';

export async function POST(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const user = await getCurrentLabsUser(tenant);
  if (!user) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  const { testId, values, tag, evidence, missingFields, note } = await req.json();
  if (!testId) {
    return Response.json({ error: 'testId es requerido.' }, { status: 400 });
  }

  if (user.role === 'Registrador') {
    const tests = await getTests(tenant, id);
    const test = tests.find((t) => t.id === testId);
    if (!test?.registradorIds?.includes(user.id)) {
      return Response.json({ error: 'No estás asignado a esta prueba.' }, { status: 403 });
    }
  }

  try {
    // contributor/role vienen SIEMPRE de la sesión verificada, nunca del body — así nadie
    // puede aportar haciéndose pasar por otra persona o rol.
    const execution = await addExecution(tenant, id, {
      testId, contributor: user.name, role: user.role, values, tag, evidence, missingFields, note,
    });
    return Response.json({ ok: true, execution });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo guardar el aporte.' }, { status: 400 });
  }
}
