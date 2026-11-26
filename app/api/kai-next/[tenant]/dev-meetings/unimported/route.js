import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { resolveProjectAccessLevel } from '@/lib/kaiNext/projects';
import { listDevMeetings, listDismissedImports, dismissImport, addDevMeeting, getDailyExternalInvites } from '@/lib/kaiNext/devMeetings';
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

// Invitaciones a reuniones que organiza alguien de FUERA del equipo (un cliente que invita a
// kai@bonsight.co): las que crea el propio equipo ya nacen en Kai, así que no se ofrecen. Calendar
// se consulta una vez al día (ver getDailyExternalInvites); se comparan contra los
// calendarEventId ya guardados acá y contra los descartados con "Ignorar" (por tenant).
const TEAM_DOMAIN = '@bonsight.co';

export async function GET(req, { params }) {
  const { tenant } = await params;
  const { error } = await gate(tenant);
  if (error) return error;

  const [upcoming, known, dismissed] = await Promise.all([
    getDailyExternalInvites(tenant, async () => {
      const [events, roster] = await Promise.all([
        listUpcomingMeetings({ maxResults: 100, timeMax: new Date(Date.now() + WINDOW_DAYS * 86400000).toISOString() }),
        listTenantUsers(tenant),
      ]);
      const team = new Set(roster.map((u) => u.email?.toLowerCase()).filter(Boolean));
      const isTeam = (email) => !email || email === KAI_EMAIL || team.has(email) || email.endsWith(TEAM_DOMAIN);
      return events
        .filter((e) => !isTeam(e.organizer?.toLowerCase()))
        .map((e) => ({ id: e.id, recurringEventId: e.recurringEventId, title: e.title, start: e.start, end: e.end, organizer: e.organizer, meet: e.meet ? { meetLink: e.meet.meetLink ?? null } : null, attendees: e.attendees }));
    }),
    listDevMeetings(tenant),
    listDismissedImports(tenant),
  ]);
  const knownIds = new Set(known.map((m) => m.calendarEventId).filter(Boolean));
  const dismissedIds = new Set(dismissed);
  // Una ocurrencia de recurrencia nunca matchea por `id` sola (ver recurringEventId en
  // lib/kai/calendar.js) — si el evento maestro ya está en Kai, esta ocurrencia no es candidata.
  const isKnown = (e) => knownIds.has(e.id) || (e.recurringEventId && knownIds.has(e.recurringEventId));
  const isDismissed = (e) => dismissedIds.has(e.id) || (e.recurringEventId && dismissedIds.has(e.recurringEventId));

  const candidates = upcoming
    .filter((e) => !isKnown(e) && !isDismissed(e) && new Date(e.end ?? e.start) > new Date())
    .map((e) => ({
      calendarEventId: e.id,
      title: e.title,
      start: e.start,
      end: e.end,
      meetLink: e.meet?.meetLink ?? null,
      organizer: e.organizer ?? null,
      attendees: (e.attendees ?? []).filter((a) => a.email !== KAI_EMAIL),
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
