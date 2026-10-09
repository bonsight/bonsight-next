import Anthropic from '@anthropic-ai/sdk';
import { isAuthorizedForTenant, getCurrentKaiNextAccess } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { runAgenticLoop } from '@/lib/shared/agents/agenticLoop';
import {
  ACTIVITY_CANVAS_TOOLS, executeActivityCanvasTool,
} from '@/lib/kaiNext/tools/activityCanvas';
import {
  getActivityMeta, getActivityCanvas, getActivityCanvasChat, appendActivityCanvasChat,
} from '@/lib/kai/activities';

const MODEL = 'claude-sonnet-4-6';
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Chat scoped a UNA activity puntual — deliberadamente separado del chat general de Kai Next
// (app/api/kai-next/[tenant]/route.js): solo tiene las tools de lib/kaiNext/tools/activityCanvas.js,
// nunca puede tocar fuentes, perfil de negocio, sprints ni otras activities. Ver nota en
// activityCanvas.js sobre por qué existe este recorte.
function buildSystemPrompt(meta, canvas) {
  const canvasBlock = canvas
    ? `Canvas actual de esta activity (ya generado):\n${JSON.stringify(canvas, null, 0)}`
    : 'Esta activity todavía NO tiene un canvas — si el usuario pide analizarla o agrupar las respuestas, llamá primero a get_activity_results y después a present_workshop_canvas.';

  return `Sos el asistente de Kai dentro de la sección Activities, enfocado EXCLUSIVAMENTE en esta activity puntual: "${meta.name}"${meta.objective ? ` (objetivo: ${meta.objective})` : ''}.

No tenés acceso a nada más de la empresa — ni fuentes de datos, ni el perfil de negocio, ni otras activities, ni sprints. Tu trabajo es analizar y organizar los resultados de ESTA activity:
- Si te piden analizarla o agrupar respuestas y no hay canvas todavía: get_activity_results → present_workshop_canvas.
- Si ya hay canvas y te piden ajustar algo (renombrar un grupo, fusionar dos, mover una iniciativa, separar algo que no corresponde, agregar una iniciativa que faltó, deshacer el último cambio, volver al agrupado original): usá update_workshop_canvas con la acción que corresponda. Identificá bien a qué grupo/pregunta se refiere el usuario usando los ids del canvas actual.
- Si te piden revisar si hay grupos de distintas preguntas que en realidad hablan de lo mismo: suggest_group_fusions.
- Si te piden sugerir en qué orden conviene profundizar los grupos de una pregunta: suggest_ficha_order.
- Si te piden armar/lanzar una ficha de profundización para un grupo puntual: start_ficha_for_group.

Después de cualquier tool que mute el canvas, confirmá en una oración concreta qué cambió (no repitas todo el canvas en texto, el usuario ya lo ve en la pantalla al lado del chat).

${canvasBlock}`;
}

export async function POST(req, { params }) {
  const { tenant, activityId } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const access = await getCurrentKaiNextAccess(tenant);
  if (!isSectionAllowed(access, 'activities')) {
    return Response.json({ error: 'Activities no está habilitado para tu usuario.' }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }
  const userMessage = String(body?.message ?? '').trim();
  if (!userMessage) return Response.json({ error: 'Falta el mensaje.' }, { status: 400 });

  const meta = await getActivityMeta(tenant, activityId);
  if (!meta) return Response.json({ error: 'Actividad no encontrada.' }, { status: 404 });

  const [history, canvas] = await Promise.all([
    getActivityCanvasChat(tenant, activityId),
    getActivityCanvas(tenant, activityId),
  ]);

  const messages = [...history.map((m) => ({ role: m.role, content: m.content })), { role: 'user', content: userMessage }];
  const cache = {};

  const { finalText, stoppedByTool } = await runAgenticLoop({
    anthropic,
    model: MODEL,
    maxTokens: 2048,
    maxIterations: 6,
    system: buildSystemPrompt(meta, canvas),
    messages,
    tools: ACTIVITY_CANVAS_TOOLS,
    executeTool: executeActivityCanvasTool,
    context: { tenant, activityId, cache },
  });

  const updatedCanvas = await getActivityCanvas(tenant, activityId);
  const now = new Date().toISOString();
  await appendActivityCanvasChat(tenant, activityId, [
    { role: 'user', content: userMessage, at: now },
    { role: 'assistant', content: finalText, at: now },
  ]);

  return Response.json({ reply: finalText, canvas: updatedCanvas, stoppedByTool });
}

export async function GET(req, { params }) {
  const { tenant, activityId } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const access = await getCurrentKaiNextAccess(tenant);
  if (!isSectionAllowed(access, 'activities')) {
    return Response.json({ error: 'Activities no está habilitado para tu usuario.' }, { status: 403 });
  }
  const [history, canvas] = await Promise.all([
    getActivityCanvasChat(tenant, activityId),
    getActivityCanvas(tenant, activityId),
  ]);
  return Response.json({ history, canvas });
}
