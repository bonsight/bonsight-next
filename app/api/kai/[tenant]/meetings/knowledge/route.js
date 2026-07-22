import { isAuthorizedForTenant, isKaiAuthorized } from '@/lib/kai/auth';
import { acceptKnowledgeItem } from '@/lib/kai/meetingAnalysis';
import { getConversationMessages, updateMessageAt } from '@/lib/kai/memory';

export async function PATCH(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { conversationId, messageIndex, itemIndex, decision, targetTenant, editedStatement } = await req.json();
  if (!conversationId || typeof messageIndex !== 'number' || typeof itemIndex !== 'number' || !['accept', 'reject'].includes(decision)) {
    return Response.json({ error: 'conversationId, messageIndex, itemIndex y decision son requeridos.' }, { status: 400 });
  }

  // Enrutar el conocimiento a un tenant distinto de la reunión (ej. una reunión sobre
  // un cliente corrida desde el Kai interno) requiere el admin global — no alcanza con
  // el acceso de un solo tenant.
  const destination = targetTenant || tenant;
  if (destination !== tenant && !(await isKaiAuthorized())) {
    return Response.json({ error: 'No autorizado para asignar conocimiento a otro tenant.' }, { status: 401 });
  }

  try {
    const messages = await getConversationMessages(tenant, conversationId);
    const msg = messages[messageIndex];
    const original = msg?.meetingAnalysis?.knowledge?.[itemIndex];
    if (!original) throw new Error('Ítem de conocimiento no encontrado.');
    if (original.status !== 'pending') throw new Error('Este ítem ya fue procesado.');

    const item = editedStatement?.trim() ? { ...original, statement: editedStatement.trim() } : original;
    if (decision === 'accept') await acceptKnowledgeItem(destination, item, conversationId);

    const knowledge = msg.meetingAnalysis.knowledge.map((k, i) => (i === itemIndex ? { ...item, status: decision === 'accept' ? 'accepted' : 'rejected', acceptedTenant: decision === 'accept' ? destination : undefined } : k));
    const updated = await updateMessageAt(tenant, conversationId, messageIndex, {
      meetingAnalysis: { ...msg.meetingAnalysis, knowledge },
    });
    return Response.json({ meetingAnalysis: updated.meetingAnalysis });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo actualizar el ítem.' }, { status: 400 });
  }
}
