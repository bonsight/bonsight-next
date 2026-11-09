import { google } from 'googleapis';

// Mismo patrón que lib/kai/calendar.js y lib/labs/gmail.js, pero impersonando a la PERSONA
// (no a kai@bonsight.co) — Google Tasks no tiene concepto de "organizador invita a otros", cada
// tarea vive en la lista de tareas de un usuario puntual. Por eso esto solo funciona para
// cuentas que son identidades reales de Workspace (ver sesión de debugging: de 7 cuentas del
// equipo, solo 1 lo era hoy) — si falla, quien llama cae a guardar la tarea solo en Kai Next.
const TASKS_SCOPE = 'https://www.googleapis.com/auth/tasks';

function getTasksClientFor(email) {
  if (!process.env.GOOGLE_CALENDAR_SA_JSON) {
    throw new Error('Falta GOOGLE_CALENDAR_SA_JSON.');
  }
  const credentials = JSON.parse(process.env.GOOGLE_CALENDAR_SA_JSON);
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [TASKS_SCOPE],
    subject: email,
  });
  return google.tasks({ version: 'v1', auth });
}

// Devuelve el id de la tarea real de Google si se pudo crear, o null si la cuenta no acepta
// impersonación (no es una identidad real de Workspace, o el scope de Tasks no está autorizado
// para delegación en todo el dominio) — nunca tira, quien llama decide qué hacer con null.
export async function tryCreateGoogleTask(email, { title, due, notes }) {
  if (!email) return null;
  try {
    const tasks = getTasksClientFor(email);
    const res = await tasks.tasks.insert({
      tasklist: '@default',
      requestBody: { title, notes: notes || undefined, due: due ? `${due}T00:00:00.000Z` : undefined },
    });
    return res.data.id ?? null;
  } catch {
    return null;
  }
}

export async function setGoogleTaskDone(email, googleTaskId, done) {
  if (!email || !googleTaskId) return;
  try {
    const tasks = getTasksClientFor(email);
    await tasks.tasks.patch({
      tasklist: '@default',
      task: googleTaskId,
      requestBody: { status: done ? 'completed' : 'needsAction' },
    });
  } catch {
    // El estado ya quedó guardado en Kai Next igual — si la cuenta dejó de ser impersonable
    // (o nunca lo fue), no hay nada más que hacer acá.
  }
}

export async function setGoogleTaskDue(email, googleTaskId, due) {
  if (!email || !googleTaskId || !due) return;
  try {
    const tasks = getTasksClientFor(email);
    await tasks.tasks.patch({
      tasklist: '@default',
      task: googleTaskId,
      requestBody: { due: `${due}T00:00:00.000Z` },
    });
  } catch {
    // Igual que setGoogleTaskDone: la fecha ya quedó guardada en Kai Next.
  }
}

export async function deleteGoogleTask(email, googleTaskId) {
  if (!email || !googleTaskId) return;
  try {
    const tasks = getTasksClientFor(email);
    await tasks.tasks.delete({ tasklist: '@default', task: googleTaskId });
  } catch {
    // noop
  }
}
