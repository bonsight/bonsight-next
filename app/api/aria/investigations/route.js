import { isAuthorized } from '@/lib/aria/auth';
import { listInvestigations, createInvestigation, BUSINESS_ID } from '@/lib/aria/memory';

export async function GET() {
  if (!(await isAuthorized())) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const investigations = await listInvestigations(BUSINESS_ID);
  return Response.json({ investigations });
}

export async function POST() {
  if (!(await isAuthorized())) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { id, meta } = await createInvestigation(BUSINESS_ID);
  return Response.json({ id, meta });
}
