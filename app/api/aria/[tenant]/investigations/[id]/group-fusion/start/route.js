import { isAuthorizedForTenant } from '@/lib/aria/auth';
import { appendInvestigationMessages, getInvestigation } from '@/lib/aria/memory';

export async function POST(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  await appendInvestigationMessages(tenant, id, [{ role: 'assistant', content: '', groupFusion: {} }]);
  const investigation = await getInvestigation(tenant, id);
  return Response.json({ messages: investigation?.messages ?? [] });
}
