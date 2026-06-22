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

const TABS = ['Business Profile', 'Conversaciones', 'Documentos', 'Stakeholders', 'Intelligence', 'Aprendizajes', 'Resumen', 'Costos IA'];

// ── Costs Tab ──────────────────────────────────────────────────────────────

function fmtT(n) {
  if (!n || n === 0) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}
function fmtC(n) { return `USD ${Number(n ?? 0).toFixed(2)}`; }

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

function CostsTab({ usage, events }) {
  const { total = {}, byFeature = [] } = usage ?? {};
  const maxCost = byFeature[0]?.cost ?? 1;

  const now = Date.now();
  const DAY = 86400000;
  const todayEvents = (events ?? []).filter((e) => now - new Date(e.createdAt).getTime() < DAY);
  const weekEvents  = (events ?? []).filter((e) => now - new Date(e.createdAt).getTime() < 7 * DAY && now - new Date(e.createdAt).getTime() >= DAY);

  function groupByFeature(evts) {
    const map = {};
    for (const e of evts) {
      const k = `${e.product}:${e.feature}`;
      if (!map[k]) map[k] = { label: e.feature, product: e.product, calls: 0, cost: 0, tokens: 0 };
      map[k].calls++;
      map[k].cost += e.cost ?? 0;
      map[k].tokens += (e.inputTokens ?? 0) + (e.outputTokens ?? 0);
    }
    return Object.values(map).sort((a, b) => b.cost - a.cost);
  }

  const LABELS = { chat: 'Discovery Chat', executive_summary: 'Executive Summary', diagnosis: 'Diagnóstico', summary: 'Resumen', insights: 'Insights', transversals: 'Patrones Transversales' };

  function EventGroup({ title, evts }) {
    if (!evts.length) return null;
    const grouped = groupByFeature(evts);
    return (
      <div className="cost-event-group">
        <div className="cost-event-period">{title}</div>
        {grouped.map((g) => (
          <div key={`${g.product}:${g.label}`} className="cost-event-row">
            <span className="cost-event-feature">{LABELS[g.label] ?? g.label}</span>
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
      {/* Global stat cards */}
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

      {/* By feature */}
      {byFeature.length > 0 && (
        <div className="cost-tab-section">
          <div className="cost-tab-section-title">Por funcionalidad</div>
          {byFeature.map((f) => (
            <div key={`${f.product}:${f.feature}`} className="cost-feature-row">
              <span className="cost-feature-label">{LABELS[f.feature] ?? f.feature}</span>
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

export default function TenantDetail({ meta, profile, conversations, allLearnings = [], participantMap = {}, knowledgeQuality = {}, recentSession = null, changeCounts = {}, recentLearnings = [], ariaInvestigations = [], tenantUsage = null, usageEvents = [] }) {
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

        {/* Documentos Tab */}
        {activeTab === 2 && (
          <div className="admin-conv-empty">
            <div style={{ fontSize: 28, opacity: 0.2, marginBottom: 10 }}>📄</div>
            Documentos — Próximamente en V2
          </div>
        )}

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
        {activeTab === 7 && <CostsTab usage={tenantUsage} events={usageEvents} />}

      </div>
    </>
  );
}
