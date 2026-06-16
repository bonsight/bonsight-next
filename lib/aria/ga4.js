import { BetaAnalyticsDataClient } from '@google-analytics/data';

const GA_PROPERTY = '538471138';

let client = null;
function getClient() {
  if (!client) {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    client = new BetaAnalyticsDataClient({ credentials });
  }
  return client;
}

export async function runGa4Query({
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
    property: `properties/${GA_PROPERTY}`,
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
