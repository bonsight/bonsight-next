import { markResolved } from '@/lib/kai/resolutions';

export const MARK_RESOLVED_TOOL = {
  name: 'mark_resolved',
  description: 'Marca un aprendizaje o un eje estratégico como resuelto/atendido. Solo llámala cuando el usuario CONFIRMA explícitamente en la conversación que ya se hizo lo que se estaba trabajando (ej. "listo, ya se lo mandé a Joha", "eso ya quedó resuelto"). No la asumas ni la llames preventivamente.',
  input_schema: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['learning', 'eje'], description: 'Qué tipo de ítem se resolvió.' },
      ref: { type: 'string', description: 'El identificador exacto del ítem resuelto — normalmente viene indicado al inicio de esta conversación (ESTA CONVERSACIÓN ES SOBRE...). Cópialo tal cual, sin modificarlo.' },
      note: { type: 'string', description: 'Breve nota de qué se hizo para resolverlo (opcional).' },
    },
    required: ['type', 'ref'],
  },
};

export async function executeMarkResolvedTool(input, { tenant }) {
  const { type, ref, note } = input ?? {};
  if (!type || !ref) return { error: 'Falta type o ref.' };
  await markResolved(tenant, { type, ref, note });
  return { ok: true, type, ref };
}
