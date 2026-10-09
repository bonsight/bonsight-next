import { runGoogleAdsQuery } from '@/lib/aria/googleAds';
import { applyFieldMeta, formatPeriodLabel } from './format';

// Sin cuenta de Google Ads conectada todavía para verificar los nombres de campo reales de
// cada reportType (campaigns/keywords/search_terms/...), así que acá no hay diccionario
// cerrado como en GA4/Search Console — applyFieldMeta() cae a su fallback genérico
// (humaniza la clave, detecta si el valor es numérico) hasta tener datos reales para mapear
// etiquetas específicas.

// Schema extraído literal de buildTools() en app/api/aria/[tenant]/route.js.
export const QUERY_GOOGLE_ADS_TOOL = {
  name: 'query_google_ads',
  description: `Consulta Google Ads para obtener datos reales de campañas, keywords, search terms, costos y conversiones.
Úsalo cuando la pregunta requiera evidencia sobre inversión publicitaria, rendimiento de campañas, keywords pagadas, costo por conversión o análisis de pauta.
No uses este tool para preguntas sobre tráfico orgánico, SEO o comportamiento en el sitio no relacionado con paid media.

Tipos de reporte disponibles: campaigns, keywords, search_terms, conversions, devices, countries, audiences, trends.

Para fechas relativas usa: today, yesterday, 7daysAgo, 30daysAgo, 90daysAgo. Para fechas absolutas usa formato YYYY-MM-DD.`,
  input_schema: {
    type: 'object',
    properties: {
      reportType: {
        type: 'string',
        enum: ['campaigns', 'keywords', 'search_terms', 'conversions', 'devices', 'countries', 'audiences', 'trends'],
        description: 'Tipo de reporte a consultar.',
      },
      dateRange: {
        type: 'object',
        properties: {
          startDate: { type: 'string', description: 'Fecha de inicio. Ej: 30daysAgo, 2026-01-01' },
          endDate: { type: 'string', description: 'Fecha de fin. Ej: today, yesterday' },
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
    required: ['reportType', 'dateRange'],
  },
};

// Mismo patrón que executeTool()'s query_google_ads branch en Aria.
export async function executeGoogleAdsTool(input, { intelligenceSources }) {
  const adsSource = intelligenceSources?.find((s) => s.id === 'google_ads');
  if (!adsSource || adsSource.status !== 'active') {
    return { error: 'Google Ads no está activo para este tenant. Configúralo en Admin > Sources.' };
  }
  const customerId = adsSource.config?.customerId;
  if (!customerId) {
    return { error: 'Google Ads está activo pero no tiene Customer ID configurado.' };
  }

  try {
    const result = await runGoogleAdsQuery({
      customerId,
      reportType: input.reportType,
      dateRange: input.dateRange,
      limit: Math.min(input.limit ?? 25, 50),
    });
    return {
      period: formatPeriodLabel(result.dateRange.startDate, result.dateRange.endDate),
      customerId,
      reportType: result.reportType,
      rowCount: result.rowCount,
      data: applyFieldMeta(result.data, {}),
      ...(result.rowCount === 0 ? { note: 'Sin datos para el período solicitado.' } : {}),
    };
  } catch (err) {
    return { error: `Error consultando Google Ads: ${err.message}` };
  }
}
