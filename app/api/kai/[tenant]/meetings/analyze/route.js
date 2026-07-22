import { isAuthorizedForTenant } from '@/lib/kai/auth';
import { analyzeMeetingTranscript } from '@/lib/kai/meetingAnalysis';
import { appendMessages, getConversationMessages, createConversation } from '@/lib/kai/memory';

export async function POST(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { transcript, meetingTitle, conversationId: incomingId } = await req.json();
  let conversationId = incomingId;

  try {
    if (!conversationId) {
      const created = await createConversation(tenant);
      conversationId = created.id;
    }
    const analysis = await analyzeMeetingTranscript(tenant, { transcript, meetingTitle });
    const message = { role: 'assistant', content: '', meetingAnalysis: analysis };
    await appendMessages(tenant, conversationId, [message]);
    const messages = await getConversationMessages(tenant, conversationId);
    return Response.json({ message, messageIndex: messages.length - 1, conversationId });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo analizar la reunión.' }, { status: 400 });
  }
}
