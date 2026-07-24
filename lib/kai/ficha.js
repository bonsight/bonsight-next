import Anthropic from '@anthropic-ai/sdk';
import { createAndStartSelfPacedActivity, finishActivity } from '@/lib/kai/activities';
import { runActivityResultsQuery } from '@/lib/aria/activities';

const MODEL = 'claude-sonnet-4-6';

// Orden fijo — el mapeo con la respuesta consolidada es por posición, no por id
// (lockActivity siempre regenera los ids como q1..q5).
export const FICHA_TEMPLATE = [
  { id: 'objetivo', text: '¿Cuál es el objetivo? Escríbelo en una sola oración, clara y directa.' },
  { id: 'problema', text: '¿Qué problema o situación actual lo origina?' },
  { id: 'prioridad', text: '¿Por qué es prioritario ahora? ¿Qué cambiaría si no lo abordamos este año?' },
  { id: 'exito', text: '¿Cómo se ve el éxito? ¿Qué debería ser diferente en 6-12 meses si logramos este objetivo?' },
  { id: 'restricciones', text: '¿Qué restricciones o condiciones debemos considerar? Tiempo, recursos, dependencias o limitaciones reales.' },
];

export async function startFichaForGroup(tenant, { name, investigationId, questionId, groupId }) {
  return createAndStartSelfPacedActivity(tenant, {
    name,
    questions: FICHA_TEMPLATE,
    source: { investigationId, questionId, groupId },
  });
}

export async function consolidateFicha(tenant, activityId) {
  await finishActivity(tenant, activityId);
  const results = await runActivityResultsQuery({ tenant, activityId });
  if (results.error) throw new Error(results.error);

  const byQuestion = FICHA_TEMPLATE.map((fq, i) => {
    const answers = (results.responses ?? [])
      .map((r) => r.answers[i])
      .filter((a) => a?.items?.length)
      .flatMap((a) => a.items);
    return { key: fq.id, questionText: fq.text, answers };
  });

  const prompt = `Sos el asistente de consolidación de fichas de objetivos de Bonsight. Vas a recibir, para cada una de 5 preguntas, las respuestas individuales de varios miembros del equipo. Tu trabajo es sintetizar UNA respuesta consolidada y coherente por pregunta — no elijas la de una sola persona, combiná lo que dijeron todos en un texto fluido y bien redactado. Si hay desacuerdo real entre respuestas, mencionalo brevemente en vez de ocultarlo.

${byQuestion.map((q) => `### ${q.questionText}\n${q.answers.length ? q.answers.map((a) => `- ${a}`).join('\n') : '(sin respuestas)'}`).join('\n\n')}

Respondé ÚNICAMENTE con un JSON válido, sin texto antes ni después, sin markdown:
{ "objetivo": "string", "problema": "string", "prioridad": "string", "exito": "string", "restricciones": "string" }`;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
  const ficha = JSON.parse(cleaned);

  return {
    objetivo: ficha.objetivo ?? '',
    problema: ficha.problema ?? '',
    prioridad: ficha.prioridad ?? '',
    exito: ficha.exito ?? '',
    restricciones: ficha.restricciones ?? '',
    participantCount: results.participantCount,
    participantNames: results.responses.map((r) => r.participant),
    generatedAt: new Date().toISOString(),
  };
}
