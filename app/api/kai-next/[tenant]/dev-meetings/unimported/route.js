import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { resolveProjectAccessLevel } from '@/lib/kaiNext/projects';
import { listDevMeetings, listDismissedImports, dismissImport, addDevMeeting } from '@/lib/kaiNext/devMeetings';
import { listUpcomingMeetings, getCalendarEventById } from '@/lib/kai/calendar';
import { listTenantUsers } from '@/lib/kai/tenantUsers';

const KAI_EMAIL = 'kai@bonsight.co';
// Mismo gate de .../dev-meetings/route.js pero sin projectId — "¿hay reuniones de Calendar sin
// importar?" es una pregunta del sidebar general, no de un proyecto puntual.
async function gate(tenant) {
  if (!(await isAuthorizedForTenant(tenant))) return { error: Response.json({ error: 'No autorizado.' }, { status: 401 }) };
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'reuniones')) {
    return { error: Response.json({ error: 'Reuniones no está habilitado para tu usuario.' }, { status: 403 }) };
  }
  const level = resolveProjectAccessLevel(identity);
  if (!level.isSupervisorLevel) {
    return { error: Response.json({ error: 'No tienes permiso para gestionar reuniones.' }, { status: 403 }) };
  }
  return { identity };
}

const WINDOW_DAYS = 14;

// Reuniones creadas directo en Google Calendar (no desde Kai) — se detectan comparando los
// eventos próximos del calendario de kai@bonsight.co contra los calendarEventId ya guardados acá
// (ver lib/kaiNext/devMeetings.js). "Ignorar" se persiste por tenant (ver dismissImport) para no
// insistir con la misma cada vez que alguien entra a Reuniones.
export async function GET(req, { params }) {
  const { tenant } = await params;
  const { error } = await gate(tenant);
  if (error) return error;

  const [upcoming, known, dismissed] = await Promise.all([
    listUpcomingMeetings({ maxResults: 50, timeMax: new Date(Date.now() + WINDOW_DAYS * 86400000).toISOString() }),
    listDevMeetings(tenant),
    listDismissedImports(tenant),
  ]);
  const knownIds = new Set(known.map((m) => m.calendarEventId).filter(Boolean));
  const dismissedIds = new Set(dismissed);

  const candidates = upcoming
    .filter((e) => !knownIds.has(e.id) && !dismissedIds.has(e.id))
    .map((e) => ({
      calendarEventId: e.id,
      title: e.title,
      start: e.start,
      end: e.end,
      meetLink: e.meet?.meetLink ?? null,
      attendees: e.attendees.filter((a) => a.email !== KAI_EMAIL),
    }));

  return Response.json({ candidates });
}

export async function POST(req, { params }) {
  const { tenant } = await params;
  const { error, identity } = await gate(tenant);
  if (error) return error;

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }
  const { calendarEventId, action } = body;
  if (!calendarEventId) return Response.json({ error: 'calendarEventId es requerido.' }, { status: 400 });

  if (action === 'dismiss') {
    await dismissImport(tenant, calendarEventId);
    return Response.json({ ok: true });
  }

  if (action !== 'import') return Response.json({ error: 'action inválida.' }, { status: 400 });

  const event = await getCalendarEventById(calendarEventId);
  if (!event) return Response.json({ error: 'El evento ya no existe en Calendar.' }, { status: 404 });

  const attendees = (event.attendees ?? []).filter((a) => a.email !== KAI_EMAIL);
  // Mismo criterio que rememberIfClientMeeting en .../dev-meetings/route.js: si hay algún
  // invitado fuera del roster de Bonsight, es una reunión con un cliente/externo.
  const roster = await listTenantUsers(tenant);
  const rosterEmails = new Set(roster.map((u) => u.email).filter(Boolean));
  const tipo = attendees.some((a) => a.email && !rosterEmails.has(a.email)) ? 'cliente' : 'equipo';

  const meeting = await addDevMeeting(tenant, {
    calendarEventId: event.id,
    title: event.title,
    tipo,
    recurrence: null, // la recurrencia de un evento creado fuera de Kai no se proyecta acá — Calendar sigue siendo la fuente de verdad para sus próximas ocurrencias.
    start: event.start,
    end: event.end,
    attendees,
    meetLink: event.meet?.meetLink ?? null,
    createdBy: identity.personId ?? null,
    createdByName: identity.personName ?? null,
    createdByEmail: identity.personEmail ?? null,
  });
  return Response.json({ meeting });
}
