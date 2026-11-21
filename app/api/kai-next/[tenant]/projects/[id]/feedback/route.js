import { projectContext } from '@/lib/kaiNext/projectAccess';
import { getProject, addFeedback, dismissFeedbackSuggestion, feedbackVisibleToMember, FEEDBACK_TARGET_TYPES } from '@/lib/kaiNext/projects';
import { suggestExecutionFromFeedback } from '@/lib/kaiNext/projectAI';
import { projectRoleOf } from '@/lib/kaiNext/capabilities';
import { listTasks as listDevTasks, getTask as getDevTask, getEpica } from '@/lib/kaiNext/devStore';

// Feedback por ítem, traído de Labs. Lo deja un Director o un Supervisor del proyecto (el
// Registrador / Team member solo lo recibe). Quien no supervisa ve solo el feedback general y el
// de sus propias tareas, pruebas y aportes, nunca el privado.
// Excepción en proyectos de Desarrollo: quien tiene la tarea a cargo (responsable o colaborador)
// puede RESPONDER el feedback de su tarea — en un equipo de desarrollo esa conversación es la
// parte útil. Igual no abre hilos nuevos.
const isDev = (meta) => meta.projectKind === 'desarrollo';

async function devTasksOf(tenant, id, meta) {
  return isDev(meta) ? listDevTasks(tenant, id).catch(() => []) : [];
}

export async function GET(req, { params }) {
  const { tenant, id } = await params;
  const ctx = await projectContext(tenant, id);
  if (ctx.error) return ctx.error;
  const project = await getProject(tenant, id);
  const devTasks = await devTasksOf(tenant, id, ctx.meta);
  const feedback = ctx.supervises
    ? project.feedback
    : feedbackVisibleToMember(project.feedback, { ...project, devTasks }, ctx.identity.personId);
  return Response.json({ feedback, canWrite: ctx.supervises, canReply: ctx.supervises || isDev(ctx.meta) });
}

async function resolveTarget(tenant, id, project, targetType, targetId) {
  if (targetType === 'dev_tarea') {
    const t = targetId ? await getDevTask(tenant, id, targetId) : null;
    return t ? { targetId: t.id, targetLabel: t.title } : null;
  }
  if (targetType === 'epica') {
    const e = targetId ? await getEpica(tenant, id, targetId) : null;
    return e ? { targetId: e.id, targetLabel: e.name } : null;
  }
  if (targetType === 'proyecto') return { targetId: null, targetLabel: 'Proyecto general' };
  if (targetType === 'prueba') {
    const t = project.tests.find((x) => x.id === targetId);
    return t ? { targetId: t.id, targetLabel: t.name } : null;
  }
  if (targetType === 'aporte') {
    const e = project.executions.find((x) => x.id === targetId);
    if (!e) return null;
    const t = project.tests.find((x) => x.id === e.testId);
    return { targetId: e.id, targetLabel: `Aporte de ${e.contributor} — ${t?.name || 'prueba eliminada'}` };
  }
  if (targetType === 'tarea') {
    const t = project.tasks.find((x) => x.id === targetId);
    return t ? { targetId: t.id, targetLabel: t.nombre } : null;
  }
  if (targetType === 'partida') {
    const p = project.partidas.find((x) => x.id === targetId);
    return p ? { targetId: p.id, targetLabel: p.descripcion } : null;
  }
  if (targetType === 'reporte') {
    const r = project.reports.find((x) => x.id === targetId);
    return r ? { targetId: r.id, targetLabel: `Reporte del ${new Date(r.createdAt).toLocaleDateString('es-PE')}` } : null;
  }
  return null;
}

export async function POST(req, { params }) {
  const { tenant, id } = await params;
  const ctx = await projectContext(tenant, id);
  if (ctx.error) return ctx.error;
  const body = await req.json().catch(() => ({}));
  const { text, visibility, attachments, replyTo } = body;
  const cleanAttachments = Array.isArray(attachments) ? attachments : [];
  if (!text?.trim() && !cleanAttachments.length) {
    return Response.json({ error: 'Escribe un texto o adjunta un archivo.' }, { status: 400 });
  }

  const project = await getProject(tenant, id);
  // Una respuesta hereda el target del feedback original: queda agrupada con él y el cliente no
  // puede apuntarla a otro lado.
  let targetType = body.targetType;
  let targetId = body.targetId;
  let replyVisibility = null;
  if (replyTo) {
    const parent = project.feedback.find((f) => f.id === replyTo);
    if (!parent) return Response.json({ error: 'El feedback al que respondes ya no existe.' }, { status: 400 });
    ({ targetType, targetId } = parent);
    // La respuesta hereda la visibilidad del hilo: responder en algo privado no lo hace público.
    replyVisibility = parent.visibility;
  }
  if (!FEEDBACK_TARGET_TYPES.includes(targetType)) return Response.json({ error: 'targetType inválido.' }, { status: 400 });

  if (!ctx.supervises) {
    // Solo la excepción de Desarrollo: responder en el hilo de una tarea propia.
    const pid = ctx.identity.personId;
    const own = isDev(ctx.meta) && replyTo && targetType === 'dev_tarea' && pid
      && (await devTasksOf(tenant, id, ctx.meta)).some((t) => t.id === targetId && (t.responsableId === pid || t.colaboradorIds?.includes(pid)));
    if (!own) return Response.json({ error: 'Solo un Director o un Supervisor del proyecto puede dejar feedback.' }, { status: 403 });
  }
  const target = await resolveTarget(tenant, id, project, targetType, targetId);
  if (!target) return Response.json({ error: 'No encontramos el ítem al que va el feedback.' }, { status: 400 });

  const suggestion = !replyTo && project.meta.projectKind === 'experimental' && ['proyecto', 'prueba', 'aporte'].includes(targetType)
    ? await suggestExecutionFromFeedback(tenant, project.meta.name, target.targetLabel, text)
    : null;

  try {
    const entry = await addFeedback(tenant, id, {
      who: ctx.actor,
      whoId: ctx.identity.personId,
      whoRole: ctx.isDirector ? 'Director' : projectRoleOf(ctx.identity.access?.capabilities).label,
      targetType, ...target, text, visibility: replyVisibility ?? visibility, suggestion,
      attachments: cleanAttachments,
      replyTo: replyTo || null,
    });
    return Response.json({ ok: true, feedback: entry });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo guardar el feedback.' }, { status: 400 });
  }
}

// Descartar la sugerencia de IA de un feedback.
export async function DELETE(req, { params }) {
  const { tenant, id } = await params;
  const ctx = await projectContext(tenant, id);
  if (ctx.error) return ctx.error;
  if (!ctx.supervises) return Response.json({ error: 'No autorizado.' }, { status: 403 });
  const { feedbackId } = await req.json().catch(() => ({}));
  try {
    return Response.json({ ok: true, feedback: await dismissFeedbackSuggestion(tenant, id, feedbackId) });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
