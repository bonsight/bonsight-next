import { isAuthorizedForTenant } from '@/lib/kai/auth';
import { getCallMeta } from '@/lib/kai/meetingCapture';
import { updateMessageAt } from '@/lib/kai/memory';

export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const url = new URL(req.url);
  const callSid = url.searchParams.get('callSid');
  const conversationId = url.searchParams.get('conversationId');
  const messageIndex = url.searchParams.get('messageIndex');
  if (!callSid) return Response.json({ error: 'callSid es requerido.' }, { status: 400 });

  const meta = await getCallMeta(callSid);
  if (!meta) return Response.json({ error: 'No se encontró esa llamada.' }, { status: 404 });

  // Persiste el estado actual en el mensaje real — así un refresh no vuelve a "calling".
  if (conversationId && messageIndex !== null) {
    try {
      await updateMessageAt(tenant, conversationId, Number(messageIndex), {
        meetingCallStatus: { callSid, ...meta },
      });
    } catch { /* si el mensaje no existe más, no bloquea la respuesta de status */ }
  }

  return Response.json(meta);
}
