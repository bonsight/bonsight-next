import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { AnalyticsAdminServiceClient } from '@google-analytics/admin';

const GA_PROPERTY = '538471138';

function parseCredentials() {
  return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
}

let client = null;
function getClient() {
  if (!client) client = new BetaAnalyticsDataClient({ credentials: parseCredentials() });
  return client;
}

let adminClient = null;
function getAdminClient() {
  if (!adminClient) adminClient = new AnalyticsAdminServiceClient({ credentials: parseCredentials() });
  return adminClient;
}

export async function validateGA4Access(propertyId) {
  try {
    const c = getClient();
    await c.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'sessions' }],
      limit: '1',
    });
    return { ok: true };
  } catch (err) {
    const code = err?.code;
    if (code === 7)  return { ok: false, error: 'Sin acceso. Verifica que el Service Account sea Viewer/Lector en esta propiedad.' };
    if (code === 5)  return { ok: false, error: 'Propiedad no encontrada. Verifica el Property ID.' };
    if (code === 3)  return { ok: false, error: 'Property ID inválido. Debe ser un número (ej: 538471138).' };
    return { ok: false, error: err?.message ?? 'Error desconocido al validar acceso.' };
  }
}

export async function fetchGA4PropertyMeta(propertyId) {
  try {
    const c = getAdminClient();
    const [property] = await c.getProperty({ name: `properties/${propertyId}` });

    let accountName = null;
    if (property.parent) {
      try {
        const [account] = await c.getAccount({ name: property.parent });
        accountName = account.displayName ?? null;
      } catch { /* best effort */ }
    }

    return {
      propertyName: property.displayName ?? null,
      accountName,
      timezone: property.timeZone ?? null,
      currency: property.currencyCode ?? null,
    };
  } catch {
    return { propertyName: null, accountName: null, timezone: null, currency: null };
  }
}

export async function runGa4Query({
  propertyId,
  metrics,
  dimensions,
  dateRanges,
  dimensionFilter,
  orderBys,
  limit,
}) {
  if (!Array.isArray(metrics) || metrics.length === 0) {
    throw new Error('metrics is required and must be a non-empty array');
  }
  if (!Array.isArray(dateRanges) || dateRanges.length === 0) {
    throw new Error('dateRanges is required and must contain at least one range');
  }

  const request = {
    property: `properties/${propertyId ?? GA_PROPERTY}`,
    dateRanges,
    metrics: metrics.map((name) => ({ name })),
  };
  if (dimensions?.length) request.dimensions = dimensions.map((name) => ({ name }));
  if (dimensionFilter) request.dimensionFilter = dimensionFilter;
  if (orderBys?.length) request.orderBys = orderBys;
  if (limit) request.limit = String(limit);

  const c = getClient();
  const [response] = await c.runReport(request);
  return formatGa4Response(response);
}

function formatGa4Response(response) {
  const dimHeaders = (response.dimensionHeaders || []).map((h) => h.name);
  const metHeaders = (response.metricHeaders || []).map((h) => h.name);
  const headers = [...dimHeaders, ...metHeaders];

  const rows = (response.rows || []).map((r) => [
    ...(r.dimensionValues || []).map((v) => v.value),
    ...(r.metricValues || []).map((v) => v.value),
  ]);

  return {
    rowCount: response.rowCount ?? rows.length,
    headers,
    rows,
  };
}
