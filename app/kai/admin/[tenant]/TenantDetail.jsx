'use client';

import { useState, useEffect } from 'react';
import { calcAreaScore, calcOverallScore } from '@/lib/kai/scoring';

// ── Utilities ──────────────────────────────────────────────────────────────

function initials(name = '') {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

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
  return new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}



function exportProfile(meta, profile, conversations) {
  const data = {
    exportedAt: new Date().toISOString(),
    client: meta,
    profile,
    conversationCount: conversations.length,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kai-profile-${meta.slug}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Shared primitives ──────────────────────────────────────────────────────

function Tag({ label, type = 'default' }) {
  const styles = {
    pain:    { background: '#FAECE7', color: '#712B13' },
    risk:    { background: '#FAEEDA', color: '#633806' },
    opp:     { background: '#E1F5EE', color: '#085041' },
    default: { background: '#f0f0ed', color: '#555' },
  };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 20,
      fontSize: 11.5, fontWeight: 500, lineHeight: 1.5,
      ...styles[type],
    }}>
      {label}
    </span>
  );
}

function EmptyText({ text = 'Sin definir' }) {
  return <span style={{ fontSize: 12, color: '#ccc', fontStyle: 'italic' }}>{text}</span>;
}

function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 600, color: '#bbb',
      textTransform: 'uppercase', letterSpacing: '0.08em',
      marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

// ── Active Priorities ─────────────────────────────────────────────────────

function ActivePrioritiesEditor({ slug }) {
  const [priorities, setPriorities] = useState([]);
  const [input, setInput]           = useState('');
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    fetch(`/api/kai/${slug}/active-priorities`)
      .then(r => r.json())
      .then(d => setPriorities(d.priorities ?? []))
      .catch(() => {});
  }, [slug]);

  const save = async (next) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/kai/${slug}/active-priorities`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priorities: next }),
      });
      const data = await res.json();
      setPriorities(data.priorities ?? next);
    } catch {}
    setSaving(false);
  };

  const add = () => {
    const trimmed = input.trim();
    if (!trimmed || priorities.includes(trimmed)) return;
    const next = [...priorities, trimmed];
    setInput('');
    save(next);
  };

  const remove = (i) => {
    const next = priorities.filter((_, idx) => idx !== i);
    save(next);
  };

  const handleKey = (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } };

  return (
    <div style={{ background: '#fff', border: '0.5px solid #e0e0dc', borderRadius: 12, padding: '18px 22px', marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
        Prioridades activas — lo que importa esta semana
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: priorities.length ? 12 : 0 }}>
        {priorities.map((p, i) => (
          <span key={i} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#F0FDF4', border: '0.5px solid #86EFAC',
            borderRadius: 20, padding: '4px 12px',
            fontSize: 12.5, fontWeight: 500, color: '#15803D',
          }}>
            {p}
            <button
              onClick={() => remove(i)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#86EFAC', padding: 0, lineHeight: 1, fontSize: 14 }}
            >×</button>
          </span>
        ))}
        {priorities.length === 0 && (
          <span style={{ fontSize: 12, color: '#bbb', fontStyle: 'italic' }}>Sin prioridades definidas</span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input
          style={{ flex: 1, padding: '7px 12px', border: '0.5px solid #ddd', borderRadius: 8, fontSize: 12.5, fontFamily: 'inherit', outline: 'none' }}
          placeholder="Nueva prioridad…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
        />
        <button
          onClick={add}
          disabled={!input.trim() || saving}
          style={{
            padding: '7px 16px', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
            background: '#20C997', color: '#fff', border: 'none',
            cursor: !input.trim() || saving ? 'not-allowed' : 'pointer',
            opacity: !input.trim() || saving ? 0.5 : 1, fontFamily: 'inherit',
          }}
        >
          + Agregar
        </button>
      </div>
    </div>
  );
}

// ── Highlight Cards ────────────────────────────────────────────────────────

const PROFILE_SECTIONS_V2 = [
  {
    label: 'General',
    items: [
      { fn: (p) => p?.general?.model,           missing: 'modelo de negocio' },
      { fn: (p) => p?.general?.size,            missing: 'tamaño de empresa' },
      { fn: (p) => p?.general?.digitalMaturity, missing: 'madurez digital' },
    ],
  },
  {
    label: 'Objetivos',
    items: [
      { fn: (p) => p?.objectives?.shortTerm?.length,  missing: 'objetivos de corto plazo' },
      { fn: (p) => p?.objectives?.mediumTerm?.length, missing: 'objetivos de mediano plazo' },
      { fn: (p) => p?.objectives?.longTerm?.length,   missing: 'objetivos de largo plazo' },
    ],
  },
  { label: 'Procesos',     items: [{ fn: (p) => p?.processes?.length,    missing: 'procesos documentados' }, { fn: (p) => p?.initiatives?.length, missing: 'iniciativas registradas' }] },
  { label: 'Riesgos',      items: [{ fn: (p) => p?.risks?.length,        missing: 'riesgos identificados' }] },
  { label: 'Oportunidades',items: [{ fn: (p) => p?.opportunities?.length, missing: 'oportunidades identificadas' }] },
  { label: 'Tecnología',   items: [{ fn: (p) => p?.technology?.length,   missing: 'stack tecnológica' }] },
  { label: 'KPIs',         items: [{ fn: (p) => p?.kpis?.length,         missing: 'indicadores clave' }] },
  { label: 'Stakeholders', items: [{ fn: (p) => p?.stakeholders?.length, missing: 'personas mapeadas' }] },
];

function KnowledgeQualityCard({ profile, knowledgeQuality }) {
  const { score, participantCount, areasCovered, uniqueLearnings, confidenceLabel, confidenceColor } = knowledgeQuality ?? {};

  const missingSections = PROFILE_SECTIONS_V2
    .map((s) => {
      const missingItems = s.items.filter((it) => !it.fn(profile)).map((it) => it.missing);
      const totalItems   = s.items.length;
      const filledItems  = totalItems - missingItems.length;
      if (missingItems.length === 0) return null;
      const msg = filledItems > 0
        ? `Información parcial — falta: ${missingItems.join(', ')}`
        : missingItems.length === 1
          ? `No se han registrado ${missingItems[0]}`
          : `Faltan: ${missingItems.join(', ')}`;
      return { label: s.label, msg, partial: filledItems > 0 };
    })
    .filter(Boolean);

  return (
    <div className="admin-hl-card">
      <div className="admin-hl-card-accent" />
      <div className="admin-hl-card-body">
        <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4, fontWeight: 500 }}>Conocimiento validado</div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: score >= 70 ? '#1D9E75' : score >= 40 ? '#F59E0B' : '#EF4444', letterSpacing: '-0.04em', lineHeight: 1 }}>
            {score ?? 0}%
          </div>
          <div style={{ fontSize: 11, color: '#aaa' }}>del perfil construido</div>
        </div>

        <div className="admin-progress-bar" style={{ marginTop: 8 }}>
          <div className="admin-progress-fill" style={{ width: `${score ?? 0}%`, background: score >= 70 ? '#1D9E75' : score >= 40 ? '#F59E0B' : '#EF4444' }} />
        </div>

        <div className="admin-kq-meta">
          {participantCount > 0 && (
            <span className="admin-kq-chip">{participantCount} participante{participantCount !== 1 ? 's' : ''}</span>
          )}
          {areasCovered > 0 && (
            <span className="admin-kq-chip">{areasCovered}/6 áreas</span>
          )}
          {uniqueLearnings > 0 && (
            <span className="admin-kq-chip">{uniqueLearnings} aprendizajes</span>
          )}
          {confidenceLabel && (
            <span className="admin-kq-chip" style={{ color: confidenceColor, borderColor: confidenceColor + '44' }}>
              confianza {confidenceLabel}
            </span>
          )}
        </div>

        {missingSections.length > 0 && (
          <div className="admin-missing-sections">
            {missingSections.slice(0, 4).map((s) => (
              <div key={s.label} className="admin-missing-section-row">
                <span className="admin-missing-section-label">{s.label}</span>
                <span className={`admin-missing-section-msg${s.partial ? ' partial' : ''}`}>{s.msg}</span>
              </div>
            ))}
            {missingSections.length > 4 && (
              <div style={{ fontSize: 10.5, color: '#bbb', marginTop: 2 }}>+{missingSections.length - 4} secciones más</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ActividadRecienteCard({ recentSession }) {
  if (!recentSession) {
    return (
      <div className="admin-hl-card">
        <div className="admin-hl-card-accent" style={{ background: '#1D9E75' }} />
        <div className="admin-hl-card-body">
          <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4, fontWeight: 500 }}>Actividad reciente</div>
          <EmptyText text="Sin actividad registrada aún" />
        </div>
      </div>
    );
  }

  const {
    date, participant, area, learningCount, riskCount, oppCount,
    latestDiscovery, scoreBefore, scoreAfter, scoreDelta,
  } = recentSession;

  return (
    <div className="admin-hl-card">
      <div className="admin-hl-card-accent" style={{ background: '#1D9E75' }} />
      <div className="admin-hl-card-body">
        <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6, fontWeight: 500 }}>Actividad reciente</div>

        <div style={{ fontSize: 17, fontWeight: 700, color: '#111', letterSpacing: '-0.02em' }}>
          {relativeTime(date)}
        </div>
        {participant && (
          <div style={{ fontSize: 12, color: '#555', marginTop: 3, fontWeight: 500 }}>{participant}</div>
        )}

        <div className="admin-recent-meta-grid">
          {area && (
            <div className="admin-recent-meta-row">
              <span className="admin-recent-meta-label">Área explorada</span>
              <span className="admin-recent-meta-val">{area.charAt(0).toUpperCase() + area.slice(1)}</span>
            </div>
          )}
          {scoreDelta !== 0 && (
            <div className="admin-recent-meta-row">
              <span className="admin-recent-meta-label">Cambio en cobertura</span>
              <span className="admin-recent-meta-val" style={{ color: scoreDelta > 0 ? '#1D9E75' : '#EF4444' }}>
                {scoreBefore}% → {scoreAfter}% ({scoreDelta > 0 ? '+' : ''}{scoreDelta}%)
              </span>
            </div>
          )}
        </div>

        <div className="admin-recent-counts">
          {learningCount > 0 && (
            <span className="admin-count-chip admin-count-chip--learning">+{learningCount} aprendizaje{learningCount !== 1 ? 's' : ''}</span>
          )}
          {riskCount > 0 && (
            <span className="admin-count-chip admin-count-chip--risk">+{riskCount} riesgo{riskCount !== 1 ? 's' : ''}</span>
          )}
          {oppCount > 0 && (
            <span className="admin-count-chip admin-count-chip--opp">+{oppCount} oportunidad{oppCount !== 1 ? 'es' : ''}</span>
          )}
        </div>

        {latestDiscovery && (
          <div className="admin-recent-discovery">
            <span className="admin-recent-discovery-label">Último descubrimiento</span>
            <p className="admin-recent-discovery-text">
              "{latestDiscovery.length > 120 ? latestDiscovery.slice(0, 117) + '…' : latestDiscovery}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function CambiosRecientesCard({ changeCounts }) {
  const { todayLearnings, weekLearnings, totalRisks, totalOpps } = changeCounts;
  const hasActivity = weekLearnings > 0 || totalRisks > 0 || totalOpps > 0;

  return (
    <div className="admin-hl-card">
      <div className="admin-hl-card-accent" style={{ background: '#6B4FE8' }} />
      <div className="admin-hl-card-body">
        <div style={{ fontSize: 11, color: '#aaa', marginBottom: 12, fontWeight: 500 }}>Cambios recientes</div>

        {!hasActivity ? (
          <EmptyText text="Sin actividad registrada" />
        ) : (
          <>
            {todayLearnings > 0 && (
              <div className="admin-changes-period">
                <div className="admin-changes-period-label">Hoy</div>
                <div className="admin-changes-chips">
                  <span className="admin-count-chip admin-count-chip--learning">+{todayLearnings} aprendizaje{todayLearnings !== 1 ? 's' : ''}</span>
                </div>
              </div>
            )}

            <div className="admin-changes-period">
              <div className="admin-changes-period-label">Últimos 7 días</div>
              <div className="admin-changes-chips">
                {weekLearnings > 0 && (
                  <span className="admin-count-chip admin-count-chip--learning">+{weekLearnings} aprendizaje{weekLearnings !== 1 ? 's' : ''}</span>
                )}
                {totalRisks > 0 && (
                  <span className="admin-count-chip admin-count-chip--risk">{totalRisks} riesgo{totalRisks !== 1 ? 's' : ''} total</span>
                )}
                {totalOpps > 0 && (
                  <span className="admin-count-chip admin-count-chip--opp">{totalOpps} oportunidad{totalOpps !== 1 ? 'es' : ''} total</span>
                )}
                {weekLearnings === 0 && totalRisks === 0 && totalOpps === 0 && (
                  <EmptyText text="Sin cambios esta semana" />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Recent Discoveries Section ─────────────────────────────────────────────

const AREA_ICONS_MAP = {
  negocio: '🏢', operaciones: '⚙️', tecnología: '💻', tecnologia: '💻',
  finanzas: '💰', marketing: '📈', personas: '👥',
};

const IMPACT_COLORS = {
  alto:  { bg: '#FEE2E2', color: '#991B1B' },
  medio: { bg: '#FEF3C7', color: '#92400E' },
  bajo:  { bg: '#F0F9F6', color: '#065F46' },
};

function LearningSource({ learning, participantMap }) {
  const entry = participantMap?.[learning.conversationId];
  const name  = entry?.name;
  const role  = entry?.role;
  const date  = learning.createdAt
    ? new Date(learning.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
    : null;

  if (!name && !date) return null;

  return (
    <div className="admin-learning-source">
      <span className="admin-learning-source-icon">◎</span>
      {name ? (
        <span>
          <strong>{name}</strong>
          {role && <span className="admin-learning-source-role"> ({role})</span>}
          {date && <span className="admin-learning-source-sep"> · </span>}
        </span>
      ) : (
        <span>Conversación{date && <span className="admin-learning-source-sep"> · </span>}</span>
      )}
      {date && <span>{date}</span>}
    </div>
  );
}

function RecentDiscoveriesSection({ recentLearnings, participantMap }) {
  if (!recentLearnings?.length) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
        Qué aprendió Kai recientemente
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {recentLearnings.map((l, i) => {
          const icon        = AREA_ICONS_MAP[l.area?.toLowerCase()?.trim()] ?? '💡';
          const impactStyle = IMPACT_COLORS[l.impact] ?? IMPACT_COLORS.medio;
          return (
            <div key={l.id ?? i} style={{
              background: '#fff', border: '0.5px solid #e8e8e4',
              borderRadius: 10, padding: '12px 16px',
              display: 'flex', alignItems: 'flex-start', gap: 12,
            }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 2 }}>{icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12.5, color: '#1a1a1a', lineHeight: 1.5, margin: '0 0 6px' }}>
                  {l.content}
                </p>
                <LearningSource learning={l} participantMap={participantMap} />
              </div>
              {l.impact && (
                <span style={{ padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 600, flexShrink: 0, ...impactStyle }}>
                  {l.impact.toUpperCase()}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Diagnosis Block ────────────────────────────────────────────────────────

const CONF_STYLE = {
  alta:  { background: '#E1F5EE', color: '#085041', label: 'Confianza alta' },
  media: { background: '#FEF3C7', color: '#92400E', label: 'Confianza media' },
  baja:  { background: '#FEF0EE', color: '#7B1A0A', label: 'Confianza baja' },
};

function DiagnosisBlock({ slug }) {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [generating, setGen]    = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    fetch(`/api/kai/${slug}/diagnosis`)
      .then((r) => r.json())
      .then((d) => { if (d.diagnosis) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  const generate = async () => {
    setGen(true); setError('');
    try {
      const res  = await fetch(`/api/kai/${slug}/diagnosis`, { method: 'POST' });
      const body = await res.json();
      if (!res.ok) { setError(body.error ?? 'Error generando diagnóstico.'); return; }
      setData(body);
    } catch { setError('Error de red.'); }
    finally { setGen(false); }
  };

  if (loading) return null;

  const diag = data?.diagnosis;
  const confStyle = CONF_STYLE[diag?.confianza] ?? CONF_STYLE.media;

  return (
    <div className="admin-diagnosis-block">
      <div className="admin-diagnosis-header">
        <span className="admin-diagnosis-title">Diagnóstico actual de Kai</span>
        {diag && (
          <span className="admin-diagnosis-conf" style={{ background: confStyle.background, color: confStyle.color }}>
            {confStyle.label}
          </span>
        )}
        <button
          className="admin-btn admin-btn--ghost"
          style={{ marginLeft: 'auto', fontSize: 11 }}
          onClick={generate}
          disabled={generating}
        >
          {generating ? 'Generando…' : diag ? 'Regenerar' : 'Generar diagnóstico'}
        </button>
      </div>

      {error && <div style={{ fontSize: 11.5, color: '#c0392b', marginTop: 6 }}>{error}</div>}

      {generating && (
        <div style={{ padding: '20px 0', fontSize: 12.5, color: '#aaa', textAlign: 'center' }}>
          Kai está analizando el perfil…
        </div>
      )}

      {!diag && !generating && !error && (
        <div style={{ padding: '14px 0', fontSize: 12.5, color: '#bbb' }}>
          Genera un diagnóstico para obtener el análisis principal de Kai sobre este cliente.
        </div>
      )}

      {diag && !generating && (
        <div className="admin-diagnosis-body">
          <div className="admin-diagnosis-row">
            <div className="admin-diagnosis-row-label admin-diagnosis-problem">⚠ Problema principal</div>
            <p className="admin-diagnosis-row-text">{diag.problema_principal}</p>
            {diag.impacto && (
              <p className="admin-diagnosis-impact">{diag.impacto}</p>
            )}
          </div>

          <div className="admin-diagnosis-row">
            <div className="admin-diagnosis-row-label admin-diagnosis-opp">→ Oportunidad principal</div>
            <p className="admin-diagnosis-row-text">{diag.oportunidad_principal}</p>
          </div>

          {diag.evidencias?.length > 0 && (
            <div className="admin-diagnosis-evidence">
              <div className="admin-diagnosis-evidence-label">Evidencias</div>
              {diag.evidencias.map((e, i) => (
                <div key={i} className="admin-diagnosis-evidence-item">
                  <span className="admin-diagnosis-evidence-dot">·</span>
                  {e}
                </div>
              ))}
            </div>
          )}

          {data.generatedAt && (
            <div style={{ fontSize: 10.5, color: '#ccc', marginTop: 10 }}>
              Basado en {data.learningCount} aprendizajes · {relativeTime(data.generatedAt)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Detail Grid ────────────────────────────────────────────────────────────

function DetailCard({ title, children }) {
  return (
    <div className="admin-detail-card">
      <SectionTitle>{title}</SectionTitle>
      {children}
    </div>
  );
}

function ObjectiveRow({ label, value }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10.5, color: '#bbb', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>{label}</div>
      {value?.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {(Array.isArray(value) ? value : [value]).map((v, i) => <Tag key={i} label={v} type="default" />)}
        </div>
      ) : <EmptyText />}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 7, alignItems: 'baseline' }}>
      <span style={{ fontSize: 11, color: '#aaa', width: 110, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, color: value ? '#222' : undefined, fontWeight: value ? 500 : 400 }}>
        {value || <EmptyText />}
      </span>
    </div>
  );
}

function TagList({ items, type, empty = 'Aún no identificados' }) {
  const list = (items ?? []).map((x) => (typeof x === 'string' ? x : x?.label)).filter(Boolean);
  if (!list.length) return <EmptyText text={empty} />;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
      {list.map((v, i) => <Tag key={i} label={v} type={type} />)}
    </div>
  );
}

function DetailGrid({ profile }) {
  const g = profile?.general ?? {};
  const obj = profile?.objectives ?? {};

  return (
    <div className="admin-detail-grid">
      <DetailCard title="Información general">
        <InfoRow label="Industria" value={g.industry} />
        <InfoRow label="Modelo" value={g.model} />
        <InfoRow label="País" value={g.country} />
        <InfoRow label="Tamaño" value={g.size} />
        <InfoRow label="Madurez digital" value={g.digitalMaturity} />
      </DetailCard>

      <DetailCard title="Objetivos estratégicos">
        <ObjectiveRow label="Corto plazo" value={obj.shortTerm} />
        <ObjectiveRow label="Mediano plazo" value={obj.mediumTerm} />
        <ObjectiveRow label="Largo plazo" value={obj.longTerm} />
      </DetailCard>

      <DetailCard title="Dolores y riesgos">
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10.5, color: '#bbb', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Dolores</div>
          <TagList items={profile?.pains} type="pain" />
        </div>
        <div>
          <div style={{ fontSize: 10.5, color: '#bbb', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Riesgos</div>
          <TagList items={profile?.risks} type="risk" />
        </div>
      </DetailCard>

      <DetailCard title="Oportunidades priorizadas">
        <TagList items={profile?.opportunities} type="opp" empty="Aún no identificadas" />
      </DetailCard>

      <DetailCard title="Tecnología actual">
        <TagList items={profile?.technology} type="default" empty="Sin definir" />
      </DetailCard>

      <DetailCard title="KPIs relevantes">
        <TagList items={profile?.kpis} type="default" />
      </DetailCard>
    </div>
  );
}

// ── Stakeholders Tab ──────────────────────────────────────────────────────

function StakeholderCard({ person }) {
  const name = typeof person === 'string' ? person : person.name;
  const roles = typeof person === 'string' ? [] : (person.roles ?? []);
  const notes = typeof person === 'string' ? '' : (person.notes ?? '');

  return (
    <div style={{
      background: '#1a1a1a',
      border: '1px solid #2a2a2a',
      borderRadius: 10,
      padding: '14px 16px',
      display: 'flex',
      gap: 14,
      alignItems: 'flex-start',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        background: '#2563EB22',
        border: '1px solid #2563EB44',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700, color: '#7B9FE0',
        flexShrink: 0,
      }}>
        {initials(name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 5 }}>{name}</div>
        {roles.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: notes ? 8 : 0 }}>
            {roles.map((r, i) => (
              <span key={i} style={{
                fontSize: 11, fontWeight: 500, color: '#7B9FE0',
                background: '#7B9FE018', border: '1px solid #7B9FE033',
                borderRadius: 5, padding: '2px 7px',
              }}>{r}</span>
            ))}
          </div>
        )}
        {notes && (
          <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>{notes}</div>
        )}
      </div>
    </div>
  );
}

function StakeholdersTab({ stakeholders }) {
  const list = stakeholders.filter(Boolean);

  if (!list.length) {
    return (
      <div className="admin-conv-empty">
        <div style={{ fontSize: 28, opacity: 0.2, marginBottom: 10 }}>👥</div>
        Aún no se han identificado stakeholders
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, padding: '4px 0' }}>
      {list.map((person, i) => (
        <StakeholderCard key={i} person={person} />
      ))}
    </div>
  );
}

// ── Intelligence Tab ───────────────────────────────────────────────────────

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
    checks: [
      (p) => p?.processes?.length,
      (p) => p?.initiatives?.length,
      (p) => p?.decisions?.length,
    ],
  },
  {
    id: 'tecnologia', label: 'Tecnología', icon: '💻',
    checks: [
      (p) => p?.technology?.length,
      (p) => p?.general?.digitalMaturity,
    ],
  },
  {
    id: 'finanzas', label: 'Finanzas', icon: '💰',
    checks: [
      (p) => p?.kpis?.length,
      (p) => p?.risks?.length,
    ],
  },
  {
    id: 'marketing', label: 'Marketing / Ventas', icon: '📈',
    checks: [
      (p) => p?.opportunities?.length,
      (p) => p?.pains?.length,
    ],
  },
  {
    id: 'personas', label: 'Personas', icon: '👥',
    checks: [
      (p) => p?.stakeholders?.length,
    ],
  },
];

const GAP_RECS = {
  negocio: 'Completar el modelo de negocio y los objetivos estratégicos.',
  operaciones: 'Explorar los procesos operativos y flujos de trabajo clave.',
  tecnologia: 'Mapear la stack tecnológica y el nivel de madurez digital.',
  finanzas: 'Identificar KPIs financieros, márgenes y estructura de costos.',
  marketing: 'Descubrir más dolores del cliente y oportunidades de crecimiento.',
  personas: 'Identificar stakeholders clave y sus áreas de influencia.',
};

function scoreColor(score) {
  if (score >= 70) return '#1D9E75';
  if (score >= 40) return '#F59E0B';
  return '#EF4444';
}


const FIELD_LABELS = {
  pains: 'Dolor', risks: 'Riesgo', opportunities: 'Oportunidad',
  stakeholders: 'Stakeholder', technology: 'Tecnología', kpis: 'KPI',
  processes: 'Proceso', initiatives: 'Iniciativa', decisions: 'Decisión',
};

function AriaSuggestionsPanel({ slug }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  const load = () => {
    setLoading(true);
    fetch(`/api/kai/${slug}/suggestions?status=pending`)
      .then((r) => r.json())
      .then((d) => setSuggestions(d.suggestions ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [slug]);

  const act = async (id, action) => {
    setActing(id + action);
    try {
      await fetch(`/api/kai/${slug}/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
    } catch {}
    setActing(null);
  };

  if (loading) return null;
  if (!suggestions.length) return null;

  return (
    <div style={{ background: '#F0EBFF', border: '0.5px solid #C4B0FF', borderRadius: 12, padding: '18px 22px', marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#4B2FBE', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
        Sugerencias de Aria — Pendientes de validación
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {suggestions.map((s) => {
          const label = FIELD_LABELS[s.field] ?? s.field;
          const pct = Math.round((s.confidence ?? 0.5) * 100);
          const isActing = acting?.startsWith(s.id);
          return (
            <div key={s.id} style={{
              background: '#fff', border: '0.5px solid #DDD6FE',
              borderRadius: 9, padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{
                display: 'inline-block', padding: '2px 8px', borderRadius: 20,
                fontSize: 10.5, fontWeight: 500, background: '#EDE9FE', color: '#4B2FBE',
                flexShrink: 0,
              }}>
                {label}
              </span>
              <span style={{ flex: 1, fontSize: 12.5, color: '#222', minWidth: 0 }}>
                {s.value}
              </span>
              <span style={{ fontSize: 11, color: '#aaa', flexShrink: 0 }}>{pct}%</span>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  disabled={isActing}
                  onClick={() => act(s.id, 'accept')}
                  style={{
                    padding: '5px 12px', borderRadius: 6, fontSize: 11.5, fontWeight: 500,
                    cursor: isActing ? 'default' : 'pointer', fontFamily: 'inherit',
                    border: '0.5px solid #1D9E75', background: '#fff', color: '#1D9E75',
                    opacity: isActing ? 0.5 : 1,
                  }}
                >
                  Aceptar
                </button>
                <button
                  disabled={isActing}
                  onClick={() => act(s.id, 'reject')}
                  style={{
                    padding: '5px 12px', borderRadius: 6, fontSize: 11.5, fontWeight: 500,
                    cursor: isActing ? 'default' : 'pointer', fontFamily: 'inherit',
                    border: '0.5px solid #ddd', background: '#fff', color: '#999',
                    opacity: isActing ? 0.5 : 1,
                  }}
                >
                  Rechazar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IntelligenceTab({ profile, conversations, ariaInvestigations, slug, allLearnings }) {
  const [learnings, setLearnings] = useState(allLearnings ?? []);

  useEffect(() => {
    fetch(`/api/kai/${slug}/learnings`)
      .then((r) => r.json())
      .then((d) => setLearnings(d.learnings ?? []))
      .catch(() => {});
  }, [slug]);

  const overallScore = calcOverallScore(profile, learnings);
  const areaScores = KNOWLEDGE_AREAS.map((a) => ({ ...a, score: calcAreaScore(a, profile, learnings) }));
  const gaps = areaScores.filter((a) => a.score < 50).sort((a, b) => a.score - b.score);
  const stakeholderCount = (profile?.stakeholders ?? []).length;

  return (
    <div>
      {/* Aria suggestions pending validation */}
      <AriaSuggestionsPanel slug={slug} />

      {/* Top metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 18 }}>
        <div style={{ background: '#fff', border: '0.5px solid #e0e0dc', borderRadius: 12, padding: '20px 22px' }}>
          <div style={{ fontSize: 11, color: '#aaa', fontWeight: 500, marginBottom: 8 }}>Knowledge Score</div>
          <div style={{ fontSize: 44, fontWeight: 700, color: scoreColor(overallScore), letterSpacing: '-0.04em', lineHeight: 1 }}>
            {overallScore}%
          </div>
          <div style={{ marginTop: 10, height: 4, background: '#f0f0ed', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: 4, background: scoreColor(overallScore), borderRadius: 2, width: `${overallScore}%`, transition: 'width 0.5s' }} />
          </div>
          <div style={{ fontSize: 11.5, color: '#aaa', marginTop: 8 }}>
            {overallScore >= 80 ? 'Conocimiento sólido' : overallScore >= 50 ? 'En desarrollo' : 'Etapa inicial'}
          </div>
        </div>

        <div style={{ background: '#fff', border: '0.5px solid #e0e0dc', borderRadius: 12, padding: '20px 22px' }}>
          <div style={{ fontSize: 11, color: '#aaa', fontWeight: 500, marginBottom: 8 }}>Conversaciones</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: '#111', letterSpacing: '-0.04em', lineHeight: 1 }}>
            {conversations.length}
          </div>
          <div style={{ fontSize: 11.5, color: '#aaa', marginTop: 8 }}>
            {stakeholderCount} stakeholder{stakeholderCount !== 1 ? 's' : ''} identificado{stakeholderCount !== 1 ? 's' : ''}
          </div>
        </div>

        <div style={{ background: '#fff', border: '0.5px solid #e0e0dc', borderRadius: 12, padding: '20px 22px' }}>
          <div style={{ fontSize: 11, color: '#aaa', fontWeight: 500, marginBottom: 8 }}>Análisis con Aria</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: '#6B4FE8', letterSpacing: '-0.04em', lineHeight: 1 }}>
            {ariaInvestigations.length}
          </div>
          <div style={{ fontSize: 11.5, color: '#aaa', marginTop: 8 }}>investigaciones generadas</div>
        </div>
      </div>

      {/* Knowledge map */}
      <div style={{ background: '#fff', border: '0.5px solid #e0e0dc', borderRadius: 12, padding: '20px 24px', marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 18 }}>
          Mapa de conocimiento
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {areaScores.map((area) => (
            <div key={area.id} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ width: 18, textAlign: 'center', fontSize: 14, flexShrink: 0 }}>{area.icon}</span>
              <span style={{ width: 160, fontSize: 12.5, color: '#444', fontWeight: 500, flexShrink: 0 }}>{area.label}</span>
              <div style={{ flex: 1, height: 6, background: '#f0f0ed', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: 6, background: scoreColor(area.score), borderRadius: 3, width: `${area.score}%`, transition: 'width 0.5s' }} />
              </div>
              <span style={{ width: 36, fontSize: 12, color: '#666', fontWeight: 600, textAlign: 'right', flexShrink: 0 }}>
                {area.score}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Origin of knowledge */}
      <div style={{ background: '#fff', border: '0.5px solid #e0e0dc', borderRadius: 12, padding: '20px 24px', marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
          Origen del conocimiento
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {[
            { label: 'Conversaciones', count: conversations.length, color: '#1D9E75', unit: 'conv.' },
            { label: 'Stakeholders identificados', count: stakeholderCount, color: '#2563EB', unit: 'personas' },
            { label: 'Documentos procesados', count: 0, color: '#aaa', unit: 'docs' },
            { label: 'Fuentes de datos', count: 0, color: '#aaa', unit: 'fuentes' },
          ].map((src) => {
            const pct = src.count > 0 ? Math.max(15, Math.min(100, (src.count / Math.max(conversations.length, 1)) * 100)) : 0;
            return (
              <div key={src.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 200, fontSize: 12.5, color: src.count > 0 ? '#444' : '#ccc', fontWeight: 500, flexShrink: 0 }}>
                  {src.label}
                </span>
                <div style={{ flex: 1, height: 5, background: '#f0f0ed', borderRadius: 3, overflow: 'hidden' }}>
                  {src.count > 0 && <div style={{ height: 5, background: src.color, borderRadius: 3, width: `${pct}%` }} />}
                </div>
                <span style={{ width: 64, fontSize: 11.5, color: src.count > 0 ? '#666' : '#ccc', textAlign: 'right', flexShrink: 0 }}>
                  {src.count > 0 ? `${src.count} ${src.unit}` : '—'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gaps */}
      {gaps.length > 0 && (
        <div style={{ background: '#FFFBF0', border: '0.5px solid #F5D475', borderRadius: 12, padding: '18px 22px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#92600A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
            Brechas detectadas — ¿Qué debería aprender Kai ahora?
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {gaps.slice(0, 3).map((gap) => (
              <div key={gap.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 14, marginTop: 1, flexShrink: 0 }}>{gap.icon}</span>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#633806' }}>
                    {gap.label} <span style={{ fontWeight: 400, color: '#92600A' }}>({gap.score}%)</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#8A6020', marginTop: 2, lineHeight: 1.5 }}>
                    {GAP_RECS[gap.id]}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Conversations Tab ──────────────────────────────────────────────────────

function ConversationsTab({ conversations, slug }) {
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(`https://kai.bonsight.co/${slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (!conversations.length) {
    return (
      <div style={{ textAlign: 'center', padding: '56px 20px' }}>
        <div style={{ fontSize: 32, opacity: 0.2, marginBottom: 12 }}>💬</div>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: '#888', marginBottom: 4 }}>
          Aún no hay conversaciones
        </div>
        <div style={{ fontSize: 12.5, color: '#bbb', marginBottom: 20 }}>
          Comparte el link con el cliente para comenzar.
        </div>
        <button className="admin-btn admin-btn--primary" onClick={copyLink}>
          {copied ? 'Copiado ✓' : 'Copiar link del cliente'}
        </button>
      </div>
    );
  }

  return (
    <div className="admin-conv-list">
      {conversations.map((c) => (
        <div key={c.id} className="admin-conv-item">
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: '#f0faf6', border: '0.5px solid #d4eddf',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>

          <div className="admin-conv-body">
            <div className="admin-conv-title">{c.title || 'Conversación'}</div>
            <div className="admin-conv-meta">
              {exactDate(c.createdAt)}
            </div>
          </div>

          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div className="admin-conv-date">
              {relativeTime(c.updatedAt || c.createdAt)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Knowledge Sources Tab ─────────────────────────────────────────────────

const STATUS_CHIP = {
  pending:    { label: 'Pendiente',    bg: '#F3F4F6', color: '#6B7280' },
  processing: { label: 'Procesando…', bg: '#EFF6FF', color: '#1D4ED8' },
  ready:      { label: 'Listo',        bg: '#F0FDF4', color: '#15803D' },
  error:      { label: 'Error',        bg: '#FEF2F2', color: '#DC2626' },
  stale:      { label: 'Desactualizado', bg: '#FFFBEB', color: '#D97706' },
};

const DRIVE_MIME_LABEL = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
  'application/vnd.ms-excel': 'Excel',
  'text/csv': 'CSV',
  'application/vnd.google-apps.document': 'Google Doc',
  'application/vnd.google-apps.spreadsheet': 'Google Sheet',
};
const DRIVE_MIME_ICON = {
  'application/pdf': '📄',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
  'application/vnd.ms-excel': '📊',
  'text/csv': '📊',
  'application/vnd.google-apps.document': '📝',
  'application/vnd.google-apps.spreadsheet': '📊',
};

const SA_EMAIL = 'id-aria-platform@bonsight-web.iam.gserviceaccount.com';

function DriveConnectPanel({ slug, driveConfig, setDriveConfig, onImported, sources }) {
  const [folderInput, setFolderInput]   = useState('');
  const [connecting, setConnecting]     = useState(false);
  const [connErr, setConnErr]           = useState('');
  const [showExplorer, setShowExplorer] = useState(false);
  const [files, setFiles]               = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selected, setSelected]         = useState({});
  const [importing, setImporting]       = useState(false);
  const [checking, setChecking]         = useState(false);
  const [checkResult, setCheckResult]   = useState(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const connect = async (e) => {
    e.preventDefault();
    setConnecting(true); setConnErr('');
    const res  = await fetch(`/api/kai/${slug}/drive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId: folderInput }),
    });
    const data = await res.json();
    if (!res.ok) { setConnErr(data.error ?? 'Error al conectar.'); setConnecting(false); return; }
    setDriveConfig(data.config);
    setFolderInput('');
    setConnecting(false);
  };

  const disconnect = async () => {
    setDisconnecting(true);
    await fetch(`/api/kai/${slug}/drive`, { method: 'DELETE' });
    setDriveConfig(null);
    setShowExplorer(false);
    setFiles([]);
    setSelected({});
    setDisconnecting(false);
  };

  const fetchFiles = async () => {
    setLoadingFiles(true);
    const res  = await fetch(`/api/kai/${slug}/drive/files`);
    const data = await res.json();
    setFiles(data.files ?? []);
    setSelected({});
    setLoadingFiles(false);
  };

  const loadFiles = async () => {
    setShowExplorer(true);
    await fetchFiles();
  };

  const checkUpdates = async () => {
    setChecking(true); setCheckResult(null);
    const res  = await fetch(`/api/kai/${slug}/drive/check-updates`, { method: 'POST' });
    const data = await res.json();
    setCheckResult(data.updatedCount ?? 0);
    setChecking(false);
    onImported?.(); // reload sources list so stale badges update
  };

  // Build a map: driveFileId → source (for status display in explorer)
  const importedMap = {};
  for (const s of (sources ?? [])) {
    if (s.driveFileId) importedMap[s.driveFileId] = s;
  }

  const toggleFile = (id, disabled) => {
    if (disabled) return;
    setSelected(s => ({ ...s, [id]: !s[id] }));
  };

  const importSelected = async () => {
    const toImport = files.filter(f => selected[f.id]);
    if (!toImport.length) return;
    setImporting(true);
    for (const f of toImport) {
      await fetch(`/api/kai/${slug}/knowledge-sources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: 'drive',
          name: f.name,
          driveFileId: f.id,
          driveMimeType: f.mimeType,
          driveModifiedTime: f.modifiedTime,
        }),
      });
    }
    setSelected({});
    setImporting(false);
    onImported?.();
  };

  if (!driveConfig) {
    return (
      <div className="ks-drive-panel">
        <div className="ks-drive-panel-header">
          <span className="ks-drive-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          </span>
          <span className="ks-drive-panel-title">Conectar Google Drive</span>
        </div>
        <p className="ks-drive-instructions">
          Compartí tu carpeta de Drive con <code className="ks-drive-sa-email">{SA_EMAIL}</code> (solo lectura) y pegá el link o ID de la carpeta.
        </p>
        <form onSubmit={connect} className="ks-drive-connect-form">
          <input
            className="ks-input"
            placeholder="Link o ID de la carpeta de Drive"
            value={folderInput}
            onChange={e => setFolderInput(e.target.value)}
            required
          />
          <button type="submit" className="ks-btn-primary" disabled={connecting}>
            {connecting ? 'Conectando…' : 'Conectar'}
          </button>
        </form>
        {connErr && <div style={{ fontSize: 12, color: '#DC2626', marginTop: 6 }}>{connErr}</div>}
      </div>
    );
  }

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <div className="ks-drive-panel ks-drive-panel--connected">
      <div className="ks-drive-panel-header">
        <span className="ks-drive-connected-dot" />
        <span className="ks-drive-panel-title">{driveConfig.folderName}</span>
        <span className="ks-drive-connected-label">Conectado</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="ks-btn-secondary" onClick={checkUpdates} disabled={checking} style={{ fontSize: 11 }}>
            {checking ? 'Verificando…' : 'Verificar actualizaciones'}
          </button>
          <button
            className="ks-btn-secondary"
            onClick={showExplorer ? () => setShowExplorer(false) : loadFiles}
            style={{ fontSize: 11 }}
          >
            {showExplorer ? 'Ocultar archivos' : 'Explorar archivos'}
          </button>
          <button className="ks-btn-danger" onClick={disconnect} disabled={disconnecting} style={{ fontSize: 11 }}>
            {disconnecting ? '…' : 'Desconectar'}
          </button>
        </div>
      </div>

      {checkResult !== null && (
        <div style={{ fontSize: 12, color: checkResult > 0 ? '#D97706' : '#15803D', marginTop: 4 }}>
          {checkResult > 0
            ? `${checkResult} archivo${checkResult !== 1 ? 's' : ''} desactualizado${checkResult !== 1 ? 's' : ''}. Reprocesalos para actualizar.`
            : 'Todo está actualizado.'}
        </div>
      )}

      {showExplorer && (
        <div className="ks-drive-explorer">
          <div className="ks-drive-explorer-toolbar">
            <span style={{ fontSize: 11.5, color: '#666', fontWeight: 500 }}>
              {loadingFiles ? 'Cargando…' : `${files.length} archivo${files.length !== 1 ? 's' : ''}`}
            </span>
            <button
              className="ks-drive-refresh-btn"
              onClick={fetchFiles}
              disabled={loadingFiles}
              title="Refrescar lista"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              Refrescar
            </button>
          </div>

          {loadingFiles ? null : files.length === 0 ? (
            <div style={{ fontSize: 12, color: '#aaa', padding: '8px 0' }}>
              No se encontraron archivos compatibles (PDF, DOCX, XLSX, Google Docs, Google Sheets).
            </div>
          ) : (
            <>
              <div className="ks-drive-file-list">
                {files.map(f => {
                  const existing = importedMap[f.id];
                  const isStale  = existing && existing.driveModifiedTime && f.modifiedTime && existing.driveModifiedTime !== f.modifiedTime;
                  const isImported = existing && !isStale;
                  const disabled = isImported;

                  return (
                    <label
                      key={f.id}
                      className={`ks-drive-file-row${selected[f.id] ? ' ks-drive-file-row--selected' : ''}${isImported ? ' ks-drive-file-row--imported' : ''}`}
                      style={{ cursor: disabled ? 'default' : 'pointer' }}
                      onClick={e => { e.preventDefault(); toggleFile(f.id, disabled); }}
                    >
                      {isImported ? (
                        <span className="ks-drive-imported-check">✓</span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={!!selected[f.id]}
                          onChange={() => toggleFile(f.id, disabled)}
                          className="ks-drive-checkbox"
                          disabled={disabled}
                        />
                      )}
                      <span className="ks-drive-file-icon">{DRIVE_MIME_ICON[f.mimeType] ?? '📄'}</span>
                      <span className="ks-drive-file-name">{f.name}</span>
                      {isImported && (
                        <span className="ks-drive-file-badge ks-drive-file-badge--imported">Importado</span>
                      )}
                      {isStale && (
                        <span className="ks-drive-file-badge ks-drive-file-badge--stale">Actualizar</span>
                      )}
                      <span className="ks-drive-file-type">{DRIVE_MIME_LABEL[f.mimeType] ?? f.mimeType}</span>
                      <span className="ks-drive-file-date">
                        {f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </span>
                    </label>
                  );
                })}
              </div>
              {selectedCount > 0 && (
                <div className="ks-drive-import-bar">
                  <span style={{ fontSize: 12, color: '#555' }}>
                    {selectedCount} archivo{selectedCount !== 1 ? 's' : ''} seleccionado{selectedCount !== 1 ? 's' : ''}
                  </span>
                  <button className="ks-btn-primary" disabled={importing} onClick={importSelected}>
                    {importing ? 'Importando…' : `Importar ${selectedCount}`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function KnowledgeSourcesTab({ slug }) {
  const [sources, setSources]       = useState([]);
  const [digest, setDigest]         = useState(null);
  const [loading, setLoading]       = useState(true);
  const [processing, setProcessing] = useState(null);
  const [deleting, setDeleting]     = useState(null);
  const [form, setForm]             = useState({ open: false, sourceType: 'url', name: '', url: '', text: '', file: null });
  const [saving, setSaving]         = useState(false);
  const [err, setErr]               = useState('');
  const [driveConfig, setDriveConfig] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/kai/${slug}/knowledge-sources`).then(r => r.json()),
      fetch(`/api/kai/${slug}/drive`).then(r => r.json()),
    ]).then(([ksData, driveData]) => {
      setSources(ksData.sources ?? []);
      setDigest(ksData.digest ?? null);
      setDriveConfig(driveData.config ?? null);
    }).finally(() => setLoading(false));
  }, [slug]);

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true); setErr('');

    let res, data;

    if (form.sourceType === 'file') {
      if (!form.file) { setErr('Seleccioná un archivo.'); setSaving(false); return; }
      const fd = new FormData();
      fd.append('file', form.file);
      fd.append('name', form.name || form.file.name);
      res = await fetch(`/api/kai/${slug}/knowledge-sources/upload`, { method: 'POST', body: fd });
    } else {
      const body = { sourceType: form.sourceType, name: form.name };
      if (form.sourceType === 'url') body.url = form.url;
      if (form.sourceType === 'text') body.text = form.text;
      res = await fetch(`/api/kai/${slug}/knowledge-sources`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
    }

    data = await res.json();
    if (!res.ok) { setErr(data.error ?? 'Error al guardar.'); setSaving(false); return; }
    setSources(prev => [data.source, ...prev]);
    setForm({ open: false, sourceType: 'url', name: '', url: '', text: '', file: null });
    setSaving(false);
  }

  async function handleProcess(id) {
    setProcessing(id);
    await fetch(`/api/kai/${slug}/knowledge-sources/${id}/process`, { method: 'POST' });
    const res = await fetch(`/api/kai/${slug}/knowledge-sources`);
    const data = await res.json();
    setSources(data.sources ?? []);
    setDigest(data.digest ?? null);
    setProcessing(null);
  }

  async function handleDelete(id) {
    setDeleting(id);
    await fetch(`/api/kai/${slug}/knowledge-sources/${id}`, { method: 'DELETE' });
    setSources(prev => prev.filter(s => s.id !== id));
    setDeleting(null);
  }

  const reloadSources = () => {
    fetch(`/api/kai/${slug}/knowledge-sources`)
      .then(r => r.json())
      .then(d => { setSources(d.sources ?? []); setDigest(d.digest ?? null); });
  };

  if (loading) return <div className="admin-conv-empty">Cargando…</div>;

  const chip = (status) => {
    const s = STATUS_CHIP[status] ?? STATUS_CHIP.pending;
    return <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: s.bg, color: s.color }}>{s.label}</span>;
  };

  return (
    <div>
      <DriveConnectPanel slug={slug} driveConfig={driveConfig} setDriveConfig={setDriveConfig} onImported={reloadSources} sources={sources} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#111' }}>Fuentes de conocimiento</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>URLs y textos que Kai usa como contexto inicial · No reemplazan conversaciones</div>
        </div>
        <button className="ks-btn-primary" onClick={() => setForm(f => ({ ...f, open: !f.open }))}>
          {form.open ? 'Cancelar' : '+ Agregar fuente'}
        </button>
      </div>

      {form.open && (
        <form onSubmit={handleAdd} className="ks-form">
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {[['url', '🔗 URL'], ['text', '📝 Texto'], ['file', '📄 Archivo']].map(([t, label]) => (
              <button key={t} type="button"
                className={`ks-type-btn${form.sourceType === t ? ' ks-type-btn--active' : ''}`}
                onClick={() => setForm(f => ({ ...f, sourceType: t, file: null }))}>
                {label}
              </button>
            ))}
          </div>
          {form.sourceType !== 'file' && (
            <input className="ks-input" placeholder="Nombre de la fuente" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          )}
          {form.sourceType === 'url' && (
            <input className="ks-input" placeholder="https://…" value={form.url}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))} required />
          )}
          {form.sourceType === 'text' && (
            <textarea className="ks-textarea" placeholder="Pega el contenido aquí…" value={form.text}
              onChange={e => setForm(f => ({ ...f, text: e.target.value }))} rows={6} required />
          )}
          {form.sourceType === 'file' && (
            <div className="ks-file-drop">
              <input type="file" accept=".pdf,.docx,.doc,.xlsx,.xls,.csv" id="ks-file-input"
                style={{ display: 'none' }}
                onChange={e => setForm(f => ({ ...f, file: e.target.files[0] ?? null }))} />
              <label htmlFor="ks-file-input" className="ks-file-label">
                {form.file ? `📄 ${form.file.name}` : '+ Seleccionar archivo'}
              </label>
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 6 }}>PDF, DOCX, XLSX · máx. 10 MB</div>
            </div>
          )}
          {err && <div style={{ color: '#DC2626', fontSize: 12 }}>{err}</div>}
          <button type="submit" className="ks-btn-primary" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar fuente'}
          </button>
        </form>
      )}

      {sources.length === 0 && !form.open && (
        <div className="admin-conv-empty">
          <div style={{ fontSize: 28, opacity: 0.2, marginBottom: 10 }}>📚</div>
          Sin fuentes todavía. Agregá una URL o texto para que Kai llegue mejor preparado a cada conversación.
        </div>
      )}

      {sources.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {sources.map(s => (
            <div key={s.id} className="ks-source-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#111', marginBottom: 3 }}>{s.name}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {chip(s.status)}
                  <span style={{ fontSize: 11, color: '#aaa' }}>
                    {s.sourceType === 'url' ? '🔗 URL' : s.sourceType === 'file' ? '📄 Archivo' : s.sourceType === 'drive' ? `🗂 Drive · ${DRIVE_MIME_LABEL[s.driveMimeType] ?? ''}` : '📝 Texto'}
                    {s.processedAt ? ` · ${new Date(s.processedAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}` : ''}
                    {s.tokenEstimate ? ` · ~${s.tokenEstimate} tokens` : ''}
                  </span>
                </div>
                {s.lastError && <div style={{ fontSize: 11, color: '#DC2626', marginTop: 4 }}>{s.lastError}</div>}
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {s.status !== 'processing' && (
                  <button className="ks-btn-secondary"
                    disabled={processing === s.id}
                    onClick={() => handleProcess(s.id)}>
                    {processing === s.id ? '…' : s.status === 'ready' ? 'Reprocesar' : 'Procesar'}
                  </button>
                )}
                <button className="ks-btn-danger"
                  disabled={deleting === s.id}
                  onClick={() => handleDelete(s.id)}>
                  {deleting === s.id ? '…' : 'Eliminar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {digest && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#555', userSelect: 'none' }}>
            Ver digest consolidado ({Math.round(digest.length / 4)} tokens est.)
          </summary>
          <pre style={{ marginTop: 10, fontSize: 11, color: '#555', background: '#fafafa', border: '0.5px solid #eee', borderRadius: 8, padding: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 300, overflow: 'auto' }}>{digest}</pre>
        </details>
      )}
    </div>
  );
}

// ── Learnings Tab ─────────────────────────────────────────────────────────

const IMPACT_STYLE = {
  alto:  { background: '#FEE2E2', color: '#991B1B' },
  medio: { background: '#FEF3C7', color: '#92400E' },
  bajo:  { background: '#F0F9F6', color: '#065F46' },
};

const AREA_ICONS = {
  negocio: '🏢', operaciones: '⚙️', tecnología: '💻',
  finanzas: '💰', marketing: '📈', personas: '👥',
};

function LearningsTab({ slug, participantMap }) {
  const [learnings, setLearnings] = useState([]);
  const [loadingL, setLoadingL] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    fetch(`/api/kai/${slug}/learnings`)
      .then((r) => r.json())
      .then((d) => setLearnings(d.learnings ?? []))
      .catch(() => {})
      .finally(() => setLoadingL(false));
  }, [slug]);

  const remove = async (id) => {
    setDeleting(id);
    await fetch(`/api/kai/${slug}/learnings`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {});
    setLearnings((prev) => prev.filter((l) => l.id !== id));
    setDeleting(null);
  };

  if (loadingL) return null;

  if (!learnings.length) {
    return (
      <div style={{ textAlign: 'center', padding: '56px 20px' }}>
        <div style={{ fontSize: 32, opacity: 0.2, marginBottom: 12 }}>💡</div>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: '#888', marginBottom: 4 }}>
          Aún no hay aprendizajes registrados
        </div>
        <div style={{ fontSize: 12.5, color: '#bbb' }}>
          Kai los genera automáticamente durante las conversaciones con el cliente.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>
        {learnings.length} aprendizaje{learnings.length !== 1 ? 's' : ''} registrado{learnings.length !== 1 ? 's' : ''}
      </div>
      {learnings.map((l) => {
        const impactStyle = IMPACT_STYLE[l.impact] ?? IMPACT_STYLE.medio;
        const areaIcon = AREA_ICONS[l.area] ?? '💡';
        const pct = Math.round((l.confidence ?? 0.7) * 100);
        const date = new Date(l.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
        return (
          <div key={l.id} style={{
            background: '#fff', border: '0.5px solid #e8e8e4',
            borderRadius: 12, padding: '14px 18px',
            display: 'flex', gap: 14, alignItems: 'flex-start',
          }}>
            <div style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{areaIcon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: '#1a1a1a', lineHeight: 1.55, marginBottom: 7 }}>
                {l.content}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 5 }}>
                <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10.5, fontWeight: 600, ...impactStyle }}>
                  {l.impact?.toUpperCase()}
                </span>
                {l.area && (
                  <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10.5, background: '#f5f5f2', color: '#666' }}>
                    {l.area}
                  </span>
                )}
                <span style={{ fontSize: 10.5, color: '#bbb' }}>Confianza {pct}%</span>
              </div>
              <LearningSource learning={l} participantMap={participantMap} />
            </div>
            <button
              disabled={deleting === l.id}
              onClick={() => remove(l.id)}
              style={{
                flexShrink: 0, background: 'none', border: 'none',
                cursor: 'pointer', color: '#ddd', padding: '2px 4px',
                fontSize: 13, lineHeight: 1, opacity: deleting === l.id ? 0.3 : 1,
              }}
              title="Eliminar aprendizaje"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── Summary Tab ────────────────────────────────────────────────────────────

function SummaryTab({ slug }) {
  const [summary, setSummary] = useState('');
  const [generatedAt, setGeneratedAt] = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch(`/api/kai/${slug}/summary`)
      .then((r) => r.json())
      .then((d) => { if (d.summary) { setSummary(d.summary); setGeneratedAt(d.generatedAt); } })
      .catch(() => {});
  }, [slug]);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/kai/${slug}/summary`, { method: 'POST' });
      const data = await res.json();
      setSummary(data.summary ?? '');
      setGeneratedAt(data.generatedAt ?? null);
    } catch {}
    setGenerating(false);
  };

  const exportHtml = () => {
    const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8">
<title>Resumen Ejecutivo · ${slug}</title>
<style>
  body { font-family: Georgia, serif; max-width: 720px; margin: 60px auto; color: #111; line-height: 1.7; font-size: 15px; }
  h1 { font-size: 24px; font-weight: 700; border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 30px; }
  p { margin: 0 0 14px; white-space: pre-line; }
  .meta { font-size: 12px; color: #888; margin-bottom: 40px; }
  @media print { body { margin: 40px; } }
</style></head>
<body>
<h1>Resumen Ejecutivo</h1>
<p class="meta">Generado por Kai · ${generatedAt ? new Date(generatedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}</p>
<p>${summary.replace(/\n/g, '</p><p>')}</p>
</body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20 }}>
        <button
          className="admin-btn admin-btn--primary"
          onClick={generate}
          disabled={generating}
        >
          {generating ? 'Generando…' : summary ? 'Regenerar' : 'Generar resumen'}
        </button>
        {summary && (
          <button className="admin-btn" onClick={exportHtml}>
            Exportar HTML
          </button>
        )}
        {generatedAt && (
          <span style={{ fontSize: 11, color: '#bbb' }}>
            Generado {new Date(generatedAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {!summary && !generating && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#bbb', fontSize: 13 }}>
          Haz click en "Generar resumen" para que Kai analice el perfil y produzca un resumen ejecutivo exportable.
        </div>
      )}

      {generating && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#aaa', fontSize: 13 }}>
          Kai está analizando el perfil…
        </div>
      )}

      {summary && !generating && (
        <div style={{
          background: '#fff', border: '0.5px solid #e8e8e4',
          borderRadius: 12, padding: '28px 32px',
          fontSize: 13.5, color: '#1a1a1a', lineHeight: 1.75,
          whiteSpace: 'pre-wrap',
        }}>
          {summary}
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

const TABS = ['Business Profile', 'Conversaciones', 'Conocimiento', 'Stakeholders', 'Intelligence', 'Aprendizajes', 'Resumen', 'Costos IA'];

// ── Costs Tab ──────────────────────────────────────────────────────────────

function fmtT(n) {
  if (!n || n === 0) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}
function fmtC(n) { return `USD ${Number(n ?? 0).toFixed(2)}`; }

function SpendChart({ data, xLabel, selectedKey, onBarClick }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const maxCost = Math.max(...data.map((d) => d.cost), 0.001);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', height: 148, gap: 3 }}>
        {data.map((d, i) => {
          const pct = (d.cost / maxCost) * 100;
          const isSelected = d.key === selectedKey;
          const isHovered = hoverIdx === i;
          return (
            <div
              key={d.key}
              style={{ flex: 1, minWidth: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', cursor: onBarClick ? 'pointer' : 'default', position: 'relative' }}
              onClick={() => onBarClick?.(d)}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            >
              {isHovered && (
                <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)', background: '#111827', border: '1px solid #374151', borderRadius: 7, padding: '7px 11px', fontSize: 11, color: '#E5E7EB', zIndex: 100, whiteSpace: 'nowrap', pointerEvents: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
                  <div style={{ fontWeight: 700, marginBottom: 3, color: '#fff' }}>{d.label}</div>
                  <div style={{ color: '#20C997', fontWeight: 600 }}>USD {d.cost.toFixed(3)}</div>
                  <div style={{ color: '#9CA3AF', marginTop: 2 }}>{fmtT(d.tokens)} tokens · {d.calls} llamadas</div>
                </div>
              )}
              <div style={{ width: '100%', height: `${Math.max(pct, pct > 0 ? 2 : 0)}%`, minHeight: pct > 0 ? 3 : 1, background: isSelected ? '#20C997' : isHovered ? '#2D7A5C' : '#1E3A2F', borderRadius: '3px 3px 0 0', transition: 'background 0.15s' }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 3, marginTop: 5 }}>
        {data.map((d, i) => (
          <div key={d.key} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: '#6B7280', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {xLabel(d, i, data.length)}
          </div>
        ))}
      </div>
    </div>
  );
}

function TokenBar({ input, output }) {
  const total = (input ?? 0) + (output ?? 0);
  if (!total) return null;
  const pct = Math.round((input / total) * 100);
  return (
    <div className="cost-token-bar">
      <div className="cost-token-bar-input" style={{ width: `${pct}%` }} />
      <div className="cost-token-bar-output" style={{ width: `${100 - pct}%` }} />
    </div>
  );
}

const FEAT_LABELS = { chat: 'Discovery Chat', executive_summary: 'Executive Summary', diagnosis: 'Diagnóstico', summary: 'Resumen', insights: 'Insights', transversals: 'Patrones Transversales' };

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}
function isoOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function CostsTab({ usage, events, dailyUsage = [] }) {
  const [fromDate, setFromDate] = useState(() => isoOffset(13));
  const [toDate, setToDate] = useState(() => isoToday());
  const [selectedDay, setSelectedDay] = useState(null);

  const { total = {}, byFeature = [] } = usage ?? {};
  const maxCost = byFeature[0]?.cost ?? 1;

  // ── Build daily chart data from pre-aggregated daily stats ──
  const dailyAggMap = {};
  for (const d of dailyUsage) {
    dailyAggMap[d.date] = { cost: d.cost, tokens: (d.input_tokens ?? 0) + (d.output_tokens ?? 0), calls: d.calls };
  }

  // Fallback: derive from events for days not yet in daily agg (e.g. before this deploy)
  const eventDayMap = {};
  for (const e of (events ?? [])) {
    const day = e.createdAt?.slice(0, 10);
    if (!day) continue;
    if (!eventDayMap[day]) eventDayMap[day] = { cost: 0, tokens: 0, calls: 0 };
    eventDayMap[day].cost   += e.cost ?? 0;
    eventDayMap[day].tokens += (e.inputTokens ?? 0) + (e.outputTokens ?? 0);
    eventDayMap[day].calls++;
  }

  const dailyData = (() => {
    const from = new Date(fromDate);
    const to   = new Date(toDate);
    const days = [];
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      const label = new Date(key).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
      const agg = dailyAggMap[key] ?? eventDayMap[key] ?? { cost: 0, tokens: 0, calls: 0 };
      days.push({ key, label, ...agg });
    }
    return days;
  })();

  function applyPreset(days) {
    setFromDate(isoOffset(days - 1));
    setToDate(isoToday());
    setSelectedDay(null);
  }

  // ── Build hourly chart data for selected day ──
  const hourlyData = selectedDay
    ? Array.from({ length: 24 }, (_, h) => ({ key: h, label: `${String(h).padStart(2, '0')}h`, cost: 0, tokens: 0, calls: 0 }))
    : null;

  if (selectedDay && hourlyData) {
    for (const e of (events ?? [])) {
      if (!e.createdAt?.startsWith(selectedDay)) continue;
      const h = new Date(e.createdAt).getHours();
      hourlyData[h].cost  += e.cost ?? 0;
      hourlyData[h].tokens += (e.inputTokens ?? 0) + (e.outputTokens ?? 0);
      hourlyData[h].calls++;
    }
  }

  // ── X-axis label helpers ──
  function dailyXLabel(d, i, total) {
    if (total <= 10) return d.label;
    if (total <= 21) return i % 2 === 0 ? d.label : '';
    return i % 5 === 0 ? d.label : '';
  }
  function hourlyXLabel(d, i) {
    return i % 6 === 0 ? d.label : '';
  }

  // ── Recent activity grouping ──
  const now = Date.now();
  const DAY = 86400000;
  const todayEvents = (events ?? []).filter((e) => now - new Date(e.createdAt).getTime() < DAY);
  const weekEvents  = (events ?? []).filter((e) => { const age = now - new Date(e.createdAt).getTime(); return age >= DAY && age < 7 * DAY; });

  function groupByFeature(evts) {
    const map = {};
    for (const e of evts) {
      const k = `${e.product}:${e.feature}`;
      if (!map[k]) map[k] = { label: e.feature, calls: 0, cost: 0, tokens: 0 };
      map[k].calls++;
      map[k].cost   += e.cost ?? 0;
      map[k].tokens += (e.inputTokens ?? 0) + (e.outputTokens ?? 0);
    }
    return Object.values(map).sort((a, b) => b.cost - a.cost);
  }

  function EventGroup({ title, evts }) {
    if (!evts.length) return null;
    return (
      <div className="cost-event-group">
        <div className="cost-event-period">{title}</div>
        {groupByFeature(evts).map((g) => (
          <div key={`${g.label}`} className="cost-event-row">
            <span className="cost-event-feature">{FEAT_LABELS[g.label] ?? g.label}</span>
            <span className="cost-event-calls">{g.calls} llamada{g.calls !== 1 ? 's' : ''}</span>
            <span className="cost-event-cost">{fmtC(g.cost)}</span>
            <span className="cost-event-tokens">{fmtT(g.tokens)} tokens</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="cost-tab">
      {/* Stat cards */}
      <div className="cost-tab-stats">
        <div className="cost-tab-stat">
          <div className="cost-tab-stat-label">Costo este mes</div>
          <div className="cost-tab-stat-value">{fmtC(total.cost)}</div>
        </div>
        <div className="cost-tab-stat">
          <div className="cost-tab-stat-label">Input tokens</div>
          <div className="cost-tab-stat-value cost-tab-stat-value--tok">{fmtT(total.input_tokens)}</div>
        </div>
        <div className="cost-tab-stat">
          <div className="cost-tab-stat-label">Output tokens</div>
          <div className="cost-tab-stat-value cost-tab-stat-value--tok">{fmtT(total.output_tokens)}</div>
        </div>
        <div className="cost-tab-stat">
          <div className="cost-tab-stat-label">Total tokens</div>
          <div className="cost-tab-stat-value cost-tab-stat-value--tok">{fmtT((total.input_tokens ?? 0) + (total.output_tokens ?? 0))}</div>
          <TokenBar input={total.input_tokens} output={total.output_tokens} />
        </div>
      </div>

      {/* Daily spend chart */}
      {(events ?? []).length > 0 && (
        <div className="cost-tab-section">
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div className="cost-tab-section-title" style={{ marginBottom: 0 }}>
                Gasto por día{selectedDay ? '' : ' — click en una barra para ver por hora'}
              </div>
              <div style={{ display: 'flex', gap: 5 }}>
                {[7, 14, 30].map((d) => {
                  const active = fromDate === isoOffset(d - 1) && toDate === isoToday();
                  return (
                    <button key={d} onClick={() => applyPreset(d)} style={{ padding: '3px 11px', borderRadius: 6, fontSize: 11, fontWeight: 600, border: '1px solid', borderColor: active ? '#20C997' : '#374151', background: active ? 'rgba(32,201,151,0.1)' : 'transparent', color: active ? '#20C997' : '#6B7280', cursor: 'pointer', fontFamily: 'inherit' }}>
                      {d}d
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#6B7280' }}>Desde</span>
              <input type="date" value={fromDate} max={toDate} onChange={(e) => { setFromDate(e.target.value); setSelectedDay(null); }} style={{ fontSize: 11, background: '#1F2937', border: '1px solid #374151', borderRadius: 6, color: '#E5E7EB', padding: '4px 8px', fontFamily: 'inherit', cursor: 'pointer', colorScheme: 'dark' }} />
              <span style={{ fontSize: 11, color: '#6B7280' }}>Hasta</span>
              <input type="date" value={toDate} min={fromDate} max={isoToday()} onChange={(e) => { setToDate(e.target.value); setSelectedDay(null); }} style={{ fontSize: 11, background: '#1F2937', border: '1px solid #374151', borderRadius: 6, color: '#E5E7EB', padding: '4px 8px', fontFamily: 'inherit', cursor: 'pointer', colorScheme: 'dark' }} />
            </div>
          </div>
          <SpendChart data={dailyData} xLabel={dailyXLabel} selectedKey={selectedDay} onBarClick={(d) => setSelectedDay(selectedDay === d.key ? null : d.key)} />

          {/* Hourly breakdown */}
          {selectedDay && hourlyData && (
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #1F2937' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div className="cost-tab-section-title" style={{ marginBottom: 0 }}>
                  Por hora — {new Date(selectedDay).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
                <button onClick={() => setSelectedDay(null)} style={{ fontSize: 11, color: '#6B7280', background: 'none', border: '1px solid #374151', borderRadius: 5, cursor: 'pointer', padding: '2px 8px', fontFamily: 'inherit' }}>✕ cerrar</button>
              </div>
              <SpendChart data={hourlyData} xLabel={hourlyXLabel} selectedKey={null} onBarClick={null} />
              {hourlyData.every((h) => h.calls === 0) && (
                <div style={{ fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 8 }}>Sin actividad registrada este día en el histórico disponible.</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* By feature */}
      {byFeature.length > 0 && (
        <div className="cost-tab-section">
          <div className="cost-tab-section-title">Por funcionalidad</div>
          {byFeature.map((f) => (
            <div key={`${f.product}:${f.feature}`} className="cost-feature-row">
              <span className="cost-feature-label">{FEAT_LABELS[f.feature] ?? f.feature}</span>
              <div className="cost-feature-bar-wrap">
                <div className="cost-feature-bar" style={{ width: `${Math.round((f.cost / maxCost) * 100)}%` }} />
              </div>
              <span className="cost-feature-cost">{fmtC(f.cost)}</span>
              <span className="cost-feature-tokens">{fmtT(f.input_tokens + f.output_tokens)} tok</span>
            </div>
          ))}
        </div>
      )}

      {/* Recent activity */}
      {(todayEvents.length > 0 || weekEvents.length > 0) && (
        <div className="cost-tab-section">
          <div className="cost-tab-section-title">Actividad reciente</div>
          <EventGroup title="Hoy" evts={todayEvents} />
          <EventGroup title="Últimos 7 días" evts={weekEvents} />
        </div>
      )}

      {!total.calls && (
        <div className="cost-tab-empty">Sin datos aún. Los costos se registrarán en la próxima conversación.</div>
      )}
    </div>
  );
}

export default function TenantDetail({ meta, profile, conversations, allLearnings = [], participantMap = {}, knowledgeQuality = {}, recentSession = null, changeCounts = {}, recentLearnings = [], ariaInvestigations = [], tenantUsage = null, usageEvents = [], dailyUsage = [] }) {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isDemo, setIsDemo] = useState(!!meta.isDemo);
  const [demoLoading, setDemoLoading] = useState(false);

  const clientUrl = `https://kai.bonsight.co/${meta.slug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(clientUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleExport = () => exportProfile(meta, profile, conversations);

  const toggleDemo = async () => {
    setDemoLoading(true);
    try {
      await fetch('/api/kai/tenants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: meta.slug, updates: { isDemo: !isDemo } }),
      });
      setIsDemo((v) => !v);
    } catch { /* ignore */ }
    finally { setDemoLoading(false); }
  };

  return (
    <>
      {/* ── Topbar ── */}
      <div className="admin-topbar">
        <div className="admin-topbar-left">
          <div className="admin-topbar-avatar">{initials(meta.name)}</div>
          <div>
            <div className="admin-topbar-name">{meta.name}</div>
            <div className="admin-topbar-url">
              kai.bonsight.co/{meta.slug}
              {meta.country && <span style={{ color: '#ccc', margin: '0 4px' }}>·</span>}
              {meta.country && <span>{meta.country}</span>}
              {meta.industry && <span style={{ color: '#ccc', margin: '0 4px' }}>·</span>}
              {meta.industry && <span>{meta.industry}</span>}
            </div>
          </div>
        </div>

        <div className="admin-topbar-actions">
          <a
            href={`/kai/${meta.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="admin-btn"
            title="Abrir interfaz del cliente"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            Abrir link
          </a>

          <button className="admin-btn" onClick={handleCopy} title="Copiar URL del cliente">
            {copied ? (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span style={{ color: '#1D9E75' }}>Copiado</span>
              </>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                Copiar link
              </>
            )}
          </button>

          <button className="admin-btn" onClick={handleExport} title="Exportar perfil como JSON">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Exportar perfil
          </button>

          <button
            className={`admin-btn${isDemo ? ' admin-demo-btn--active' : ''}`}
            onClick={toggleDemo}
            disabled={demoLoading}
            title={isDemo ? 'Desactivar modo demo' : 'Activar modo demo'}
          >
            {isDemo ? '◈ Demo activo' : '◈ Activar demo'}
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="admin-tabs">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            className={`admin-tab${activeTab === i ? ' admin-tab--active' : ''}`}
            onClick={() => setActiveTab(i)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="admin-content">

        {/* Business Profile Tab */}
        {activeTab === 0 && (
          <>
            {/* Highlight cards row */}
            <div className="admin-hl-row">
              <KnowledgeQualityCard profile={profile} knowledgeQuality={knowledgeQuality} />
              <ActividadRecienteCard recentSession={recentSession} />
              <CambiosRecientesCard changeCounts={changeCounts} />
            </div>

            {/* Active priorities */}
            <ActivePrioritiesEditor slug={meta.slug} />

            {/* Diagnosis */}
            <DiagnosisBlock slug={meta.slug} />

            {/* Recent discoveries */}
            <RecentDiscoveriesSection recentLearnings={recentLearnings} participantMap={participantMap} />

            {/* Detail grid */}
            <div className="admin-detail-section-title">Detalle del perfil</div>
            <DetailGrid profile={profile} />
          </>
        )}

        {/* Conversaciones Tab */}
        {activeTab === 1 && (
          <ConversationsTab conversations={conversations} slug={meta.slug} />
        )}

        {/* Conocimiento Tab */}
        {activeTab === 2 && <KnowledgeSourcesTab slug={meta.slug} />}

        {/* Stakeholders Tab */}
        {activeTab === 3 && (
          <StakeholdersTab stakeholders={profile?.stakeholders ?? []} />
        )}

        {/* Intelligence Tab */}
        {activeTab === 4 && (
          <IntelligenceTab
            profile={profile}
            conversations={conversations}
            ariaInvestigations={ariaInvestigations}
            slug={meta.slug}
            allLearnings={allLearnings}
          />
        )}

        {/* Aprendizajes Tab */}
        {activeTab === 5 && <LearningsTab slug={meta.slug} participantMap={participantMap} />}

        {/* Resumen Tab */}
        {activeTab === 6 && <SummaryTab slug={meta.slug} />}

        {/* Costos IA Tab */}
        {activeTab === 7 && <CostsTab usage={tenantUsage} events={usageEvents} dailyUsage={dailyUsage} />}

      </div>
    </>
  );
}
