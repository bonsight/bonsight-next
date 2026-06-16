import Anthropic from '@anthropic-ai/sdk';
import { isAuthorized } from '@/lib/aria/auth';
import { runGa4Query } from '@/lib/aria/ga4';
import {
  getInvestigationMeta,
  updateInvestigationMeta,
  appendInvestigationMessages,
  recordAriaMetrics,
  BUSINESS_ID,
} from '@/lib/aria/memory';
import { summarizeIfNeeded } from '@/lib/aria/summarize';
import { buildAriaSystemPrompt } from '@/lib/aria/prompts';
import { CLIENT_PROFILE } from '@/lib/aria/clientProfile';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 16000;
const MAX_ITERATIONS = 4;

const tools = [
  {
    name: 'ga4_query',
    description:
      'Consulta datos de Google Analytics 4 de la propiedad de Bonsight. Devuelve filas con las dimensiones y métricas solicitadas.',
    input_schema: {
      type: 'object',
      properties: {
        metrics: {
          type: 'array',
          items: { type: 'string' },
          description: "Nombres de métricas GA4, ej. 'sessions', 'totalUsers', 'conversions'.",
        },
        dimensions: {
          type: 'array',
          items: { type: 'string' },
          description: "Nombres de dimensiones GA4, ej. 'date', 'country', 'sessionSource'.",
        },
        dateRanges: {
          type: 'array',
          minItems: 1,
          maxItems: 2,
          items: {
            type: 'object',
            properties: {
              startDate: { type: 'string' },
              endDate: { type: 'string' },
            },
            required: ['startDate', 'endDate'],
          },
          description: 'Uno o dos rangos de fecha. Dos rangos habilitan comparación entre períodos.',
        },
        dimensionFilter: {
          type: 'object',
          description: 'Filtro opcional en formato FilterExpression de GA4.',
        },
        orderBys: {
          type: 'array',
          items: { type: 'object' },
          description: 'Ordenamiento opcional en formato OrderBy de GA4.',
        },
        limit: {
          type: 'integer',
          description: 'Máximo de filas a devolver. Default 10, máximo 100.',
        },
      },
      required: ['metrics', 'dateRanges'],
    },
  },
  {
    name: 'save_session_memory',
    description:
      'Persiste un resumen estructurado de esta investigación para retomarla en futuras conversaciones.',
    input_schema: {
      type: 'object',
      properties: {
        titulo: {
          type: 'string',
          description:
            "Título corto (3-6 palabras, sin emoji) que describe esta investigación, ej. 'Riesgo de conversión', 'Comparación junio vs. mayo'.",
        },
        emoji: {
          type: 'string',
          enum: ['🚨', '📈', '🎯', '🌎', '🏆', '🔍', '✅', '🟡', '💡', '📊'],
          description: 'Un emoji que represente el tema de esta investigación.',
        },
        area: {
          type: 'string',
          enum: ['Bonsight Website', 'Kai', 'Quiniela', 'General'],
          description:
            "Producto o área del negocio principal involucrado (ver [PERFIL_NEGOCIO].products). 'General' si aplica a todo el negocio o a varias áreas.",
        },
        estado: {
          type: 'string',
          enum: ['abierta', 'pendiente', 'resuelta', 'en_seguimiento'],
          description: 'Estado actual de esta investigación.',
        },
        resumen_sesion: { type: 'string' },
        nuevos_insights: { type: 'array', items: { type: 'string' } },
        decisiones_confirmadas: { type: 'array', items: { type: 'string' } },
        preguntas_abiertas: { type: 'array', items: { type: 'string' } },
        objetivos_actualizados: { type: 'array', items: { type: 'string' } },
        sugerencia_proxima_sesion: { type: 'string' },
      },
      required: ['resumen_sesion'],
    },
  },
  {
    name: 'present_analysis',
    description:
      'Presenta un análisis respaldado por datos de GA4 con un formato visual enriquecido (KPIs, gráfico de tendencia, insights, confianza, preguntas de seguimiento). Llamar como paso final del turno cuando el análisis lo amerite.',
    input_schema: {
      type: 'object',
      properties: {
        headline: {
          type: 'object',
          description:
            'Síntesis ejecutiva: lo más importante de este análisis, visible antes que todo lo demás.',
          properties: {
            status: {
              type: 'string',
              enum: ['positive', 'neutral', 'warning', 'critical'],
              description:
                "Severidad/tono general del análisis (independiente del 'Tipo de hallazgo' de un bloque de alerta específico).",
            },
            title: { type: 'string', description: 'Título de 1 línea: el hallazgo principal.' },
            impact: { type: 'string', description: '1-2 frases: qué significa esto para el negocio.' },
          },
          required: ['status', 'title', 'impact'],
        },
        summary: {
          type: 'string',
          description:
            "Narrativa completa (Qué dice la data, qué significa para el negocio, bloque de alerta/hipótesis si aplica, 1-2 frases sobre la lógica/secuencia de 'actionItems', y Cierre). Se renderiza como markdown. NO incluyas aquí el desglose 'Top 3 accionables' — eso va en 'actionItems'.",
        },
        kpis: {
          type: 'array',
          minItems: 1,
          maxItems: 5,
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              value: { type: 'string' },
              deltaPct: { type: 'number' },
              trend: { type: 'string', enum: ['up', 'down', 'flat'] },
            },
            required: ['label', 'value'],
          },
        },
        trendChart: {
          type: 'object',
          description: 'Opcional. Solo si se consultó una serie temporal con comparación de períodos.',
          properties: {
            title: { type: 'string' },
            metricLabel: { type: 'string' },
            currentPeriodLabel: { type: 'string' },
            previousPeriodLabel: { type: 'string' },
            series: {
              type: 'array',
              items: {
                type: 'object',
                properties: { date: { type: 'string' }, value: { type: 'number' } },
                required: ['date', 'value'],
              },
            },
            previousSeries: {
              type: 'array',
              items: {
                type: 'object',
                properties: { date: { type: 'string' }, value: { type: 'number' } },
                required: ['date', 'value'],
              },
            },
          },
          required: ['title', 'metricLabel', 'series'],
        },
        insights: {
          type: 'array',
          minItems: 1,
          maxItems: 5,
          items: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              icon: {
                type: 'string',
                enum: ['trend-up', 'trend-down', 'target', 'bar-chart', 'alert', 'lightbulb'],
              },
              category: {
                type: 'string',
                description:
                  "Etiqueta corta (1-2 palabras) que refleja el tema real del insight para este negocio, ej. 'Conversión', 'Engagement', 'Adquisición', o el nombre de un producto/servicio si aplica ('Quiniela', 'Kai', 'Lumen'). Insights relacionados pueden compartir categoría.",
              },
            },
            required: ['text', 'icon', 'category'],
          },
        },
        actionItems: {
          type: 'array',
          minItems: 1,
          maxItems: 3,
          items: {
            type: 'object',
            properties: {
              text: { type: 'string', description: 'La acción concreta, sin tags de prioridad/esfuerzo/impacto.' },
              priority: { type: 'string', enum: ['alta', 'media', 'baja'] },
              effort: { type: 'string', enum: ['rápido', '1 semana', '1 mes'] },
              impact: { type: 'string', enum: ['revenue', 'leads', 'product', 'brand'] },
            },
            required: ['text', 'priority', 'effort', 'impact'],
          },
          description:
            "Top 3 accionables priorizados, extraídos de 'Aria — Framework de Análisis'. Reemplaza el desglose de accionables que antes vivía en 'summary'.",
        },
        confidence: {
          type: 'object',
          properties: {
            level: { type: 'integer', minimum: 1, maximum: 5 },
            label: { type: 'string', enum: ['Alta', 'Media', 'Baja'] },
            basis: { type: 'string' },
          },
          required: ['level', 'label', 'basis'],
        },
        followUps: {
          type: 'array',
          minItems: 2,
          maxItems: 4,
          items: {
            type: 'object',
            properties: {
              label: {
                type: 'string',
                description:
                  "Etiqueta corta (2-4 palabras, formato 'Acción + objeto'), ej. 'Segmentar tráfico', 'Auditar formularios', 'Comparar benchmark', 'Analizar Kai'.",
              },
              prompt: {
                type: 'string',
                description: 'Pregunta completa en lenguaje natural que se envía a Aria si el usuario hace clic en este chip.',
              },
            },
            required: ['label', 'prompt'],
          },
        },
      },
      required: ['summary', 'kpis', 'insights', 'confidence', 'followUps', 'headline', 'actionItems'],
    },
  },
  {
    name: 'present_advisory',
    description:
      'Presenta una recomendación ejecutiva (riesgo principal, decisiones priorizadas, impacto esperado, justificación y próximo paso) para preguntas de decisión/estrategia — no requiere una consulta nueva a ga4_query. Llamar como paso final del turno.',
    input_schema: {
      type: 'object',
      properties: {
        risk: {
          type: 'object',
          description: 'El riesgo, incertidumbre u oportunidad más importante — el headline de esta recomendación.',
          properties: {
            status: { type: 'string', enum: ['positive', 'neutral', 'warning', 'critical'] },
            title: { type: 'string', description: '1 línea: el riesgo/oportunidad principal.' },
            description: { type: 'string', description: '1-2 frases: la consecuencia de negocio si no se actúa.' },
          },
          required: ['status', 'title', 'description'],
        },
        decisions: {
          type: 'array',
          minItems: 1,
          maxItems: 3,
          items: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              priority: { type: 'string', enum: ['alta', 'media', 'baja'] },
              effort: { type: 'string', enum: ['rápido', '1 semana', '1 mes'] },
              impact: { type: 'string', enum: ['revenue', 'leads', 'product', 'brand'] },
              expectedImpact: { type: 'string', description: '1 frase: qué cambia si Rafa ejecuta esta decisión.' },
            },
            required: ['text', 'priority', 'effort', 'impact', 'expectedImpact'],
          },
          description: 'Top 1-3 decisiones recomendadas, priorizadas (Revenue > Leads > Product > Brand, igual que actionItems).',
        },
        justification: {
          type: 'string',
          description: '2-4 frases: por qué estas son las decisiones correctas ahora, conectando con el riesgo principal.',
        },
        immediatePlan: {
          type: 'string',
          description: '1-2 frases: el siguiente paso concreto — qué haría Aria esta semana. Recomienda, no preguntes.',
        },
        followUps: {
          type: 'array',
          minItems: 2,
          maxItems: 4,
          items: {
            type: 'object',
            properties: {
              label: {
                type: 'string',
                description:
                  "Etiqueta corta (2-4 palabras, formato 'Acción + objeto'), ej. 'Segmentar tráfico', 'Auditar formularios', 'Comparar benchmark', 'Analizar Kai'.",
              },
              prompt: {
                type: 'string',
                description: 'Pregunta completa en lenguaje natural que se envía a Aria si el usuario hace clic en este chip.',
              },
            },
            required: ['label', 'prompt'],
          },
        },
      },
      required: ['risk', 'decisions', 'justification', 'immediatePlan', 'followUps'],
    },
  },
];

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function buildConfidenceBasisMetrics(dataSources) {
  if (!dataSources.length) return null;

  const dimensions = new Set();
  const metrics = new Set();
  let minDate = null;
  let maxDate = null;

  for (const src of dataSources) {
    (src.dimensions ?? []).forEach((d) => dimensions.add(d));
    (src.metrics ?? []).forEach((m) => metrics.add(m));
    (src.dateRanges ?? []).forEach((r) => {
      if (ISO_DATE_RE.test(r.startDate) && (!minDate || r.startDate < minDate)) minDate = r.startDate;
      if (ISO_DATE_RE.test(r.endDate) && (!maxDate || r.endDate > maxDate)) maxDate = r.endDate;
    });
  }

  return {
    queriesRun: dataSources.length,
    dimensionsAnalyzed: dimensions.size,
    metricsAnalyzed: metrics.size,
    periodAnalyzed: minDate && maxDate ? `${minDate} → ${maxDate}` : null,
  };
}

async function executeTool(name, input, investigationId) {
  if (name === 'ga4_query') {
    return runGa4Query(input);
  }
  if (name === 'save_session_memory') {
    return updateInvestigationMeta(BUSINESS_ID, investigationId, input);
  }
  if (name === 'present_analysis') {
    return { ok: true };
  }
  if (name === 'present_advisory') {
    return { ok: true };
  }
  return { error: `Unknown tool: ${name}` };
}

export async function POST(req) {
  if (!(await isAuthorized())) {
    return Response.json({ reply: 'No autorizado.' }, { status: 401 });
  }

  const requestStart = Date.now();
  let investigationIdForLog;

  try {
    const { messages, investigationId } = await req.json();
    investigationIdForLog = investigationId;
    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ reply: 'Falta el mensaje.' }, { status: 400 });
    }

    const investigationContext = await getInvestigationMeta(BUSINESS_ID, investigationId);
    const currentDate = new Date().toISOString().slice(0, 10);
    const system = buildAriaSystemPrompt({ investigationContext, clientProfile: CLIENT_PROFILE, currentDate });

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const userQuery = String(messages[messages.length - 1]?.content ?? '').slice(0, 200);
    const cleanMessages = messages.map(({ role, content }) => ({ role, content }));
    const conversation = await summarizeIfNeeded(cleanMessages);
    let finalText = '';
    let presentation = null;
    let advisory = null;
    const dataSources = [];
    const callLogs = [];

    const createMessage = (withTools) =>
      anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'medium' },
        system,
        messages: conversation,
        ...(withTools ? { tools } : {}),
      });

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const isLastIteration = i === MAX_ITERATIONS - 1;

      let callStart = Date.now();
      let response = await createMessage(!isLastIteration);
      callLogs.push({
        iteration: i,
        withTools: !isLastIteration,
        ms: Date.now() - callStart,
        stopReason: response.stop_reason,
        usage: response.usage,
        toolCalls: response.content.filter((b) => b.type === 'tool_use').map((b) => b.name),
      });

      // 'pause_turn' means Claude paused a long-running turn mid-thought; feed the
      // partial response back as-is to let it continue, instead of treating it as final.
      let pauseCount = 0;
      while (response.stop_reason === 'pause_turn' && pauseCount < 3) {
        conversation.push({ role: 'assistant', content: response.content });
        callStart = Date.now();
        response = await createMessage(!isLastIteration);
        callLogs.push({
          iteration: i,
          withTools: !isLastIteration,
          pauseContinuation: true,
          ms: Date.now() - callStart,
          stopReason: response.stop_reason,
          usage: response.usage,
          toolCalls: response.content.filter((b) => b.type === 'tool_use').map((b) => b.name),
        });
        pauseCount++;
      }

      if (response.stop_reason !== 'tool_use') {
        finalText = response.content
          .filter((b) => b.type === 'text')
          .map((b) => b.text)
          .join('\n');
        break;
      }

      conversation.push({ role: 'assistant', content: response.content });

      const toolResults = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;

        if (block.name === 'present_analysis') {
          presentation = { ...block.input, dataSources: [...dataSources] };
        }
        if (block.name === 'present_advisory') {
          advisory = { ...block.input };
        }

        let content;
        let isError = false;
        const toolStart = Date.now();
        try {
          content = JSON.stringify(await executeTool(block.name, block.input, investigationId));
        } catch (err) {
          content = JSON.stringify({ error: err.message });
          isError = true;
        }
        const lastCall = callLogs[callLogs.length - 1];
        (lastCall.tools ??= []).push({ name: block.name, ms: Date.now() - toolStart, isError });

        if (block.name === 'ga4_query' && !isError) {
          dataSources.push({
            metrics: block.input?.metrics ?? [],
            dimensions: block.input?.dimensions ?? [],
            dateRanges: block.input?.dateRanges ?? [],
          });
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content,
          ...(isError ? { is_error: true } : {}),
        });
      }

      if (presentation || advisory) {
        finalText = response.content
          .filter((b) => b.type === 'text')
          .map((b) => b.text)
          .join('\n');
        break;
      }

      conversation.push({ role: 'user', content: toolResults });
    }

    if (presentation) {
      presentation.confidence = {
        ...presentation.confidence,
        percentage: (presentation.confidence?.level ?? 0) * 20,
        basisMetrics: buildConfidenceBasisMetrics(dataSources),
      };
    }

    if (!finalText && (presentation || advisory)) {
      finalText = presentation?.summary || advisory?.justification || '';
    }

    const totalUsage = callLogs.reduce(
      (acc, c) => {
        const u = c.usage || {};
        acc.inputTokens += u.input_tokens || 0;
        acc.outputTokens += u.output_tokens || 0;
        acc.cacheCreationTokens += u.cache_creation_input_tokens || 0;
        acc.cacheReadTokens += u.cache_read_input_tokens || 0;
        return acc;
      },
      { inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0 },
    );

    const metrics = {
      investigationId,
      totalMs: Date.now() - requestStart,
      callCount: callLogs.length,
      hasPresentation: !!presentation,
      hasAdvisory: !!advisory,
      totalUsage,
      calls: callLogs,
      query: userQuery,
    };
    console.log('[aria-metrics]', JSON.stringify(metrics));
    await recordAriaMetrics(BUSINESS_ID, metrics);

    const lastUserMessage = messages[messages.length - 1];
    await appendInvestigationMessages(BUSINESS_ID, investigationId, [
      { role: lastUserMessage.role, content: lastUserMessage.content },
      { role: 'assistant', content: finalText, presentation, advisory },
    ]);
    const investigationMeta = await getInvestigationMeta(BUSINESS_ID, investigationId);

    return Response.json({ reply: finalText, presentation, advisory, investigationMeta });
  } catch (err) {
    console.error('Aria API error:', err);
    const errorMetrics = {
      investigationId: investigationIdForLog,
      totalMs: Date.now() - requestStart,
      error: err?.message || String(err),
    };
    console.log('[aria-metrics]', JSON.stringify(errorMetrics));
    await recordAriaMetrics(BUSINESS_ID, errorMetrics);

    if (err instanceof Anthropic.RateLimitError) {
      return Response.json(
        {
          reply:
            'Aria está procesando muchas solicitudes en este momento y alcanzó el límite de uso temporal. Espera unos segundos e intenta de nuevo.',
        },
        { status: 429 },
      );
    }

    if (err instanceof Anthropic.APIError) {
      return Response.json(
        { reply: 'Aria tuvo un problema temporal al conectarse con el modelo. Intenta de nuevo en un momento.' },
        { status: 502 },
      );
    }

    return Response.json({ reply: `Error: ${err?.message || 'Unknown error'}` }, { status: 500 });
  }
}
