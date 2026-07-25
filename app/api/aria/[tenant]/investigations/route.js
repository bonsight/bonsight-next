import { isAuthorizedForTenant } from '@/lib/aria/auth';
import { listInvestigations, createInvestigation } from '@/lib/aria/memory';

export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const owner = new URL(req.url).searchParams.get('usr') || undefined;
  const investigations = await listInvestigations(tenant, owner);
  return Response.json({ investigations });
}

export async function POST(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { id, meta } = await createInvestigation(tenant, body?.usr || undefined);
  return Response.json({ id, meta });
}
