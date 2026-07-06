import { isAuthorizedForTenant } from '@/lib/aria/auth';
import { listInvestigations, createInvestigation } from '@/lib/aria/memory';

export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const investigations = await listInvestigations(tenant);
  return Response.json({ investigations });
}

export async function POST(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { id, meta } = await createInvestigation(tenant);
  return Response.json({ id, meta });
}
