import { checkParticipantsToken } from '@/lib/kaiNext/recall';
import { handleParticipantEvent } from '@/lib/kaiNext/meetingBot';

// Avisos en vivo de Recall: alguien entró o salió de la reunión donde está Kai. Se configuran por
// bot al crearlo (realtime_endpoints en createBot); el token de la ruta los autentica.
export async function POST(req, { params }) {
  const { token } = await params;
  if (!checkParticipantsToken(token)) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  let payload;
  try { payload = await req.json(); } catch { return Response.json({ error: 'JSON inválido.' }, { status: 400 }); }
  const botId = payload?.data?.bot?.id;
  const inner = payload?.data?.data;
  if (!botId || !inner?.participant) return Response.json({ ok: true, ignored: true });
  try {
    await handleParticipantEvent(botId, payload.event, inner.participant, inner.timestamp);
  } catch (err) {
    console.error('[recall participants]', err.message);
  }
  return Response.json({ ok: true });
}
