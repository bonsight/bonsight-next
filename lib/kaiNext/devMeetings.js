import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// Reuniones de Proyecto de Desarrollo (Kai Next) — una sola lista por tenant (en la práctica
// siempre `bonsight`, el único tenant con proyectos 'desarrollo'), NO por proyecto: una reunión
// puede estar asociada a un proyecto puntual (projectId) o a ninguno (reunión general del
// equipo) — el selector de proyecto en la pantalla Meetings es opcional, no obligatorio. El
// detalle de agenda/invitados vive en el evento real de Google Calendar (fuente de verdad, ver
// lib/kai/calendar.js), acá solo se guarda lo que Calendar no modela bien: notas/decisiones
// post-reunión y links a documentación. No tiene nada que ver con lib/kai/meetings.js (historial
// de reuniones analizadas por Twilio del Kai legacy, una feature totalmente distinta).
const meetingsKey = (tenant) => `kainext:${tenant}:dev-meetings`;
// Invitados externos (no del roster de Bonsight) de reuniones tipo "Cliente" — para que la
// próxima vez que agendes algo con el mismo cliente, su email aparezca sugerido en el picker de
// asistentes en vez de tener que tipearlo de nuevo cada vez (ver AttendeePicker en
// KaiNextMeetings.jsx). Nunca se guardan externos de reuniones tipo Equipo/1:1 — a propósito,
// esas no suelen repetir invitados de la misma forma.
const externalContactsKey = (tenant) => `kainext:${tenant}:dev-meeting-contacts`;
// Eventos de Calendar que el banner de "reunión no importada" ya ofreció y la persona descartó
// con "Ignorar" — para que no vuelva a aparecer cada vez que entra a Reuniones. Por tenant, no
// por persona: si alguien del equipo ya la descartó, no tiene sentido que otro supervisor la
// siga viendo.
const dismissedImportsKey = (tenant) => `kainext:${tenant}:dev-meeting-import-dismissed`;

export async function listDismissedImports(tenant) {
  return (await kv.get(dismissedImportsKey(tenant))) ?? [];
}

export async function dismissImport(tenant, calendarEventId) {
  const existing = await listDismissedImports(tenant);
  if (existing.includes(calendarEventId)) return;
  await kv.set(dismissedImportsKey(tenant), [...existing, calendarEventId]);
}

export async function listExternalContacts(tenant) {
  return (await kv.get(externalContactsKey(tenant))) ?? [];
}

export async function rememberExternalContacts(tenant, contacts) {
  if (!contacts?.length) return;
  const existing = await listExternalContacts(tenant);
  const byEmail = new Map(existing.map((c) => [c.email, c]));
  for (const c of contacts) {
    if (!c.email) continue;
    byEmail.set(c.email, { email: c.email, name: c.name || c.email });
  }
  await kv.set(externalContactsKey(tenant), [...byEmail.values()]);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export async function listDevMeetings(tenant, { projectId } = {}) {
  const meetings = (await kv.get(meetingsKey(tenant))) ?? [];
  const filtered = projectId ? meetings.filter((m) => m.projectId === projectId) : meetings;
  return filtered.sort((a, b) => (a.start < b.start ? 1 : -1));
}

export async function getDevMeeting(tenant, meetingId) {
  const meetings = (await kv.get(meetingsKey(tenant))) ?? [];
  return meetings.find((m) => m.id === meetingId) ?? null;
}

export async function addDevMeeting(tenant, meeting) {
  const entry = {
    id: generateId(),
    calendarEventId: meeting.calendarEventId,
    title: meeting.title,
    tipo: meeting.tipo || 'equipo',
    recurrence: meeting.recurrence ?? null, // { freq: 'WEEKLY'|'MONTHLY', interval } | null
    start: meeting.start,
    end: meeting.end,
    attendees: meeting.attendees ?? [],
    meetLink: meeting.meetLink ?? null,
    notes: '',
    documentLinks: [],
    proposals: [], // { id, date, startTime, duration, proposedById, proposedByName, createdAt } — ver addProposal/removeProposal
    projectId: meeting.projectId ?? null,
    projectName: meeting.projectName ?? null,
    createdAt: new Date().toISOString(),
    createdBy: meeting.createdBy ?? null,
    createdByName: meeting.createdByName ?? null,
    createdByEmail: meeting.createdByEmail ?? null, // para avisarle por mail si alguien propone otro horario
  };
  const meetings = (await kv.get(meetingsKey(tenant))) ?? [];
  await kv.set(meetingsKey(tenant), [...meetings, entry]);
  return entry;
}

// Para "Proponer otra hora" — reemplaza los campos que vienen de Calendar (título/tipo/horario/
// invitados/recurrencia/proyecto), deja notes/documentLinks/createdAt/createdBy intactos (eso no
// tiene nada que ver con reprogramar).
export async function updateDevMeeting(tenant, meetingId, patch) {
  const meetings = (await kv.get(meetingsKey(tenant))) ?? [];
  const next = meetings.map((m) => (m.id === meetingId ? { ...m, ...patch } : m));
  await kv.set(meetingsKey(tenant), next);
  return next.find((m) => m.id === meetingId) ?? null;
}

// Para quien NO organizó la reunión: "proponer otra hora" nunca toca el evento real ni el
// registro guardado — solo deja una propuesta pendiente que el organizador ve al abrir el panel
// de detalle y decide si aceptar (ahí sí se reprograma de verdad, ver acceptProposal en la ruta
// propose/route.js) o rechazar.
export async function addProposal(tenant, meetingId, proposal) {
  const entry = { id: generateId(), ...proposal, createdAt: new Date().toISOString() };
  const meetings = (await kv.get(meetingsKey(tenant))) ?? [];
  const next = meetings.map((m) => (m.id === meetingId ? { ...m, proposals: [...(m.proposals ?? []), entry] } : m));
  await kv.set(meetingsKey(tenant), next);
  return entry;
}

export async function removeProposal(tenant, meetingId, proposalId) {
  const meetings = (await kv.get(meetingsKey(tenant))) ?? [];
  const next = meetings.map((m) => (m.id === meetingId ? { ...m, proposals: (m.proposals ?? []).filter((p) => p.id !== proposalId) } : m));
  await kv.set(meetingsKey(tenant), next);
}

export async function updateDevMeetingNotes(tenant, meetingId, { notes, documentLinks }) {
  const meetings = (await kv.get(meetingsKey(tenant))) ?? [];
  const next = meetings.map((m) => (m.id === meetingId
    ? { ...m, notes: notes ?? m.notes, documentLinks: documentLinks ?? m.documentLinks }
    : m));
  await kv.set(meetingsKey(tenant), next);
  return next.find((m) => m.id === meetingId) ?? null;
}

export async function removeDevMeeting(tenant, meetingId) {
  const meetings = (await kv.get(meetingsKey(tenant))) ?? [];
  const target = meetings.find((m) => m.id === meetingId);
  await kv.set(meetingsKey(tenant), meetings.filter((m) => m.id !== meetingId));
  return target ?? null;
}
