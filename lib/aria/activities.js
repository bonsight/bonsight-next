import { getActivityResults as getRawActivityResults, getActivityMeta } from '@/lib/kai/activities';

export async function runActivityResultsQuery({ tenant, activityId }) {
  if (!activityId) {
    throw new Error('activityId is required');
  }

  const meta = await getActivityMeta(tenant, activityId);
  if (!meta || meta.tenant !== tenant) {
    return { error: 'Activity no encontrada para este tenant.' };
  }
  if (meta.status !== 'finished') {
    return { error: 'Esta Activity todavía no finalizó — no hay resultados definitivos para analizar.' };
  }

  const results = await getRawActivityResults(tenant, activityId);
  if (!results) return { error: 'No se pudieron cargar los resultados de la Activity.' };

  const completed = results.responses.filter((r) => r.status === 'completed');
  const abandoned = results.responses.filter((r) => r.status === 'abandoned');
  const durations = completed.map((r) => r.totalDurationMs).filter((n) => typeof n === 'number');
  const questionTimes = results.responses.flatMap((r) => r.answers.map((a) => a.timeOnQuestionMs)).filter((n) => typeof n === 'number');
  const avg = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null);

  // Lista plana e indexada por pregunta — para que present_workshop_canvas pueda
  // referenciar respuestas individuales con un índice unívoco (itemIndexes).
  const itemsByQuestion = {};
  results.template.forEach((q) => { itemsByQuestion[q.id] = []; });
  results.responses.forEach((r) => {
    r.answers.forEach((a, qi) => {
      const q = results.template[qi];
      if (!q) return;
      a.items.forEach((text) => {
        itemsByQuestion[q.id].push({ index: itemsByQuestion[q.id].length, participant: r.participant, text });
      });
    });
  });

  return {
    name: results.meta.name,
    objective: results.meta.objective,
    type: results.meta.type,
    finishedAt: results.meta.finishedAt,
    participantCount: results.participantCount,
    questions: results.template.map((q) => ({ id: q.id, text: q.text, responseType: q.responseType })),
    summary: {
      completedCount: completed.length,
      abandonedCount: abandoned.length,
      completionRatePct: results.participantCount ? Math.round((completed.length / results.participantCount) * 100) : null,
      avgTotalDurationMs: avg(durations),
      avgTimePerQuestionMs: avg(questionTimes),
    },
    itemsByQuestion,
    responses: results.responses,
  };
}
