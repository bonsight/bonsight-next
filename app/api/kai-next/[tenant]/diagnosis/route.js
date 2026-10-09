import { isAuthorizedForTenant } from '@/lib/kaiNext/auth';
import { getDiagnosis, generateDiagnosis } from '@/lib/kai/diagnosis';

// Mismo backend que app/api/kai/[tenant]/diagnosis/route.js (lib/kai/diagnosis.js, mismo
// Redis key) — acá con el gate de auth de Kai Next, para que una persona del cliente con
// access.kaiNext pueda pedir "Actualizar Contexto" sin depender de un admin de Bonsight.
export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  return Response.json(await getDiagnosis(tenant));
}

export async function POST(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const outcome = await generateDiagnosis(tenant);
  if (!outcome.ok) return Response.json({ error: outcome.error }, { status: outcome.status });
  return Response.json(outcome.result);
}
