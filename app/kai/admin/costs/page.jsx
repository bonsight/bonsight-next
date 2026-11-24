import { getMonthlyUsageSummary, getAllTenantsMonthlyUsage, getMeetingUsageSummary, currentMonth } from '@/lib/kai/usage';
import { getAllTenantsMeta } from '@/lib/kai/tenants';
import Link from 'next/link';

function fmt(n) {
  if (!n || n === 0) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function fmtCost(n) {
  return `USD ${Number(n ?? 0).toFixed(2)}`;
}

function fmtMonth(m) {
  const [y, mo] = m.split('-');
  const names = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${names[parseInt(mo, 10) - 1]} ${y}`;
}

function fmtMinutes(min) {
  const m = Math.round(min ?? 0);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
}

function shiftMonth(m, delta) {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function TokenBar({ input, output }) {
  const total = input + output;
  if (!total) return null;
  const inputPct = Math.round((input / total) * 100);
  return (
    <div className="cost-token-bar">
      <div className="cost-token-bar-input" style={{ width: `${inputPct}%` }} title={`Input: ${fmt(input)}`} />
      <div className="cost-token-bar-output" style={{ width: `${100 - inputPct}%` }} title={`Output: ${fmt(output)}`} />
    </div>
  );
}

export default async function CostsDashboardPage({ searchParams }) {
  const sp = await searchParams;
  const thisMonth = currentMonth();
  const month = /^\d{4}-\d{2}$/.test(sp?.m ?? '') && sp.m <= thisMonth ? sp.m : thisMonth;
  const allMeta = await getAllTenantsMeta();
  const [{ total, byProduct, byFeature }, byTenant, meetings] = await Promise.all([
    getMonthlyUsageSummary(month),
    getAllTenantsMonthlyUsage(allMeta, month),
    getMeetingUsageSummary(allMeta, month),
  ]);
  const grandTotal = total.cost + meetings.total.cost;
  const maxMeetingCost = meetings.byTenant[0]?.cost ?? 0;

  const maxFeatureCost = byFeature[0]?.cost ?? 1;

  return (
    <div className="costs-page">
      <div className="costs-header">
        <div>
          <div className="costs-title">Consumo</div>
          <div className="costs-month-nav">
            <Link href={`?m=${shiftMonth(month, -1)}`} className="costs-back">‹</Link>
            <span className="costs-month">{fmtMonth(month)}</span>
            {month < thisMonth && <Link href={`?m=${shiftMonth(month, 1)}`} className="costs-back">›</Link>}
          </div>
        </div>
        <Link href="/admin" className="costs-back">← Dashboard</Link>
      </div>

      {/* ── Vista global ── */}
      <div className="costs-global-grid">
        <div className="costs-stat-card costs-stat-card--primary">
          <div className="costs-stat-label">Total del mes</div>
          <div className="costs-stat-value">{fmtCost(grandTotal)}</div>
          <div className="costs-stat-calls">IA + reuniones</div>
        </div>
        <div className="costs-stat-card">
          <div className="costs-stat-label">IA (Claude)</div>
          <div className="costs-stat-value">{fmtCost(total.cost)}</div>
          <div className="costs-stat-calls">{total.calls} llamadas</div>
        </div>
        <div className="costs-stat-card">
          <div className="costs-stat-label">Reuniones (Recall)</div>
          <div className="costs-stat-value">{fmtCost(meetings.total.cost)}</div>
          <div className="costs-stat-calls">{meetings.total.meetings} reuniones · {fmtMinutes(meetings.total.minutes)}</div>
        </div>
        <div className="costs-stat-card">
          <div className="costs-stat-label">Total tokens</div>
          <div className="costs-stat-value costs-stat-value--tokens">{fmt(total.input_tokens + total.output_tokens)}</div>
          <TokenBar input={total.input_tokens} output={total.output_tokens} />
        </div>
      </div>

      {/* ── Por producto ── */}
      <div className="costs-section">
        <div className="costs-section-title">Por producto</div>
        <div className="costs-product-grid">
          {[
            { key: 'kai-next', label: 'Kai Next', color: '#0F766E' },
            { key: 'kai',  label: 'Kai (legado)',  color: '#1D9E75' },
            { key: 'aria', label: 'Aria', color: '#7C3AED' },
            { key: 'labs', label: 'Labs', color: '#3F9E73' },
          ].map(({ key, label, color }) => {
            const d = byProduct[key];
            const totalT = (d.input_tokens ?? 0) + (d.output_tokens ?? 0);
            return (
              <div key={key} className="costs-product-card">
                <div className="costs-product-dot" style={{ background: color }} />
                <div className="costs-product-label">{label}</div>
                <div className="costs-product-cost">{fmtCost(d.cost)}</div>
                <div className="costs-product-tokens">{fmt(totalT)} tokens</div>
                <TokenBar input={d.input_tokens} output={d.output_tokens} />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Reuniones ── */}
      <div className="costs-section">
        <div className="costs-section-title">Reuniones con Kai (Recall.ai · USD {meetings.ratePerHour.toFixed(2)}/hora)</div>
        {meetings.byTenant.length === 0 ? (
          <div className="costs-empty">Sin reuniones grabadas este mes.</div>
        ) : (
          <div className="costs-feature-list">
            {meetings.byTenant.map((t) => {
              const barW = maxMeetingCost > 0 ? Math.round((t.cost / maxMeetingCost) * 100) : 0;
              return (
                <div key={t.slug} className="costs-feature-row">
                  <div className="costs-feature-meta">
                    <span className="costs-feature-label">{t.name}</span>
                    <span className="costs-feature-product">{t.slug}</span>
                    <span className="costs-feature-calls">{t.meetings} {t.meetings === 1 ? 'reunión' : 'reuniones'}</span>
                  </div>
                  <div className="costs-feature-bar-wrap">
                    <div className="costs-feature-bar" style={{ width: `${barW}%` }} />
                  </div>
                  <div className="costs-feature-numbers">
                    <span className="costs-feature-cost">{fmtCost(t.cost)}</span>
                    <span className="costs-feature-tokens">{fmtMinutes(t.minutes)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Por funcionalidad ── */}
      <div className="costs-section">
        <div className="costs-section-title">IA por funcionalidad</div>
        {byFeature.length === 0 ? (
          <div className="costs-empty">Sin datos aún. Los costos se registran en cada llamada a IA.</div>
        ) : (
          <div className="costs-feature-list">
            {byFeature.map((f) => {
              const totalT = f.input_tokens + f.output_tokens;
              const barW = maxFeatureCost > 0 ? Math.round((f.cost / maxFeatureCost) * 100) : 0;
              return (
                <div key={`${f.product}-${f.feature}`} className="costs-feature-row">
                  <div className="costs-feature-meta">
                    <span className="costs-feature-label">{f.label}</span>
                    <span className="costs-feature-product">{f.product}</span>
                    <span className="costs-feature-calls">{f.calls} llamadas</span>
                  </div>
                  <div className="costs-feature-bar-wrap">
                    <div className="costs-feature-bar" style={{ width: `${barW}%` }} />
                  </div>
                  <div className="costs-feature-numbers">
                    <span className="costs-feature-cost">{fmtCost(f.cost)}</span>
                    <span className="costs-feature-tokens">{fmt(totalT)} tokens</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Por cliente ── */}
      <div className="costs-section">
        <div className="costs-section-title">IA por cliente</div>
        {byTenant.length === 0 ? (
          <div className="costs-empty">Sin actividad registrada este mes.</div>
        ) : (
          <div className="costs-feature-list">
            {byTenant.map((t) => {
              const totalT = t.input_tokens + t.output_tokens;
              const maxCost = byTenant[0]?.cost ?? 1;
              const barW = maxCost > 0 ? Math.round((t.cost / maxCost) * 100) : 0;
              return (
                <div key={t.slug} className="costs-feature-row">
                  <div className="costs-feature-meta">
                    <span className="costs-feature-label">{t.name}</span>
                    <span className="costs-feature-product">{t.slug}</span>
                    <span className="costs-feature-calls">{t.calls} llamadas</span>
                  </div>
                  <div className="costs-feature-bar-wrap">
                    <div className="costs-feature-bar" style={{ width: `${barW}%` }} />
                  </div>
                  <div className="costs-feature-numbers">
                    <span className="costs-feature-cost">{fmtCost(t.cost)}</span>
                    <span className="costs-feature-tokens">{fmt(totalT)} tokens</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
