import { anthropic, executeTool, MEMORY_TOOLS } from './agentShared';
import { trackUsage } from '@/lib/kai/usage';

const MODEL = 'claude-haiku-4-5-20251001';

// Pasada aparte, después de que Kai ya respondió al usuario — ver MEMORY_TOOLS en agentShared.js
// para el porqué. Modelo chico porque es una tarea simple de extracción, no la conversación real;
// nunca lanza — si falla, el turno ya respondió bien y esto es pura ganancia, no debe romper nada.
export async function captureBusinessMemory({ tenant, conversationId, userMessage, assistantReply }) {
  if (!assistantReply?.trim()) return;
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 500,
      system: `Acabas de responder como Kai, el asistente de ${tenant}. Revisa este intercambio y, SOLO si hay un dato concreto de negocio (objetivo, dolor, riesgo, tecnología, KPI, proceso, decisión, oportunidad, o una persona con su rol) o un hallazgo de orden superior que valga la pena guardar, usa update_business_profile y/o add_learning — puedes llamar varias veces si hay más de un dato. Si no hay nada nuevo que capturar, no llames ninguna herramienta.`,
      messages: [
        { role: 'user', content: userMessage?.trim() || '(mensaje sin texto, posible adjunto)' },
        { role: 'assistant', content: assistantReply },
      ],
      tools: MEMORY_TOOLS,
    });

    const toolBlocks = response.content.filter((b) => b.type === 'tool_use');
    for (const block of toolBlocks) {
      await executeTool(block.name, block.input, { tenant, conversationId });
    }

    trackUsage({
      tenant, product: 'kai-next', feature: 'memory_capture', model: MODEL,
      inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens,
    }).catch(() => null);
  } catch (err) {
    console.error('[kai-next memory capture]', err.message);
  }
}
