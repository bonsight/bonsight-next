import { addLearning } from '@/lib/kai/learnings';

// Hallazgos de orden superior (kai:{tenant}:learnings) — separados a propósito del Business
// Profile (ver businessProfile.js): un learning es un patrón o implicación, no un dato suelto.
// No tocan el perfil directamente, pero sí el score de completitud por área (lib/kai/scoring.js:
// 70% campos del perfil + 30% cantidad de learnings).
export const ADD_LEARNING_TOOL = {
  name: 'add_learning',
  description: 'Guarda un hallazgo de orden superior sobre el negocio — un patrón, una implicación, algo que conecta varios datos o conversaciones. No la uses para un dato suelto y concreto (eso es update_business_profile); úsala cuando lo que notaste es una síntesis o conclusión.',
  input_schema: {
    type: 'object',
    properties: {
      content: { type: 'string', description: 'El hallazgo, en una o dos oraciones.' },
      area: {
        type: 'string',
        enum: ['negocio', 'operaciones', 'tecnologia', 'finanzas', 'marketing', 'personas'],
        description: 'A qué área del negocio pertenece.',
      },
      impact: { type: 'string', enum: ['alto', 'medio', 'bajo'], description: 'Qué tan relevante es este hallazgo.' },
      confidence: { type: 'number', description: 'Qué tan seguro estás de este hallazgo, de 0.0 a 1.0.' },
    },
    required: ['content'],
  },
};

export async function executeAddLearningTool(input, { tenant, conversationId }) {
  const learning = await addLearning(tenant, {
    content: input?.content,
    area: input?.area ?? null,
    impact: input?.impact ?? 'medio',
    confidence: input?.confidence ?? 0.7,
    source: 'kai-next',
    conversationId: conversationId ?? null,
  });
  return { saved: !!learning };
}
