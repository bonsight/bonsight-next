import Anthropic from '@anthropic-ai/sdk';

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

  return `EXPERIMENTO: ${meta.name}
Propósito: ${meta.purpose || '(no definido)'}
Hipótesis: ${meta.hypothesis || '(no definida)'}
Criterios de éxito: ${meta.successCriteria?.join(' · ') || '(no definidos)'}

PRUEBAS Y EJECUCIONES:
${testsDesc || '(sin pruebas todavía)'}

FEEDBACK RECIENTE:
${feedbackDesc}`;
}

export async function generateSupervisorSummary(experiment) {
  const context = buildContext(experiment);
  const prompt = `Sos el asistente de Labs de Bonsight, ayudando a un Supervisor a entender rápido qué pasó en su experimento desde la última vez que lo revisó.

${context}

Generá:
1. "whatChanged": un párrafo corto (3-4 líneas) resumiendo qué pasó — nuevos aportes, resultados relevantes, cualquier cosa que contradiga la hipótesis o los criterios de éxito.
2. "priorities": lista de 0 a 3 cosas que necesitan la atención del Supervisor — inconsistencias entre ejecuciones, resultados que contradicen la hipótesis, datos faltantes importantes, feedback sin responder. Cada ítem: { "title": "string corto", "why": "string explicando por qué importa", "icon": "un solo emoji relevante" }. Si no hay nada urgente, lista vacía — no inventes problemas.

Respondé ÚNICAMENTE con JSON válido, sin texto antes ni después, sin markdown:
{ "whatChanged": "string", "priorities": [{ "title": "string", "why": "string", "icon": "string" }] }`;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({ model: MODEL, max_tokens: 1200, messages: [{ role: 'user', content: prompt }] });
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
  const parsed = JSON.parse(cleaned);

  return {
    whatChanged: parsed.whatChanged || '',
    priorities: Array.isArray(parsed.priorities) ? parsed.priorities : [],
  };
}

export async function generateDirectorBrief(experiment) {
  const context = buildContext(experiment);
  const prompt = `Sos el asistente de Labs de Bonsight, armando el resumen ejecutivo de un experimento para su Director — alguien con 30 segundos, que quiere la conclusión antes que el detalle.

${context}

Generá:
1. "headline": UNA oración con el hallazgo más importante hasta ahora (el "titular").
2. "narrative": un párrafo corto con contexto adicional — qué falta confirmar, qué riesgo hay.
3. "dimensions": evaluá estas 5 dimensiones con un número de 0 a 100 y una etiqueta corta (2-4 palabras) que explique el número — "Hipótesis" (qué tan confirmada está), "Éxito" (% de criterios de éxito cumplidos), "Ejecución" (volumen/ritmo de ejecuciones), "Conocimiento" (qué tan resuelto está lo que se quería aprender), "Documentación" (qué tan bien registrado/validado está todo).
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
