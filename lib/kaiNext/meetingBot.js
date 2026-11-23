import { Redis } from '@upstash/redis';
import { Readable } from 'node:stream';
import { createBot, cancelBot, getBot, botStatus, recordingMedia, fetchTranscriptText } from '@/lib/kaiNext/recall';
import { getDevMeeting, updateDevMeeting } from '@/lib/kaiNext/devMeetings';
import { getProjectMeta, addEvent, ensureProjectSubfolder } from '@/lib/kaiNext/projects';
import { getDriveConfig, ensureSubfolder, uploadStream } from '@/lib/kaiNext/projectsDrive';
import { analyzeMeetingTranscript } from '@/lib/kai/meetingAnalysis';
import { getTenantMeta } from '@/lib/kai/tenants';
import { sendMilestone, tenantUrl } from '@/lib/kaiNext/notifications';
import { escapeHtml } from '@/lib/labs/emailTemplates';

// Kai como integrante de la reunión (Recall.ai, ver lib/kaiNext/recall.js):
// 1. Al agendar con "Sumar a Kai", se programa un bot para la hora de inicio.
// 2. Recall avisa por webhook cada cambio de estado (app/api/webhooks/recall/route.js).
// 3. Al terminar (bot.done): transcripción por persona → análisis (resumen, decisiones, tareas,
//    conocimiento) → se guarda en la reunión, en la Historia del proyecto, el video va al Drive
//    y el resumen se manda por correo a los invitados.
// 4. Si la reunión se repite, se programa el bot de la próxima.
//
// meeting.kai = { enabled, botId, status, joinAt, error, analysis, transcript, speakers,
//                 driveFileId, driveUrl, processedAt, emailedAt }
const kv = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
const botKey = (botId) => `kainext:recall-bot:${botId}`;

export const KAI_STATUS_LABEL = {
  scheduled: 'Programado',
  joining_call: 'Entrando',
  in_waiting_room: 'En sala de espera',
  in_call_not_recording: 'En la reunión',
  in_call_recording: 'Grabando',
  call_ended: 'Reunión terminada',
  processing: 'Procesando',
  done: 'Listo',
  fatal: 'No pudo entrar',
  error: 'Error',
};

// Próxima ocurrencia de una reunión repetida, a partir de `after` (misma hora).
export function nextOccurrence(meeting, after = new Date()) {
  const r = meeting.recurrence;
  if (!r) return null;
  const start = new Date(meeting.start);
  const d = new Date(start);
  for (let i = 0; i < 400 && d <= after; i++) {
    if (r.freq === 'WEEKLY') d.setUTCDate(d.getUTCDate() + 7 * (r.interval || 1));
    else if (r.freq === 'MONTHLY') d.setUTCMonth(d.getUTCMonth() + (r.interval || 1));
    else if (r.freq === 'MONTHLY_WEEKDAY') {
      // n-ésimo día de la semana del mes siguiente (ej. 2do martes).
      const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, d.getUTCHours(), d.getUTCMinutes()));
      const offset = (r.weekday - next.getUTCDay() + 7) % 7;
      next.setUTCDate(1 + offset + 7 * ((r.ordinal || 1) - 1));
      d.setTime(next.getTime());
    } else return null;
  }
  return d > after ? d.toISOString() : null;
}

export async function scheduleKai(tenant, meeting, { joinAt } = {}) {
  if (!meeting.meetLink) throw new Error('La reunión no tiene enlace de Meet: Kai no tiene dónde entrar.');
  const tenantMeta = await getTenantMeta(tenant).catch(() => null);
  const when = joinAt ?? (new Date(meeting.start) > new Date() ? meeting.start : nextOccurrence(meeting) ?? meeting.start);
  const bot = await createBot({
    meetingUrl: meeting.meetLink,
    joinAt: when,
    botName: `Kai · ${tenantMeta?.name || tenant}`,
    metadata: { tenant, meetingId: meeting.id },
  });
  await kv.set(botKey(bot.id), { tenant, meetingId: meeting.id }, { ex: 60 * 60 * 24 * 60 });
  const kai = { ...(meeting.kai ?? {}), enabled: true, botId: bot.id, status: 'scheduled', joinAt: when, error: null };
  await updateDevMeeting(tenant, meeting.id, { kai });
  return kai;
}

export async function unscheduleKai(tenant, meeting, { keepEnabled = false } = {}) {
  if (meeting?.kai?.botId && !['done', 'processing'].includes(meeting.kai.status)) await cancelBot(meeting.kai.botId);
  if (meeting?.id) {
    await updateDevMeeting(tenant, meeting.id, { kai: { ...(meeting.kai ?? {}), enabled: keepEnabled, botId: keepEnabled ? meeting.kai?.botId : null, status: keepEnabled ? meeting.kai?.status : null } });
  }
}

// Reagendar: el bot viejo se cancela y se programa uno nuevo para el nuevo horario.
export async function rescheduleKai(tenant, meeting) {
  if (!meeting?.kai?.enabled) return null;
  await unscheduleKai(tenant, meeting, { keepEnabled: true });
  return scheduleKai(tenant, await getDevMeeting(tenant, meeting.id));
}

export async function lookupBot(botId) {
  return kv.get(botKey(botId));
}

// Estado intermedio que avisa Recall (entrando, grabando, etc.).
export async function setKaiStatus(tenant, meetingId, botId, status, error = null) {
  const meeting = await getDevMeeting(tenant, meetingId);
  if (!meeting || meeting.kai?.botId !== botId) return;
  if (['processing', 'done'].includes(meeting.kai?.status) && status !== 'done') return;
  await updateDevMeeting(tenant, meetingId, { kai: { ...meeting.kai, status, error } });
}

async function copyVideoToDrive(tenant, meeting, videoUrl) {
  const config = await getDriveConfig(tenant);
  if (!config?.folderId || !videoUrl) return null;
  let folderId;
  if (meeting.projectId) {
    const meta = await getProjectMeta(tenant, meeting.projectId);
    folderId = meta ? await ensureProjectSubfolder(tenant, meta, 'reunionesFolderId', 'Reuniones') : null;
  }
  if (!folderId) folderId = await ensureSubfolder(config.folderId, 'Reuniones');
  const res = await fetch(videoUrl);
  if (!res.ok || !res.body) throw new Error(`No se pudo bajar el video (${res.status}).`);
  const day = String(meeting.kai?.joinAt || meeting.start).slice(0, 10);
  return uploadStream(folderId, { name: `${day} · ${meeting.title}.mp4`, mimeType: 'video/mp4', stream: Readable.fromWeb(res.body) });
}

const listHtml = (items) => (items.length
  ? `<ul style="margin:8px 0 0;padding-left:18px;font-size:13px;line-height:1.6;color:#5c5344;">${items.map((i) => `<li>${i}</li>`).join('')}</ul>`
  : '');
const label = (t) => `<p style="font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#8a7c68;margin:14px 0 0;">${t}</p>`;

async function emailSummary(tenant, meeting, analysis) {
  const people = new Map();
  for (const a of meeting.attendees ?? []) if (a.email) people.set(a.email.toLowerCase(), a);
  if (meeting.createdByEmail) people.set(meeting.createdByEmail.toLowerCase(), { email: meeting.createdByEmail, name: meeting.createdByName });
  const recipients = [...people.values()].map((a) => ({ id: a.email, email: a.email, name: a.name || a.email, firstName: (a.name || '').split(' ')[0] || '' }));
  const decisions = analysis.decisions.map((d) => `<b>${escapeHtml(d.title)}</b>${d.reason ? ` — ${escapeHtml(d.reason)}` : ''}`);
  const tasks = analysis.tasks.map((t) => `${escapeHtml(t.task)}${t.owner ? ` <span style="color:#8a7c68;">· ${escapeHtml(t.owner)}</span>` : ''}${t.deadline ? ` <span style="color:#8a7c68;">· ${escapeHtml(t.deadline)}</span>` : ''}`);
  const bodyHtml = (decisions.length ? label('Decisiones') + listHtml(decisions) : '') + (tasks.length ? label('Tareas acordadas') + listHtml(tasks) : '');
  await sendMilestone(tenant, recipients, {
    subject: `Resumen de la reunión: ${meeting.title}`,
    title: meeting.title,
    body: analysis.summary,
    bodyHtml,
    projectName: meeting.projectName || 'Reunión',
    actionUrl: tenantUrl(tenant, `/meetings?m=${meeting.id}`),
    actionLabel: 'Ver en Kai →',
  });
}

// bot.done: todo el procesamiento. Idempotente: si ya se procesó ese bot, no hace nada.
export async function processKaiRecording(tenant, meetingId, botId) {
  let meeting = await getDevMeeting(tenant, meetingId);
  if (!meeting || meeting.kai?.botId !== botId) return;
  if (['processing', 'done'].includes(meeting.kai?.status) && meeting.kai?.processedBotId === botId) return;
  await updateDevMeeting(tenant, meetingId, { kai: { ...meeting.kai, status: 'processing', processedBotId: botId } });

  try {
    const bot = await getBot(botId);
    const media = recordingMedia(bot);
    if (!media.transcriptUrl) throw new Error('Kai no llegó a grabar: nadie lo admitió o la reunión no ocurrió.');
    const { text, speakers } = await fetchTranscriptText(media.transcriptUrl);
    if (!text.trim()) throw new Error('La grabación no tiene conversación.');
    const analysis = await analyzeMeetingTranscript(tenant, {
      transcript: text,
      meetingTitle: meeting.title,
      attendees: (meeting.attendees ?? []).map((a) => a.name || a.email),
    });

    let drive = null;
    try { drive = await copyVideoToDrive(tenant, meeting, media.videoUrl); } catch (err) { console.error('[kai-bot] video a Drive:', err.message); }

    meeting = await getDevMeeting(tenant, meetingId);
    const kai = {
      ...meeting.kai, status: 'done', error: null, processedAt: new Date().toISOString(),
      analysis: { ...analysis, tasks: analysis.tasks.map((t, i) => ({ ...t, id: `t${i}`, status: 'pending' })) },
      transcript: text.slice(0, 200000), speakers,
      recordedAt: media.startedAt, driveFileId: drive?.id ?? null, driveUrl: drive?.webViewLink ?? null,
    };
    await updateDevMeeting(tenant, meetingId, { kai });

    if (meeting.projectId && analysis.hasSubstantiveContent) {
      await addEvent(tenant, meeting.projectId, {
        type: 'reunion', actor: 'Kai', title: `Kai resumió la reunión «${meeting.title}»`,
        body: analysis.summary, meetingId,
      }, { notify: false }).catch((err) => console.error('[kai-bot] historia:', err.message));
    }
    if (analysis.hasSubstantiveContent) {
      await emailSummary(tenant, meeting, analysis);
      await updateDevMeeting(tenant, meetingId, { kai: { ...kai, emailedAt: new Date().toISOString() } });
    }
  } catch (err) {
    console.error(`[kai-bot] ${tenant}/${meetingId}:`, err.message);
    const m = await getDevMeeting(tenant, meetingId);
    await updateDevMeeting(tenant, meetingId, { kai: { ...m.kai, status: 'error', error: err.message } });
  }

  // Reunión que se repite: Kai queda programado para la próxima.
  const fresh = await getDevMeeting(tenant, meetingId);
  if (fresh?.recurrence && fresh.kai?.enabled) {
    const next = nextOccurrence(fresh);
    if (next) {
      try { await scheduleKai(tenant, { ...fresh, kai: { ...fresh.kai, history: [...(fresh.kai.history ?? []), summaryForHistory(fresh.kai)] } }, { joinAt: next }); } catch (err) { console.error('[kai-bot] próxima:', err.message); }
    }
  }
}

// Al reprogramar una reunión repetida, lo de la sesión anterior queda en `history`.
function summaryForHistory(kai) {
  return { botId: kai.botId, status: kai.status, processedAt: kai.processedAt, summary: kai.analysis?.summary ?? null, driveUrl: kai.driveUrl ?? null, error: kai.error ?? null };
}
