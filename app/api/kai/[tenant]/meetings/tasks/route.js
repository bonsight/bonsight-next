import { isAuthorizedForTenant } from '@/lib/kai/auth';
import { getConversationMessages, updateMessageAt } from '@/lib/kai/memory';

// Corrige el owner de una tarea ya analizada — pensado para el caso en que Kai deja la
// duda explícita en possibleOwners y un humano confirma quién es realmente.
export async function PATCH(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { conversationId, messageIndex, itemIndex, owner } = await req.json();
  if (!conversationId || typeof messageIndex !== 'number' || typeof itemIndex !== 'number' || !owner?.trim()) {
    return Response.json({ error: 'conversationId, messageIndex, itemIndex y owner son requeridos.' }, { status: 400 });
  }

  try {
    const messages = await getConversationMessages(tenant, conversationId);
    const msg = messages[messageIndex];
    const task = msg?.meetingAnalysis?.tasks?.[itemIndex];
    if (!task) throw new Error('Tarea no encontrada.');

    const tasks = msg.meetingAnalysis.tasks.map((t, i) => (i === itemIndex ? { ...t, owner: owner.trim(), possibleOwners: [] } : t));
    const updated = await updateMessageAt(tenant, conversationId, messageIndex, {
      meetingAnalysis: { ...msg.meetingAnalysis, tasks },
    });
    return Response.json({ meetingAnalysis: updated.meetingAnalysis });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo actualizar la tarea.' }, { status: 400 });
  }
}
