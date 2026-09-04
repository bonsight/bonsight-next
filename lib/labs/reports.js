import Anthropic from '@anthropic-ai/sdk';
import { trackUsage } from '@/lib/kai/usage';
import { formatSuccessCriterion } from './experiments';

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
Criterios de éxito: ${meta.successCriteria?.length ? meta.successCriteria.map(formatSuccessCriterion).join(' · ') : '(no definidos)'}

EJECUCIONES POR PRUEBA:
${testsDesc || '(sin ejecuciones todavía)'}

FEEDBACK:
${feedbackDesc}`;
}

// Mismo espíritu que consolidateFicha (lib/kai/ficha.js) — el reporte es un subproducto de
// lo que ya quedó registrado, no algo que alguien redacta de cero. Un humano lo aprueba
// antes de que salga (ver approveReport en experiments.js).
export async function generateReportDraft(tenant, experiment) {
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
  trackUsage({ tenant, product: 'labs', feature: 'report_draft', model: MODEL, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens }).catch(() => null);
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

// financialByEtapa/totalImporte salen vacíos/cero cuando el proyecto no tiene partidas —
// pasa siempre en 'seguimiento' (no tiene Presupuesto) y a veces en 'civil' antes de cargar
// alguna. En ese caso ni mostramos la sección al modelo, para que no la mencione de relleno.
function buildCivilContext(experiment, breakdown) {
  const { meta, civilMetrics: m, civilAlerts } = experiment;
  const tasksLines = breakdown.tasksByFase
    .map((f) => `- ${f.fase}: ${f.pct}% (${f.done}/${f.total} tareas terminadas)`)
    .join('\n') || '(sin tareas cargadas)';
  const alertsLines = civilAlerts.map((a) => `- ${a.message}`).join('\n') || '(sin alertas activas)';
  // Comentarios en tareas/partidas son la evidencia de campo — el análisis debe reflejar lo
  // que la gente reportó ahí, no solo los números agregados.
  const recentComments = experiment.feedback
    .filter((f) => f.targetType === 'tarea' || f.targetType === 'partida')
    .slice(0, 15)
    .map((f) => `- ${f.who} sobre "${f.targetLabel}": ${f.text?.trim() || '(adjuntó evidencia sin texto)'}`)
    .join('\n') || '(sin comentarios registrados)';

  const hasBudget = m.totalImporte > 0;
  const financialBlock = hasBudget
    ? `Financiero: ${m.pctFinanciero}% ejecutado (S/ ${m.totalEjecutado.toLocaleString('es-PE')} de S/ ${m.totalImporte.toLocaleString('es-PE')} presupuestados)\n\nAVANCE FINANCIERO POR ETAPA\n${breakdown.financialByEtapa.map((e) => `- ${e.etapa}: ${e.pct}% ejecutado (S/ ${e.ejecutado.toLocaleString('es-PE')} de S/ ${e.importe.toLocaleString('es-PE')})`).join('\n')}\n\n`
    : '';

  return `PROYECTO: ${meta.name}${meta.code ? ` (código ${meta.code})` : ''}

AVANCE GENERAL
${financialBlock}Tareas: ${m.pctTareas}% (${m.tareasTerminadas} de ${m.totalTareas})
Tiempo transcurrido del proyecto: ${m.pctTiempo}%

AVANCE DE TAREAS POR FASE
${tasksLines}

ALERTAS DEL SISTEMA
${alertsLines}

COMENTARIOS RECIENTES
${recentComments}`;
}

// Mismo espíritu que generateReportDraft: el análisis es un subproducto de datos ya
// registrados (tareas, partidas, comentarios), nunca algo inventado. Acá, a diferencia del
// experimental, los números en sí NO los genera la IA — ya salen de computeCivilMetrics /
// computeCivilReportBreakdown; a la IA solo le pedimos que los interprete en prosa. Sirve
// tanto para proyectos civiles como de seguimiento (mismo Cronograma, con o sin Presupuesto).
export async function generateCivilReportDraft(tenant, experiment, breakdown) {
  const context = buildCivilContext(experiment, breakdown);
  const prompt = `Sos el asistente de Labs de Bonsight, redactando el análisis de un reporte de avance de proyecto a partir de datos reales — no inventes ninguna cifra que no esté abajo.

${context}

Escribí un análisis de 2 a 4 párrafos, en español, con el tono de un informe de avance (ej. "En el proyecto se avanzó con..."). Interpretá los números — el avance de tareas, si hay desvíos de cronograma o sobrecostos según las alertas (si no hay datos financieros arriba, no los menciones), qué dicen los comentarios registrados, y qué queda pendiente. No repitas las cifras tal cual una tabla (el lector ya las ve en las tablas del reporte) — enfocate en qué significan.

Respondé ÚNICAMENTE con el texto del análisis en español, sin JSON, sin markdown, sin comillas envolventes.`;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({ model: MODEL, max_tokens: 800, messages: [{ role: 'user', content: prompt }] });
  trackUsage({ tenant, product: 'labs', feature: 'civil_report_draft', model: MODEL, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens }).catch(() => null);
  return response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
}
