import Anthropic from '@anthropic-ai/sdk';
import { trackUsage } from '@/lib/kai/usage';
import { formatSuccessCriterion } from '@/lib/kaiNext/projects';

// IA de Proyectos traída de Labs (lib/labs/reports.js y summary.js): borradores de reporte,
// resumen para Director/Supervisor y la sugerencia que sale de un feedback. Siempre es un
// subproducto de lo que el equipo ya registró: nada de inventar cifras. Los textos que ve el
// cliente van en español neutro (tú), nunca voseo.
const MODEL = 'claude-sonnet-4-6';

function client() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

async function ask(tenant, feature, prompt, maxTokens) {
  const response = await client().messages.create({ model: MODEL, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] });
  trackUsage({ tenant, product: 'kai-next', feature, model: MODEL, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens }).catch(() => null);
  return response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
}

function parseJson(text) {
  return JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, ''));
}

function feedbackLines(feedback, limit) {
  return feedback.slice(0, limit).map((f) => `- ${f.who} sobre "${f.targetLabel ?? f.target ?? 'el proyecto'}": ${f.text?.trim() || '(adjuntó evidencia sin texto)'}`).join('\n');
}

function experimentalContext(project) {
  const { meta, tests = [], executions = [], feedback = [] } = project;
  const testsDesc = tests.map((t) => {
    const execs = executions.filter((e) => e.testId === t.id);
    const lines = execs.map((e) => `[${e.tag}] ${e.contributor}: ${Object.entries(e.values ?? {}).map(([k, v]) => `${k}=${v}`).join(', ')}${e.note ? ` — ${e.note}` : ''}${e.validatedBy ? ' (validado)' : ''}`);
    return `- ${t.name} (${execs.length} ejecuciones): ${lines.join(' | ') || '(sin ejecuciones todavía)'}`;
  }).join('\n');
  return `PROYECTO: ${meta.name}
Propósito: ${meta.purpose || '(no definido)'}
Hipótesis: ${meta.hypothesis || '(no definida)'}
Criterios de éxito: ${meta.successCriteria?.length ? meta.successCriteria.map(formatSuccessCriterion).join(' · ') : '(no definidos)'}

PRUEBAS Y EJECUCIONES:
${testsDesc || '(sin pruebas todavía)'}

FEEDBACK RECIENTE:
${feedbackLines(feedback, 10) || '(sin feedback todavía)'}`;
}

// ── Reporte experimental (JSON con secciones) ───────────────────────────────
export async function generateExperimentalReport(tenant, project) {
  const prompt = `Eres el asistente de proyectos de Kai. Sintetiza el reporte de un proyecto a partir de lo que el equipo ya registró. No inventes nada que no esté en los datos.

${experimentalContext(project)}

Genera un reporte con estas secciones, en español neutro (usa "tú", nunca "vos"):
- "summary": párrafo de 3-4 líneas con la conclusión principal.
- "whatWasTested": lista de qué se probó (una por prueba con ejecuciones).
- "results": párrafo con los resultados más relevantes, citando números reales cuando existan.
- "learnings": párrafo con los aprendizajes operativos (qué se entendió, no solo los datos).
- "highlightedFeedback": párrafo con el feedback más relevante, o cadena vacía si no hay.
- "nextSteps": lista de 2-4 próximos pasos según lo que falta confirmar.

Responde ÚNICAMENTE con JSON válido, sin texto antes ni después y sin markdown:
{ "summary": "string", "whatWasTested": ["string"], "results": "string", "learnings": "string", "highlightedFeedback": "string", "nextSteps": ["string"] }`;
  const parsed = parseJson(await ask(tenant, 'project_report_experimental', prompt, 1500));
  return {
    summary: parsed.summary || '',
    whatWasTested: Array.isArray(parsed.whatWasTested) ? parsed.whatWasTested : [],
    results: parsed.results || '',
    learnings: parsed.learnings || '',
    highlightedFeedback: parsed.highlightedFeedback || '',
    nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [],
  };
}

// ── Reporte de avance (civil y seguimiento): los números salen de computeCivilMetrics y
// computeCivilReportBreakdown; la IA solo los interpreta en prosa.
export async function generateProgressReportAnalysis(tenant, project, breakdown) {
  const { meta, civilMetrics: m, civilAlerts = [], feedback = [] } = project;
  const tasksLines = breakdown.tasksByFase.map((f) => `- ${f.fase}: ${f.pct}% (${f.done}/${f.total} tareas terminadas)`).join('\n') || '(sin tareas cargadas)';
  const alertsLines = civilAlerts.map((a) => `- ${a.message}`).join('\n') || '(sin alertas activas)';
  const comments = feedbackLines(feedback.filter((f) => f.targetType === 'tarea' || f.targetType === 'partida'), 15) || '(sin comentarios registrados)';
  const hasBudget = m?.totalImporte > 0;
  const financial = hasBudget
    ? `Financiero: ${m.pctFinanciero}% ejecutado (S/ ${m.totalEjecutado.toLocaleString('es-PE')} de S/ ${m.totalImporte.toLocaleString('es-PE')})\n\nAVANCE FINANCIERO POR ETAPA\n${breakdown.financialByEtapa.map((e) => `- ${e.etapa}: ${e.pct}% (S/ ${e.ejecutado.toLocaleString('es-PE')} de S/ ${e.importe.toLocaleString('es-PE')})`).join('\n')}\n\n`
    : '';
  const prompt = `Eres el asistente de proyectos de Kai. Redacta el análisis de un reporte de avance a partir de datos reales. No inventes ninguna cifra que no esté abajo.

PROYECTO: ${meta.name}${meta.code ? ` (código ${meta.code})` : ''}

AVANCE GENERAL
${financial}Tareas: ${m?.pctTareas ?? 0}% (${m?.tareasTerminadas ?? 0} de ${m?.totalTareas ?? 0})
Tiempo transcurrido del proyecto: ${m?.pctTiempo ?? 0}%

AVANCE DE TAREAS POR FASE
${tasksLines}

ALERTAS DEL SISTEMA
${alertsLines}

COMENTARIOS RECIENTES
${comments}

Escribe un análisis de 2 a 4 párrafos en español neutro (usa "tú", nunca "vos"), con tono de informe de avance. Interpreta los números: avance de tareas, desvíos de cronograma o sobrecostos según las alertas (si no hay datos financieros, no los menciones), qué dicen los comentarios y qué queda pendiente. No repitas las cifras como tabla: explica qué significan.

Responde ÚNICAMENTE con el texto del análisis, sin JSON, sin markdown y sin comillas envolventes.`;
  return ask(tenant, 'project_report_progress', prompt, 800);
}

// ── Resumen para el Director: titular + 5 dimensiones (la "tarjeta de análisis de Kai") ──
export async function generateDirectorBrief(tenant, project) {
  const prompt = `Eres el asistente de proyectos de Kai y armas el resumen ejecutivo de un proyecto para su Director: alguien con 30 segundos que quiere la conclusión antes que el detalle.

${experimentalContext(project)}

Genera, en español neutro (usa "tú", nunca "vos"):
1. "headline": UNA oración con el hallazgo más importante hasta ahora.
2. "narrative": un párrafo corto con contexto: qué falta confirmar, qué riesgo hay.
3. "dimensions": evalúa estas 5 dimensiones con un número de 0 a 100 y una etiqueta corta (2-4 palabras). Calibra con rigor: un proyecto recién empezado con pocas ejecuciones debe puntuar BAJO en casi todo; que lo poco que existe esté bien cargado no significa que el proyecto esté avanzado.
   - "Hipótesis" (qué tan confirmada o refutada está; 0 si aún no hay evidencia suficiente)
   - "Éxito" (% de criterios de éxito cumplidos)
   - "Ejecución" (ritmo de ejecuciones frente a lo que el proyecto necesita para concluir)
   - "Conocimiento" (cuánto de lo que se quería aprender ya se sabe)
   - "Trazabilidad" (qué parte del trabajo está documentada y validada, ponderado por el trabajo total)
4. "wentWell": 2-4 puntos cortos de lo que salió bien.
5. "needsAttention": 2-4 puntos cortos de lo que requiere atención.

Responde ÚNICAMENTE con JSON válido, sin texto antes ni después y sin markdown:
{ "headline": "string", "narrative": "string", "dimensions": [{ "name": "string", "pct": 0, "label": "string" }], "wentWell": ["string"], "needsAttention": ["string"] }`;
  const parsed = parseJson(await ask(tenant, 'project_director_brief', prompt, 1200));
  return {
    headline: parsed.headline || '',
    narrative: parsed.narrative || '',
    dimensions: Array.isArray(parsed.dimensions) ? parsed.dimensions : [],
    wentWell: Array.isArray(parsed.wentWell) ? parsed.wentWell : [],
    needsAttention: Array.isArray(parsed.needsAttention) ? parsed.needsAttention : [],
  };
}

// ── Resumen para el Supervisor: qué cambió + hasta 3 prioridades ────────────────
export async function generateSupervisorSummary(tenant, project) {
  const prompt = `Eres el asistente de proyectos de Kai y ayudas a un Supervisor a entender rápido qué pasó en su proyecto desde la última vez que lo revisó.

${experimentalContext(project)}

Genera, en español neutro (usa "tú", nunca "vos"):
1. "whatChanged": un párrafo corto (3-4 líneas) con lo que pasó: nuevos aportes, resultados relevantes, cualquier cosa que contradiga la hipótesis o los criterios de éxito.
2. "priorities": de 0 a 3 cosas que necesitan su atención (inconsistencias entre ejecuciones, resultados que contradicen la hipótesis, datos faltantes importantes, feedback sin responder). Cada una: { "title": "string corto", "why": "por qué importa", "icon": "un solo emoji" }. Si no hay nada urgente, lista vacía: no inventes problemas.

Responde ÚNICAMENTE con JSON válido, sin texto antes ni después y sin markdown:
{ "whatChanged": "string", "priorities": [{ "title": "string", "why": "string", "icon": "string" }] }`;
  const parsed = parseJson(await ask(tenant, 'project_supervisor_summary', prompt, 1200));
  return {
    whatChanged: parsed.whatChanged || '',
    priorities: Array.isArray(parsed.priorities) ? parsed.priorities : [],
  };
}

// ── Feedback que pide una nueva ejecución → sugerencia para el Supervisor. Best-effort: si
// falla, el feedback se guarda igual, sin sugerencia.
export async function suggestExecutionFromFeedback(tenant, projectName, targetLabel, text) {
  if (!text?.trim()) return null;
  try {
    const prompt = `Un feedback sobre el proyecto "${projectName}" (respecto a: ${targetLabel}) dice:\n"""${text}"""\n\n¿Este feedback pide o implica claramente una nueva ejecución de prueba (por ejemplo, repetir algo con otras condiciones o a mayor escala)? Si sí, responde con UNA frase corta en español neutro describiendo qué ejecución nueva sugiere, sin comillas. Si no lo implica claramente, responde exactamente: NINGUNA`;
    const out = await ask(tenant, 'project_feedback_suggestion', prompt, 150);
    return !out || out.toUpperCase().includes('NINGUNA') ? null : out;
  } catch {
    return null;
  }
}
