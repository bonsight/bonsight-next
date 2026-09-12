import { google } from 'googleapis';

// Mismo patrón que lib/kai/calendar.js — la service account impersona a kai@bonsight.co vía
// domain-wide delegation. El scope de Gmail send es nuevo: si todavía no está autorizado para
// este client ID en el Admin Console de Workspace (Seguridad > Controles de API > Delegación
// en todo el dominio), el envío va a fallar con un 403 aunque el resto del código esté bien.
const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
const IMPERSONATE_USER = 'kai@bonsight.co';

function getGmailClient() {
  if (!process.env.GOOGLE_CALENDAR_SA_JSON) {
    throw new Error('Falta GOOGLE_CALENDAR_SA_JSON.');
  }
  const credentials = JSON.parse(process.env.GOOGLE_CALENDAR_SA_JSON);
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [GMAIL_SCOPE],
    subject: IMPERSONATE_USER,
  });
  return google.gmail({ version: 'v1', auth });
}

// Gmail espera el mensaje RFC 2822 completo, base64url (no el base64 estándar: -/_ en vez de
// +//, sin padding) — por eso el reemplazo manual en vez de solo Buffer.toString('base64').
function buildRawMessage({ to, subject, html }) {
  const message = [
    'From: Bonsight Labs <kai@bonsight.co>',
    `To: ${to}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: =?utf-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`,
    '',
    html,
  ].join('\r\n');
  return Buffer.from(message, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sendEmail({ to, subject, html }) {
  const gmail = getGmailClient();
  const raw = buildRawMessage({ to, subject, html });
  await gmail.users.messages.send({ userId: IMPERSONATE_USER, requestBody: { raw } });
}
