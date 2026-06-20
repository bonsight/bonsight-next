import { getMonthlyUsageSummary, getAllTenantsMonthlyUsage, currentMonth } from '@/lib/kai/usage';
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

export default async function CostsDashboardPage() {
  const month = currentMonth();
  const allMeta = await getAllTenantsMeta();
  const [{ total, byProduct, byFeature }, byTenant] = await Promise.all([
    getMonthlyUsageSummary(month),
    getAllTenantsMonthlyUsage(allMeta, month),
  ]);

  const maxFeatureCost = byFeature[0]?.cost ?? 1;

  return (
    <div className="costs-page">
      <div className="costs-header">
        <div>
          <div className="costs-title">Costos IA</div>
          <div className="costs-month">{fmtMonth(month)}</div>
        </div>
        <Link href="/kai/admin" className="costs-back">← Dashboard</Link>
      </div>

      {/* ── Vista global ── */}
      <div className="costs-global-grid">
        <div className="costs-stat-card costs-stat-card--primary">
          <div className="costs-stat-label">Costo total</div>
          <div className="costs-stat-value">{fmtCost(total.cost)}</div>
          <div className="costs-stat-calls">{total.calls} llamadas</div>
        </div>
        <div className="costs-stat-card">
          <div className="costs-stat-label">Input tokens</div>
          <div className="costs-stat-value costs-stat-value--tokens">{fmt(total.input_tokens)}</div>
          <div className="costs-stat-hint">prompts + contexto</div>
        </div>
        <div className="costs-stat-card">
          <div className="costs-stat-label">Output tokens</div>
          <div className="costs-stat-value costs-stat-value--tokens">{fmt(total.output_tokens)}</div>
          <div className="costs-stat-hint">respuestas generadas</div>
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
            { key: 'kai',  label: 'Kai',  color: '#1D9E75' },
            { key: 'aria', label: 'Aria', color: '#7C3AED' },
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

      {/* ── Por funcionalidad ── */}
      <div className="costs-section">
        <div className="costs-section-title">Por funcionalidad</div>
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
        <div className="costs-section-title">Por cliente</div>
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
