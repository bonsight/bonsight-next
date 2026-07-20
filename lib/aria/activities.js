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

  return {
    name: results.meta.name,
    objective: results.meta.objective,
    type: results.meta.type,
    finishedAt: results.meta.finishedAt,
    participantCount: results.participantCount,
    questions: results.template.map((q) => q.text),
    responses: results.responses,
  };
}
