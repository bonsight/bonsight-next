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
  fallbackPrompt = 'Resumí en un párrafo lo que encontraste. Respondé directamente, sin usar herramientas.',
  fallbackMaxTokens = 1024,
}) {
  const conversation = [...messages];
  let finalText = '';
  let stoppedByTool = false;
  const callLogs = [];

  for (let i = 0; i < maxIterations; i++) {
    const isLastIteration = i === maxIterations - 1;
    const callStart = Date.now();
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: conversation,
      ...(isLastIteration ? {} : { tools }),
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
