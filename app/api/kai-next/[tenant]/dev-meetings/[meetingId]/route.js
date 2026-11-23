import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getDevMeeting, updateDevMeeting } from '@/lib/kaiNext/devMeetings';
import { getCalendarEventById } from '@/lib/kai/calendar';
import { resolveProjectAccessLevel } from '@/lib/kaiNext/projects';
import { addDevTask } from '@/lib/kaiNext/devTasks';
import { acceptKnowledgeItem, acceptDecision } from '@/lib/kai/meetingAnalysis';
import { scheduleKai, unscheduleKai, processKaiRecording } from '@/lib/kaiNext/meetingBot';
import { getBot, recordingMedia } from '@/lib/kaiNext/recall';

// Ver dev-meetings/route.js — kai@bonsight.co ahora siempre está en los attendees reales de
// Calendar (así cuenta como organizador ahí), pero no tiene sentido mostrarlo en "Asistentes"
// acá, donde ya se muestra "Organizada por" aparte.
const KAI_EMAIL = 'kai@bonsight.co';
function withoutKai(attendees) {
  return (attendees ?? []).filter((a) => a.email !== KAI_EMAIL);
}

// Detalle de UNA reunión — fusiona lo guardado (notes/documentLinks/projectId, lo que Calendar no
// modela) con una lectura EN VIVO del evento real (attendees[].responseStatus cambia con el
// tiempo, la foto de cuando se agendó queda vieja apenas alguien responde la invitación).
export async function GET(req, { params }) {
  const { tenant, meetingId } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'reuniones')) {
    return Response.json({ error: 'Reuniones no está habilitado para tu usuario.' }, { status: 403 });
  }

  const meeting = await getDevMeeting(tenant, meetingId);
  if (!meeting) return Response.json({ error: 'Reunión no encontrada.' }, { status: 404 });

  let liveEvent = null;
  try {
    liveEvent = meeting.calendarEventId ? await getCalendarEventById(meeting.calendarEventId) : null;
  } catch (err) {
    console.error('[kai-next meetings] no se pudo leer el evento en vivo:', err.message);
  }

  // "Ver grabación": el video queda en el Drive; si no se pudo copiar, se pide a Recall un
  // enlace fresco (los suyos son temporales y Recall guarda el archivo 7 días).
  if (new URL(req.url).searchParams.get('recording') === '1') {
    if (meeting.kai?.driveUrl) return Response.redirect(meeting.kai.driveUrl, 302);
    if (!meeting.kai?.botId) return Response.json({ error: 'Esta reunión no tiene grabación.' }, { status: 404 });
    try {
      const { videoUrl } = recordingMedia(await getBot(meeting.kai.botId));
      if (!videoUrl) return Response.json({ error: 'La grabación ya no está disponible.' }, { status: 404 });
      return Response.redirect(videoUrl, 302);
    } catch (err) {
      return Response.json({ error: err.message }, { status: 502 });
    }
  }

  return Response.json({
    meeting: {
      ...meeting,
      attendees: withoutKai(liveEvent?.attendees ?? meeting.attendees),
      meetLink: liveEvent?.meet?.meetLink ?? meeting.meetLink,
      description: liveEvent?.description ?? null,
    },
  });
}

// Acciones de Kai sobre la reunión. Las hace quien organizó la reunión o un Supervisor/Director.
// - enable_kai / disable_kai: sumar o sacar a Kai (programa o cancela el bot de Recall.ai).
// - retry: volver a procesar la grabación si falló el análisis.
// - accept_task / dismiss_task: una tarea propuesta pasa a la lista de tareas de Reuniones.
// - accept_knowledge / reject_knowledge / accept_decision: el conocimiento va a la memoria de Kai.
export async function POST(req, { params }) {
  const { tenant, meetingId } = await params;
  if (!(await isAuthorizedForTenant(tenant))) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'reuniones')) return Response.json({ error: 'Reuniones no está habilitado para tu usuario.' }, { status: 403 });
  const meeting = await getDevMeeting(tenant, meetingId);
  if (!meeting) return Response.json({ error: 'Reunión no encontrada.' }, { status: 404 });
  const isOwner = !!identity.personEmail && identity.personEmail === meeting.createdByEmail;
  if (!isOwner && !resolveProjectAccessLevel(identity).isSupervisorLevel) {
    return Response.json({ error: 'Solo quien organizó la reunión o un Supervisor puede hacer esto.' }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const kai = meeting.kai ?? {};
  const analysis = kai.analysis;
  const save = (patch) => updateDevMeeting(tenant, meetingId, { kai: { ...kai, ...patch } });

  try {
    switch (body.action) {
      case 'enable_kai':
        // Solo reuniones que nacieron con Kai (Meet con acceso abierto): en las demás el bot
        // quedaría en la sala de espera sin nadie que pueda admitirlo, y cambiarles el enlace a
        // los invitados confunde (decisión de Rafa, 2026-11-23).
        if (!meeting.meetOpen) throw new Error('Kai solo puede sumarse a reuniones creadas con «Sumar a Kai» marcado.');
        return Response.json({ kai: await scheduleKai(tenant, meeting) });
      case 'disable_kai':
        await unscheduleKai(tenant, meeting);
        return Response.json({ ok: true });
      case 'retry':
        if (!kai.botId) throw new Error('Kai no estuvo en esta reunión.');
        await save({ processedBotId: null, status: 'call_ended', error: null });
        await processKaiRecording(tenant, meetingId, kai.botId);
        return Response.json({ meeting: await getDevMeeting(tenant, meetingId) });
      case 'accept_task': {
        const t = analysis?.tasks?.find((x) => x.id === body.taskId);
        if (!t) throw new Error('Tarea no encontrada.');
        const today = new Date().toISOString().slice(0, 10);
        const due = /^\d{4}-\d{2}-\d{2}$/.test(body.deadline || '') ? body.deadline : null;
        const created = await addDevTask(tenant, {
          title: String(body.title || t.task).slice(0, 200), date: due || today, deadline: due,
          description: `Acordada en la reunión «${meeting.title}».${t.evidence ? `\n«${t.evidence}»` : ''}`,
          responsableId: body.responsableId ?? null, responsableName: body.responsableName ?? t.owner ?? null, responsableEmail: body.responsableEmail ?? null,
          projectId: meeting.projectId ?? null, projectName: meeting.projectName ?? null,
          createdById: identity.personId ?? null, createdByName: identity.personName ?? null, createdByEmail: identity.personEmail ?? null,
        });
        await save({ analysis: { ...analysis, tasks: analysis.tasks.map((x) => (x.id === t.id ? { ...x, status: 'accepted', devTaskId: created.id } : x)) } });
        return Response.json({ ok: true, task: created });
      }
      case 'dismiss_task':
        await save({ analysis: { ...analysis, tasks: analysis.tasks.map((x) => (x.id === body.taskId ? { ...x, status: 'dismissed' } : x)) } });
        return Response.json({ ok: true });
      case 'accept_knowledge':
      case 'reject_knowledge': {
        const i = Number(body.index);
        const item = analysis?.knowledge?.[i];
        if (!item) throw new Error('Ítem no encontrado.');
        if (body.action === 'accept_knowledge') await acceptKnowledgeItem(tenant, { ...item, statement: body.statement || item.statement }, null);
        const knowledge = analysis.knowledge.map((k, j) => (j === i ? { ...k, statement: body.statement || k.statement, status: body.action === 'accept_knowledge' ? 'accepted' : 'rejected' } : k));
        await save({ analysis: { ...analysis, knowledge } });
        return Response.json({ ok: true });
      }
      case 'accept_decision': {
        const i = Number(body.index);
        const d = analysis?.decisions?.[i];
        if (!d) throw new Error('Decisión no encontrada.');
        await acceptDecision(tenant, d);
        await save({ analysis: { ...analysis, decisions: analysis.decisions.map((x, j) => (j === i ? { ...x, status: 'accepted' } : x)) } });
        return Response.json({ ok: true });
      }
      default:
        return Response.json({ error: 'Acción inválida.' }, { status: 400 });
    }
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
