'use client';

import { useEffect, useState } from 'react';

// ── Utilities ──────────────────────────────────────────────────────────────

function relativeTime(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Hace un momento';
  if (mins < 60) return `Hace ${mins} min`;
  if (hours < 24) return `Hace ${hours} h`;
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  return new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function exactDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ── Knowledge Score (same logic as Kai Admin Intelligence tab) ─────────────

const KNOWLEDGE_AREAS = [
  {
    id: 'negocio', label: 'Negocio', icon: '🏢',
    checks: [
      (p) => p?.general?.model,
      (p) => p?.general?.size,
      (p) => p?.general?.industry,
      (p) => p?.objectives?.shortTerm?.length,
      (p) => p?.objectives?.mediumTerm?.length,
      (p) => p?.objectives?.longTerm?.length,
    ],
  },
  {
    id: 'operaciones', label: 'Operaciones', icon: '⚙️',
    checks: [(p) => p?.processes?.length, (p) => p?.initiatives?.length, (p) => p?.decisions?.length],
  },
  {
    id: 'tecnologia', label: 'Tecnología', icon: '💻',
    checks: [(p) => p?.technology?.length, (p) => p?.general?.digitalMaturity],
  },
  {
    id: 'finanzas', label: 'Finanzas', icon: '💰',
    checks: [(p) => p?.kpis?.length, (p) => p?.risks?.length],
  },
  {
    id: 'marketing', label: 'Marketing / Ventas', icon: '📈',
    checks: [(p) => p?.opportunities?.length, (p) => p?.pains?.length],
  },
  {
    id: 'personas', label: 'Personas', icon: '👥',
    checks: [(p) => p?.stakeholders?.length],
  },
];

function calcAreaScore(area, profile) {
  const filled = area.checks.filter((fn) => fn(profile)).length;
  return Math.round((filled / area.checks.length) * 100);
}

function calcOverallScore(profile) {
  const scores = KNOWLEDGE_AREAS.map((a) => calcAreaScore(a, profile));
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function scoreColor(score) {
  if (score >= 70) return '#1D9E75';
  if (score >= 40) return '#F59E0B';
  return '#EF4444';
}

// ── Shared primitives ──────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 600, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
      {children}
    </div>
  );
}

function MetricCard({ label, value, sub, valueColor = '#111' }) {
  return (
    <div style={{ background: '#fff', border: '0.5px solid #e0e0dc', borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ fontSize: 11, color: '#aaa', fontWeight: 500, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: valueColor, letterSpacing: '-0.04em', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#bbb', marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

// ── Context Tab ────────────────────────────────────────────────────────────

function ContextTab({ profile, conversations, ariaInvestigations, slug }) {
  const overallScore = calcOverallScore(profile);
  const stakeholderCount = (profile?.stakeholders ?? []).length;
  const lastKaiConv = conversations[0] ?? null;
  const [kaiAdminUrl, setKaiAdminUrl] = useState('#');

  useEffect(() => {
    const isLocal = window.location.hostname.includes('localhost');
    setKaiAdminUrl(
      isLocal
        ? `http://kai.localhost:3000/kai/admin/${slug}`
        : `https://kai.bonsight.co/kai/admin/${slug}`
    );
  }, [slug]);

  return (
    <div>
      {/* What Aria knows from Kai */}
      <div style={{ marginBottom: 18 }}>
        <SectionLabel>Contexto disponible para Aria</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <MetricCard label="Conversaciones de Kai" value={conversations.length} sub="fuente principal" />
          <MetricCard label="Stakeholders conocidos" value={stakeholderCount} sub="identificados por Kai" />
          <MetricCard label="Documentos disponibles" value={0} sub="próximamente" />
          <MetricCard label="Fuentes de datos" value={0} sub="próximamente" />
        </div>
      </div>

      {/* Coverage */}
      <div style={{ background: '#fff', border: '0.5px solid #e0e0dc', borderRadius: 12, padding: '20px 24px', marginBottom: 14 }}>
        <SectionLabel>Cobertura del negocio</SectionLabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 18 }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: scoreColor(overallScore), letterSpacing: '-0.04em', lineHeight: 1 }}>
            {overallScore}%
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>
              {overallScore >= 80 ? 'Aria tiene conocimiento sólido de este negocio' :
               overallScore >= 50 ? 'Aria tiene conocimiento parcial del negocio' :
               'Aria tiene conocimiento inicial — Kai debe profundizar más'}
            </div>
            {lastKaiConv && (
              <div style={{ fontSize: 11.5, color: '#aaa', marginTop: 4 }}>
                Última actualización de Kai: {relativeTime(lastKaiConv.updatedAt || lastKaiConv.createdAt)}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {KNOWLEDGE_AREAS.map((area) => {
            const score = calcAreaScore(area, profile);
            return (
              <div key={area.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 16, textAlign: 'center', fontSize: 13, flexShrink: 0 }}>{area.icon}</span>
                <span style={{ width: 160, fontSize: 12.5, color: '#444', fontWeight: 500, flexShrink: 0 }}>{area.label}</span>
                <div style={{ flex: 1, height: 5, background: '#f0f0ed', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: 5, background: scoreColor(score), borderRadius: 3, width: `${score}%`, transition: 'width 0.5s' }} />
                </div>
                <span style={{ width: 32, fontSize: 11.5, color: '#666', fontWeight: 600, textAlign: 'right', flexShrink: 0 }}>
                  {score}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Link to Kai Admin */}
      <div style={{
        background: '#f5f2ff', border: '0.5px solid #e0d8ff',
        borderRadius: 12, padding: '14px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: 12.5, color: '#4B2FBE' }}>
          Para enriquecer este contexto, abre el perfil de Kai del cliente.
        </div>
        <a
          href={kaiAdminUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '7px 14px', borderRadius: 7,
            fontSize: 12, fontWeight: 500, color: '#fff',
            background: '#6B4FE8', textDecoration: 'none', flexShrink: 0,
          }}
        >
          Abrir en Kai Admin ↗
        </a>
      </div>
    </div>
  );
}

// ── Analysis Tab ───────────────────────────────────────────────────────────

function AnalysisTab({ ariaInvestigations, ariaLastMessages, slug }) {
  const [copied, setCopied] = useState(false);
  const [ariaUrl, setAriaUrl] = useState('');
  const [ariaUrlFull, setAriaUrlFull] = useState('#');

  useEffect(() => {
    const isLocal = window.location.hostname.includes('localhost');
    setAriaUrl(isLocal ? `aria.localhost:3000/${slug}` : `aria.bonsight.co/${slug}`);
    setAriaUrlFull(isLocal ? `http://aria.localhost:3000/${slug}` : `https://aria.bonsight.co/${slug}`);
  }, [slug]);

  const total = ariaInvestigations.length;
  const last = ariaInvestigations[0] ?? null;
  const memoriaCount = ariaInvestigations.filter(
    (inv) => inv.nuevos_insights?.length > 0 || inv.decisiones_confirmadas?.length > 0 || inv.objetivos_actualizados?.length > 0
  ).length;

  const copyLink = () => {
    navigator.clipboard.writeText(ariaUrlFull);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div>
      {/* Aria link card */}
      <div style={{
        background: '#fff', border: '0.5px solid #e0e0dc',
        borderRadius: 12, padding: '16px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: '#1a1040', border: '1.5px solid #6B4FE8',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 3L13.4 8.6L19 10L13.4 11.4L12 17L10.6 11.4L5 10L10.6 8.6L12 3Z" fill="#8B6FF0"/>
              <path d="M5 3L5.8 5.4L8.2 6.2L5.8 7L5 9.4L4.2 7L1.8 6.2L4.2 5.4L5 3Z" fill="#8B6FF0" opacity="0.5"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#111', letterSpacing: '-0.01em' }}>
              Aria para este cliente
            </div>
            {ariaUrl && (
              <div style={{ fontSize: 11.5, color: '#6B4FE8', marginTop: 2, fontFamily: 'monospace' }}>
                {ariaUrl}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={copyLink}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit',
              border: '0.5px solid #ddd', background: '#fff', color: '#555',
            }}
          >
            {copied ? '✓ Copiado' : 'Copiar link'}
          </button>
          <a
            href={ariaUrlFull || '#'}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 500,
              border: '0.5px solid #6B4FE8', color: '#6B4FE8',
              background: '#fff', textDecoration: 'none',
            }}
          >
            Abrir Aria ↗
          </a>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 22 }}>
        <MetricCard label="Investigaciones totales" value={total} valueColor="#6B4FE8" />
        <div style={{ background: '#fff', border: '0.5px solid #e0e0dc', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ fontSize: 11, color: '#aaa', fontWeight: 500, marginBottom: 6 }}>Última sesión</div>
          {last ? (
            <>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#111', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                {relativeTime(last.updatedAt || last.createdAt)}
              </div>
              <div style={{ fontSize: 11, color: '#bbb', marginTop: 5 }}>{ariaLastMessages.length} mensajes</div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: '#ddd', fontStyle: 'italic' }}>Sin sesiones</div>
          )}
        </div>
        <MetricCard
          label="Con memoria actualizada"
          value={memoriaCount}
          sub={`de ${total} totales`}
          valueColor="#6B4FE8"
        />
      </div>

      {/* Investigation history */}
      <div style={{ fontSize: 12, fontWeight: 600, color: '#555', letterSpacing: '-0.01em', marginBottom: 12 }}>
        Historial de investigaciones
      </div>

      {ariaInvestigations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ fontSize: 28, opacity: 0.2, marginBottom: 10 }}>✦</div>
          <div style={{ fontSize: 13.5, fontWeight: 500, color: '#888', marginBottom: 4 }}>
            Este cliente aún no ha usado Aria.
          </div>
          <div style={{ fontSize: 12, color: '#bbb', marginBottom: 18 }}>
            Comparte el acceso para comenzar.
          </div>
          <button
            onClick={copyLink}
            style={{
              padding: '7px 16px', borderRadius: 7, fontSize: 12, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit',
              border: '0.5px solid #6B4FE8', background: '#fff', color: '#6B4FE8',
            }}
          >
            Copiar link de Aria
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ariaInvestigations.map((inv) => {
            const memUpdated =
              inv.nuevos_insights?.length > 0 ||
              inv.decisiones_confirmadas?.length > 0 ||
              inv.objetivos_actualizados?.length > 0;
            return (
              <div key={inv.id} style={{
                background: '#fff', border: '0.5px solid #e0e0dc',
                borderRadius: 10, padding: '14px 18px',
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: '#f5f2ff', border: '0.5px solid #e0d8ff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6B4FE8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#222', display: 'flex', alignItems: 'center', gap: 5 }}>
                    {inv.emoji && <span>{inv.emoji}</span>}
                    <span>{inv.titulo || 'Nueva investigación'}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#bbb', marginTop: 3 }}>
                    {exactDate(inv.updatedAt || inv.createdAt)}
                  </div>
                </div>
                <div style={{ flexShrink: 0, marginTop: 2 }}>
                  {memUpdated ? (
                    <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 20, fontSize: 10.5, fontWeight: 500, background: '#f0ebff', color: '#4B2FBE' }}>
                      Memoria actualizada
                    </span>
                  ) : (
                    <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 20, fontSize: 10.5, fontWeight: 500, background: '#f0f0ed', color: '#999' }}>
                      Sin cambios
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Placeholder Tab ────────────────────────────────────────────────────────

function PlaceholderTab({ icon, label, description }) {
  return (
    <div style={{ textAlign: 'center', padding: '64px 20px' }}>
      <div style={{ fontSize: 32, opacity: 0.2, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 500, color: '#888', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 12.5, color: '#bbb' }}>{description}</div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

const TABS = ['Context', 'Analysis', 'Data Sources', 'Insights', 'Recommendations'];

export default function AriaAdminDetail({ meta, profile, conversations, ariaInvestigations, ariaLastMessages }) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <>
      {/* Topbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 26px', background: '#fff',
        borderBottom: '0.5px solid #e0e0dc', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: '#6B4FE8', color: '#fff',
            fontSize: 15, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            letterSpacing: '-0.01em', flexShrink: 0,
          }}>
            {meta.name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#111', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              {meta.name}
            </div>
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 2, fontFamily: 'monospace' }}>
              aria.bonsight.co/{meta.slug}
              {meta.country && <span style={{ color: '#ccc', margin: '0 4px' }}>·</span>}
              {meta.country && <span>{meta.country}</span>}
              {meta.industry && <span style={{ color: '#ccc', margin: '0 4px' }}>·</span>}
              {meta.industry && <span>{meta.industry}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', borderBottom: '0.5px solid #e0e0dc',
        padding: '0 26px', background: '#fff', flexShrink: 0, overflowX: 'auto',
      }}>
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            style={{
              padding: '11px 14px', fontSize: 12.5, fontWeight: 500,
              color: activeTab === i ? '#4B2FBE' : '#999',
              cursor: 'pointer', border: 'none', background: 'none',
              fontFamily: 'inherit',
              borderBottom: activeTab === i ? '2px solid #6B4FE8' : '2px solid transparent',
              marginBottom: -0.5, transition: 'color 0.1s, border-color 0.1s',
              whiteSpace: 'nowrap', letterSpacing: '-0.005em',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '22px 26px', flex: 1, overflowY: 'auto' }}>
        {activeTab === 0 && (
          <ContextTab
            profile={profile}
            conversations={conversations}
            ariaInvestigations={ariaInvestigations}
            slug={meta.slug}
          />
        )}
        {activeTab === 1 && (
          <AnalysisTab
            ariaInvestigations={ariaInvestigations}
            ariaLastMessages={ariaLastMessages}
            slug={meta.slug}
          />
        )}
        {activeTab === 2 && (
          <PlaceholderTab icon="🔌" label="Data Sources" description="Conectores a GA4, BigQuery, HubSpot y más — próximamente en V2." />
        )}
        {activeTab === 3 && (
          <PlaceholderTab icon="💡" label="Insights" description="Hallazgos relevantes generados por Aria — próximamente en V2." />
        )}
        {activeTab === 4 && (
          <PlaceholderTab icon="🎯" label="Recommendations" description="Recomendaciones activas para el cliente — próximamente en V2." />
        )}
      </div>
    </>
  );
}
