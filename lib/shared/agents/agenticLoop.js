// Loop agéntico genérico — extraído de la forma del loop en app/api/aria/[tenant]/route.js,
// pero sin ningún conocimiento de tools específicas de un producto (ni GA4, ni "tools de
// presentación"). Aria sigue con su loop inline sin cambios; este módulo es la fuente de
// verdad compartida para cualquier superficie nueva que necesite el mismo patrón
// (llamar a Claude → si pide una tool, ejecutarla y devolver el resultado → repetir hasta
// que responda en texto, se cumpla una condición de corte, o se agoten las iteraciones).
export async function runAgenticLoop({
  anthropic,
  model,
  maxTokens,
  maxIterations,
  system,
  messages,
  tools,
  executeTool,
  context,
  isStopTool,
  onToolStart,
  onToolUse,
  forceTextFallback = true,
  fallbackPrompt = 'Resume en un párrafo lo que encontraste. Responde directamente, sin usar herramientas.',
  fallbackMaxTokens = 1024,
  // Tools que siguen disponibles en la última vuelta (ej. la de presentar el resultado). Por
  // defecto ninguna: la última vuelta es para concluir, no para seguir consultando.
  lastIterationTools = [],
  lastIterationPrompt = 'Esta es tu última vuelta: ya no puedes consultar más datos. Responde ahora con lo que ya encontraste — conclusiones concretas con las cifras que obtuviste. No anuncies consultas pendientes ni digas que vas a revisar algo más; si algo quedó sin verificar, dilo como límite del análisis.',
}) {
  const conversation = [...messages];
  let finalText = '';
  let stoppedByTool = false;
  const callLogs = [];

  for (let i = 0; i < maxIterations; i++) {
    const isLastIteration = i === maxIterations - 1;
    // Antes la última vuelta solo le quitaba las tools a Claude sin decírselo: si todavía estaba
    // investigando, escribía "consulto X…" como si fuera a llamar otra tool, ese texto no venía
    // vacío y el turno terminaba con una promesa que nunca se cumplía (la red de seguridad de
    // abajo solo mira texto vacío). Ahora se le avisa explícitamente que tiene que concluir.
    // Solo si ya hubo tools en este turno (i > 0): en un turno sin tools no hay nada que cerrar.
    const callMessages = isLastIteration && i > 0 ? withClosingNote(conversation, lastIterationPrompt) : conversation;
    const callTools = isLastIteration ? lastIterationTools : tools;
    const callStart = Date.now();
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: callMessages,
      ...(callTools?.length ? { tools: callTools } : {}),
    });
    callLogs.push({
      iteration: i,
      ms: Date.now() - callStart,
      stopReason: response.stop_reason,
      usage: response.usage,
      toolCalls: response.content.filter((b) => b.type === 'tool_use').map((b) => b.name),
    });

    if (response.stop_reason !== 'tool_use') {
      finalText = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
      break;
    }

    conversation.push({ role: 'assistant', content: response.content });
    const toolBlocks = response.content.filter((b) => b.type === 'tool_use');
    const toolResults = [];
    let hitStopTool = false;

    for (const block of toolBlocks) {
      let content;
      let isError = false;
      onToolStart?.(block.name, block.input);
      try {
        const result = await executeTool(block.name, block.input, context);
        content = JSON.stringify(result);
        onToolUse?.(block.name, block.input, result);
      } catch (err) {
        content = JSON.stringify({ error: err.message });
        isError = true;
      }
      if (isStopTool?.(block.name, block.input)) hitStopTool = true;
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content,
        ...(isError ? { is_error: true } : {}),
      });
    }

    if (hitStopTool) {
      finalText = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
      stoppedByTool = true;
      break;
    }
    conversation.push({ role: 'user', content: toolResults });
  }

  // Red de seguridad: si el loop se agotó sin una respuesta de texto limpia, un último llamado
  // sin tools que fuerza un resumen — mismo patrón que Aria.
  if (!finalText && forceTextFallback && conversation.length > 0) {
    const forced = await anthropic.messages.create({
      model,
      max_tokens: fallbackMaxTokens,
      system,
      messages: [...conversation, { role: 'user', content: fallbackPrompt }],
    });
    finalText = forced.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
  }

  const usage = callLogs.reduce(
    (acc, l) => ({
      inputTokens: acc.inputTokens + (l.usage?.input_tokens ?? 0),
      outputTokens: acc.outputTokens + (l.usage?.output_tokens ?? 0),
    }),
    { inputTokens: 0, outputTokens: 0 }
  );

  return { finalText, conversation, callLogs, stoppedByTool, usage };
}

// Agrega la nota de cierre al último mensaje del usuario (el de los tool_result) sin mutar la
// conversación original — dos mensajes 'user' seguidos no son válidos para la API.
function withClosingNote(conversation, note) {
  const last = conversation[conversation.length - 1];
  if (!last || last.role !== 'user') return [...conversation, { role: 'user', content: note }];
  const content = Array.isArray(last.content)
    ? [...last.content, { type: 'text', text: note }]
    : [{ type: 'text', text: String(last.content) }, { type: 'text', text: note }];
  return [...conversation.slice(0, -1), { ...last, content }];
}
