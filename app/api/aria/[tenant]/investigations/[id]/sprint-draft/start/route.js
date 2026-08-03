import { isAuthorizedForTenant } from '@/lib/aria/auth';
import { appendInvestigationMessages, getInvestigation } from '@/lib/aria/memory';

// Agrega el mensaje-puntero "sprintDraft" a la conversación — no genera nada todavía,
// SprintDraftReviewPresentation dispara la generación real al montarse (mismo patrón
// que SprintBoardPresentation con el mensaje "board").
export async function POST(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const groupIds = Array.isArray(body?.groupIds) ? body.groupIds : undefined;

  await appendInvestigationMessages(tenant, id, [{ role: 'assistant', content: '', sprintDraft: { groupIds } }]);
  const investigation = await getInvestigation(tenant, id);
  return Response.json({ messages: investigation?.messages ?? [] });
}
