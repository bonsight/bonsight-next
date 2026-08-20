import { isAuthorizedForTenant } from '@/lib/labs/auth';
import { listExperiments, createExperiment } from '@/lib/labs/experiments';

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
  const { name, purpose, hypothesis, successCriteria, team } = await req.json();
  if (!name?.trim()) return Response.json({ error: 'El nombre es requerido.' }, { status: 400 });
  const meta = await createExperiment(tenant, { name, purpose, hypothesis, successCriteria, team });
  return Response.json({ ok: true, meta });
}
