import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { resolveProjectAccessLevel, getProjectMeta } from '@/lib/kaiNext/projects';
import { getDevMeeting } from '@/lib/kaiNext/devMeetings';
import { getCalendarEventById } from '@/lib/kai/calendar';

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
  const level = resolveProjectAccessLevel(identity);
  if (!level.isSupervisorLevel) {
    return Response.json({ error: 'No tienes permiso para ver reuniones.' }, { status: 403 });
  }

  const meeting = await getDevMeeting(tenant, meetingId);
  if (!meeting) return Response.json({ error: 'Reunión no encontrada.' }, { status: 404 });

  if (meeting.projectId && !level.isDirectorLevel) {
    const meta = await getProjectMeta(tenant, meeting.projectId);
    if (!meta?.supervisorIds?.includes(identity.personId)) {
      return Response.json({ error: 'No tienes acceso a esta reunión.' }, { status: 403 });
    }
  }

  let liveEvent = null;
  try {
    liveEvent = meeting.calendarEventId ? await getCalendarEventById(meeting.calendarEventId) : null;
  } catch (err) {
    console.error('[kai-next meetings] no se pudo leer el evento en vivo:', err.message);
  }

  return Response.json({
    meeting: {
      ...meeting,
      attendees: liveEvent?.attendees ?? meeting.attendees,
      meetLink: liveEvent?.meet?.meetLink ?? meeting.meetLink,
      description: liveEvent?.description ?? null,
    },
  });
}
