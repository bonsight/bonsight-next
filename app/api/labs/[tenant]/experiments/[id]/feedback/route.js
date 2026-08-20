import Anthropic from '@anthropic-ai/sdk';
import { isAuthorizedForTenant } from '@/lib/labs/auth';
import { addFeedback, dismissFeedbackSuggestion, getExperiment } from '@/lib/labs/experiments';

const MODEL = 'claude-sonnet-4-6';

// Best-effort — si esto falla, el feedback igual se guarda sin sugerencia. No bloquea nada.
async function suggestConversion(experimentName, target, text) {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const prompt = `Un feedback sobre el experimento "${experimentName}" (respecto a: ${target}) dice:\n"""${text}"""\n\n¿Este feedback pide o implica claramente una nueva ejecución de prueba (ej. repetir algo con otras condiciones, probar a mayor escala)? Si sí, respondé con UNA frase corta describiendo qué ejecución nueva sugiere, en español, sin comillas. Si no lo implica claramente, respondé exactamente: NINGUNA`;
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    });
    const text_ = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    if (!text_ || text_.toUpperCase().includes('NINGUNA')) return null;
    return text_;
  } catch {
    return null;
  }
}

export async function GET(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const experiment = await getExperiment(tenant, id);
  if (!experiment) return Response.json({ error: 'Experimento no encontrado.' }, { status: 404 });
  return Response.json({ feedback: experiment.feedback });
}

export async function POST(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const { who, target, text, visibility } = await req.json();
  if (!who?.trim() || !text?.trim()) {
    return Response.json({ error: 'who y text son requeridos.' }, { status: 400 });
  }

  const experiment = await getExperiment(tenant, id);
  if (!experiment) return Response.json({ error: 'Experimento no encontrado.' }, { status: 404 });

  const suggestion = await suggestConversion(experiment.meta.name, target || 'Experimento general', text);
  const entry = await addFeedback(tenant, id, { who, target, text, visibility, suggestion });
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
