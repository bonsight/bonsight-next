import Anthropic from '@anthropic-ai/sdk';

const SUMMARY_MODEL = 'claude-haiku-4-5';
const HISTORY_LIMIT = 12;
// Must be odd: `messages` always ends with the newest user message (odd-length,
// alternating user/assistant), so an odd KEEP_RECENT keeps `recent` starting with
// 'user' — preserving valid role alternation after the synthetic resumen/assistant pair.
const KEEP_RECENT = 5;

export async function summarizeIfNeeded(messages) {
  if (messages.length <= HISTORY_LIMIT) return messages;

  const older = messages.slice(0, -KEEP_RECENT);
  const recent = messages.slice(-KEEP_RECENT);

  const transcript = older
    .map((m) => `${m.role === 'user' ? 'Rafa' : 'Aria'}: ${m.content}`)
    .join('\n');

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({
    model: SUMMARY_MODEL,
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `Resume en un párrafo breve (máx. 6-8 líneas) los puntos clave de esta conversación entre Rafa y Aria (agente de CRO/growth de Bonsight). Conserva datos concretos, hallazgos, decisiones y preguntas abiertas relevantes para continuar la conversación:\n\n${transcript}`,
      },
    ],
  });

  const summaryText = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

  if (!summaryText) return recent;

  return [
    { role: 'user', content: `[Resumen de la conversación previa]\n${summaryText}` },
    { role: 'assistant', content: 'Entendido, tengo el contexto de la conversación previa.' },
    ...recent,
  ];
}
