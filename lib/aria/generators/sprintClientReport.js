import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-6';

// Agrupa tareas terminadas por Iniciativa (o Proyecto si no hay iniciativa) — es lo más
// parecido a "módulo/frente de trabajo" que existe en el schema hoy; no hay un campo de
// módulo explícito en Tareas.
function groupDoneTasks(tasks) {
  const groups = [];
  for (const t of tasks) {
    if (t.status !== 'Done') continue;
    const key = t.iniciativaName || t.proyectoName || 'General';
    let g = groups.find((x) => x.key === key);
    if (!g) { g = { key, tasks: [] }; groups.push(g); }
    g.tasks.push(t);
  }
  return groups;
}

function buildContext({ clienteName, periodLabel, sprintTitles, groups, openTasks }) {
  const groupsDesc = groups
    .map((g) => `${g.key}:\n${g.tasks.map((t) => `  - [${t.taskType || 'Tarea'}] ${t.title}`).join('\n')}`)
    .join('\n\n') || '(sin tareas terminadas en el período)';
  const openDesc = openTasks.map((t) => `- [${t.status}] ${t.title}`).join('\n') || '(ninguna)';

  return `CLIENTE: ${clienteName}
PERÍODO: ${periodLabel} (sprints incluidos: ${sprintTitles.join(', ')})

TRABAJO TERMINADO, AGRUPADO POR INICIATIVA/PROYECTO:
${groupsDesc}

TRABAJO QUE QUEDÓ EN CURSO O PENDIENTE AL CIERRE DEL PERÍODO:
${openDesc}`;
}

// Mismo espíritu que los generadores de reportes de Labs: el reporte es un subproducto de
// trabajo ya registrado en el board, nunca algo inventado. Acá además hay una restricción de
// tono explícita (decisión del usuario): reporte de servicio hacia afuera, tercera persona
// plural ("el equipo"), NUNCA nombres de personas de Bonsight — el cliente no ve quién hizo
// qué, solo qué se hizo y qué valor le deja.
export async function generateSprintClientReportDraft({ clienteName, periodLabel, sprintTitles, tasks }) {
  const groups = groupDoneTasks(tasks);
  const openTasks = tasks.filter((t) => t.status !== 'Done');
  const context = buildContext({ clienteName, periodLabel, sprintTitles, groups, openTasks });

  const prompt = `Sos el equipo de Bonsight redactando un reporte de servicio para el cliente ${clienteName}, a partir de tareas reales de un tablero de trabajo — no inventes nada que no esté en los datos de abajo. Tono profesional, en tercera persona/plural ("el equipo", "se avanzó en..."), NUNCA menciones nombres de personas de Bonsight. El cliente va a leer esto — traducí trabajo técnico a lenguaje de negocio cuando haga falta, sin perder precisión ni inventar impacto que no se pueda sostener con lo que hay abajo.

${context}

Generá un reporte con esta estructura EXACTA en JSON:
{
  "titulo": "Reporte de Servicio a ${clienteName} — <período corto, ej. 'Julio–Agosto 2026'>",
  "resumenEjecutivo": "1-2 párrafos: en qué se enfocó el trabajo del período y cuál fue el hito más relevante.",
  "secciones": [
    { "titulo": "<nombre del frente de trabajo>", "texto": "1 párrafo de contexto sobre ese frente", "bullets": ["punto concreto de qué se hizo", "..."] }
  ],
  "valorEntregado": ["frase de valor de negocio entregado al cliente, una por punto relevante"]
}

Una entrada en "secciones" por cada iniciativa/proyecto con trabajo terminado (podés fusionar frentes muy chicos si tiene sentido, o dejar fuera los que no tuvieron avance real). "valorEntregado" traduce el trabajo técnico a impacto para el cliente (ej. "habilitó X", "redujo Y"), no repite los bullets técnicos tal cual.

Respondé ÚNICAMENTE con el JSON, sin texto antes ni después, sin markdown.`;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  // 2200 se quedaba corto con 2+ sprints de tareas (el JSON se cortaba a mitad de un string y
  // JSON.parse tiraba "Unterminated string") — 8192 es el mismo techo que ya usa sprintDraft.js
  // para generaciones de tamaño similar en este mismo tablero.
  const response = await anthropic.messages.create({ model: MODEL, max_tokens: 8192, messages: [{ role: 'user', content: prompt }] });
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('La IA no pudo terminar de armar el reporte (respuesta incompleta) — probá con menos sprints, o generalo de nuevo.');
  }

  return {
    titulo: parsed.titulo || `Reporte de Servicio a ${clienteName}`,
    resumenEjecutivo: parsed.resumenEjecutivo || '',
    secciones: Array.isArray(parsed.secciones)
      ? parsed.secciones.map((s) => ({ titulo: s.titulo || '', texto: s.texto || '', bullets: Array.isArray(s.bullets) ? s.bullets : [] }))
      : [],
    valorEntregado: Array.isArray(parsed.valorEntregado) ? parsed.valorEntregado : [],
  };
}
