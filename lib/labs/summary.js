import Anthropic from '@anthropic-ai/sdk';
import { trackUsage } from '@/lib/kai/usage';
import { formatSuccessCriterion } from './experiments';

const MODEL = 'claude-sonnet-4-6';

function buildContext(experiment) {
  const { meta, tests, executions, feedback } = experiment;
  const testsDesc = tests
    .map((t) => {
      const execs = executions.filter((e) => e.testId === t.id);
      return `- ${t.name} (${execs.length} ejecuciones): ${execs
        .map((e) => `[${e.tag}] ${e.contributor}: ${Object.entries(e.values).map(([k, v]) => `${k}=${v}`).join(', ')}${e.note ? ` — ${e.note}` : ''}${e.validatedBy ? ' (validado)' : ''}`)
        .join(' | ') || '(sin ejecuciones todavía)'}`;
    })
    .join('\n');
  const feedbackDesc = feedback.slice(0, 10).map((f) => `- ${f.who} sobre "${f.target}": ${f.text}`).join('\n') || '(sin feedback todavía)';

  return `PROYECTO: ${meta.name}
Propósito: ${meta.purpose || '(no definido)'}
Hipótesis: ${meta.hypothesis || '(no definida)'}
Criterios de éxito: ${meta.successCriteria?.length ? meta.successCriteria.map(formatSuccessCriterion).join(' · ') : '(no definidos)'}

PRUEBAS Y EJECUCIONES:
${testsDesc || '(sin pruebas todavía)'}

FEEDBACK RECIENTE:
${feedbackDesc}`;
}

export async function generateSupervisorSummary(tenant, experiment) {
  const context = buildContext(experiment);
  const prompt = `Sos el asistente de Labs de Bonsight, ayudando a un Supervisor a entender rápido qué pasó en su proyecto desde la última vez que lo revisó.

${context}

Generá:
1. "whatChanged": un párrafo corto (3-4 líneas) resumiendo qué pasó — nuevos aportes, resultados relevantes, cualquier cosa que contradiga la hipótesis o los criterios de éxito.
2. "priorities": lista de 0 a 3 cosas que necesitan la atención del Supervisor — inconsistencias entre ejecuciones, resultados que contradicen la hipótesis, datos faltantes importantes, feedback sin responder. Cada ítem: { "title": "string corto", "why": "string explicando por qué importa", "icon": "un solo emoji relevante" }. Si no hay nada urgente, lista vacía — no inventes problemas.

Respondé ÚNICAMENTE con JSON válido, sin texto antes ni después, sin markdown:
{ "whatChanged": "string", "priorities": [{ "title": "string", "why": "string", "icon": "string" }] }`;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({ model: MODEL, max_tokens: 1200, messages: [{ role: 'user', content: prompt }] });
  trackUsage({ tenant, product: 'labs', feature: 'supervisor_summary', model: MODEL, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens }).catch(() => null);
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
  const parsed = JSON.parse(cleaned);

  return {
    whatChanged: parsed.whatChanged || '',
    priorities: Array.isArray(parsed.priorities) ? parsed.priorities : [],
  };
}

export async function generateDirectorBrief(tenant, experiment) {
  const context = buildContext(experiment);
  const prompt = `Sos el asistente de Labs de Bonsight, armando el resumen ejecutivo de un proyecto para su Director — alguien con 30 segundos, que quiere la conclusión antes que el detalle.

${context}

Generá:
1. "headline": UNA oración con el hallazgo más importante hasta ahora (el "titular").
2. "narrative": un párrafo corto con contexto adicional — qué falta confirmar, qué riesgo hay.
3. "dimensions": evaluá estas 5 dimensiones con un número de 0 a 100 y una etiqueta corta (2-4 palabras) que explique el número. Sé estricto con la calibración: un proyecto recién empezado con pocas ejecuciones debe puntuar BAJO en la mayoría de las dimensiones — que el poco dato que existe esté bien cargado y validado no significa que el proyecto esté avanzado, solo que ESE dato puntual está bien hecho. No confundas "calidad de lo poco que hay" con "progreso general del proyecto".
   - "Hipótesis" (qué tan confirmada o refutada está — 0 si todavía no hay evidencia suficiente para saberlo, sin importar cuántas ejecuciones haya)
   - "Éxito" (% de criterios de éxito cumplidos)
   - "Ejecución" (volumen/ritmo de ejecuciones logrado hasta ahora respecto a lo que un proyecto de este tipo necesitaría para sacar conclusiones)
   - "Conocimiento" (qué tan resuelto está lo que se quería aprender — no cuánto se registró, sino cuánto se sabe ahora que no se sabía antes)
   - "Trazabilidad" (qué proporción del trabajo hecho está bien documentado y validado, ponderado por cuánto trabajo se hizo en TOTAL — un proyecto con una sola ejecución, aunque esa ejecución esté perfecta, tiene una trazabilidad todavía incipiente, no alta)
4. "wentWell": 2-4 bullets cortos de lo que salió bien.
5. "needsAttention": 2-4 bullets cortos de lo que requiere atención.

Respondé ÚNICAMENTE con JSON válido, sin texto antes ni después, sin markdown:
{
  "headline": "string",
  "narrative": "string",
  "dimensions": [{ "name": "string", "pct": 0, "label": "string" }],
  "wentWell": ["string"],
  "needsAttention": ["string"]
}`;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({ model: MODEL, max_tokens: 1200, messages: [{ role: 'user', content: prompt }] });
  trackUsage({ tenant, product: 'labs', feature: 'director_brief', model: MODEL, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens }).catch(() => null);
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
  const parsed = JSON.parse(cleaned);

  return {
    headline: parsed.headline || '',
    narrative: parsed.narrative || '',
    dimensions: Array.isArray(parsed.dimensions) ? parsed.dimensions : [],
    wentWell: Array.isArray(parsed.wentWell) ? parsed.wentWell : [],
    needsAttention: Array.isArray(parsed.needsAttention) ? parsed.needsAttention : [],
  };
}
