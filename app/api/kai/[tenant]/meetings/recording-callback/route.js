import { after } from 'next/server';
import { processRecording } from '@/lib/kai/meetingCapture';

// Descargar la grabación + Whisper + Claude puede tardar más que el timeout por default —
// se corre en after() para no bloquear la respuesta a Twilio. 300s = el default máximo
// configurado en Vercel para este proyecto (ver Function Max Duration en Project Settings).
export const maxDuration = 300;

// Sin auth de tenant: es un webhook de Twilio, no manda cookies.
export async function POST(req) {
  const form = await req.formData();
  const callSid = form.get('CallSid');
  const recordingUrl = form.get('RecordingUrl');
  const status = form.get('RecordingStatus');

  if (status === 'completed' && callSid && recordingUrl) {
    after(() =>
      processRecording({ callSid, recordingUrl }).catch((err) => {
        console.error(`[meetings/recording-callback] ${callSid}:`, err?.message || err);
      })
    );
  }

  return new Response('', { status: 200 });
}
