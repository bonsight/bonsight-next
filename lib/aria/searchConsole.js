import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly'];

function resolveDate(dateStr) {
  const s = (dateStr ?? '').trim();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (s === 'today') return today.toISOString().slice(0, 10);
  if (s === 'yesterday') {
    const d = new Date(today); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10);
  }
  const m = s.match(/^(\d+)daysAgo$/);
  if (m) {
    const d = new Date(today); d.setDate(d.getDate() - parseInt(m[1], 10)); return d.toISOString().slice(0, 10);
  }
  return s; // already absolute YYYY-MM-DD
}

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  return new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
}

function extractDomain(input) {
  const raw = input.trim().replace(/^sc-domain:/, '');
  try {
    const url = raw.startsWith('http') ? new URL(raw) : new URL(`https://${raw}`);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return raw.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}

function buildCandidates(input) {
  const raw = input.trim();
  if (raw.startsWith('sc-domain:')) {
    const domain = raw.slice('sc-domain:'.length).trim();
    return [`sc-domain:${domain}`, `https://${domain}/`, `https://www.${domain}/`];
  }
  const domain = extractDomain(raw);
  return [`sc-domain:${domain}`, `https://${domain}/`, `https://www.${domain}/`];
}

export async function validateSearchConsoleAccess(siteUrl) {
  const auth = getAuth();
  const sc = google.webmasters({ version: 'v3', auth });
  const candidates = buildCandidates(siteUrl);

  // Use recent dates within SC retention (16 months). 403 = no access, 200 = has access (even if 0 rows).
  const now = new Date();
  const endDate = new Date(now - 7 * 86400000).toISOString().slice(0, 10);
  const startDate = new Date(now - 37 * 86400000).toISOString().slice(0, 10);
  const testBody = { startDate, endDate, rowLimit: 1 };
  const errors = [];
  for (const url of candidates) {
    try {
      await sc.searchanalytics.query({ siteUrl: url, requestBody: testBody });
      return { ok: true, resolvedUrl: url };
    } catch (err) {
      const status = err?.code ?? err?.status;
      const message = err?.response?.data?.error?.message ?? err?.message ?? 'unknown';
      console.error(`[SC validate] ${url} → ${status}: ${message}`);
      errors.push({ url, status, message });
    }
  }

  const apiDisabled = errors.find((e) => e.message?.includes('has not been used') || e.message?.includes('is disabled'));
  if (apiDisabled) {
    return {
      ok: false,
      error: 'La Search Console API no está habilitada en el proyecto de GCP. Habilítala en Google Cloud Console y vuelve a intentarlo.',
    };
  }

  const accessDenied = errors.find((e) => e.status === 403);
  if (accessDenied) {
    return {
      ok: false,
      error: `El Service Account no tiene acceso a esta propiedad. Ve a Search Console → Configuración → Usuarios y permisos → agrega el email del Service Account como "Propietario" o "Acceso completo".`,
    };
  }

  return {
    ok: false,
    error: `No se pudo acceder a ninguna variante del dominio. Errores: ${errors.map((e) => `${e.url} (${e.status}: ${e.message})`).join(' | ')}`,
  };
}

export async function runSearchConsoleQuery({ siteUrl, dimensions, dateRange, limit }) {
  const auth = getAuth();
  const sc = google.webmasters({ version: 'v3', auth });

  const candidates = buildCandidates(siteUrl);
  const requestBody = {
    startDate: resolveDate(dateRange.startDate),
    endDate: resolveDate(dateRange.endDate),
    dimensions: dimensions?.length ? dimensions : undefined,
    rowLimit: Math.min(limit ?? 25, 50),
  };

  let lastError;
  for (const url of candidates) {
    try {
      const res = await sc.searchanalytics.query({ siteUrl: url, requestBody });
      const dims = dimensions ?? [];
      const rows = (res.data.rows ?? []).map((row) => {
        const obj = {};
        dims.forEach((dim, i) => { obj[dim] = row.keys?.[i] ?? null; });
        obj.clicks      = row.clicks      ?? 0;
        obj.impressions = row.impressions ?? 0;
        obj.ctr         = row.ctr      != null ? parseFloat((row.ctr * 100).toFixed(2)) : 0;
        obj.position    = row.position != null ? parseFloat(row.position.toFixed(1))    : null;
        return obj;
      });
      return { rowCount: rows.length, data: rows, resolvedUrl: url };
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError;
}
