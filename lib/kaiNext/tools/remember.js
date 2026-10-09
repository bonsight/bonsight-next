import { updateKaiNextMemory } from '@/lib/kaiNext/memory';

export const REMEMBER_TOOL = {
  name: 'remember',
  description: 'Guarda un dato breve y reusable en la memoria persistente de este tenant para futuras conversaciones (preferencias, contexto recurrente, decisiones). Úsalo con moderación, no para cualquier detalle de la charla.',
  input_schema: {
    type: 'object',
    properties: {
      key: { type: 'string', description: 'Identificador corto en snake_case, ej: reporting_preference' },
      value: { type: 'string', description: 'El dato a recordar, en una oración.' },
    },
    required: ['key', 'value'],
  },
};

export async function executeRememberTool(input, { tenant }) {
  await updateKaiNextMemory(tenant, { facts: { [input.key]: input.value } });
  return { saved: true, key: input.key };
}
