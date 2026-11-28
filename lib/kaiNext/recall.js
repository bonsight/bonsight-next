import { createHmac, timingSafeEqual } from 'crypto';

// Cliente mínimo de Recall.ai: el bot que entra a una reunión (Meet, Zoom, Teams) como un
// integrante más ("Kai"), graba audio y video reales y transcribe por persona. Reemplaza la
// captura por teléfono (Twilio) del Kai legacy. Docs: https://docs.recall.ai
//
// Variables: RECALL_API_KEY y RECALL_REGION (us-west-2). Los avisos de estado llegan por webhook
// (Svix) a /api/webhooks/recall, firmados con RECALL_WEBHOOK_SECRET.
const base = () => `https://${process.env.RECALL_REGION || 'us-west-2'}.recall.ai/api/v1`;

async function recall(path, { method = 'GET', body } = {}) {
  if (!process.env.RECALL_API_KEY) throw new Error('Falta RECALL_API_KEY.');
  const res = await fetch(`${base()}${path}`, {
    method,
    headers: { Authorization: `Token ${process.env.RECALL_API_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) {
    const detail = typeof data === 'object' ? JSON.stringify(data).slice(0, 300) : String(text).slice(0, 300);
    throw new Error(`Recall.ai ${res.status}: ${detail}`);
  }
  return data;
}

// Imagen que muestra la cámara del bot (logo de Kai + "Tomando notas de la reunión") en vez del
// cuadro negro con iniciales. Un bot sin cuenta de Google no puede tener foto de perfil; esto
// es lo que se ve en su lugar. Se baja del sitio publicado una vez por instancia.
// Dos imágenes: "Esperando que empiece la reunión" mientras está solo con una persona, y
// "Tomando notas de la reunión" desde que se suma la segunda (ver handleParticipantEvent en
// meetingBot.js, que la cambia con outputVideo).
const cameraCache = {};
export async function kaiCameraImage(kind = 'notes') {
  if (cameraCache[kind]) return cameraCache[kind];
  const file = kind === 'waiting' ? 'kai-bot-camera-waiting.jpg' : 'kai-bot-camera.jpg';
  try {
    const res = await fetch(`https://kai.bonsight.co/assets/${file}`);
    if (res.ok) cameraCache[kind] = Buffer.from(await res.arrayBuffer()).toString('base64');
  } catch { /* sin imagen: el bot entra igual */ }
  return cameraCache[kind] ?? null;
}

// Avisos en vivo de quién entra y sale (realtime endpoint de Recall). No pasan por Svix: se
// autentican con un token en la ruta, derivado del secreto de los webhooks.
export function participantsWebhookToken() {
  const secret = process.env.RECALL_WEBHOOK_SECRET;
  return secret ? createHmac('sha256', secret).update('kai-participants').digest('hex').slice(0, 32) : null;
}

export function checkParticipantsToken(token) {
  const expected = participantsWebhookToken();
  if (!expected || typeof token !== 'string' || token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

// Cambia la imagen de la cámara del bot en plena llamada.
export async function outputVideo(botId, b64) {
  return recall(`/bot/${botId}/output_video/`, { method: 'POST', body: { kind: 'jpeg', b64_data: b64 } });
}

// joinAt: ISO del inicio de la reunión (Recall pide al menos 10 min de anticipación para
// programar; con menos, entra apenas puede).
export async function createBot({ meetingUrl, joinAt, botName, metadata }) {
  const body = {
    meeting_url: meetingUrl,
    bot_name: (botName || 'Kai').slice(0, 100),
    recording_config: {
      transcript: { provider: { recallai_streaming: { mode: 'prioritize_accuracy', language_code: 'es' } } },
      video_mixed_layout: 'speaker_view',
    },
    automatic_leave: { waiting_room_timeout: 900, noone_joined_timeout: 900 },
    metadata: metadata ?? {},
  };
  const token = participantsWebhookToken();
  if (token) {
    body.recording_config.realtime_endpoints = [{
      type: 'webhook',
      url: `https://kai.bonsight.co/api/webhooks/recall/participants/${token}`,
      events: ['participant_events.join', 'participant_events.leave'],
    }];
  }
  // Entra con la imagen de espera solo si va a haber aviso de quién entra; si no, directo la de notas.
  const image = (token && await kaiCameraImage('waiting')) || await kaiCameraImage('notes');
  if (image) {
    body.automatic_video_output = {
      in_call_recording: { kind: 'jpeg', b64_data: image },
      in_call_not_recording: { kind: 'jpeg', b64_data: image },
    };
  }
  if (joinAt && new Date(joinAt).getTime() > Date.now() + 60_000) body.join_at = new Date(joinAt).toISOString();
  // Bot con cuenta de Google (Workspace dedicado, ver docs de Recall "Google Meet Signed-in
  // Bots"): si además esa cuenta está invitada a la reunión, Meet lo deja pasar sin sala de espera.
  if (process.env.RECALL_GOOGLE_LOGIN_GROUP_ID) body.google_meet = { google_login_group_id: process.env.RECALL_GOOGLE_LOGIN_GROUP_ID };
  return recall('/bot/', { method: 'POST', body });
}

export const getBot = (botId) => recall(`/bot/${botId}/`);

// Solo se puede borrar un bot programado que todavía no entró; si ya entró, se lo saca de la
// llamada. Ninguno de los dos casos debe romper a quien llama.
export async function cancelBot(botId) {
  if (!botId) return;
  try {
    await recall(`/bot/${botId}/`, { method: 'DELETE' });
  } catch {
    try { await recall(`/bot/${botId}/leave_call/`, { method: 'POST' }); } catch { /* ya terminó */ }
  }
}

// Último estado del bot (status_changes es la historia; el último manda).
export function botStatus(bot) {
  const changes = bot?.status_changes ?? [];
  return changes.length ? changes[changes.length - 1].code : null;
}

// Tramo que Recall cobra: desde que el bot empieza a entrar (incluye la sala de espera) hasta que
// sale de la llamada. Si no hay historia de estados, se usa el tramo grabado.
const IN_CALL = new Set(['joining_call', 'in_waiting_room', 'in_call_not_recording', 'in_call_recording']);
const LEFT = new Set(['call_ended', 'done', 'fatal']);
export function botCallWindow(bot) {
  const changes = bot?.status_changes ?? [];
  const start = changes.find((c) => IN_CALL.has(c.code))?.created_at ?? null;
  const end = changes.find((c) => LEFT.has(c.code))?.created_at ?? null;
  if (start && end) return { startedAt: start, completedAt: end };
  const rec = bot?.recordings?.[0];
  return { startedAt: rec?.started_at ?? null, completedAt: rec?.completed_at ?? null };
}

export function recordingMedia(bot) {
  const rec = bot?.recordings?.[0];
  const sc = rec?.media_shortcuts ?? {};
  return {
    videoUrl: sc.video_mixed?.data?.download_url ?? null,
    transcriptUrl: sc.transcript?.data?.download_url ?? null,
    // processing | done | failed — con la transcripción en vivo puede quedar lista un poco
    // después de que el bot sale (llega el aviso transcript.done).
    transcriptStatus: sc.transcript?.status?.code ?? null,
    startedAt: rec?.started_at ?? null,
    completedAt: rec?.completed_at ?? null,
  };
}

// Transcripción de Recall → texto "[mm:ss] Nombre: lo que dijo", agrupando frases seguidas de la
// misma persona. La marca es el segundo desde el inicio de la grabación (el análisis la usa para
// decir en qué momento se tomó cada decisión/tarea, y el detalle enlaza a ese segundo del video).
// Formato de Recall: [{ participant: { name }, words: [{ text, start_timestamp: { relative } }] }].
export const fmtClock = (sec) => {
  const t = Math.max(0, Math.floor(Number(sec) || 0));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const mm = String(m).padStart(2, '0'), ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

// fromRelative: segundo de la grabación desde el que cuenta la reunión (cuando se sumó la segunda
// persona); lo dicho antes, mientras se esperaba, no entra al análisis.
export async function fetchTranscriptText(url, { fromRelative = null } = {}) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo bajar la transcripción (${res.status}).`);
  const segments = await res.json();
  const lines = [];
  for (const seg of Array.isArray(segments) ? segments : []) {
    const who = seg.participant?.name || 'Participante';
    const words = (seg.words ?? []).filter((w) => fromRelative == null || (w.start_timestamp?.relative ?? Infinity) >= fromRelative);
    const text = words.map((w) => w.text).join(' ').replace(/\s+([,.;:!?])/g, '$1').trim();
    if (!text) continue;
    const at = words[0]?.start_timestamp?.relative ?? null;
    const last = lines[lines.length - 1];
    if (last && last.who === who) last.text += ` ${text}`;
    else lines.push({ who, text, at });
  }
  return {
    text: lines.map((l) => `${l.at != null ? `[${fmtClock(l.at)}] ` : ''}${l.who}: ${l.text}`).join('\n'),
    speakers: [...new Set(lines.map((l) => l.who))],
  };
}

// Verificación de webhooks de Svix (Recall los manda así): firma HMAC-SHA256 de
// `${svix-id}.${svix-timestamp}.${body}` con el secreto (whsec_<base64>), y tolerancia de 5 min.
export function verifyRecallWebhook(headers, rawBody) {
  const secret = process.env.RECALL_WEBHOOK_SECRET;
  if (!secret) return { ok: false, reason: 'Falta RECALL_WEBHOOK_SECRET.' };
  const id = headers.get('svix-id') || headers.get('webhook-id');
  const ts = headers.get('svix-timestamp') || headers.get('webhook-timestamp');
  const sigHeader = headers.get('svix-signature') || headers.get('webhook-signature');
  if (!id || !ts || !sigHeader) return { ok: false, reason: 'Faltan cabeceras de firma.' };
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return { ok: false, reason: 'Firma vencida.' };
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = createHmac('sha256', key).update(`${id}.${ts}.${rawBody}`).digest();
  const ok = sigHeader.split(' ').some((part) => {
    const sig = part.split(',')[1];
    if (!sig) return false;
    const got = Buffer.from(sig, 'base64');
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
  return ok ? { ok: true } : { ok: false, reason: 'Firma inválida.' };
}
