import Anthropic from '@anthropic-ai/sdk';
import { trackUsage } from '@/lib/kai/usage';

// Q&A liviano para el panel de detalle de una Épica — a diferencia del chat completo de Kai Next
// (agéntico, con tools y Business Profile), esto es un solo llamado sin tools, acotado al contexto
// de ESA épica (mismo criterio que projectImport.js/projectSchedule.js), para no desviarse ni
// mezclarse con el historial general de conversaciones.
const MODEL = 'claude-sonnet-4-6';

function buildPrompt({ epica, historias, question, history }) {
  const historiasList = historias.length
    ? historias.map((t) => `- "${t.title}" (${t.status}${t.responsableName ? ` · ${t.responsableName}` : ''}${t.sprintIds?.length ? '' : ' · sin sprint'})`).join('\n')
    : '(sin historias todavía)';
  const historyText = history?.length
    ? history.map((h) => `${h.role === 'user' ? 'Persona' : 'Vos'}: ${h.content}`).join('\n')
    : '';

  return `Sos Kai, el asistente de Proyectos — te preguntan sobre UNA épica puntual de un proyecto de desarrollo de software. Respondé SOLO con lo que esta información permite saber; si la pregunta pide algo que no está acá (ej. detalles de otras épicas, decisiones de negocio ajenas), decilo con naturalidad en vez de inventar.

ÉPICA: "${epica.name}"
Fase: ${epica.fase || 'sin fase'}
Fechas: ${epica.startDate && epica.endDate ? `${epica.startDate} → ${epica.endDate}` : 'sin fecha'}
Notas: ${epica.notas || '(sin notas)'}

HISTORIAS (${historias.length}):
${historiasList}
${historyText ? `\nCONVERSACIÓN PREVIA EN ESTE PANEL:\n${historyText}\n` : ''}
PREGUNTA: ${question}

Respondé en 1-3 oraciones, directo, en español, sin markdown ni encabezados.`;
}

export async function askAboutEpica(tenant, { epica, historias, question, history }) {
  if (!question?.trim()) throw new Error('La pregunta está vacía.');

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 400,
    messages: [{ role: 'user', content: buildPrompt({ epica, historias: historias || [], question, history: history || [] }) }],
  });
  trackUsage({ tenant, product: 'kai-next', feature: 'project_epica_ask', model: MODEL, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens }).catch(() => null);

  return response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
}
