import Anthropic from '@anthropic-ai/sdk';
import { isAuthorizedForTenant, getCurrentLabsUser } from '@/lib/labs/auth';
import { addFeedback, dismissFeedbackSuggestion, getExperiment, TASK_TRACKING_KINDS, taskResponsables } from '@/lib/labs/experiments';
import { trackUsage } from '@/lib/kai/usage';

const MODEL = 'claude-sonnet-4-6';

// Best-effort — si esto falla, el feedback igual se guarda sin sugerencia. No bloquea nada.
async function suggestConversion(tenant, experimentName, targetLabel, text) {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const prompt = `Un feedback sobre el experimento "${experimentName}" (respecto a: ${targetLabel}) dice:\n"""${text}"""\n\n¿Este feedback pide o implica claramente una nueva ejecución de prueba (ej. repetir algo con otras condiciones, probar a mayor escala)? Si sí, respondé con UNA frase corta describiendo qué ejecución nueva sugiere, en español, sin comillas. Si no lo implica claramente, respondé exactamente: NINGUNA`;
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    });
    trackUsage({ tenant, product: 'labs', feature: 'feedback_conversion_suggestion', model: MODEL, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens }).catch(() => null);
    const text_ = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    if (!text_ || text_.toUpperCase().includes('NINGUNA')) return null;
    return text_;
  } catch {
    return null;
  }
}

// No la usa el cliente hoy (lee experiment.feedback del fetch principal) pero queda expuesta,
// así que aplica el mismo recorte por rol que /experiments/[id] para un Registrador.
export async function GET(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const user = await getCurrentLabsUser(tenant);
  if (!user) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  const experiment = await getExperiment(tenant, id);
  if (!experiment) return Response.json({ error: 'Experimento no encontrado.' }, { status: 404 });

  if (user.role === 'Supervisor' && !experiment.meta.supervisorIds?.includes(user.id)) {
    return Response.json({ error: 'No tenés acceso a este proyecto.' }, { status: 403 });
  }
  if (user.role === 'Registrador' && TASK_TRACKING_KINDS.includes(experiment.meta.projectKind)) {
    const visibleTaskIds = new Set(experiment.tasks.filter((t) => taskResponsables(t).includes(user.id)).map((t) => t.id));
    if (visibleTaskIds.size === 0) return Response.json({ error: 'No tenés acceso a este proyecto.' }, { status: 403 });
    experiment.feedback = experiment.feedback.filter((f) => f.targetType === 'tarea' && visibleTaskIds.has(f.targetId));
  } else if (user.role === 'Registrador') {
    const visibleTestIds = new Set(experiment.tests.filter((t) => t.registradorIds?.includes(user.id)).map((t) => t.id));
    if (visibleTestIds.size === 0) return Response.json({ error: 'No tenés acceso a este proyecto.' }, { status: 403 });
    const visibleExecutionIds = new Set(experiment.executions.filter((e) => visibleTestIds.has(e.testId)).map((e) => e.id));
    experiment.feedback = experiment.feedback.filter((f) => (
      f.targetType === 'proyecto'
      || (f.targetType === 'prueba' && visibleTestIds.has(f.targetId))
      || (f.targetType === 'aporte' && visibleExecutionIds.has(f.targetId))
      || !f.targetType
    ));
  }

  return Response.json({ feedback: experiment.feedback });
}

export async function POST(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const user = await getCurrentLabsUser(tenant);
  if (!user) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  if (user.role === 'Registrador') {
    return Response.json({ error: 'Los Registradores no dejan feedback, solo lo reciben.' }, { status: 403 });
  }

  const { targetType, targetId, text, visibility, attachments } = await req.json();
  const cleanAttachments = Array.isArray(attachments) ? attachments : [];
  // Un comentario puede ser solo evidencia (una foto sin texto) — no forzamos texto si ya
  // hay al menos un adjunto.
  if (!text?.trim() && cleanAttachments.length === 0) {
    return Response.json({ error: 'Escribí un texto o adjuntá un archivo.' }, { status: 400 });
  }
  if (!['proyecto', 'prueba', 'aporte', 'tarea', 'partida', 'reporte'].includes(targetType)) {
    return Response.json({ error: 'targetType inválido.' }, { status: 400 });
  }
  // Experimental: Director puede dejar feedback en cualquier nivel; Supervisor solo sobre
  // aportes (registros) del equipo que supervisa. Civil: comentarios en Tareas/Partidas —
  // tanto Director como Supervisor pueden, sin restricción entre ellos (nunca Registrador,
  // ya bloqueado arriba). 'reporte' vale para ambos flujos — es donde Director y Supervisor
  // se van y vienen comentarios sobre un reporte ya generado.
  const supervisorAllowedTargets = ['aporte', 'tarea', 'partida', 'reporte'];
  if (user.role === 'Supervisor' && !supervisorAllowedTargets.includes(targetType)) {
    return Response.json({ error: 'Un Supervisor no puede dejar feedback a este nivel.' }, { status: 403 });
  }

  const experiment = await getExperiment(tenant, id);
  if (!experiment) return Response.json({ error: 'Experimento no encontrado.' }, { status: 404 });

  if (user.role === 'Supervisor' && !experiment.meta.supervisorIds?.includes(user.id)) {
    return Response.json({ error: 'No tenés acceso a este proyecto.' }, { status: 403 });
  }

  let resolvedTargetId = null;
  let targetLabel = 'Proyecto general';
  if (targetType === 'prueba') {
    const test = experiment.tests.find((t) => t.id === targetId);
    if (!test) return Response.json({ error: 'Prueba no encontrada.' }, { status: 400 });
    resolvedTargetId = test.id;
    targetLabel = test.name;
  } else if (targetType === 'aporte') {
    const execution = experiment.executions.find((e) => e.id === targetId);
    if (!execution) return Response.json({ error: 'Aporte no encontrado.' }, { status: 400 });
    const test = experiment.tests.find((t) => t.id === execution.testId);
    resolvedTargetId = execution.id;
    targetLabel = `Aporte de ${execution.contributor} — ${test?.name || 'prueba eliminada'}`;
  } else if (targetType === 'tarea') {
    const task = experiment.tasks.find((t) => t.id === targetId);
    if (!task) return Response.json({ error: 'Tarea no encontrada.' }, { status: 400 });
    resolvedTargetId = task.id;
    targetLabel = task.nombre;
  } else if (targetType === 'partida') {
    const partida = experiment.partidas.find((p) => p.id === targetId);
    if (!partida) return Response.json({ error: 'Partida no encontrada.' }, { status: 400 });
    resolvedTargetId = partida.id;
    targetLabel = partida.descripcion;
  } else if (targetType === 'reporte') {
    const report = experiment.reports.find((r) => r.id === targetId);
    if (!report) return Response.json({ error: 'Reporte no encontrado.' }, { status: 400 });
    resolvedTargetId = report.id;
    targetLabel = `Reporte del ${new Date(report.createdAt).toLocaleDateString('es-ES')}`;
  }

  // La sugerencia de "convertir en una nueva ejecución" solo tiene sentido para proyectos
  // experimentales (pruebas/aportes) — no aplica al vocabulario de tareas/partidas de civil.
  const suggestion = ['proyecto', 'prueba', 'aporte'].includes(targetType)
    ? await suggestConversion(tenant, experiment.meta.name, targetLabel, text)
    : null;
  const entry = await addFeedback(tenant, id, {
    who: user.name, whoRole: user.role, targetType, targetId: resolvedTargetId, targetLabel, text, visibility, suggestion,
    attachments: cleanAttachments,
  });
  return Response.json({ ok: true, feedback: entry });
}

export async function DELETE(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const { feedbackId } = await req.json();
  try {
    const entry = await dismissFeedbackSuggestion(tenant, id, feedbackId);
    return Response.json({ ok: true, feedback: entry });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo actualizar.' }, { status: 400 });
  }
}
