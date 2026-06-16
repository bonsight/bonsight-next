function formatDelta(deltaPct, trend) {
  if (deltaPct === undefined || deltaPct === null) return null;
  const arrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
  const sign = deltaPct > 0 ? '+' : '';
  return `${arrow} ${sign}${deltaPct.toFixed(1)}%`;
}

function trendClass(trend) {
  if (trend === 'up') return 'aria-kpi-delta-up';
  if (trend === 'down') return 'aria-kpi-delta-down';
  return 'aria-kpi-delta-flat';
}

function Kpi({ kpi, primary }) {
  const delta = formatDelta(kpi.deltaPct, kpi.trend);
  return (
    <div className={primary ? 'aria-kpi aria-kpi-primary' : 'aria-kpi'}>
      <p className="aria-kpi-label">{kpi.label}</p>
      <p className="aria-kpi-value">{kpi.value}</p>
      {delta && <p className={`aria-kpi-delta ${trendClass(kpi.trend)}`}>{delta}</p>}
    </div>
  );
}

export default function KpiGrid({ kpis }) {
  if (!Array.isArray(kpis) || kpis.length === 0) return null;

  const [primary, ...secondary] = kpis;

  return (
    <div className="aria-kpi-grid">
      <Kpi kpi={primary} primary />
      {secondary.map((kpi, i) => (
        <Kpi key={i} kpi={kpi} />
      ))}
    </div>
  );
}
