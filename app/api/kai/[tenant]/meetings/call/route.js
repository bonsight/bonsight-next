import { isAuthorizedForTenant } from '@/lib/kai/auth';
import { startMeetingCall } from '@/lib/kai/meetingCapture';
import { createConversation, appendMessages, getConversationMessages } from '@/lib/kai/memory';

export async function POST(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { dialInNumber, pin, meetingTitle, attendees, conversationId: incomingId } = await req.json();
  let conversationId = incomingId;

  try {
    if (!conversationId) {
      const created = await createConversation(tenant);
      conversationId = created.id;
    }
    const call = await startMeetingCall({ tenant, conversationId, dialInNumber, pin, meetingTitle, attendees });

    // Se persiste como mensaje real (no solo estado local) para que el botón "Obtener
    // análisis" sobreviva un refresh — antes vivía solo en React state y desaparecía.
    await appendMessages(tenant, conversationId, [{
      role: 'assistant',
      content: '',
      meetingCallStatus: { callSid: call.sid, status: 'calling', meetingTitle: meetingTitle || 'Reunión' },
    }]);
    const messages = await getConversationMessages(tenant, conversationId);

    return Response.json({ ok: true, callSid: call.sid, conversationId, messageIndex: messages.length - 1 });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo iniciar la llamada.' }, { status: 400 });
  }
}
