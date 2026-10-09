import { isKaiAuthorized } from '@/lib/kai/auth';
import { getDiagnosis, generateDiagnosis } from '@/lib/kai/diagnosis';

export async function GET(req, { params }) {
  const { tenant } = await params;
  return Response.json(await getDiagnosis(tenant));
}

export async function POST(req, { params }) {
  if (!(await isKaiAuthorized())) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  const { tenant } = await params;
  const outcome = await generateDiagnosis(tenant);
  if (!outcome.ok) return Response.json({ error: outcome.error }, { status: outcome.status });
  return Response.json(outcome.result);
}
