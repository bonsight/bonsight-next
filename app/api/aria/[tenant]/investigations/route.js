import { isAuthorized } from '@/lib/aria/auth';
import { listInvestigations, createInvestigation } from '@/lib/aria/memory';

export async function GET(req, { params }) {
  if (!(await isAuthorized())) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { tenant } = await params;
  const investigations = await listInvestigations(tenant);
  return Response.json({ investigations });
}

export async function POST(req, { params }) {
  if (!(await isAuthorized())) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { tenant } = await params;
  const { id, meta } = await createInvestigation(tenant);
  return Response.json({ id, meta });
}
