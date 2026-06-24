import { google } from 'googleapis';

const ADS_API_VERSION = 'v18';
const ADS_BASE = `https://googleads.googleapis.com/${ADS_API_VERSION}`;

function normalizeId(id) {
  return String(id).replace(/-/g, '');
}

function getOAuth2Client() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_ADS_CLIENT_ID,
    process.env.GOOGLE_ADS_CLIENT_SECRET,
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN });
  return auth;
}

async function getAccessToken() {
  const { token } = await getOAuth2Client().getAccessToken();
  return token;
}

async function gaqlQuery(customerId, query) {
  const token = await getAccessToken();
  const cid = normalizeId(customerId);
  const managerId = process.env.GOOGLE_ADS_MANAGER_CUSTOMER_ID;

  const headers = {
    Authorization: `Bearer ${token}`,
    'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    'Content-Type': 'application/json',
  };
  if (managerId) headers['login-customer-id'] = normalizeId(managerId);

  const res = await fetch(`${ADS_BASE}/customers/${cid}/googleAds:search`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg =
      body?.error?.details?.[0]?.errors?.[0]?.message ??
      body?.error?.message ??
      res.statusText;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }

  return res.json();
}

export async function validateGoogleAdsAccess(customerId) {
  try {
    const data = await gaqlQuery(
      customerId,
      'SELECT customer.id, customer.descriptive_name FROM customer LIMIT 1',
    );
    const customerName = data.results?.[0]?.customer?.descriptiveName ?? null;
    return { ok: true, customerName };
  } catch (err) {
    const msg = err.message ?? '';
    if (msg.includes('DEVELOPER_TOKEN_NOT_APPROVED') || msg.includes('not approved')) {
      return { ok: false, error: 'El Developer Token no está aprobado por Google. Solicita acceso en Google Ads API Center.' };
    }
    if (msg.includes('CUSTOMER_NOT_FOUND') || err.status === 404) {
      return { ok: false, error: `Customer ID ${customerId} no encontrado. Verifica que el ID sea correcto.` };
    }
    if (err.status === 403 || msg.includes('AUTHORIZATION_ERROR') || msg.includes('not authorized')) {
      return { ok: false, error: 'Sin acceso a esta cuenta de Google Ads. Verifica que el Manager Account esté vinculado a este Customer ID.' };
    }
    if (msg.includes('has not been used') || msg.includes('is disabled')) {
      return { ok: false, error: 'La Google Ads API no está habilitada en el proyecto de GCP. Habilítala en Google Cloud Console.' };
    }
    return { ok: false, error: msg || 'Error desconocido al validar acceso.' };
  }
}

function resolveDate(d) {
  if (d === 'today') return new Date().toISOString().slice(0, 10);
  const m = d.match(/^(\d+)daysAgo$/);
  if (m) {
    const dt = new Date();
    dt.setDate(dt.getDate() - parseInt(m[1]));
    return dt.toISOString().slice(0, 10);
  }
  return d;
}

const micros = (v) => parseFloat((Number(v ?? 0) / 1_000_000).toFixed(2));
const num = (v) => Number(v ?? 0);
const pct = (v) => parseFloat((Number(v ?? 0) * 100).toFixed(2));

const QUERIES = {
  campaigns: ({ start, end }) => `
    SELECT campaign.name, campaign.status,
      metrics.cost_micros, metrics.clicks, metrics.impressions,
      metrics.ctr, metrics.conversions
    FROM campaign
    WHERE segments.date BETWEEN '${start}' AND '${end}'
      AND campaign.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC`,

  keywords: ({ start, end }) => `
    SELECT ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type,
      metrics.clicks, metrics.cost_micros, metrics.impressions, metrics.ctr, metrics.conversions
    FROM keyword_view
    WHERE segments.date BETWEEN '${start}' AND '${end}'
      AND campaign.status = 'ENABLED' AND ad_group.status = 'ENABLED'
    ORDER BY metrics.clicks DESC`,

  search_terms: ({ start, end }) => `
    SELECT search_term_view.search_term,
      metrics.clicks, metrics.cost_micros, metrics.impressions, metrics.conversions
    FROM search_term_view
    WHERE segments.date BETWEEN '${start}' AND '${end}'
    ORDER BY metrics.clicks DESC`,

  conversions: ({ start, end }) => `
    SELECT conversion_action.name, conversion_action.category,
      metrics.conversions, metrics.conversions_value, metrics.cost_per_conversion
    FROM conversion_action
    WHERE segments.date BETWEEN '${start}' AND '${end}'
      AND metrics.conversions > 0
    ORDER BY metrics.conversions DESC`,

  devices: ({ start, end }) => `
    SELECT segments.device,
      metrics.clicks, metrics.cost_micros, metrics.impressions, metrics.ctr, metrics.conversions
    FROM campaign
    WHERE segments.date BETWEEN '${start}' AND '${end}'
    ORDER BY metrics.clicks DESC`,

  countries: ({ start, end }) => `
    SELECT geographic_view.country_criterion_id,
      metrics.clicks, metrics.cost_micros, metrics.impressions, metrics.conversions
    FROM geographic_view
    WHERE segments.date BETWEEN '${start}' AND '${end}'
    ORDER BY metrics.clicks DESC`,

  trends: ({ start, end }) => `
    SELECT segments.date,
      metrics.clicks, metrics.cost_micros, metrics.impressions, metrics.conversions
    FROM customer
    WHERE segments.date BETWEEN '${start}' AND '${end}'
    ORDER BY segments.date ASC`,

  audiences: ({ start, end }) => `
    SELECT campaign.name, ad_group.name, user_list.name,
      metrics.clicks, metrics.cost_micros, metrics.impressions, metrics.conversions
    FROM ad_group_audience_view
    WHERE segments.date BETWEEN '${start}' AND '${end}'
    ORDER BY metrics.clicks DESC`,
};

const FORMATTERS = {
  campaigns: (r) => ({
    campaign: r.campaign?.name,
    status: r.campaign?.status,
    cost: micros(r.metrics?.costMicros),
    clicks: num(r.metrics?.clicks),
    impressions: num(r.metrics?.impressions),
    ctr: pct(r.metrics?.ctr),
    conversions: num(r.metrics?.conversions),
  }),
  keywords: (r) => ({
    keyword: r.adGroupCriterion?.keyword?.text,
    matchType: r.adGroupCriterion?.keyword?.matchType,
    clicks: num(r.metrics?.clicks),
    cost: micros(r.metrics?.costMicros),
    impressions: num(r.metrics?.impressions),
    ctr: pct(r.metrics?.ctr),
    conversions: num(r.metrics?.conversions),
  }),
  search_terms: (r) => ({
    searchTerm: r.searchTermView?.searchTerm,
    clicks: num(r.metrics?.clicks),
    cost: micros(r.metrics?.costMicros),
    impressions: num(r.metrics?.impressions),
    conversions: num(r.metrics?.conversions),
  }),
  conversions: (r) => ({
    name: r.conversionAction?.name,
    category: r.conversionAction?.category,
    conversions: num(r.metrics?.conversions),
    value: num(r.metrics?.conversionsValue),
    costPerConversion: micros(r.metrics?.costPerConversion),
  }),
  devices: (r) => ({
    device: r.segments?.device,
    clicks: num(r.metrics?.clicks),
    cost: micros(r.metrics?.costMicros),
    impressions: num(r.metrics?.impressions),
    ctr: pct(r.metrics?.ctr),
    conversions: num(r.metrics?.conversions),
  }),
  countries: (r) => ({
    countryCriterionId: r.geographicView?.countryCriterionId,
    clicks: num(r.metrics?.clicks),
    cost: micros(r.metrics?.costMicros),
    impressions: num(r.metrics?.impressions),
    conversions: num(r.metrics?.conversions),
  }),
  trends: (r) => ({
    date: r.segments?.date,
    clicks: num(r.metrics?.clicks),
    cost: micros(r.metrics?.costMicros),
    impressions: num(r.metrics?.impressions),
    conversions: num(r.metrics?.conversions),
  }),
  audiences: (r) => ({
    campaign: r.campaign?.name,
    adGroup: r.adGroup?.name,
    audience: r.userList?.name,
    clicks: num(r.metrics?.clicks),
    cost: micros(r.metrics?.costMicros),
    impressions: num(r.metrics?.impressions),
    conversions: num(r.metrics?.conversions),
  }),
};

export async function runGoogleAdsQuery({ customerId, reportType, dateRange, limit = 25 }) {
  const start = resolveDate(dateRange?.startDate ?? '30daysAgo');
  const end = resolveDate(dateRange?.endDate ?? 'today');
  const cap = Math.min(limit, 50);

  const queryFn = QUERIES[reportType];
  if (!queryFn) throw new Error(`reportType desconocido: ${reportType}`);

  const gaql = `${queryFn({ start, end })} LIMIT ${cap}`;
  const data = await gaqlQuery(customerId, gaql);

  const formatter = FORMATTERS[reportType] ?? ((r) => r);
  const rows = (data.results ?? []).map(formatter);

  return {
    reportType,
    dateRange: { startDate: start, endDate: end },
    rowCount: rows.length,
    data: rows,
  };
}
