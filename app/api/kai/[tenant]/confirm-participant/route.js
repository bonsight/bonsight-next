import { isAuthorizedForTenant } from '@/lib/kai/auth';
import { appendMessages, updateConversationMeta } from '@/lib/kai/memory';
import { addOrUpdateKnownParticipant } from '@/lib/kai/participants';

export async function POST(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const { conversationId, participantName, participantRole, confirmed } = await req.json();

  if (!conversationId) {
    return Response.json({ error: 'conversationId requerido' }, { status: 400 });
  }

  if (confirmed && participantName) {
    const firstName = participantName.split(/\s+/)[0];

    await Promise.all([
      updateConversationMeta(tenant, conversationId, {
        confirmedParticipantName: participantName,
        confirmedParticipantRole: participantRole ?? null,
      }),
      addOrUpdateKnownParticipant(tenant, { name: participantName, role: participantRole }),
    ]);

    const reply = `Perfecto ${firstName}. Tengo contexto previo de tus conversaciones anteriores y lo consideraré en esta sesión. ¿Cuál es tu rol en la empresa actualmente?`;

    await appendMessages(tenant, conversationId, [
      { role: 'user', content: `Sí, soy ${firstName}` },
      { role: 'assistant', content: reply },
    ]);

    return Response.json({ reply, confirmed: true, participantName, conversationId });
  }

  // Denied — ask for full name
  const reply = 'Entendido. ¿Cuál es tu nombre completo?';

  await appendMessages(tenant, conversationId, [
    { role: 'user', content: 'No, soy otra persona' },
    { role: 'assistant', content: reply },
  ]);

  return Response.json({ reply, confirmed: false, conversationId });
}
