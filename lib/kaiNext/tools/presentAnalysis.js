// Tool de salida, no de consulta — a diferencia de query_ga4/query_knowledge/etc., esto no trae
// datos nuevos, convierte una respuesta en un panel visual estructurado. El contrato (view_id,
// data_source, layout, components[]) es deliberadamente genérico por tipo de bloque (no un
// schema fijo como el present_analysis de Aria) para poder agregar nuevos tipos de reporte sin
// tocar el schema — ver app/kai-next/[tenant]/KaiNextAnalysisView.jsx para el renderer.
export const PRESENT_ANALYSIS_TOOL = {
  name: 'present_analysis',
  description: 'Presenta un análisis como un panel visual estructurado (KPIs, gráficos, tablas, hallazgos) en vez de solo texto — úsalo cuando la pregunta amerite un análisis sustancial con datos reales (no para saludos, preguntas simples o cuando no consultaste ninguna fuente de datos todavía). SIEMPRE consulta datos reales primero con query_ga4/query_search_console/query_google_ads/query_database/query_knowledge — nunca inventes los valores que pones acá. Esto termina tu respuesta: no sigas llamando otras herramientas después.',
  input_schema: {
    type: 'object',
    properties: {
      view_id: { type: 'string', description: 'Identificador corto y descriptivo, ej: "trafico_organico_septiembre".' },
      summary: { type: 'string', description: 'Narrativa breve (2-4 oraciones) con el hallazgo principal.' },
      data_source: {
        type: 'object',
        properties: {
          provider: { type: 'string', description: 'Ej: "Google Analytics 4", "Search Console", "Google Ads".' },
          dataset: { type: 'string' },
          records_analyzed: { type: 'number' },
        },
      },
      layout: { type: 'string', enum: ['grid', 'stacked'], description: '"grid" para paneles lado a lado, "stacked" para uno debajo del otro.' },
      components: {
        type: 'array',
        description: 'Entre 1 y 6 bloques, en el orden en que deben mostrarse.',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string', enum: ['kpi_grid', 'insight_banner', 'chart', 'data_table', 'pinned_card'] },
            title: { type: 'string' },
            subtitle: { type: 'string' },
            severity: { type: 'string', enum: ['critical', 'warning', 'success', 'neutral'], description: 'Solo para insight_banner.' },
            description: { type: 'string', description: 'Solo para insight_banner o pinned_card.' },
            chart_type: { type: 'string', enum: ['bar', 'line'], description: 'Solo para type="chart".' },
            data: { description: 'kpi_grid: array de {label,value,change?,trend?,status?,note?} (note: aclaración corta tipo "66 sin tráfico interno"). chart: {series:[{label,value,tone?}]} (bar — tone:"alt" para resaltar con otro color una barra que pertenece a un subgrupo distinto, ej. unidades de reemplazo vs. unidades propias, solo cuando de verdad haya esa distinción) o {series:[{date,value}],previousSeries?,annotations?:[{index,note,source}]} (line) — annotations marca un punto puntual del gráfico con una nota y la fuente que la sostiene (ej: una reunión, un documento), solo cuando de verdad tengas esa evidencia.' },
            columns: { type: 'array', description: 'Solo para data_table: [{key,label,align?}].' },
            rows: { type: 'array', description: 'Solo para data_table: array de objetos con las keys de columns, más un "_flag" opcional {label,tone?} en filas que se salgan de lo normal (ej. {label:"Bajo rendimiento",tone:"critical"}) — se muestra como una etiqueta junto al valor de la primera columna, solo cuando de verdad haya algo que marcar.' },
            followUp: {
              type: 'object',
              description: 'Opcional, en cualquier bloque: una pregunta concreta de seguimiento para profundizar justo en este bloque (se muestra como link "Preguntar sobre esto").',
              properties: { label: { type: 'string' }, prompt: { type: 'string' } },
            },
          },
          required: ['id', 'type'],
        },
      },
    },
    required: ['view_id', 'layout', 'components'],
  },
};

// No consulta nada — el valor real es el input mismo, capturado en onToolUse (ver route.js).
export async function executePresentAnalysisTool() {
  return { ok: true };
}
