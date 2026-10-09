import { runGa4Query } from '@/lib/aria/ga4';
import { applyFieldMeta, formatPeriodLabel } from './format';

// Diccionario de campos GA4 — nombres crudos de la API a etiqueta + tipo de formato. Cerrado
// porque el schema de la tool (más abajo) solo permite elegir de este mismo set.
const GA4_FIELD_META = {
  date: { label: 'Fecha', format: 'date' },
  sessionDefaultChannelGroup: { label: 'Canal', format: 'text' },
  sessionSource: { label: 'Fuente', format: 'text' },
  sessionMedium: { label: 'Medio', format: 'text' },
  sessionSourceMedium: { label: 'Fuente / medio', format: 'text' },
  country: { label: 'País', format: 'text' },
  deviceCategory: { label: 'Dispositivo', format: 'text' },
  landingPage: { label: 'Página de entrada', format: 'text' },
  pagePath: { label: 'Página', format: 'text' },
  pageTitle: { label: 'Título de página', format: 'text' },
  eventName: { label: 'Evento', format: 'text' },
  firstUserDefaultChannelGroup: { label: 'Canal de adquisición', format: 'text' },
  sessions: { label: 'Sesiones', format: 'integer' },
  activeUsers: { label: 'Usuarios activos', format: 'integer' },
  newUsers: { label: 'Usuarios nuevos', format: 'integer' },
  screenPageViews: { label: 'Vistas de página', format: 'integer' },
  bounceRate: { label: 'Tasa de rebote', format: 'percent_ratio' },
  averageSessionDuration: { label: 'Duración media de sesión', format: 'duration' },
  engagementRate: { label: 'Tasa de interacción', format: 'percent_ratio' },
  conversions: { label: 'Conversiones', format: 'integer' },
  totalRevenue: { label: 'Ingresos totales', format: 'currency' },
  eventCount: { label: 'Eventos', format: 'integer' },
  userEngagementDuration: { label: 'Tiempo de interacción', format: 'duration' },
  sessionsPerUser: { label: 'Sesiones por usuario', format: 'decimal' },
};

// Schema extraído literal de buildTools() en app/api/aria/[tenant]/route.js (no existe hoy
// como módulo separado) — misma definición que ya usa Aria, no una reescritura.
export const QUERY_GA4_TOOL = {
  name: 'query_ga4',
  description: `Consulta Google Analytics 4 para obtener datos reales de tráfico, conversiones y comportamiento de usuarios.
Úsalo cuando la pregunta requiera evidencia observada sobre adquisición, engagement, conversiones, canales, páginas o comportamiento de usuarios.
No uses este tool para preguntas sobre estrategia, operaciones o riesgos que no requieran datos de tráfico web.

Métricas disponibles: sessions, activeUsers, newUsers, screenPageViews, bounceRate, averageSessionDuration, engagementRate, conversions, totalRevenue, eventCount, userEngagementDuration, sessionsPerUser.

Dimensiones disponibles: date, sessionDefaultChannelGroup, sessionSource, sessionMedium, sessionSourceMedium, country, deviceCategory, landingPage, pagePath, pageTitle, eventName, firstUserDefaultChannelGroup.

Para fechas relativas usa: today, yesterday, 7daysAgo, 30daysAgo, 90daysAgo. Para fechas absolutas usa formato YYYY-MM-DD.`,
  input_schema: {
    type: 'object',
    properties: {
      metrics: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['sessions', 'activeUsers', 'newUsers', 'screenPageViews', 'bounceRate', 'averageSessionDuration', 'engagementRate', 'conversions', 'totalRevenue', 'eventCount', 'userEngagementDuration', 'sessionsPerUser'],
        },
        minItems: 1,
        maxItems: 5,
        description: 'Métricas a incluir en la consulta.',
      },
      dimensions: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['date', 'sessionDefaultChannelGroup', 'sessionSource', 'sessionMedium', 'sessionSourceMedium', 'country', 'deviceCategory', 'landingPage', 'pagePath', 'pageTitle', 'eventName', 'firstUserDefaultChannelGroup'],
        },
        maxItems: 3,
        description: 'Dimensiones por las que agrupar los datos. Opcional.',
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
    required: ['metrics', 'dateRange'],
  },
};

// Mismo patrón de resolución que executeTool()'s query_ga4 branch en Aria: busca la fuente
// GA4 en la config de Intelligence Sources del tenant, exige que esté activa, y llama
// runGa4Query (lib/aria/ga4.js, ya genérico) con el propertyId configurado.
export async function executeGa4Tool(input, { intelligenceSources }) {
  const ga4Source = intelligenceSources?.find((s) => s.id === 'ga4');
  if (!ga4Source || ga4Source.status !== 'active') {
    return { error: 'GA4 no está activo para este tenant. Configúralo en Admin > Sources.' };
  }
  const propertyId = ga4Source.config?.propertyId;
  if (!propertyId) {
    return { error: 'GA4 está activo pero no tiene Property ID configurado.' };
  }

  try {
    const result = await runGa4Query({
      propertyId,
      metrics: input.metrics,
      dimensions: input.dimensions ?? [],
      dateRanges: [{ startDate: input.dateRange.startDate, endDate: input.dateRange.endDate }],
      limit: Math.min(input.limit ?? 25, 50),
    });
    const rawRows = result.rows.map((row) => Object.fromEntries(result.headers.map((h, i) => [h, row[i]])));
    return {
      period: formatPeriodLabel(input.dateRange.startDate, input.dateRange.endDate),
      propertyId,
      rowCount: result.rowCount,
      returned: rawRows.length,
      data: applyFieldMeta(rawRows, GA4_FIELD_META),
      ...(rawRows.length === 0 ? { note: 'Sin datos para el período solicitado.' } : {}),
    };
  } catch (err) {
    return { error: `Error consultando GA4: ${err.message}` };
  }
}
