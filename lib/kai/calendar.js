import { google } from 'googleapis';

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';
// Kai "es" este usuario de Workspace — la service account lo impersona vía domain-wide delegation.
const IMPERSONATE_USER = 'kai@bonsight.co';

// Google NO suma solo al dueño del calendario a `attendees` cuando el evento se crea por API
// (a diferencia de crear desde la web de Calendar) — sin esto, kai@bonsight.co queda como
// organizador en los metadatos del evento pero invisible en la lista de invitados que ve la
// gente (confirmado comparando eventos viejos, creados desde la web, contra los que arma esta
// app: los viejos sí traen a kai@bonsight.co en `attendees` con `organizer:true`, los nuevos no).
function withOrganizerAttendee(attendees) {
  const mapped = (attendees ?? []).map((a) => ({ email: a.email, displayName: a.name || undefined, optional: a.optional || undefined }));
  if (mapped.some((a) => a.email === IMPERSONATE_USER)) return mapped;
  return [{ email: IMPERSONATE_USER }, ...mapped];
}

function getCalendarClient() {
  if (!process.env.GOOGLE_CALENDAR_SA_JSON) {
    throw new Error('Falta GOOGLE_CALENDAR_SA_JSON.');
  }
  const credentials = JSON.parse(process.env.GOOGLE_CALENDAR_SA_JSON);
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [CALENDAR_SCOPE],
    subject: IMPERSONATE_USER,
  });
  return google.calendar({ version: 'v3', auth });
}

// Extrae el link de video y todos los números de dial-in (uno por región) de un evento.
function extractMeetInfo(event) {
  const conferenceData = event.conferenceData;
  if (!conferenceData) return null;

  const videoEntry = conferenceData.entryPoints?.find((e) => e.entryPointType === 'video');
  const phoneEntries = (conferenceData.entryPoints ?? [])
    .filter((e) => e.entryPointType === 'phone')
    .map((e) => ({
      number: e.uri?.replace(/^tel:/, '') ?? null,
      pin: e.pin ?? null,
      regionCode: e.regionCode ?? null,
    }));

  return {
    meetLink: videoEntry?.uri ?? event.hangoutLink ?? null,
    conferenceId: conferenceData.conferenceId ?? null,
    phoneEntries,
  };
}

export async function listUpcomingMeetings({ maxResults = 15, timeMax } = {}) {
  const calendar = getCalendarClient();
  const res = await calendar.events.list({
    calendarId: IMPERSONATE_USER,
    timeMin: new Date().toISOString(),
    ...(timeMax ? { timeMax } : {}),
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
  });

  return (res.data.items ?? [])
    .filter((e) => e.status !== 'cancelled')
    .map((e) => eventToMeeting(e));
}

function eventToMeeting(e) {
  return {
    id: e.id,
    title: e.summary || 'Sin título',
    description: e.description ?? null,
    start: e.start?.dateTime ?? e.start?.date ?? null,
    end: e.end?.dateTime ?? e.end?.date ?? null,
    organizer: e.organizer?.email ?? null,
    attendees: (e.attendees ?? []).map((a) => ({
      email: a.email,
      name: a.displayName ?? null,
      responseStatus: a.responseStatus ?? null,
      optional: !!a.optional,
    })),
    meet: extractMeetInfo(e),
  };
}

// Crea el evento real en el calendario de kai@bonsight.co e invita a todos los asistentes por
// mail de verdad (`sendUpdates: 'all'` — sin esto, Calendar crea el evento pero no manda ninguna
// invitación). `timeZone` viene del navegador de quien agenda (Intl.DateTimeFormat().
// resolvedOptions().timeZone) para no tener que adivinar un país fijo acá.
export async function createCalendarEvent({ title, description, startDateTime, endDateTime, timeZone, attendees, withMeet = true, recurrence }) {
  const calendar = getCalendarClient();
  const requestBody = {
    summary: title,
    description: description || undefined,
    start: { dateTime: startDateTime, timeZone },
    end: { dateTime: endDateTime, timeZone },
    attendees: withOrganizerAttendee(attendees),
  };
  // RFC5545 (ej. "RRULE:FREQ=WEEKLY;INTERVAL=2") — Google crea UN solo evento "maestro" con la
  // regla, no N eventos sueltos. Kai Next solo guarda ese evento maestro (ver addDevMeeting) y
  // proyecta las próximas ocurrencias en el calendario semanal del lado del cliente — no hay
  // fecha de fin (recurre indefinidamente) en esta primera versión.
  if (recurrence) requestBody.recurrence = [recurrence];
  if (withMeet) {
    requestBody.conferenceData = {
      createRequest: { requestId: `kai-${Date.now()}-${Math.random().toString(36).slice(2)}` },
    };
  }

  const res = await calendar.events.insert({
    calendarId: IMPERSONATE_USER,
    requestBody,
    conferenceDataVersion: withMeet ? 1 : 0,
    sendUpdates: 'all',
  });
  return eventToMeeting(res.data);
}

// "Proponer otra hora" edita este MISMO evento (events.patch) en vez de crear uno nuevo — los
// invitados reciben un aviso de que la reunión se reprogramó, no una invitación nueva separada,
// y nunca queda duplicada. `attendees`/`start`/`end` se reemplazan enteros (Calendar no los
// mergea campo a campo), así que quien llama siempre manda el set completo, no un delta.
export async function updateCalendarEvent(eventId, { title, description, startDateTime, endDateTime, timeZone, attendees, recurrence }) {
  const calendar = getCalendarClient();
  const requestBody = {
    summary: title,
    description: description || undefined,
    start: { dateTime: startDateTime, timeZone },
    end: { dateTime: endDateTime, timeZone },
    attendees: withOrganizerAttendee(attendees),
    recurrence: recurrence ? [recurrence] : [],
  };
  const res = await calendar.events.patch({
    calendarId: IMPERSONATE_USER, eventId, requestBody, sendUpdates: 'all',
  });
  return eventToMeeting(res.data);
}

export async function deleteCalendarEvent(eventId) {
  const calendar = getCalendarClient();
  await calendar.events.delete({ calendarId: IMPERSONATE_USER, eventId, sendUpdates: 'all' });
}

// Para refrescar el RSVP real de una reunión ya agendada (attendees[].responseStatus cambia con
// el tiempo a medida que la gente acepta/rechaza) — la foto guardada al crear el evento queda
// vieja apenas alguien responde la invitación, así que el panel de detalle vuelve a pedir esto
// en vez de confiar en lo que se guardó en Redis al agendar.
export async function getCalendarEventById(eventId) {
  const calendar = getCalendarClient();
  const res = await calendar.events.get({ calendarId: IMPERSONATE_USER, eventId });
  return eventToMeeting(res.data);
}

// Disponibilidad real por persona — Google solo devuelve datos útiles para calendarios a los
// que kai@bonsight.co tiene visibilidad (en la práctica: gente del mismo Workspace, @bonsight.co)
// — para un email externo esto devuelve o un error por calendario o un array de busy vacío sin
// que eso signifique "está libre", por eso quien llama a esto nunca debería pedirlo para
// invitados externos (ver AvailabilityAssistant en KaiNextMeetings.jsx).
export async function getFreeBusy(emails, timeMin, timeMax) {
  const calendar = getCalendarClient();
  const res = await calendar.freebusy.query({
    requestBody: { timeMin, timeMax, items: emails.map((email) => ({ id: email })) },
  });
  const calendars = res.data.calendars ?? {};
  const result = {};
  for (const email of emails) {
    const entry = calendars[email];
    result[email] = { busy: entry?.busy ?? [], error: entry?.errors?.length ? entry.errors[0].reason : null };
  }
  return result;
}
