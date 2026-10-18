import { google } from 'googleapis';

// API de Meet (meetings.space.created) — recién pasó a GA en sept. 2026, la versión de
// `googleapis` instalada todavía no genera cliente para spaces.members, así que esto pega
// directo al REST endpoint con el token de la service account en vez de esperar el bump de
// dependencia. Mismo patrón de impersonación que lib/kai/calendar.js / lib/labs/gmail.js.
const MEET_SCOPE = 'https://www.googleapis.com/auth/meetings.space.created';
const IMPERSONATE_USER = 'kai@bonsight.co';

function getMeetAuth() {
  if (!process.env.GOOGLE_CALENDAR_SA_JSON) {
    throw new Error('Falta GOOGLE_CALENDAR_SA_JSON.');
  }
  const credentials = JSON.parse(process.env.GOOGLE_CALENDAR_SA_JSON);
  return new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [MEET_SCOPE],
    subject: IMPERSONATE_USER,
  });
}

// `conferenceId` es el mismo que ya devuelve eventToMeeting (lib/kai/calendar.js) — sirve tal
// cual como alias del nombre del space ("spaces/{meetingCode}"), sin tener que resolverlo
// aparte. No bloquea la creación de la reunión si falla (ver catch en el caller): lo más común
// es que falle porque el scope todavía no está autorizado para la service account.
export async function addCohost(conferenceId, email) {
  if (!conferenceId || !email) return null;
  const auth = getMeetAuth();
  const { access_token: accessToken } = await auth.authorize();
  const res = await fetch(`https://meet.googleapis.com/v2/spaces/${conferenceId}/members`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, role: 'COHOST' }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Meet API ${res.status}: ${text}`);
  }
  return res.json();
}
