import { google } from 'googleapis';

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';
// Kai "es" este usuario de Workspace — la service account lo impersona vía domain-wide delegation.
const IMPERSONATE_USER = 'kai@bonsight.co';

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

export async function listUpcomingMeetings({ maxResults = 15 } = {}) {
  const calendar = getCalendarClient();
  const res = await calendar.events.list({
    calendarId: IMPERSONATE_USER,
    timeMin: new Date().toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
  });

  return (res.data.items ?? [])
    .filter((e) => e.status !== 'cancelled')
    .map((e) => ({
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
      })),
      meet: extractMeetInfo(e),
    }));
}
