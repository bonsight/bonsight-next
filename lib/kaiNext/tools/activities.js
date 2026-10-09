// Tool de solo lectura para que el chat general de Kai Next pueda responder sobre Activities
// (workshops/dinámicas con el equipo) — hasta ahora esta sección solo era consultable desde el
// chat scoped de cada Activity (ver lib/kaiNext/tools/activityCanvas.js), nunca desde el chat
// general, aunque la data (resultados, canvas ya agrupado) viviera en el mismo tenant.
// Reusa get_activity_results y el canvas tal cual existen — no reimplementa el análisis, solo
// lo expone de lectura.
import { getFinishedActivitiesSummary, getActivityCanvas } from '@/lib/kai/activities';
import { runActivityResultsQuery } from '@/lib/aria/activities';

export const QUERY_ACTIVITIES_TOOL = {
  name: 'query_activities',
  description: 'Consulta las Activities (workshops/dinámicas) ya finalizadas con el equipo. Sin activity_name devuelve la lista de activities finalizadas con su objetivo y cantidad de participantes. Con activity_name trae el detalle de una puntual: sus preguntas y las respuestas, agrupadas por tema si ya se analizaron (canvas), o crudas por participante si todavía no. Úsala para preguntas sobre qué propuso el equipo, iniciativas/resultados de un workshop puntual, etc.',
  input_schema: {
    type: 'object',
    properties: {
      activity_name: { type: 'string', description: 'Nombre (o parte del nombre) de la activity puntual a consultar. Si se omite, devuelve la lista de activities finalizadas.' },
    },
  },
};

export async function executeQueryActivitiesTool(input, { tenant }) {
  const finished = await getFinishedActivitiesSummary(tenant);
  if (!finished.length) return { error: 'Todavía no hay activities finalizadas para este tenant.' };

  const activityName = input?.activity_name?.trim().toLowerCase();
  if (!activityName) return { activities: finished };

  const match = finished.find((a) => a.name?.toLowerCase().includes(activityName));
  if (!match) return { error: `No encontré ninguna activity finalizada que coincida con "${input.activity_name}".` };

  const canvas = await getActivityCanvas(tenant, match.id);
  if (canvas) {
    return {
      activity: canvas.workshopName,
      resumen: canvas.summary,
      preguntas: canvas.questions.map((q) => ({
        pregunta: q.questionText,
        grupos: (q.groups ?? []).map((g) => ({
          tema: g.label,
          cantidad: (g.itemIndexes ?? []).length,
          items: (g.itemIndexes ?? [])
            .map((idx) => canvas.itemsByQuestion?.[q.questionId]?.[idx])
            .filter(Boolean)
            .map((it) => ({ participante: it.participant, texto: it.text })),
        })),
      })),
    };
  }

  const raw = await runActivityResultsQuery({ tenant, activityId: match.id });
  if (raw.error) return raw;
  return {
    activity: raw.name,
    objetivo: raw.objective,
    resumen: raw.summary,
    preguntas: raw.questions.map((q) => ({
      pregunta: q.text,
      respuestas: (raw.itemsByQuestion[q.id] ?? []).map((it) => ({ participante: it.participant, texto: it.text })),
    })),
  };
}
