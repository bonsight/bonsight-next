import { isAuthorized } from '@/lib/aria/auth';
import { getInvestigation, BUSINESS_ID } from '@/lib/aria/memory';

export async function GET(req, { params }) {
  if (!(await isAuthorized())) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { id } = await params;
  const investigation = await getInvestigation(BUSINESS_ID, id);
  if (!investigation) {
    return Response.json({ error: 'No encontrada.' }, { status: 404 });
  }

  return Response.json(investigation);
}
