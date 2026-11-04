import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// Tareas tipo Google Tasks dentro de Reuniones (ver KaiNextMeetings.jsx, fila arriba de la
// grilla semanal) — una lista por tenant, no por persona: cada tarea guarda quién la creó, así
// que "mías" se calcula en el cliente igual que ya se hace con las reuniones. Redis es siempre
// la fuente de verdad para lo que ve Kai Next; `googleTaskId`/`synced` son un espejo opcional
// hacia el Google Tasks real de quien la creó (ver lib/kai/tasks.js) cuando esa cuenta lo permite.
const tasksKey = (tenant) => `kainext:${tenant}:dev-tasks`;

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export async function listDevTasks(tenant) {
  return (await kv.get(tasksKey(tenant))) ?? [];
}

export async function addDevTask(tenant, task) {
  const entry = {
    id: generateId(),
    title: task.title,
    date: task.date, // YYYY-MM-DD — día en que se muestra en la fila de la semana
    time: task.time ?? null, // HH:MM opcional, solo informativo (no posiciona en la grilla de horas)
    deadline: task.deadline ?? null, // YYYY-MM-DD opcional, distinto de `date` — ver lib/kai/tasks.js (due)
    description: task.description ?? '',
    done: false,
    googleTaskId: task.googleTaskId ?? null,
    synced: !!task.googleTaskId,
    // Responsable = de quién es la tarea (a quién se le asignó) — puede ser otra persona
    // distinta de quien la creó, por eso el espejo a Google (ver route.js) impersona al
    // responsable, no a quien la creó.
    responsableId: task.responsableId ?? null,
    responsableName: task.responsableName ?? null,
    responsableEmail: task.responsableEmail ?? null,
    projectId: task.projectId ?? null,
    projectName: task.projectName ?? null,
    createdById: task.createdById ?? null,
    createdByName: task.createdByName ?? null,
    createdByEmail: task.createdByEmail ?? null,
    createdAt: new Date().toISOString(),
  };
  const list = await listDevTasks(tenant);
  await kv.set(tasksKey(tenant), [...list, entry]);
  return entry;
}

export async function updateDevTask(tenant, taskId, patch) {
  const list = await listDevTasks(tenant);
  const next = list.map((t) => (t.id === taskId ? { ...t, ...patch } : t));
  await kv.set(tasksKey(tenant), next);
  return next.find((t) => t.id === taskId) ?? null;
}

export async function removeDevTask(tenant, taskId) {
  const list = await listDevTasks(tenant);
  const target = list.find((t) => t.id === taskId);
  await kv.set(tasksKey(tenant), list.filter((t) => t.id !== taskId));
  return target ?? null;
}
