import { createCalendarEvent, getFreeBusy } from '@/lib/kai/calendar';
import { addDevMeeting } from '@/lib/kaiNext/devMeetings';

// El evento lo agenda kai@bonsight.co (mismo mecanismo que cualquier reunión de Kai Next) — Rafa
// y ventas van como invitados, no como organizadores. La reunión entra al tenant `bonsight` de
// Reuniones (Kai Next) con tipo 'prospecto', visible para el equipo ahí mismo.
const HOST_EMAIL = 'kai@bonsight.co';
const TENANT = 'bonsight';

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }
  const { startDateTime, endDateTime, name, email, company, summary, timeZone } = body;
  if (!startDateTime || !endDateTime) return Response.json({ error: 'Falta el horario.' }, { status: 400 });
  if (!name?.trim()) return Response.json({ error: 'Falta el nombre.' }, { status: 400 });
  if (!/^\S+@\S+\.\S+$/.test(email || '')) return Response.json({ error: 'Email inválido.' }, { status: 400 });

  try {
    // Revalida justo antes de crear — guarda contra que dos visitantes reserven la misma hora
    // casi a la vez (la lista que ve el cliente pudo haber quedado vieja entre que la cargó y
    // confirmó).
    const busy = await getFreeBusy([HOST_EMAIL], startDateTime, endDateTime);
    if ((busy[HOST_EMAIL]?.busy ?? []).length > 0) {
      return Response.json({ error: 'Ese horario se acaba de ocupar — elige otro.' }, { status: 409 });
    }

    const zone = timeZone || 'America/New_York';
    const title = `Llamada de discovery · ${company?.trim() || name.trim()}`;
    const event = await createCalendarEvent({
      title,
      description: summary || undefined,
      startDateTime,
      endDateTime,
      timeZone: zone,
      attendees: [
        { email: email.trim(), name: name.trim() },
        { email: 'rafa@bonsight.co' },
        { email: 'sales@bonsight.co' },
      ],
      withMeet: true,
    });

    const meeting = await addDevMeeting(TENANT, {
      calendarEventId: event.id,
      title: event.title,
      tipo: 'prospecto',
      start: event.start,
      end: event.end,
      attendees: event.attendees,
      meetLink: event.meet?.meetLink ?? null,
      createdByName: 'Bonsight Advisor',
      createdByEmail: null,
    });

    // El invite nativo de Google Calendar (sendUpdates:'all' en createCalendarEvent) ya cubre
    // fecha/hora/Meet/participantes — no hace falta un mail de confirmación aparte.
    return Response.json({ meeting, start: event.start, end: event.end, meetLink: event.meet?.meetLink ?? null });
  } catch (err) {
    console.error('[advisor book]', err.message);
    return Response.json({ error: 'No se pudo agendar. Intenta de nuevo.' }, { status: 500 });
  }
}
