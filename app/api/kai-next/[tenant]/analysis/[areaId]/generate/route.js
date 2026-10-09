import { isAuthorizedForTenant, getCurrentKaiNextAccess } from '@/lib/kaiNext/auth';
import { getTenantMeta } from '@/lib/kai/tenants';
import { getIntelligenceSources } from '@/lib/kai/intelligenceSources';
import { getDbSources, buildDbSourcesContext } from '@/lib/aria/databases';
import { getKaiNextMemory } from '@/lib/kaiNext/memory';
import { buildSystemPrompt } from '@/lib/kaiNext/prompt';
import { buildBIC, formatBICForPrompt } from '@/lib/kai/bic';
import {
  MODEL, TOOL_LABELS, anthropic, executeTool, TOOLS_BY_SOURCE, QUERY_KNOWLEDGE_TOOL, PRESENT_ANALYSIS_TOOL,
} from '@/lib/kaiNext/agentShared';
import { isCapabilityAllowed, isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { runAgenticLoop } from '@/lib/shared/agents/agenticLoop';
import { listAreas, saveAreaSnapshot } from '@/lib/kaiNext/analysisAreas';
import { trackUsage } from '@/lib/kai/usage';

const MAX_TOKENS = 8000;
// Antes eran las 9 tools del chat (incluyendo search_archive/remember/mark_resolved, que acá no
// pintan nada) y 6 iteraciones — Kai terminaba explorando fuentes que no aplicaban al área y
// tardaba mucho. Con el tools[] ya acotado por área (ver abajo) converge más rápido.
const MAX_ITERATIONS = 4;

function ndjson(obj) {
  return new TextEncoder().encode(JSON.stringify(obj) + '\n');
}

// El usuario puede fijar qué KPIs quiere ver para un área (ver updateAreaKpis en
// lib/kaiNext/analysisAreas.js) — la instrucción se lo pide a Kai, pero no hay garantía de que
// el modelo respete el set/orden exacto cada vez (ya nos pasó con otro bloque — [KAI_SOURCES] en
// el chat). Acá se fuerza la estructura de verdad: se arma un único kpi_grid con exactamente los
// KPIs configurados, en ese orden, tomando el valor real que Kai haya calculado para cada uno
// (match por label, con fallback difuso) y marcando "Sin datos" el que no haya aparecido — nunca
// se inventa un valor.
function normalizeFixedKpis(presentation, configuredKpis) {
  if (!configuredKpis?.length) return presentation;
  const components = presentation.components ?? [];
  const kpiBlocks = components.filter((c) => c.type === 'kpi_grid');
  const allEntries = kpiBlocks.flatMap((c) => (Array.isArray(c.data) ? c.data : []));
  const norm = (s) => (s || '').trim().toLowerCase();
  const findEntry = (label) => {
    const target = norm(label);
    return allEntries.find((e) => norm(e.label) === target)
      ?? allEntries.find((e) => norm(e.label).includes(target) || target.includes(norm(e.label)));
  };
  const fixedData = configuredKpis.map((k) => {
    const found = findEntry(k.label);
    return found ? { ...found, label: k.label } : { label: k.label, value: 'Sin datos', status: 'neutral' };
  });
  const fixedComponent = {
    id: kpiBlocks[0]?.id ?? 'kpis',
    type: 'kpi_grid',
    title: kpiBlocks[0]?.title,
    followUp: kpiBlocks[0]?.followUp,
    data: fixedData,
  };

  let inserted = false;
  const nextComponents = components.reduce((acc, c) => {
    if (c.type !== 'kpi_grid') { acc.push(c); return acc; }
    if (!inserted) { acc.push(fixedComponent); inserted = true; }
    return acc;
  }, []);
  if (!inserted) nextComponents.unshift(fixedComponent);

  return { ...presentation, components: nextComponents };
}

// A diferencia del chat (app/api/kai-next/[tenant]/route.js), esto no se guarda como
// conversación — es una corrida puntual, sin historial, cuyo único resultado persistido es el
// snapshot del área (ver lib/kaiNext/analysisAreas.js). Si el usuario quiere profundizar en algo
// puntual del panel, el panel lateral de Análisis abre un chat de verdad aparte.
// Streaming NDJSON (mismo patrón que el chat) en vez de un único JSON al final: generar un área
// completa implica varias llamadas reales a Claude + fuentes de datos, puede tardar bastante, y
// sin progreso en vivo la pantalla se queda en blanco sin forma de saber si sigue trabajando o
// se colgó.
export async function POST(req, { params }) {
  const { tenant, areaId } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { period, compare } = await req.json().catch(() => ({}));
  const periodLabel = period || 'los últimos 30 días';

  const meta = await getTenantMeta(tenant);
  if (!meta) return Response.json({ error: 'Tenant no encontrado.' }, { status: 404 });
  const kaiNextAccess = await getCurrentKaiNextAccess(tenant);
  if (!isSectionAllowed(kaiNextAccess, 'analisis')) {
    return Response.json({ error: 'La sección Análisis no está habilitada para tu usuario.' }, { status: 403 });
  }

  const areas = await listAreas(tenant);
  const area = areas.find((a) => a.id === areaId);
  if (!area) return Response.json({ error: 'Área no encontrada.' }, { status: 404 });

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const [intelligenceSources, dbSources, memory, bic] = await Promise.all([
          getIntelligenceSources(tenant),
          getDbSources(tenant),
          getKaiNextMemory(tenant),
          buildBIC(tenant),
        ]);
        const bicText = formatBICForPrompt({ ...bic, knowledge_digest: null });
        const sourceStatus = (id) => intelligenceSources.find((s) => s.id === id)?.status;
        const system = buildSystemPrompt({
          tenantName: meta.name,
          ga4Status: sourceStatus('ga4'),
          searchConsoleStatus: sourceStatus('search_console'),
          googleAdsStatus: sourceStatus('google_ads'),
          dbSourcesContext: buildDbSourcesContext(dbSources),
          bicText,
          memory,
          activeRef: null,
        });

        // Las fuentes asignadas al área (ver lib/kaiNext/analysisAreas.js) que además estén
        // realmente conectadas para este tenant — si el área dice "google_ads" pero el tenant no
        // tiene Google Ads activo, no se ofrece esa tool (Kai no puede ni intentarlo). Esto es lo
        // que antes faltaba: sin esto, dos áreas con el mismo tenant terminaban mirando lo mismo
        // (siempre GA4 por default) y el loop exploraba fuentes de más, lo que lo hacía lento.
        const connectedIds = (area.sources ?? []).filter((id) => (
          isCapabilityAllowed(kaiNextAccess, id)
          && (id === 'database' ? (dbSources?.length ?? 0) > 0 : sourceStatus(id) === 'active')
        ));
        const areaTools = [
          ...connectedIds.map((id) => TOOLS_BY_SOURCE[id]).filter(Boolean),
          QUERY_KNOWLEDGE_TOOL,
          PRESENT_ANALYSIS_TOOL,
        ];
        const sourceLabels = connectedIds.map((id) => TOOL_LABELS[`query_${id}`]?.replace(/^Consultando /, '') ?? id);

        // Si el usuario ya configuró KPIs fijos para esta área, se le pide a Kai calcular
        // EXACTAMENTE esos (no elegir otros) — igual se normaliza después (normalizeFixedKpis)
        // porque pedirlo en el prompt no garantiza que el modelo respete el set/orden exacto.
        const kpiClause = area.kpis?.length
          ? ` Los KPIs de esta área están configurados de antemano y son EXACTAMENTE estos ${area.kpis.length}, ni uno más ni uno menos: ${area.kpis.map((k) => `"${k.label}"`).join(', ')}. Arma un único bloque kpi_grid con una entrada por cada uno (el "label" debe calzar textualmente con el que te di), calculando el valor real de cada uno con las fuentes habilitadas — no agregues KPIs extra ni los reemplaces por otros que te parezcan más relevantes.`
          : '';

        const instruction = connectedIds.length
          ? `Genera la lectura completa del área "${area.label}" de ${meta.name} para ${periodLabel}${compare ? ', comparando contra el período anterior' : ''}. Las únicas fuentes de datos habilitadas para esta área son: ${sourceLabels.join(', ')} (además del conocimiento de la organización) — consúltalas, no inventes datos de ninguna otra. Identifica entre 2 y 4 hallazgos reales marcados como "Atención" (severity critical o warning), "Oportunidad" (severity success) o "Contexto" (severity neutral) usando bloques insight_banner, arma los KPIs principales con su variación,${kpiClause} un gráfico de tendencia relevante${compare ? ' con el período anterior superpuesto en previousSeries' : ''}, y una tabla de detalle con lo que se salga de lo normal. Si algún hallazgo, el gráfico o una fila de tabla amerita profundizar, agrégale un "followUp" con una pregunta concreta de seguimiento. Usa la tool present_analysis para presentar todo esto — es obligatorio, no respondas solo en texto y no saludes ni cierres con despedida.`
          : `El área "${area.label}" de ${meta.name} todavía no tiene ninguna fuente de datos conectada asignada. Usa present_analysis con un único bloque insight_banner (severity "neutral") explicando que hace falta conectar o asignar una fuente para esta área, y un summary breve en el mismo sentido — no inventes cifras.`;

        let presentation = null;
        const { usage } = await runAgenticLoop({
          anthropic,
          model: MODEL,
          maxTokens: MAX_TOKENS,
          maxIterations: MAX_ITERATIONS,
          system,
          messages: [{ role: 'user', content: instruction }],
          tools: areaTools,
          context: { tenant, intelligenceSources, dbSources },
          executeTool,
          isStopTool: (name) => name === 'present_analysis',
          onToolStart: (name) => {
            controller.enqueue(ndjson({ type: 'tool_start', name, label: TOOL_LABELS[name] ?? name }));
          },
          onToolUse: (name, input) => {
            if (name === 'present_analysis') presentation = input;
          },
        });

        if (!presentation) {
          controller.enqueue(ndjson({ type: 'error', error: 'Kai no pudo generar el análisis esta vez. Intenta de nuevo.' }));
          return;
        }
        presentation = normalizeFixedKpis(presentation, area.kpis);

        trackUsage({
          tenant,
          product: 'kai-next',
          feature: 'analysis_area',
          model: MODEL,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
        }).catch(() => null);

        const snapshot = await saveAreaSnapshot(tenant, areaId, {
          presentation,
          period: periodLabel,
          compare: !!compare,
          generatedAt: new Date().toISOString(),
        });

        controller.enqueue(ndjson({ type: 'done', snapshot }));
      } catch (err) {
        console.error(`kai-next analysis generate [${tenant}/${areaId}] error:`, err);
        controller.enqueue(ndjson({ type: 'error', error: 'Algo salió mal generando el análisis.' }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8' } });
}
