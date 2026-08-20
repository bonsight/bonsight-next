import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-6';

function buildContext(experiment) {
  const { meta, tests, executions, feedback } = experiment;
  const testsDesc = tests
    .map((t) => {
      const execs = executions.filter((e) => e.testId === t.id);
      if (!execs.length) return null;
      return `${t.name}:\n${execs
        .map((e) => `  - [${e.tag}] ${e.contributor}: ${Object.entries(e.values).map(([k, v]) => `${k}=${v}`).join(', ')}${e.note ? ` — ${e.note}` : ''}`)
        .join('\n')}`;
    })
    .filter(Boolean)
    .join('\n\n');
  const feedbackDesc = feedback.map((f) => `- ${f.who} (${f.target}): ${f.text}`).join('\n') || '(sin feedback)';

  return `PROYECTO: ${meta.name}
Propósito: ${meta.purpose || '(no definido)'}
Hipótesis: ${meta.hypothesis || '(no definida)'}
Criterios de éxito: ${meta.successCriteria?.join(' · ') || '(no definidos)'}

EJECUCIONES POR PRUEBA:
${testsDesc || '(sin ejecuciones todavía)'}

FEEDBACK:
${feedbackDesc}`;
}

// Mismo espíritu que consolidateFicha (lib/kai/ficha.js) — el reporte es un subproducto de
// lo que ya quedó registrado, no algo que alguien redacta de cero. Un humano lo aprueba
// antes de que salga (ver approveReport en experiments.js).
export async function generateReportDraft(experiment) {
  const context = buildContext(experiment);
  const prompt = `Sos el asistente de Labs de Bonsight, sintetizando el reporte de un proyecto a partir de lo que el equipo ya registró — no inventes nada que no esté en los datos de abajo.

${context}

Generá un reporte con estas secciones:
- "summary": párrafo de 3-4 líneas con la conclusión principal.
- "whatWasTested": lista de bullets de qué se probó (una por prueba con ejecuciones).
- "results": párrafo con los resultados más relevantes, citando números reales cuando existan.
- "learnings": párrafo con aprendizajes operativos que surgieron (no solo los datos, sino qué se entendió).
- "highlightedFeedback": párrafo resumiendo el feedback más relevante recibido, o cadena vacía si no hay feedback.
- "nextSteps": lista de 2-4 próximos pasos sugeridos en base a lo que falta confirmar.

Respondé ÚNICAMENTE con JSON válido, sin texto antes ni después, sin markdown:
{
  "summary": "string",
  "whatWasTested": ["string"],
  "results": "string",
  "learnings": "string",
  "highlightedFeedback": "string",
  "nextSteps": ["string"]
}`;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({ model: MODEL, max_tokens: 1500, messages: [{ role: 'user', content: prompt }] });
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
  const parsed = JSON.parse(cleaned);

  return {
    summary: parsed.summary || '',
    whatWasTested: Array.isArray(parsed.whatWasTested) ? parsed.whatWasTested : [],
    results: parsed.results || '',
    learnings: parsed.learnings || '',
    highlightedFeedback: parsed.highlightedFeedback || '',
    nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [],
  };
}
