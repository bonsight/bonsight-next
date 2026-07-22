import { isAuthorizedForTenant } from '@/lib/kai/auth';
import { startMeetingCall } from '@/lib/kai/meetingCapture';
import { createConversation } from '@/lib/kai/memory';

export async function POST(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { dialInNumber, pin, meetingTitle, conversationId: incomingId } = await req.json();
  let conversationId = incomingId;

  try {
    if (!conversationId) {
      const created = await createConversation(tenant);
      conversationId = created.id;
    }
    const call = await startMeetingCall({ tenant, conversationId, dialInNumber, pin, meetingTitle });
    return Response.json({ ok: true, callSid: call.sid, conversationId });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo iniciar la llamada.' }, { status: 400 });
  }
}
