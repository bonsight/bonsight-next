import { isAuthorizedForTenant } from '@/lib/labs/auth';
import { getExperiment } from '@/lib/labs/experiments';

export async function GET(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const experiment = await getExperiment(tenant, id);
  if (!experiment) return Response.json({ error: 'Experimento no encontrado.' }, { status: 404 });
  return Response.json(experiment);
}
