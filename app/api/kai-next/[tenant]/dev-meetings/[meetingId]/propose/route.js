import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { resolveProjectAccessLevel } from '@/lib/kaiNext/projects';
import { getDevMeeting, addProposal, removeProposal, updateDevMeeting } from '@/lib/kaiNext/devMeetings';
import { updateCalendarEvent } from '@/lib/kai/calendar';
import { sendEmail } from '@/lib/labs/gmail';
import { kaiNextBasePath } from '@/lib/kaiNext/paths';

async function gate(tenant) {
  if (!(await isAuthorizedForTenant(tenant))) return { error: Response.json({ error: 'No autorizado.' }, { status: 401 }) };
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'reuniones')) {
    return { error: Response.json({ error: 'Reuniones no está habilitado para tu usuario.' }, { status: 403 }) };
  }
  if (!resolveProjectAccessLevel(identity).isSupervisorLevel) {
    return { error: Response.json({ error: 'No tienes permiso para gestionar reuniones.' }, { status: 403 }) };
  }
  return { identity };
}

// Un invitado (no organizador) deja una propuesta pendiente — no toca el evento real todavía.
export async function POST(req, { params }) {
  const { tenant, meetingId } = await params;
  const { error, identity } = await gate(tenant);
  if (error) return error;

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }
  const { date, startTime, duration, motivo } = body;
  if (!date || !startTime || !duration) return Response.json({ error: 'Fecha, hora y duración son requeridas.' }, { status: 400 });

  const meeting = await getDevMeeting(tenant, meetingId);
  if (!meeting) return Response.json({ error: 'Reunión no encontrada.' }, { status: 404 });

  const proposal = await addProposal(tenant, meetingId, {
    date, startTime, duration, motivo: motivo?.trim() || null,
    proposedById: identity.personId ?? null, proposedByName: identity.personName ?? 'Alguien',
  });

  // Aviso al organizador — "Proponer otra hora" no toca Calendar (ver PATCH acá abajo), así que
  // sin este mail nunca se entera salvo que entre a Meetings por las suyas. Si no tiene email
  // guardado (ej. organizó un equipo-interno sin tenant-user, o la reunión es de antes de este
  // campo) se omite en silencio — no bloquea la propuesta en sí.
  if (meeting.createdByEmail) {
    const host = req.headers.get('host') ?? 'kai.bonsight.co';
    const proto = host.includes('localhost') ? 'http' : 'https';
    const link = `${proto}://${host}${kaiNextBasePath(host)}/${tenant}/meetings`;
    const endMin = (() => { const [h, m] = startTime.split(':').map(Number); return h * 60 + m + duration; })();
    const endLabel = `${String(Math.floor(endMin / 60) % 24).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
    sendEmail({
      to: meeting.createdByEmail,
      subject: `${identity.personName} propuso otro horario para "${meeting.title}"`,
      html: `
        <p>${identity.personName} propuso cambiar <b>${meeting.title}</b> a ${date}, ${startTime}–${endLabel}.</p>
        ${motivo?.trim() ? `<p>«${motivo.trim()}»</p>` : ''}
        <p><a href="${link}">Revisar en Kai Next Meetings</a></p>
      `,
    }).catch((err) => console.error('[kai-next meetings] no se pudo avisar al organizador:', err.message));
  }

  return Response.json({ proposal });
}

// El organizador acepta (reprograma de verdad el evento real) o rechaza (solo la descarta).
export async function PATCH(req, { params }) {
  const { tenant, meetingId } = await params;
  const { error } = await gate(tenant);
  if (error) return error;

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }
  const { proposalId, accept } = body;
  if (!proposalId) return Response.json({ error: 'proposalId es requerido.' }, { status: 400 });

  const meeting = await getDevMeeting(tenant, meetingId);
  if (!meeting) return Response.json({ error: 'Reunión no encontrada.' }, { status: 404 });
  const proposal = (meeting.proposals ?? []).find((p) => p.id === proposalId);
  if (!proposal) return Response.json({ error: 'Propuesta no encontrada.' }, { status: 404 });

  try {
    if (accept) {
      const [h, m] = proposal.startTime.split(':').map(Number);
      const endTotal = h * 60 + m + proposal.duration;
      const endTime = `${String(Math.floor(endTotal / 60) % 24).padStart(2, '0')}:${String(endTotal % 60).padStart(2, '0')}`;
      const timeZone = body.timeZone || 'America/Bogota';
      const event = await updateCalendarEvent(meeting.calendarEventId, {
        title: meeting.title, description: meeting.description,
        startDateTime: `${proposal.date}T${proposal.startTime}:00`, endDateTime: `${proposal.date}T${endTime}:00`,
        timeZone, attendees: meeting.attendees,
        recurrence: meeting.recurrence ? (meeting.recurrence.freq === 'WEEKLY' ? `RRULE:FREQ=WEEKLY${meeting.recurrence.interval > 1 ? `;INTERVAL=${meeting.recurrence.interval}` : ''}` : 'RRULE:FREQ=MONTHLY') : null,
      });
      await updateDevMeeting(tenant, meetingId, { start: event.start, end: event.end });
    }
    await removeProposal(tenant, meetingId, proposalId);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
