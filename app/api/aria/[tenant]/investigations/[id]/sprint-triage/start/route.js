import { isAuthorizedForTenant } from '@/lib/aria/auth';
import { appendInvestigationMessages, getInvestigation } from '@/lib/aria/memory';

// Agrega el mensaje-puntero "sprintTriage" a la conversación — es el primer paso del
// flujo (Triage → borrador de sprint), mismo patrón que "board"/"sprintDraft": el
// mensaje solo marca el lugar, SprintTriagePresentation dispara la generación real.
export async function POST(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  await appendInvestigationMessages(tenant, id, [{ role: 'assistant', content: '', sprintTriage: {} }]);
  const investigation = await getInvestigation(tenant, id);
  return Response.json({ messages: investigation?.messages ?? [] });
}
