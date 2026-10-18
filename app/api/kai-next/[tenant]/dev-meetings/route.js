import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getProjectMeta, resolveProjectAccessLevel } from '@/lib/kaiNext/projects';
import { listDevMeetings, addDevMeeting, updateDevMeeting, removeDevMeeting, getDevMeeting, rememberExternalContacts } from '@/lib/kaiNext/devMeetings';
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/lib/kai/calendar';
import { addCohost } from '@/lib/kai/meet';
import { listTenantUsers } from '@/lib/kai/tenantUsers';

// Ahora createCalendarEvent/updateCalendarEvent siempre suman a kai@bonsight.co a los
// `attendees` reales de Calendar (así cuenta como organizador en la lista de invitados que ve
// la gente, no solo en los metadatos — ver withOrganizerAttendee en lib/kai/calendar.js). Pero
// en la lista de "Asistentes" DENTRO de Reuniones no tiene sentido mostrarlo: ya se muestra
// "Organizada por {la persona real}" aparte, y Kai no es alguien que tenga que confirmar
// asistencia — así que se filtra acá antes de guardar/mostrar en nuestra propia UI.
const KAI_EMAIL = 'kai@bonsight.co';
function withoutKai(attendees) {
  return (attendees ?? []).filter((a) => a.email !== KAI_EMAIL);
}

// Quien crea la reunión queda como coanfitrión (ver addCohost más abajo), pero eso es un permiso
// de la LLAMADA, no lo hace invitado del evento — el picker de invitados arranca vacío y nada
// la agrega sola. Sin esto, la persona que agendó termina con control de la sala de espera pero
// sin la invitación real de Calendar ni la reunión en su propio calendario.
function withCreator(attendees, identity) {
  const list = attendees ?? [];
  if (!identity?.personEmail || list.some((a) => a.email === identity.personEmail)) return list;
  return [...list, { email: identity.personEmail, name: identity.personName || undefined }];
}

// Guarda los invitados que NO son del roster de Bonsight — solo para reuniones tipo "Cliente"
// (ver rememberExternalContacts). No bloquea ni demora la respuesta si falla.
async function rememberIfClientMeeting(tenant, tipo, attendees) {
  if (tipo !== 'cliente') return;
  const roster = await listTenantUsers(tenant);
  const rosterEmails = new Set(roster.map((u) => u.email).filter(Boolean));
  const external = (attendees ?? []).filter((a) => a.email && !rosterEmails.has(a.email));
  await rememberExternalContacts(tenant, external).catch(() => null);
}

// `repeat` es un id simple del selector del modal — se traduce acá a RRULE (lo que entiende
// Calendar) y a la forma chica que guarda Kai Next para poder proyectar las próximas ocurrencias
// en la grilla semanal sin tener que volver a leer Calendar (ver WeekCalendarView). Compartido
// entre crear y editar.
const RECURRENCE = {
  weekly: { rrule: 'RRULE:FREQ=WEEKLY', meta: { freq: 'WEEKLY', interval: 1 } },
  biweekly: { rrule: 'RRULE:FREQ=WEEKLY;INTERVAL=2', meta: { freq: 'WEEKLY', interval: 2 } },
  monthly: { rrule: 'RRULE:FREQ=MONTHLY', meta: { freq: 'MONTHLY', interval: 1 } },
};

// A diferencia de la versión anterior (project-scoped), esta pantalla vive en el sidebar y el
// proyecto es OPCIONAL — por eso el gate no exige un projectId en la URL. Si viene uno (en el
// body del POST o como ?projectId= en el GET), se revalida que el Supervisor esté asignado a
// ESE proyecto puntual (mismo criterio que projects/[id]/route.js); sin proyecto, alcanza con
// ser Supervisor-level de Proyectos en general (son reuniones del equipo, no de un cliente).
async function gate(tenant, projectId) {
  if (!(await isAuthorizedForTenant(tenant))) return { error: Response.json({ error: 'No autorizado.' }, { status: 401 }) };
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'reuniones')) {
    return { error: Response.json({ error: 'Reuniones no está habilitado para tu usuario.' }, { status: 403 }) };
  }
  const level = resolveProjectAccessLevel(identity);
  if (!level.isSupervisorLevel) {
    return { error: Response.json({ error: 'No tienes permiso para gestionar reuniones.' }, { status: 403 }) };
  }
  let projectName = null;
  if (projectId) {
    const meta = await getProjectMeta(tenant, projectId);
    if (!meta || meta.projectKind !== 'desarrollo') return { error: Response.json({ error: 'Proyecto no encontrado.' }, { status: 404 }) };
    if (!level.isDirectorLevel && !meta.supervisorIds?.includes(identity.personId)) {
      return { error: Response.json({ error: 'No tienes acceso a las reuniones de este proyecto.' }, { status: 403 }) };
    }
    projectName = meta.name;
  }
  return { identity, projectName };
}

export async function GET(req, { params }) {
  const { tenant } = await params;
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId') || null;
  const { error } = await gate(tenant, projectId);
  if (error) return error;

  const meetings = await listDevMeetings(tenant, { projectId });
  return Response.json({ meetings });
}

export async function POST(req, { params }) {
  const { tenant } = await params;

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }
  const { title, description, startDateTime, endDateTime, timeZone, attendees, withMeet, projectId, tipo, repeat } = body;

  const { error, identity, projectName } = await gate(tenant, projectId || null);
  if (error) return error;

  if (!title?.trim()) return Response.json({ error: 'El título es requerido.' }, { status: 400 });
  if (!startDateTime || !endDateTime) return Response.json({ error: 'Fecha/hora de inicio y fin son requeridas.' }, { status: 400 });
  if (!Array.isArray(attendees) || !attendees.length) return Response.json({ error: 'Agrega al menos un invitado.' }, { status: 400 });

  const recurrence = RECURRENCE[repeat] ?? null;

  try {
    const event = await createCalendarEvent({
      title: title.trim(), description, startDateTime, endDateTime,
      timeZone: timeZone || 'America/Bogota', attendees: withCreator(attendees, identity), withMeet: withMeet !== false,
      recurrence: recurrence?.rrule,
    });
    const meeting = await addDevMeeting(tenant, {
      calendarEventId: event.id, title: event.title, tipo, recurrence: recurrence?.meta ?? null,
      start: event.start, end: event.end,
      attendees: withoutKai(event.attendees), meetLink: event.meet?.meetLink ?? null, createdBy: identity.personId ?? null,
      createdByName: identity.personName ?? null, createdByEmail: identity.personEmail ?? null,
      projectId: projectId || null, projectName,
    });
    await rememberIfClientMeeting(tenant, tipo, attendees);
    // Coanfitrión de Meet para quien crea la reunión — kai@bonsight.co es el organizador real
    // pero nunca entra a la llamada, así que sin esto nadie puede admitir gente de la sala de
    // espera. Esperado (no fire-and-forget: en serverless la función puede cortarse apenas se
    // manda la respuesta) pero con su propio try/catch — si falla (ej. el scope de Meet todavía
    // no está autorizado), la reunión ya quedó creada igual, no se cae la respuesta por esto.
    if (identity.personEmail) {
      try {
        await addCohost(event.meet?.conferenceId, identity.personEmail);
      } catch (err) {
        console.error('[dev-meetings] no se pudo asignar coanfitrión:', err.message);
      }
    }
    return Response.json({ meeting });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}

// "Proponer otra hora" — edita el evento real (mismo id, ver updateCalendarEvent) en vez de
// crear uno nuevo, así nunca queda duplicada y los invitados reciben un aviso de reprogramación.
export async function PATCH(req, { params }) {
  const { tenant } = await params;

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }
  const { meetingId, title, description, startDateTime, endDateTime, timeZone, attendees, projectId, tipo, repeat } = body;
  if (!meetingId) return Response.json({ error: 'meetingId es requerido.' }, { status: 400 });

  const { error, projectName } = await gate(tenant, projectId || null);
  if (error) return error;

  if (!title?.trim()) return Response.json({ error: 'El título es requerido.' }, { status: 400 });
  if (!startDateTime || !endDateTime) return Response.json({ error: 'Fecha/hora de inicio y fin son requeridas.' }, { status: 400 });
  if (!Array.isArray(attendees) || !attendees.length) return Response.json({ error: 'Agrega al menos un invitado.' }, { status: 400 });

  const existing = await getDevMeeting(tenant, meetingId);
  if (!existing) return Response.json({ error: 'Reunión no encontrada.' }, { status: 404 });

  const recurrence = RECURRENCE[repeat] ?? null;

  try {
    const event = await updateCalendarEvent(existing.calendarEventId, {
      title: title.trim(), description, startDateTime, endDateTime,
      timeZone: timeZone || 'America/Bogota', attendees, recurrence: recurrence?.rrule,
    });
    const meeting = await updateDevMeeting(tenant, meetingId, {
      title: event.title, tipo, recurrence: recurrence?.meta ?? null,
      start: event.start, end: event.end,
      attendees: withoutKai(event.attendees), meetLink: event.meet?.meetLink ?? existing.meetLink,
      projectId: projectId || null, projectName,
    });
    await rememberIfClientMeeting(tenant, tipo, attendees);
    return Response.json({ meeting });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  const { tenant } = await params;
  const { searchParams } = new URL(req.url);
  const meetingId = searchParams.get('meetingId');
  if (!meetingId) return Response.json({ error: 'meetingId es requerido.' }, { status: 400 });

  // No sabemos a qué proyecto pertenece (si pertenece a alguno) hasta leerla — el gate acá es
  // deliberadamente general (Supervisor-level alcanza); si en el futuro hace falta acotar borrar
  // reuniones de un proyecto puntual a SU supervisor nada más, hay que leer la reunión primero.
  const { error } = await gate(tenant, null);
  if (error) return error;

  try {
    const meeting = await removeDevMeeting(tenant, meetingId);
    if (meeting?.calendarEventId) {
      await deleteCalendarEvent(meeting.calendarEventId).catch((err) => console.error('[kai-next meetings] no se pudo borrar el evento de Calendar:', err.message));
    }
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
