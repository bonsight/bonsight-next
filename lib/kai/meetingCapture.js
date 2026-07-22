import Twilio from 'twilio';
import OpenAI from 'openai';
import { Redis } from '@upstash/redis';
import { appendMessages } from '@/lib/kai/memory';
import { analyzeMeetingTranscript } from '@/lib/kai/meetingAnalysis';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const callMetaKey = (callSid) => `kai:meeting_call:${callSid}`;
const CALL_META_TTL_SECONDS = 60 * 60 * 12; // una reunión no debería durar más de 12h

function getBaseUrl() {
  const url = process.env.PUBLIC_BASE_URL || (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`);
  if (!url) throw new Error('Falta PUBLIC_BASE_URL (o VERCEL_URL) — Twilio necesita una URL pública para los webhooks. No funciona desde localhost.');
  return url;
}

function twilioClient() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new Error('Twilio no está configurado (faltan TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN).');
  }
  return Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

async function setCallMeta(callSid, updates) {
  const current = (await kv.get(callMetaKey(callSid))) ?? {};
  const next = { ...current, ...updates };
  await kv.set(callMetaKey(callSid), next, { ex: CALL_META_TTL_SECONDS });
  return next;
}

export async function getCallMeta(callSid) {
  return kv.get(callMetaKey(callSid));
}

// Kai nunca habla ni interviene — solo marca, entra con el PIN (por DTMF) y graba en silencio.
export async function startMeetingCall({ tenant, conversationId, dialInNumber, pin, meetingTitle }) {
  if (!process.env.TWILIO_PHONE_NUMBER) throw new Error('Falta TWILIO_PHONE_NUMBER.');
  if (!dialInNumber?.trim()) throw new Error('El número de dial-in es requerido.');

  const baseUrl = getBaseUrl();
  const client = twilioClient();
  // 'w' = pausa de 0.5s en el string de DTMF de Twilio — le da tiempo al prompt de Meet a arrancar.
  // Acepta el PIN con o sin '#' final y con o sin espacios (tal cual lo copia el usuario de Meet).
  const cleanedPin = pin?.trim().replace(/[^0-9#*]/g, '').replace(/#+$/, '');
  const digits = cleanedPin ? `ww${cleanedPin}#` : undefined;

  const call = await client.calls.create({
    to: dialInNumber.trim(),
    from: process.env.TWILIO_PHONE_NUMBER,
    url: `${baseUrl}/api/kai/${tenant}/meetings/twiml`,
    ...(digits ? { sendDigits: digits } : {}),
  });

  await setCallMeta(call.sid, { tenant, conversationId, meetingTitle: meetingTitle || 'Reunión', status: 'calling' });
  return call;
}

// Se ejecuta en background (after()) cuando Twilio avisa que la grabación terminó.
// Actualiza el status en cada paso para que el botón "Obtener análisis" pueda consultarlo.
export async function processRecording({ callSid, recordingUrl }) {
  const meta = await getCallMeta(callSid);
  if (!meta) throw new Error(`No se encontró metadata para la llamada ${callSid} — no se puede saber a qué conversación pertenece.`);
  const { tenant, conversationId, meetingTitle } = meta;

  try {
    await setCallMeta(callSid, { status: 'processing' });

    const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
    const audioRes = await fetch(`${recordingUrl}.mp3`, { headers: { Authorization: `Basic ${auth}` } });
    if (!audioRes.ok) throw new Error(`No se pudo descargar la grabación de Twilio: HTTP ${audioRes.status}`);
    const audioBuffer = Buffer.from(await audioRes.arrayBuffer());

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const file = new File([audioBuffer], 'meeting.mp3', { type: 'audio/mpeg' });
    // Sin "language" fijo — el idioma de la reunión puede variar por cliente (ver decisión de Fase 1).
    const transcription = await openai.audio.transcriptions.create({ file, model: 'whisper-1' });
    const transcript = transcription.text?.trim() ?? '';

    const analysis = await analyzeMeetingTranscript(tenant, { transcript, meetingTitle });
    await appendMessages(tenant, conversationId, [{ role: 'assistant', content: '', meetingAnalysis: analysis }]);

    await setCallMeta(callSid, { status: 'done' });
    return analysis;
  } catch (err) {
    await setCallMeta(callSid, { status: 'error', error: err.message || String(err) });
    throw err;
  }
}
