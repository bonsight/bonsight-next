import { after } from 'next/server';
import { verifyRecallWebhook } from '@/lib/kaiNext/recall';
import { lookupBot, setKaiStatus, processKaiRecording } from '@/lib/kaiNext/meetingBot';

// Avisos de Recall.ai (vía Svix) sobre el bot de Kai: entró, está grabando, terminó, falló.
// Se configura en el panel de Recall apuntando a https://kai.bonsight.co/api/webhooks/recall,
// con el secreto en RECALL_WEBHOOK_SECRET. Responde rápido (Svix reintenta si tarda) y el
// procesamiento pesado de bot.done corre después de responder (after()).
export const maxDuration = 300;

const STATUS_BY_EVENT = {
  'bot.joining_call': 'joining_call',
  'bot.in_waiting_room': 'in_waiting_room',
  'bot.in_call_not_recording': 'in_call_not_recording',
  'bot.in_call_recording': 'in_call_recording',
  'bot.recording_permission_denied': 'in_call_not_recording',
  'bot.call_ended': 'call_ended',
  'bot.fatal': 'fatal',
};

export async function POST(req) {
  const raw = await req.text();
  const check = verifyRecallWebhook(req.headers, raw);
  if (!check.ok) {
    console.error('[recall webhook] rechazado:', check.reason);
    return Response.json({ error: check.reason }, { status: 401 });
  }
  let payload;
  try { payload = JSON.parse(raw); } catch { return Response.json({ error: 'JSON inválido.' }, { status: 400 }); }

  const event = payload.event;
  const botId = payload.data?.bot?.id ?? payload.data?.bot_id;
  if (!event || !botId) return Response.json({ ok: true, ignored: true });
  const ref = (await lookupBot(botId)) ?? (payload.data?.bot?.metadata?.tenant ? payload.data.bot.metadata : null);
  if (!ref?.tenant || !ref?.meetingId) return Response.json({ ok: true, ignored: 'bot desconocido' });

  if (event === 'bot.done' || event === 'transcript.done') {
    after(() => processKaiRecording(ref.tenant, ref.meetingId, botId));
  } else if (event === 'transcript.failed') {
    await setKaiStatus(ref.tenant, ref.meetingId, botId, 'error', 'Recall no pudo transcribir la grabación.');
  } else if (STATUS_BY_EVENT[event]) {
    const subCode = payload.data?.data?.sub_code ?? null;
    await setKaiStatus(ref.tenant, ref.meetingId, botId, STATUS_BY_EVENT[event], event === 'bot.fatal' ? (subCode || 'El bot no pudo entrar a la reunión.') : null);
  }
  return Response.json({ ok: true });
}
