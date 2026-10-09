// Formateo de tablas para las tools de Kai Next — vive en la capa de la tool (no en el prompt)
// para que sirva para toda la reportería, no solo para lo que el modelo decida escribir bien
// una vez. Cada tool mapea sus campos crudos (sessionSource, engagementRate, ctr...) a label +
// tipo de formato acá; el renderer del lado del cliente solo muestra lo que ya llega formateado.

const RELATIVE_LABELS = {
  today: 'Hoy',
  yesterday: 'Ayer',
  '7daysAgo': 'Últimos 7 días',
  '30daysAgo': 'Últimos 30 días',
  '90daysAgo': 'Últimos 90 días',
};

function formatDatePart(value) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  return value;
}

export function formatPeriodLabel(startDate, endDate) {
  if (RELATIVE_LABELS[startDate] && (endDate === 'today' || startDate === endDate)) {
    return RELATIVE_LABELS[startDate];
  }
  return `${formatDatePart(startDate)} – ${formatDatePart(endDate)}`;
}

export function formatValue(value, type) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  switch (type) {
    case 'integer':
      return Number.isFinite(n) ? n.toLocaleString('es') : String(value);
    case 'decimal':
      return Number.isFinite(n) ? n.toLocaleString('es', { maximumFractionDigits: 2 }) : String(value);
    case 'percent_ratio': // valor 0–1 (ej. GA4 engagementRate) → "58%"
      return Number.isFinite(n) ? `${Math.round(n * 100)}%` : String(value);
    case 'percent_scaled': // valor ya en 0–100 (ej. ctr de Search Console) → "58%"
      return Number.isFinite(n) ? `${Math.round(n)}%` : String(value);
    case 'currency':
      return Number.isFinite(n) ? `$${n.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : String(value);
    case 'duration': { // segundos → "2m 15s"
      if (!Number.isFinite(n)) return String(value);
      const mins = Math.floor(n / 60);
      const secs = Math.round(n % 60);
      return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    }
    case 'date': {
      if (/^\d{8}$/.test(value)) { // GA4: "20260714"
        return new Date(`${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00`)
          .toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
      }
      return formatDatePart(value);
    }
    default:
      return String(value);
  }
}

// Fallback genérico para campos sin diccionario (reportes de Google Ads, columnas de bases SQL
// del tenant) — "sessionSource" / "session_source" → "Session source" legible, sin pretender
// saber su tipo real (no inventamos que algo es moneda o porcentaje sin evidencia de la fuente).
export function humanizeKey(key) {
  const spaced = String(key).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim().toLowerCase();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : String(key);
}

export function guessFormat(value) {
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'decimal';
  return 'text';
}

// Aplica un diccionario {campo: {label, format}} a un array de filas crudas — devuelve filas
// con claves ya legibles y valores ya formateados como string, listas para mostrar.
export function applyFieldMeta(rows, fieldMeta) {
  return rows.map((row) => {
    const out = {};
    for (const [key, value] of Object.entries(row)) {
      const meta = fieldMeta[key];
      const label = meta?.label ?? humanizeKey(key);
      const format = meta?.format ?? guessFormat(value);
      out[label] = formatValue(value, format);
    }
    return out;
  });
}
