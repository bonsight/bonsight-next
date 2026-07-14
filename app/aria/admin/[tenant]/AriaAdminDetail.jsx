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

// ── Intelligence Sources Tab ───────────────────────────────────────────────

const LEVEL_LABELS = { 1: 'Nivel 1', 2: 'Nivel 2', 3: 'Nivel 3' };
const LEVEL_DESC   = { 1: 'Datos observados', 2: 'Conocimiento validado', 3: 'Historial' };

const statusColor = { active: '#10B981', inactive: '#D1D5DB', soon: '#F59E0B' };

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
      style={{
        fontSize: 10.5, padding: '2px 8px', borderRadius: 4, cursor: 'pointer',
        fontFamily: 'inherit', border: '0.5px solid #ddd', background: '#fff', color: '#888',
        flexShrink: 0,
      }}
    >
      {copied ? '✓' : 'Copiar'}
    </button>
  );
}

const SA_PERMISSION = {
  ga4:            'Viewer / Lector en tu propiedad GA4',
  search_console: 'Full User en Google Search Console',
};

function SourceCard({ source, onToggle, onValidate, onSaveConfig, loading, saEmail }) {
  const isAlways    = source.alwaysActive;
  const isSoon      = source.status === 'soon';
  const isActive    = source.status === 'active';
  const primaryKey  = source.fields?.[0]?.key;
  const hasConfig   = primaryKey ? !!source.config?.[primaryKey] : Object.keys(source.config ?? {}).length > 0;
  const needsValidation = !!onValidate;

  const [configuring,     setConfiguring]     = useState(false);
  const [validating,      setValidating]      = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [fieldValues,     setFieldValues]     = useState(
    () => Object.fromEntries((source.fields ?? []).map((f) => [f.key, source.config?.[f.key] ?? '']))
  );

  const handleValidate = async () => {
    setValidating(true);
    setValidationError(null);
    const result = await onValidate(source.id, fieldValues);
    setValidating(false);
    if (result.ok) setConfiguring(false);
    else setValidationError(result.error);
  };

  const canSubmit = Object.values(fieldValues).some((v) => String(v).trim());

  return (
    <div style={{
      background: isActive ? '#faf8ff' : '#fff',
      border: `0.5px solid ${isActive ? '#c4b5fd' : configuring ? '#6B4FE8' : '#e0e0dc'}`,
      borderRadius: 10, padding: '14px 16px', marginBottom: 10,
      opacity: isSoon ? 0.6 : 1, transition: 'border-color 0.15s',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: statusColor[source.status] ?? '#D1D5DB' }} />
          <span style={{ fontSize: 13.5, fontWeight: 600, color: '#111', whiteSpace: 'nowrap' }}>{source.label}</span>
          <span style={{ fontSize: 10.5, color: '#aaa', background: '#f5f5f3', borderRadius: 4, padding: '1px 6px', whiteSpace: 'nowrap' }}>
            {LEVEL_LABELS[source.evidenceLevel]} — {LEVEL_DESC[source.evidenceLevel]}
          </span>
        </div>
        {!isAlways && !isSoon && !configuring && (() => {
          if (!hasConfig) return (
            <button onClick={() => setConfiguring(true)} style={{ fontSize: 11.5, fontWeight: 600, padding: '4px 13px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', border: '0.5px solid #6B4FE8', background: '#fff', color: '#6B4FE8' }}>Configurar</button>
          );
          return (
            <button onClick={onToggle} disabled={loading} style={{ fontSize: 11.5, fontWeight: 600, padding: '4px 13px', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', border: isActive ? 'none' : '0.5px solid #6B4FE8', background: isActive ? '#6B4FE8' : '#fff', color: isActive ? '#fff' : '#6B4FE8', opacity: loading ? 0.5 : 1 }}>
              {loading ? '…' : isActive ? 'Desactivar' : 'Activar'}
            </button>
          );
        })()}
        {isAlways && <span style={{ fontSize: 10.5, fontWeight: 600, background: '#e0f2fe', color: '#0369a1', borderRadius: 5, padding: '2px 8px', whiteSpace: 'nowrap' }}>Siempre activo</span>}
        {isSoon   && <span style={{ fontSize: 10.5, fontWeight: 600, background: '#fef3c7', color: '#92400e', borderRadius: 5, padding: '2px 8px', whiteSpace: 'nowrap' }}>Próximamente</span>}
      </div>

      <p style={{ fontSize: 12.5, color: '#6B7280', margin: '0 0 8px', lineHeight: 1.5 }}>{source.description}</p>

      {/* Active metadata — GA4 */}
      {source.id === 'ga4' && hasConfig && !configuring && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 8 }}>
          {source.config.propertyName && (
            <span style={{ fontSize: 12, color: '#444' }}>
              <span style={{ color: '#aaa' }}>Propiedad: </span>{source.config.propertyName}
              {source.config.accountName && <span style={{ color: '#aaa' }}> · {source.config.accountName}</span>}
            </span>
          )}
          <span style={{ fontSize: 12, color: '#aaa' }}>
            Property ID: {source.config.propertyId}
            {source.config.lastValidatedAt && <span> · Validado {relativeTime(source.config.lastValidatedAt)}</span>}
          </span>
          {source.config.permissionStatus === 'access_error' && source.config.lastError && (
            <span style={{ fontSize: 11.5, color: '#EF4444', marginTop: 2 }}>⚠ {source.config.lastError}</span>
          )}
        </div>
      )}

      {/* Active metadata — Google Ads */}
      {source.id === 'google_ads' && hasConfig && !configuring && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 8 }}>
          {source.config.customerName && (
            <span style={{ fontSize: 12, color: '#444' }}>
              <span style={{ color: '#aaa' }}>Cuenta: </span>{source.config.customerName}
            </span>
          )}
          <span style={{ fontSize: 12, color: '#aaa' }}>
            Customer ID: {source.config.customerId}
            {source.config.lastValidatedAt && <span> · Validado {relativeTime(source.config.lastValidatedAt)}</span>}
          </span>
          {source.config.permissionStatus === 'access_error' && source.config.lastError && (
            <span style={{ fontSize: 11.5, color: '#EF4444', marginTop: 2 }}>⚠ {source.config.lastError}</span>
          )}
        </div>
      )}

      {/* Active metadata — Search Console */}
      {source.id === 'search_console' && hasConfig && !configuring && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: '#444', fontFamily: 'monospace' }}>{source.config.siteUrl}</span>
          {source.config.lastValidatedAt && (
            <span style={{ fontSize: 12, color: '#aaa' }}>Validado {relativeTime(source.config.lastValidatedAt)}</span>
          )}
          {source.config.permissionStatus === 'access_error' && source.config.lastError && (
            <span style={{ fontSize: 11.5, color: '#EF4444', marginTop: 2 }}>⚠ {source.config.lastError}</span>
          )}
        </div>
      )}

      {/* Capabilities */}
      {source.capabilities?.length > 0 && !configuring && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {source.capabilities.map((c, i) => (
            <span key={i} style={{ fontSize: 11, borderRadius: 4, padding: '2px 7px', background: isActive ? '#ede9fe' : '#f5f5f3', color: isActive ? '#4B2FBE' : '#555' }}>{c}</span>
          ))}
        </div>
      )}

      {/* Validation form (shared: GA4, Search Console, future connectors) */}
      {needsValidation && configuring && (
        <div style={{ marginTop: 12, padding: '16px', background: '#f9f8ff', border: '0.5px solid #e0d8ff', borderRadius: 8 }}>
          {saEmail && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: '#555', marginBottom: 6 }}>
                1. Agrega este email como {SA_PERMISSION[source.id] ?? 'usuario'} de esta propiedad
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '0.5px solid #e0d8ff', borderRadius: 6, padding: '8px 10px' }}>
                <span style={{ fontSize: 12, color: '#4B2FBE', fontFamily: 'monospace', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{saEmail}</span>
                <CopyButton text={saEmail} />
              </div>
            </div>
          )}
          {(source.fields ?? []).map((f, idx) => (
            <div key={f.key} style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#555', marginBottom: 5 }}>
                {saEmail ? `${idx + 2}. ` : ''}{f.label}
              </label>
              <input
                type={f.type ?? 'text'}
                value={fieldValues[f.key] ?? ''}
                placeholder={f.placeholder}
                onChange={(e) => setFieldValues((p) => ({ ...p, [f.key]: e.target.value }))}
                style={{ width: '100%', boxSizing: 'border-box', padding: '7px 10px', borderRadius: 6, fontSize: 13, border: '0.5px solid #c4b5fd', outline: 'none', fontFamily: 'inherit', color: '#111', background: '#fff' }}
              />
            </div>
          ))}
          {validationError && (
            <div style={{ fontSize: 12, color: '#EF4444', background: '#FEF2F2', border: '0.5px solid #FECACA', borderRadius: 6, padding: '8px 10px', marginBottom: 12 }}>
              ⚠ {validationError}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => { setConfiguring(false); setValidationError(null); }} style={{ fontSize: 12, padding: '5px 14px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', border: '0.5px solid #ddd', background: '#fff', color: '#888' }}>Cancelar</button>
            <button onClick={handleValidate} disabled={validating || !canSubmit} style={{ fontSize: 12, fontWeight: 600, padding: '5px 16px', borderRadius: 6, cursor: validating || !canSubmit ? 'not-allowed' : 'pointer', fontFamily: 'inherit', background: '#6B4FE8', color: '#fff', border: 'none', opacity: validating || !canSubmit ? 0.6 : 1 }}>
              {validating ? 'Validando…' : validationError ? 'Reintentar' : 'Guardar y validar'}
            </button>
          </div>
        </div>
      )}

      {/* Edit config link */}
      {!configuring && hasConfig && (needsValidation || source.fields?.length > 0) && (
        <div style={{ marginTop: 8, textAlign: 'right' }}>
          <button onClick={() => { setConfiguring(true); setValidationError(null); }} style={{ fontSize: 11, color: '#bbb', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>Editar configuración</button>
        </div>
      )}
    </div>
  );
}

function IntelligenceSourcesTab({ slug }) {
  const [sources, setSources] = useState(null);
  const [saving,  setSaving]  = useState({});
  const [saEmail, setSaEmail] = useState(null);

  useEffect(() => {
    fetch(`/api/kai/${slug}/intelligence-sources`)
      .then((r) => r.json())
      .then((d) => { setSources(d.sources ?? []); setSaEmail(d.saEmail ?? null); })
      .catch(() => setSources([]));
  }, [slug]);

  const patch = async (sourceId, body, optimistic) => {
    setSaving((p) => ({ ...p, [sourceId]: true }));
    try {
      await fetch(`/api/kai/${slug}/intelligence-sources`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, ...body }),
      });
      setSources((prev) => prev.map((s) => s.id === sourceId ? { ...s, ...optimistic } : s));
    } catch { /* ignore */ }
    finally { setSaving((p) => ({ ...p, [sourceId]: false })); }
  };

  const toggle = (sourceId, currentStatus) =>
    patch(sourceId, { enabled: currentStatus !== 'active' }, { status: currentStatus !== 'active' ? 'active' : 'inactive' });

  const saveConfig = (sourceId, config) =>
    patch(sourceId, { enabled: true, config }, { status: 'active', config });

  const validateGA4 = async (_sourceId, { propertyId }) => {
    setSaving((p) => ({ ...p, ga4: true }));
    try {
      const res = await fetch(`/api/kai/${slug}/intelligence-sources/ga4/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId }),
      });
      const data = await res.json();
      if (data.ok) {
        setSources((prev) => prev.map((s) => s.id === 'ga4' ? {
          ...s, status: 'active',
          config: {
            ...s.config,
            propertyId: data.propertyId,
            propertyName: data.propertyName,
            accountName: data.accountName,
            permissionStatus: 'validated',
            lastValidatedAt: data.lastValidatedAt,
            lastError: null,
          },
        } : s));
        return { ok: true };
      }
      return { ok: false, error: data.error };
    } catch {
      return { ok: false, error: 'Error de conexión. Intenta de nuevo.' };
    } finally {
      setSaving((p) => ({ ...p, ga4: false }));
    }
  };

  const validateGoogleAds = async (_sourceId, { customerId }) => {
    setSaving((p) => ({ ...p, google_ads: true }));
    try {
      const res = await fetch(`/api/kai/${slug}/intelligence-sources/google-ads/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId }),
      });
      const data = await res.json();
      if (data.ok) {
        setSources((prev) => prev.map((s) => s.id === 'google_ads' ? {
          ...s, status: 'active',
          config: {
            ...s.config,
            customerId: data.customerId,
            customerName: data.customerName,
            permissionStatus: 'validated',
            lastValidatedAt: data.lastValidatedAt,
            lastError: null,
          },
        } : s));
        return { ok: true };
      }
      return { ok: false, error: data.error };
    } catch {
      return { ok: false, error: 'Error de conexión. Intenta de nuevo.' };
    } finally {
      setSaving((p) => ({ ...p, google_ads: false }));
    }
  };

  const validateSearchConsole = async (_sourceId, { siteUrl }) => {
    setSaving((p) => ({ ...p, search_console: true }));
    try {
      const res = await fetch(`/api/kai/${slug}/intelligence-sources/search-console/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteUrl }),
      });
      const data = await res.json();
      if (data.ok) {
        setSources((prev) => prev.map((s) => s.id === 'search_console' ? {
          ...s, status: 'active',
          config: {
            ...s.config,
            siteUrl: data.siteUrl,
            permissionStatus: 'validated',
            lastValidatedAt: data.lastValidatedAt,
            lastError: null,
          },
        } : s));
        return { ok: true };
      }
      return { ok: false, error: data.error };
    } catch {
      return { ok: false, error: 'Error de conexión. Intenta de nuevo.' };
    } finally {
      setSaving((p) => ({ ...p, search_console: false }));
    }
  };

  if (!sources) {
    return <div style={{ fontSize: 13, color: '#bbb', padding: '32px 0' }}>Cargando…</div>;
  }

  const always      = sources.filter((s) => s.alwaysActive);
  const configurable = sources.filter((s) => !s.alwaysActive && !s.comingSoon);
  const soon        = sources.filter((s) => s.comingSoon);
  const activeCount = sources.filter((s) => s.status === 'active').length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#111', letterSpacing: '-0.02em', marginBottom: 3 }}>
            Intelligence Sources
          </div>
          <div style={{ fontSize: 12.5, color: '#aaa' }}>
            ¿Con qué evidencia está razonando Aria hoy?
          </div>
        </div>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          background: '#f5f2ff', border: '0.5px solid #e0d8ff',
          borderRadius: 10, padding: '10px 20px', minWidth: 76,
        }}>
          <span style={{ fontSize: 26, fontWeight: 700, color: '#6B4FE8', lineHeight: 1 }}>{activeCount}</span>
          <span style={{ fontSize: 10.5, color: '#aaa', marginTop: 2 }}>fuentes activas</span>
        </div>
      </div>

      {/* Group: Siempre disponibles */}
      <div style={{ marginBottom: 28 }}>
        <SectionLabel>Siempre disponibles</SectionLabel>
        <div style={{ fontSize: 12, color: '#bbb', marginBottom: 10 }}>
          No requieren configuración. Aria las usa en todos los análisis.
        </div>
        {always.map((s) => <SourceCard key={s.id} source={s} />)}
      </div>

      {/* Group: Conectores */}
      <div style={{ marginBottom: 28 }}>
        <SectionLabel>Conectores</SectionLabel>
        <div style={{ fontSize: 12, color: '#bbb', marginBottom: 10 }}>
          Fuentes de datos externas. Actívalas para ampliar la evidencia disponible.
        </div>
        {configurable.map((s) => (
          <SourceCard
            key={s.id}
            source={s}
            onToggle={() => toggle(s.id, s.status)}
            onSaveConfig={(sourceId, config) => saveConfig(sourceId, config)}
            onValidate={s.id === 'ga4' ? validateGA4 : s.id === 'search_console' ? validateSearchConsole : s.id === 'google_ads' ? validateGoogleAds : undefined}
            saEmail={s.id === 'ga4' || s.id === 'search_console' ? saEmail : undefined}
            loading={!!saving[s.id]}
          />
        ))}
      </div>

      {/* Group: Bases de datos */}
      <div style={{ marginBottom: 28 }}>
        <DatabasesSection slug={slug} />
      </div>

      {/* Group: Próximamente */}
      <div>
        <SectionLabel>Próximamente</SectionLabel>
        <div style={{ fontSize: 12, color: '#bbb', marginBottom: 10 }}>
          Conectores en desarrollo. Estarán disponibles en futuras versiones.
        </div>
        {soon.map((s) => <SourceCard key={s.id} source={s} />)}
      </div>
    </div>
  );
}

// ── Databases Section ─────────────────────────────────────────────────────

const DB_TYPES = [
  { value: 'postgres',  label: 'PostgreSQL' },
  { value: 'mysql',     label: 'MySQL' },
  { value: 'mariadb',   label: 'MariaDB' },
  { value: 'redis',     label: 'Redis' },
  { value: 'bigquery',  label: 'BigQuery' },
];

const DB_PLACEHOLDERS = {
  postgres: 'postgresql://user:pass@host:5432/db',
  mysql:    'mysql://user:pass@host:3306/db',
  mariadb:  'mysql://user:pass@host:3306/db',
  redis:    'redis://:password@host:6379',
  bigquery: '{ "type": "service_account", "project_id": "...", "private_key": "...", ... }',
};

function DatabasesSection({ slug }) {
  const [sources,    setSources]    = useState(null);
  const [adding,     setAdding]     = useState(false);
  const [form,       setForm]       = useState({ type: 'postgres', label: '', connectionString: '' });
  const [testing,    setTesting]    = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [busy,       setBusy]       = useState({});

  useEffect(() => {
    fetch(`/api/aria/${slug}/databases`)
      .then((r) => r.json())
      .then((d) => setSources(d.sources ?? []))
      .catch(() => setSources([]));
  }, [slug]);

  const apiPost = async (body) => {
    const r = await fetch(`/api/aria/${slug}/databases`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return r.json();
  };

  const handleTest = async () => {
    setTesting(true); setTestResult(null);
    const d = await apiPost({ action: 'test', source: form });
    setTesting(false);
    setTestResult(d);
  };

  const handleAdd = async () => {
    setSaving(true);
    const d = await apiPost({ action: 'add', source: form });
    setSaving(false);
    if (d.ok) {
      setSources((p) => [...(p ?? []), d.source]);
      setAdding(false); setForm({ type: 'postgres', label: '', connectionString: '' }); setTestResult(null);
    }
  };

  const handleToggle = async (id) => {
    setBusy((p) => ({ ...p, [id]: true }));
    await apiPost({ action: 'toggle', source: { id } });
    setSources((p) => p.map((s) => s.id === id ? { ...s, status: s.status === 'active' ? 'inactive' : 'active' } : s));
    setBusy((p) => ({ ...p, [id]: false }));
  };

  const handleRefresh = async (id) => {
    setBusy((p) => ({ ...p, [id]: true }));
    const d = await apiPost({ action: 'refresh', source: { id } });
    if (d.ok) setSources((p) => p.map((s) => s.id === id ? d.source : s));
    setBusy((p) => ({ ...p, [id]: false }));
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta conexión?')) return;
    setBusy((p) => ({ ...p, [id]: true }));
    await apiPost({ action: 'delete', source: { id } });
    setSources((p) => p.filter((s) => s.id !== id));
  };

  const inputStyle = {
    width: '100%', fontSize: 12.5, padding: '7px 10px', borderRadius: 6,
    border: '0.5px solid #ddd', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  };
  const selectStyle = { ...inputStyle, background: '#fff', cursor: 'pointer' };
  const statusDot = (s) => ({ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: s === 'active' ? '#10B981' : s === 'error' ? '#EF4444' : '#D1D5DB' });

  if (!sources) return <div style={{ fontSize: 12, color: '#ccc', padding: '16px 0' }}>Cargando…</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <SectionLabel>Bases de datos</SectionLabel>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            style={{ fontSize: 11.5, fontWeight: 600, padding: '4px 13px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', border: '0.5px solid #6B4FE8', background: '#fff', color: '#6B4FE8' }}
          >
            + Conectar BD
          </button>
        )}
      </div>

      {/* Form */}
      {adding && (
        <div style={{ background: '#faf8ff', border: '0.5px solid #c4b5fd', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: '#111' }}>Nueva conexión</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value, connectionString: '' }))} style={{ ...selectStyle, flex: '0 0 140px' }}>
                {DB_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <input
                placeholder="Nombre de referencia (ej: CRM Producción)"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                style={{ ...inputStyle, flex: 1 }}
              />
            </div>
            {form.type === 'bigquery' ? (
              <textarea
                placeholder={DB_PLACEHOLDERS[form.type]}
                value={form.connectionString}
                onChange={(e) => setForm((f) => ({ ...f, connectionString: e.target.value }))}
                style={{ ...inputStyle, height: 120, resize: 'vertical', fontFamily: 'monospace', fontSize: 11.5 }}
                autoComplete="off"
                spellCheck={false}
              />
            ) : (
              <input
                placeholder={DB_PLACEHOLDERS[form.type]}
                value={form.connectionString}
                onChange={(e) => setForm((f) => ({ ...f, connectionString: e.target.value }))}
                style={inputStyle}
                type="password"
                autoComplete="off"
              />
            )}
            {testResult && (
              <div style={{ fontSize: 12, padding: '6px 10px', borderRadius: 6, background: testResult.ok ? '#f0fdf4' : '#fef2f2', color: testResult.ok ? '#166534' : '#991b1b', border: `0.5px solid ${testResult.ok ? '#bbf7d0' : '#fecaca'}` }}>
                {testResult.ok ? `✓ ${testResult.message}` : `✗ ${testResult.error}`}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 2 }}>
              <button onClick={() => { setAdding(false); setTestResult(null); }} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', border: '0.5px solid #ddd', background: '#fff', color: '#888' }}>Cancelar</button>
              <button onClick={handleTest} disabled={testing || !form.connectionString} style={{ fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 6, cursor: testing ? 'not-allowed' : 'pointer', fontFamily: 'inherit', border: '0.5px solid #9ca3af', background: '#fff', color: '#374151', opacity: testing ? 0.6 : 1 }}>{testing ? 'Probando…' : 'Probar'}</button>
              <button onClick={handleAdd} disabled={saving || !form.connectionString || !form.label} style={{ fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', border: 'none', background: '#6B4FE8', color: '#fff', opacity: saving || !form.connectionString || !form.label ? 0.5 : 1 }}>{saving ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {sources.length === 0 && !adding && (
        <div style={{ fontSize: 12.5, color: '#bbb', padding: '12px 0' }}>Sin bases de datos conectadas.</div>
      )}
      {sources.map((s) => {
        const tableCount = s.schema?.tables?.length ?? 0;
        const meta = s.type === 'redis'
          ? `${s.schema?.redisInfo?.totalKeys ?? '?'} keys`
          : s.type === 'bigquery'
            ? `${tableCount} tabla${tableCount !== 1 ? 's' : ''} en ${new Set((s.schema?.tables ?? []).map((t) => t.name.split('.')[0])).size} dataset${new Set((s.schema?.tables ?? []).map((t) => t.name.split('.')[0])).size !== 1 ? 's' : ''}`
            : `${tableCount} tabla${tableCount !== 1 ? 's' : ''}`;
        return (
          <div key={s.id} style={{ background: s.status === 'active' ? '#faf8ff' : '#fff', border: `0.5px solid ${s.status === 'active' ? '#c4b5fd' : '#e0e0dc'}`, borderRadius: 10, padding: '12px 16px', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={statusDot(s.status)} />
              <span style={{ fontSize: 13.5, fontWeight: 600, color: '#111', flex: 1 }}>{s.label}</span>
              <span style={{ fontSize: 10.5, color: '#aaa', background: '#f5f5f3', borderRadius: 4, padding: '1px 6px' }}>{DB_TYPES.find((t) => t.value === s.type)?.label ?? s.type}</span>
              {s.schema && <span style={{ fontSize: 10.5, color: '#9ca3af' }}>{meta}</span>}
              <button onClick={() => handleRefresh(s.id)} disabled={!!busy[s.id]} title="Actualizar schema" style={{ fontSize: 11, color: '#6B4FE8', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', opacity: busy[s.id] ? 0.4 : 1 }}>{busy[s.id] ? '…' : '↺'}</button>
              <button onClick={() => handleToggle(s.id)} disabled={!!busy[s.id]} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit', border: s.status === 'active' ? 'none' : '0.5px solid #6B4FE8', background: s.status === 'active' ? '#6B4FE8' : '#fff', color: s.status === 'active' ? '#fff' : '#6B4FE8', opacity: busy[s.id] ? 0.5 : 1 }}>{s.status === 'active' ? 'Desactivar' : 'Activar'}</button>
              <button onClick={() => handleDelete(s.id)} disabled={!!busy[s.id]} title="Eliminar" style={{ fontSize: 12, color: '#d1d5db', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}>✕</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

const TABS = ['Context', 'Analysis', 'Intelligence Sources', 'Insights', 'Recommendations'];

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
        {activeTab === 2 && <IntelligenceSourcesTab slug={meta.slug} />}
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
