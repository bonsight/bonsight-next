import { runSearchConsoleQuery } from '@/lib/aria/searchConsole';
import { applyFieldMeta, formatPeriodLabel } from './format';

// lib/aria/searchConsole.js ya deja ctr en 0–100 (row.ctr * 100, ver ese archivo) — por eso acá
// es 'percent_scaled' y no 'percent_ratio' como en GA4, que entrega la fracción 0–1 cruda.
const SC_FIELD_META = {
  query: { label: 'Consulta', format: 'text' },
  page: { label: 'Página', format: 'text' },
  country: { label: 'País', format: 'text' },
  device: { label: 'Dispositivo', format: 'text' },
  date: { label: 'Fecha', format: 'date' },
  clicks: { label: 'Clics', format: 'integer' },
  impressions: { label: 'Impresiones', format: 'integer' },
  ctr: { label: 'CTR', format: 'percent_scaled' },
  position: { label: 'Posición promedio', format: 'decimal' },
};

// Schema extraído literal de buildTools() en app/api/aria/[tenant]/route.js.
export const QUERY_SEARCH_CONSOLE_TOOL = {
  name: 'query_search_console',
  description: `Consulta Google Search Console para obtener datos de búsqueda orgánica: queries, impresiones, CTR y posición promedio.
Úsalo cuando la pregunta requiera evidencia sobre visibilidad en buscadores, intención de búsqueda, rendimiento SEO, CTR por query o por página.
No uses este tool para preguntas sobre comportamiento en el sitio, conversiones o canales que no sean búsqueda orgánica.

Dimensiones disponibles: query, page, country, device, date.
Las métricas siempre incluidas son: clicks, impressions, ctr (en %), position.

Para fechas relativas usa: today, yesterday, 7daysAgo, 30daysAgo, 90daysAgo. Para fechas absolutas usa formato YYYY-MM-DD.`,
  input_schema: {
    type: 'object',
    properties: {
      dimensions: {
        type: 'array',
        items: { type: 'string', enum: ['query', 'page', 'country', 'device', 'date'] },
        maxItems: 3,
        description: 'Dimensiones por las que agrupar. Ej: ["query"] para ver top queries, ["page"] para landing pages, ["query","page"] para cruzar ambas.',
      },
      dateRange: {
        type: 'object',
        properties: {
          startDate: { type: 'string', description: 'Fecha de inicio. Ej: 30daysAgo' },
          endDate: { type: 'string', description: 'Fecha de fin. Ej: today' },
        },
        required: ['startDate', 'endDate'],
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 50,
        description: 'Máximo de filas a devolver. Default: 25.',
      },
    },
    required: ['dateRange'],
  },
};

// Mismo patrón que executeTool()'s query_search_console branch en Aria.
export async function executeSearchConsoleTool(input, { intelligenceSources }) {
  const scSource = intelligenceSources?.find((s) => s.id === 'search_console');
  if (!scSource || scSource.status !== 'active') {
    return { error: 'Search Console no está activo para este tenant. Configúralo en Admin > Sources.' };
  }
  const siteUrl = scSource.config?.siteUrl;
  if (!siteUrl) {
    return { error: 'Search Console está activo pero no tiene Site URL configurada.' };
  }

  try {
    const result = await runSearchConsoleQuery({
      siteUrl,
      dimensions: input.dimensions ?? [],
      dateRange: input.dateRange,
      limit: Math.min(input.limit ?? 25, 50),
    });
    return {
      period: formatPeriodLabel(input.dateRange.startDate, input.dateRange.endDate),
      siteUrl,
      rowCount: result.rowCount,
      data: applyFieldMeta(result.data, SC_FIELD_META),
      ...(result.rowCount === 0 ? { note: 'Sin datos para el período solicitado.' } : {}),
    };
  } catch (err) {
    const detail = err?.response?.data?.error?.message ?? err?.message ?? String(err);
    return {
      error: `Search Console error (${err?.code ?? err?.status ?? '?'}): ${detail}. Si es 403, agrega el Service Account como usuario en Search Console → Configuración → Usuarios y permisos.`,
    };
  }
}
