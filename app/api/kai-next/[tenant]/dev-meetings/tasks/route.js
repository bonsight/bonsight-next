import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { resolveProjectAccessLevel, getProjectMeta } from '@/lib/kaiNext/projects';
import { listDevTasks, addDevTask, updateDevTask, removeDevTask } from '@/lib/kaiNext/devTasks';
import { tryCreateGoogleTask, setGoogleTaskDone, setGoogleTaskDue, deleteGoogleTask } from '@/lib/kai/tasks';

// Mismo gate que .../dev-meetings/route.js — Tasks vive adentro de Reuniones, no tiene permiso
// propio.
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

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req, { params }) {
  const { tenant } = await params;
  const { error } = await gate(tenant);
  if (error) return error;

  const tasks = await listDevTasks(tenant);
  return Response.json({ tasks });
}

// Intenta crear la tarea de verdad en el Google Tasks de quien la pide (ver lib/kai/tasks.js) —
// si esa cuenta no es una identidad real de Workspace, tryCreateGoogleTask devuelve null y acá
// se guarda igual, solo que sin espejo en Google. Nunca bloquea la creación por eso.
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
  const { title, date, time, deadline, description, responsableId, responsableName, responsableEmail, projectId } = body;
  if (!title?.trim()) return Response.json({ error: 'El título es requerido.' }, { status: 400 });
  if (!date) return Response.json({ error: 'La fecha es requerida.' }, { status: 400 });

  // Sin responsable explícito (ej. el "+ Tarea" rápido de cada día), queda asignada a quien la
  // crea — mismo default que las reuniones.
  const rId = responsableId || identity.personId || null;
  const rName = responsableName || identity.personName || null;
  const rEmail = responsableEmail || identity.personEmail || null;

  // El nombre del proyecto se resuelve server-side (igual que dev-meetings/route.js) — nunca se
  // confía en lo que mande el cliente, así queda siempre consistente con el proyecto real. Sin
  // restricción de projectKind: a diferencia de dev-meetings (solo 'desarrollo'), una tarea
  // puede colgar de cualquier tipo de proyecto.
  let projectName = null;
  if (projectId) {
    const meta = await getProjectMeta(tenant, projectId);
    if (!meta) return Response.json({ error: 'Proyecto no encontrado.' }, { status: 404 });
    projectName = meta.name;
  }

  const googleTaskId = await tryCreateGoogleTask(rEmail, { title: title.trim(), due: deadline || date, notes: description });
  const task = await addDevTask(tenant, {
    title: title.trim(), date, time: time || null, deadline: deadline || null, description: description || '', googleTaskId,
    responsableId: rId, responsableName: rName, responsableEmail: rEmail,
    projectId: projectId || null, projectName,
    createdById: identity.personId ?? null, createdByName: identity.personName ?? null, createdByEmail: identity.personEmail ?? null,
  });
  return Response.json({ task });
}

export async function PATCH(req, { params }) {
  const { tenant } = await params;
  const { error } = await gate(tenant);
  if (error) return error;

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }
  const { taskId, done, date, deadline } = body;
  if (!taskId) return Response.json({ error: 'taskId es requerido.' }, { status: 400 });

  // Solo se toca lo que venga en el body: marcar hecha no debe mover fechas, ni al revés.
  const patch = {};
  if (done !== undefined) patch.done = !!done;
  if (date !== undefined) {
    if (!ISO_DATE.test(date ?? '')) return Response.json({ error: 'Fecha planificada inválida.' }, { status: 400 });
    patch.date = date;
  }
  if (deadline !== undefined) {
    if (deadline && !ISO_DATE.test(deadline)) return Response.json({ error: 'Fecha límite inválida.' }, { status: 400 });
    patch.deadline = deadline || null;
  }
  if (!Object.keys(patch).length) return Response.json({ error: 'Nada que actualizar.' }, { status: 400 });

  const task = await updateDevTask(tenant, taskId, patch);
  if (!task) return Response.json({ error: 'Tarea no encontrada.' }, { status: 404 });
  if (task.synced) {
    if (patch.done !== undefined) await setGoogleTaskDone(task.responsableEmail, task.googleTaskId, patch.done);
    // Mismo criterio que al crear: en Google el vencimiento es la fecha límite o, sin ella, la planificada.
    if (patch.date !== undefined || patch.deadline !== undefined) {
      await setGoogleTaskDue(task.responsableEmail, task.googleTaskId, task.deadline || task.date);
    }
  }
  return Response.json({ task });
}

export async function DELETE(req, { params }) {
  const { tenant } = await params;
  const { error } = await gate(tenant);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get('taskId');
  if (!taskId) return Response.json({ error: 'taskId es requerido.' }, { status: 400 });

  const task = await removeDevTask(tenant, taskId);
  if (task?.synced) await deleteGoogleTask(task.responsableEmail, task.googleTaskId);
  return Response.json({ ok: true });
}
