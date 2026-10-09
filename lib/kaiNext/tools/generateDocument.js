// Dos tools de salida (igual que present_analysis — ver presentAnalysis.js): no consultan nada
// nuevo, convierten lo que Kai ya analizó en un documento descargable. Mismo patrón que Aria
// (generate_measurement_excel/generate_measurement_pdf en app/api/aria/[tenant]/route.js): el
// input de la tool ES el documento (Kai lo re-describe con el contenido que ya tiene en
// contexto), no una referencia a otra cosa — el valor real se captura en onToolUse (ver route.js),
// no en el resultado de ejecución (siempre {ok:true}).
const COMPONENTS_SCHEMA = {
  type: 'array',
  description: 'Mismo formato que los components[] de present_analysis (kpi_grid/insight_banner/chart/data_table/pinned_card) — si el usuario pide exportar un análisis que ya le mostraste en este chat, reusá los mismos bloques tal cual.',
  items: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      type: { type: 'string', enum: ['kpi_grid', 'insight_banner', 'chart', 'data_table', 'pinned_card'] },
      title: { type: 'string' },
      subtitle: { type: 'string' },
      severity: { type: 'string', enum: ['critical', 'warning', 'success', 'neutral'] },
      description: { type: 'string' },
      chart_type: { type: 'string', enum: ['bar', 'line'] },
      data: { description: 'Mismo shape que en present_analysis.' },
      columns: { type: 'array' },
      rows: { type: 'array' },
    },
    required: ['id', 'type'],
  },
};

export const GENERATE_PDF_REPORT_TOOL = {
  name: 'generate_pdf_report',
  description: 'Genera un PDF descargable con branding Bonsight (portada + contenido) a partir de un análisis — úsala SOLO cuando el usuario pida explícitamente un documento/PDF descargable, no para responder preguntas normales. Nunca inventes datos: si el usuario pide exportar algo que ya le mostraste, reusá esos mismos valores.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Título del documento.' },
      filename: { type: 'string', description: 'Nombre de archivo, ej: analisis-web-septiembre.pdf' },
      summary: { type: 'string', description: 'Narrativa breve para la portada.' },
      data_source: {
        type: 'object',
        properties: { provider: { type: 'string' }, dataset: { type: 'string' } },
      },
      components: COMPONENTS_SCHEMA,
    },
    required: ['title', 'filename', 'components'],
  },
};

export const GENERATE_EXCEL_REPORT_TOOL = {
  name: 'generate_excel_report',
  description: 'Genera un Excel descargable (una o varias hojas con encabezados y filas) a partir de datos reales ya consultados — úsala SOLO cuando el usuario pida explícitamente un documento/Excel descargable. Nunca inventes filas: si el usuario pide exportar algo que ya le mostraste en una tabla, reusá esos mismos datos.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      filename: { type: 'string', description: 'Nombre de archivo, ej: detalle-canales-septiembre.xlsx' },
      description: { type: 'string' },
      sheets: {
        type: 'array',
        description: 'Entre 1 y 10 hojas.',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Nombre de la pestaña (máx 31 caracteres).' },
            headers: { type: 'array', items: { type: 'string' } },
            rows: { type: 'array', items: { type: 'array' }, description: 'Cada fila es un array paralelo a headers.' },
          },
          required: ['name', 'headers', 'rows'],
        },
      },
    },
    required: ['title', 'filename', 'sheets'],
  },
};

// Tools de salida puras — no ejecutan nada real, el valor está en el input (ver onToolUse).
export async function executeGeneratePdfReportTool() { return { ok: true }; }
export async function executeGenerateExcelReportTool() { return { ok: true }; }
