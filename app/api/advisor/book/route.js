import { createCalendarEvent, getFreeBusy } from '@/lib/kai/calendar';
import { addDevMeeting } from '@/lib/kaiNext/devMeetings';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

// El evento lo agenda kai@bonsight.co (mismo mecanismo que cualquier reunión de Kai Next) — Rafa
// y ventas van como invitados, no como organizadores. La reunión entra al tenant `bonsight` de
// Reuniones (Kai Next) con tipo 'prospecto', visible para el equipo ahí mismo.
const HOST_EMAIL = 'kai@bonsight.co';
const TENANT = 'bonsight';

// Topes de texto libre — este endpoint es público y sin auth, así que no hay que confiar en que
// el cliente respete los límites visuales del formulario.
const MAX_SHORT = 200; // name / company / purpose
const MAX_SUMMARY = 3000;
const MIN_DURATION_MIN = 5;
const MAX_DURATION_MIN = 120;
const MAX_LEAD_DAYS = 90;

function clamp(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function POST(req) {
  // Público y sin auth — el booking real (crea evento de Calendar + manda invite) es la acción
  // más cara de todo el flujo del Advisor, así que es la que más importa limitar.
  if (!(await checkRateLimit(`advisor-book:${getClientIp(req)}`, 5, 3600))) {
    return Response.json({ error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' }, { status: 429 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }
  const { startDateTime, endDateTime, timeZone } = body;
  const name = clamp(body.name, MAX_SHORT);
  const company = clamp(body.company, MAX_SHORT);
  const purpose = clamp(body.purpose, MAX_SHORT);
  const summary = clamp(body.summary, MAX_SUMMARY);
  const email = (body.email || '').trim();

  if (!startDateTime || !endDateTime) return Response.json({ error: 'Falta el horario.' }, { status: 400 });
  if (!name) return Response.json({ error: 'Falta el nombre.' }, { status: 400 });
  if (!/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: 'Email inválido.' }, { status: 400 });

  // El cliente calcula start/end a partir de un slot que el servidor ofreció, pero nada obliga a
  // que el request realmente venga de ahí — se revalida acá que sea una fecha futura, dentro de
  // una ventana razonable, y de una duración sana (no confiamos en que `duration` de
  // /availability se haya usado para construir estos timestamps).
  const start = new Date(startDateTime);
  const end = new Date(endDateTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return Response.json({ error: 'Fecha/hora inválida.' }, { status: 400 });
  }
  const durationMin = (end.getTime() - start.getTime()) / 60000;
  if (durationMin < MIN_DURATION_MIN || durationMin > MAX_DURATION_MIN) {
    return Response.json({ error: 'Duración inválida.' }, { status: 400 });
  }
  if (start.getTime() < Date.now()) {
    return Response.json({ error: 'No se puede agendar en el pasado.' }, { status: 400 });
  }
  if (start.getTime() > Date.now() + MAX_LEAD_DAYS * 86400000) {
    return Response.json({ error: 'Esa fecha está fuera de rango.' }, { status: 400 });
  }

  try {
    // Revalida justo antes de crear — guarda contra que dos visitantes reserven la misma hora
    // casi a la vez (la lista que ve el cliente pudo haber quedado vieja entre que la cargó y
    // confirmó).
    const busy = await getFreeBusy([HOST_EMAIL], startDateTime, endDateTime);
    if ((busy[HOST_EMAIL]?.busy ?? []).length > 0) {
      return Response.json({ error: 'Ese horario se acaba de ocupar — elige otro.' }, { status: 409 });
    }

    const zone = timeZone || 'America/New_York';
    // `purpose` viene de llamadores internos (ej. "Conectar Google Search Console" desde el
    // modal de Fuentes de Kai Next) — sin eso, sigue siendo la llamada de discovery del Advisor.
    const title = `${purpose || 'Llamada de discovery'} · ${company || name}`;
    const event = await createCalendarEvent({
      title,
      description: summary || undefined,
      startDateTime,
      endDateTime,
      timeZone: zone,
      attendees: [
        { email, name },
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
