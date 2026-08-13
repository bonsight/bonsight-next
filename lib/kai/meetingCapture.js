import Twilio from 'twilio';
import OpenAI from 'openai';
import { Readable } from 'node:stream';
import { Redis } from '@upstash/redis';
import { appendMessages, getConversationMessages } from '@/lib/kai/memory';
import { analyzeMeetingTranscript } from '@/lib/kai/meetingAnalysis';
import { addMeetingIndexEntry } from '@/lib/kai/meetings';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const callMetaKey = (callSid) => `kai:meeting_call:${callSid}`;
// Antes esto era solo estado efímero para el polling del botón "Obtener análisis" (12h
// alcanzaba). Ahora también es el respaldo para poder reprocesar una sesión días después
// si algo falló (ej. créditos de OpenAI agotados) — 30 días le da margen real a eso.
const CALL_META_TTL_SECONDS = 60 * 60 * 24 * 30;

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
export async function startMeetingCall({ tenant, conversationId, dialInNumber, pin, meetingTitle, attendees }) {
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

  await setCallMeta(call.sid, { tenant, conversationId, meetingTitle: meetingTitle || 'Reunión', attendees: attendees ?? [], status: 'calling' });
  return call;
}

// Whisper rechaza cualquier archivo por encima de 25MB exactos (26214400 bytes) con un 413
// — pasa en llamadas largas. Partimos el buffer en pedazos por debajo de ese límite y
// transcribimos cada uno por separado; un mp3 cortado a la mitad de un frame se resincroniza
// solo en el siguiente frame válido, así que el corte no rompe la transcripción de forma
// perceptible, como mucho se pierde una fracción de segundo justo en el borde del corte.
const WHISPER_MAX_BYTES = 25 * 1024 * 1024;
const CHUNK_TARGET_BYTES = 24 * 1024 * 1024; // margen de seguridad bajo el límite real

function splitBufferIntoChunks(buffer, chunkBytes) {
  const chunks = [];
  for (let offset = 0; offset < buffer.length; offset += chunkBytes) {
    chunks.push(buffer.subarray(offset, offset + chunkBytes));
  }
  return chunks;
}

async function transcribeAudioBuffer(openai, audioBuffer) {
  if (audioBuffer.length <= WHISPER_MAX_BYTES) {
    const file = new File([audioBuffer], 'meeting.mp3', { type: 'audio/mpeg' });
    const transcription = await openai.audio.transcriptions.create({ file, model: 'whisper-1' });
    return transcription.text?.trim() ?? '';
  }

  const chunks = splitBufferIntoChunks(audioBuffer, CHUNK_TARGET_BYTES);
  const parts = [];
  // Secuencial, no en paralelo — evita pegarle a rate limits de Whisper con varios
  // archivos grandes al mismo tiempo por una sola reunión larga.
  for (let i = 0; i < chunks.length; i++) {
    const file = new File([chunks[i]], `meeting-part${i + 1}.mp3`, { type: 'audio/mpeg' });
    const transcription = await openai.audio.transcriptions.create({ file, model: 'whisper-1' });
    parts.push(transcription.text?.trim() ?? '');
  }
  return parts.join('\n\n');
}

// Se ejecuta en background (after()) cuando Twilio avisa que la grabación terminó.
// Actualiza el status en cada paso para que el botón "Obtener análisis" pueda consultarlo.
export async function processRecording({ callSid, recordingUrl }) {
  const meta = await getCallMeta(callSid);
  if (!meta) throw new Error(`No se encontró metadata para la llamada ${callSid} — no se puede saber a qué conversación pertenece.`);
  const { tenant, conversationId, meetingTitle, attendees } = meta;

  try {
    // Se guarda ANTES de procesar — si Whisper o Claude fallan más abajo, igual queda
    // disponible para reprocesar sin tener que volver a pedirle la grabación a Twilio.
    await setCallMeta(callSid, { status: 'processing', recordingUrl });

    const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
    const audioRes = await fetch(`${recordingUrl}.mp3`, { headers: { Authorization: `Basic ${auth}` } });
    if (!audioRes.ok) throw new Error(`No se pudo descargar la grabación de Twilio: HTTP ${audioRes.status}`);
    // Twilio manda la grabación con Transfer-Encoding: chunked (sin Content-Length) — para
    // respuestas así, audioRes.arrayBuffer() choca con un límite interno de 25MB de Node
    // ("Maximum content size limit exceeded"), mucho antes de llegar al límite real de
    // Whisper. Consumir el stream a mano lo evita por completo.
    const chunks = [];
    for await (const chunk of Readable.fromWeb(audioRes.body)) chunks.push(chunk);
    const audioBuffer = Buffer.concat(chunks);

    // Default del SDK es 10 min por request — se queda corto para transcribir en 2+ partes
    // secuenciales una reunión larga.
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 20 * 60 * 1000 });
    // Sin "language" fijo — el idioma de la reunión puede variar por cliente (ver decisión de Fase 1).
    const transcript = await transcribeAudioBuffer(openai, audioBuffer);

    const analysis = await analyzeMeetingTranscript(tenant, { transcript, meetingTitle, attendees });
    await appendMessages(tenant, conversationId, [{ role: 'assistant', content: '', meetingAnalysis: analysis }]);
    const messages = await getConversationMessages(tenant, conversationId);
    await addMeetingIndexEntry(tenant, { conversationId, messageIndex: messages.length - 1, analysis });

    await setCallMeta(callSid, { status: 'done' });
    return analysis;
  } catch (err) {
    await setCallMeta(callSid, { status: 'error', error: err.message || String(err) });
    throw err;
  }
}

// Reprocesa una llamada a mano — para el botón "Procesar"/"Reprocesar" del registro de
// sesiones, cuando el pipeline automático falló (ej. créditos de OpenAI agotados) o cuando
// una grabación quedó sin analizar. Verifica que la llamada sea del tenant que la pide,
// para que nadie reprocese una sesión de otro cliente adivinando el callSid.
export async function reprocessCall(tenant, callSid) {
  const meta = await getCallMeta(callSid);
  if (!meta) throw new Error('No se encontró esta llamada — puede que haya expirado (más de 30 días).');
  if (meta.tenant !== tenant) throw new Error('Esta llamada no pertenece a este tenant.');

  let { recordingUrl } = meta;
  if (!recordingUrl) {
    // Llamadas de antes de este fix no tienen recordingUrl guardado — se lo pedimos a Twilio.
    const client = twilioClient();
    const recordings = await client.calls(callSid).recordings.list({ limit: 1 });
    if (!recordings.length) throw new Error('No se encontró ninguna grabación de Twilio para esta llamada.');
    recordingUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Recordings/${recordings[0].sid}`;
  }

  return processRecording({ callSid, recordingUrl });
}
