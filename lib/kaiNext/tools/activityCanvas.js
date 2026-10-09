// Tools del chat scoped de Activities (ver app/api/kai-next/[tenant]/activities/[activityId]/chat/route.js)
// — deliberadamente separadas de lib/kaiNext/agentShared.js: este chat SOLO puede tocar el
// canvas de la activity en la que vive, nada del resto de Kai Next (ni present_analysis, ni
// fuentes, ni sprints). ctx siempre trae { tenant, activityId, cache } — cache es un objeto
// mutable de una sola corrida del loop, usado para pasar itemsByQuestion de
// get_activity_results a present_workshop_canvas sin que Claude tenga que retransmitir texto.
import { runActivityResultsQuery } from '@/lib/aria/activities';
import { setActivityCanvas, updateActivityCanvas } from '@/lib/kai/activities';
import { startFichaForCanvasGroup } from '@/lib/kai/ficha';
import { suggestGroupFusions, suggestFichaOrder } from '@/lib/kaiNext/canvasAnalysis';

export const GET_ACTIVITY_RESULTS_TOOL = {
  name: 'get_activity_results',
  description: 'Carga las respuestas crudas de esta activity (ya finalizada) agrupadas por pregunta, con un índice único por respuesta. Usala ANTES de present_workshop_canvas — nunca inventes respuestas, siempre partí de esto.',
  input_schema: { type: 'object', properties: {} },
};

export async function executeGetActivityResultsTool(_input, ctx) {
  const result = await runActivityResultsQuery({ tenant: ctx.tenant, activityId: ctx.activityId });
  if (!result.error) ctx.cache.itemsByQuestion = result.itemsByQuestion;
  return result;
}

export const PRESENT_WORKSHOP_CANVAS_TOOL = {
  name: 'present_workshop_canvas',
  description: 'Usala DESPUÉS de get_activity_results para presentar las respuestas agrupadas por temática. Agrupá TODAS las respuestas de cada pregunta (si una no encaja en ningún tema, creale un grupo propio) — nunca omitas una respuesta ni reescribas su texto, solo referenciá su índice en itemIndexes.',
  input_schema: {
    type: 'object',
    properties: {
      workshopName: { type: 'string' },
      summary: {
        type: 'object',
        properties: {
          participantCount: { type: 'integer' },
          questionCount: { type: 'integer' },
          totalItems: { type: 'integer' },
          groupCount: { type: 'integer' },
        },
        required: ['participantCount', 'questionCount', 'totalItems', 'groupCount'],
      },
      questions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            questionId: { type: 'string' },
            questionText: { type: 'string' },
            groups: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Slug corto único dentro de la pregunta, ej. "eventos-demos".' },
                  name: { type: 'string' },
                  consolidatedText: { type: 'string' },
                  itemIndexes: { type: 'array', items: { type: 'integer' } },
                },
                required: ['id', 'name', 'consolidatedText', 'itemIndexes'],
              },
            },
          },
          required: ['questionId', 'questionText', 'groups'],
        },
      },
    },
    required: ['workshopName', 'summary', 'questions'],
  },
};

export async function executePresentWorkshopCanvasTool(input, ctx) {
  const itemsByQuestion = ctx.cache.itemsByQuestion;
  if (!itemsByQuestion) throw new Error('Llamá primero a get_activity_results.');
  const canvas = await setActivityCanvas(ctx.tenant, ctx.activityId, { ...input, itemsByQuestion });
  return { ok: true, groupCount: canvas.summary?.groupCount };
}

export const UPDATE_WORKSHOP_CANVAS_TOOL = {
  name: 'update_workshop_canvas',
  description: `Aplica una edición puntual sobre el canvas ya generado de esta activity (no regenera nada, es una mutación quirúrgica). Acciones disponibles en "action", con los params que requiere cada una:
- rename_group: { questionId, groupId, name }
- merge_groups: { questionId, sourceGroupId, targetGroupId } (mismo pregunta)
- merge_groups_cross_question: { sourceQuestionId, sourceGroupId, targetQuestionId, targetGroupId }
- delete_group: { questionId, groupId } (sus iniciativas pasan a "Sin agrupar", no se pierden)
- create_group: { questionId, id, name, consolidatedText? }
- move_item: { questionId, fromGroupId, toGroupId, itemIndex }
- create_item: { questionId, groupId, text, participant? }
- comment_item: { questionId, itemIndex, comment }
- update_group_meta: { questionId, groupId, area?, responsable?, involucrados? }
- revert_groups: { questionId } (vuelve al agrupado original de present_workshop_canvas)
- undo: { questionId } (deshace el último cambio sobre esa pregunta)`,
  input_schema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['rename_group', 'merge_groups', 'merge_groups_cross_question', 'delete_group', 'create_group', 'move_item', 'create_item', 'comment_item', 'update_group_meta', 'revert_groups', 'undo'],
      },
      params: { type: 'object' },
    },
    required: ['action', 'params'],
  },
};

export async function executeUpdateWorkshopCanvasTool(input, ctx) {
  const canvas = await updateActivityCanvas(ctx.tenant, ctx.activityId, input.action, input.params ?? {});
  return { ok: true, summary: canvas.summary };
}

export const SUGGEST_GROUP_FUSIONS_TOOL = {
  name: 'suggest_group_fusions',
  description: 'Analiza todos los grupos sin ficha de este canvas (entre preguntas distintas) y sugiere cuáles hablan del mismo tema de fondo, para fusionarlos antes de armar fichas por separado. Mostrale las sugerencias al usuario en texto, con el motivo de cada una — no fusiones nada automáticamente, eso lo decide el humano con update_workshop_canvas.',
  input_schema: { type: 'object', properties: {} },
};

export async function executeSuggestGroupFusionsTool(_input, ctx) {
  return suggestGroupFusions(ctx.tenant, ctx.activityId);
}

export const SUGGEST_FICHA_ORDER_TOOL = {
  name: 'suggest_ficha_order',
  description: 'Sugiere en qué orden conviene lanzar fichas para los grupos de una pregunta, según qué tan conectados están con lo que Kai ya sabe de la empresa (dolores/objetivos/oportunidades).',
  input_schema: {
    type: 'object',
    properties: { questionId: { type: 'string' } },
    required: ['questionId'],
  },
};

export async function executeSuggestFichaOrderTool(input, ctx) {
  return { order: await suggestFichaOrder(ctx.tenant, ctx.activityId, input.questionId) };
}

export const START_FICHA_FOR_GROUP_TOOL = {
  name: 'start_ficha_for_group',
  description: 'Arranca una ficha de objetivos (5 preguntas fijas, autogestionada) para profundizar un grupo puntual — generá un código y QR para compartir con quien tenga que responderla. Usala solo cuando el usuario lo pida explícitamente para un grupo.',
  input_schema: {
    type: 'object',
    properties: { questionId: { type: 'string' }, groupId: { type: 'string' } },
    required: ['questionId', 'groupId'],
  },
};

export async function executeStartFichaForGroupTool(input, ctx) {
  try {
    const canvas = await startFichaForCanvasGroup(ctx.tenant, ctx.activityId, { questionId: input.questionId, groupId: input.groupId });
    const group = canvas.questions.find((q) => q.questionId === input.questionId)?.groups.find((g) => g.id === input.groupId);
    return { ok: true, fichaCode: group?.fichaCode };
  } catch (err) {
    return { error: err.message };
  }
}

export const ACTIVITY_CANVAS_TOOLS = [
  GET_ACTIVITY_RESULTS_TOOL,
  PRESENT_WORKSHOP_CANVAS_TOOL,
  UPDATE_WORKSHOP_CANVAS_TOOL,
  SUGGEST_GROUP_FUSIONS_TOOL,
  SUGGEST_FICHA_ORDER_TOOL,
  START_FICHA_FOR_GROUP_TOOL,
];

export async function executeActivityCanvasTool(name, input, ctx) {
  if (name === 'get_activity_results') return executeGetActivityResultsTool(input, ctx);
  if (name === 'present_workshop_canvas') return executePresentWorkshopCanvasTool(input, ctx);
  if (name === 'update_workshop_canvas') return executeUpdateWorkshopCanvasTool(input, ctx);
  if (name === 'suggest_group_fusions') return executeSuggestGroupFusionsTool(input, ctx);
  if (name === 'suggest_ficha_order') return executeSuggestFichaOrderTool(input, ctx);
  if (name === 'start_ficha_for_group') return executeStartFichaForGroupTool(input, ctx);
  return { error: `Herramienta desconocida: ${name}` };
}
