'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import KaiClientChat from './KaiClientChat';
import DemoChatPlayer from './DemoChatPlayer';
import { getDemoProgression } from '@/lib/kai/demoScripts';
import '../kai.css';

function mergeProfile(base, patch) {
  const result = { ...base };
  for (const [key, val] of Object.entries(patch)) {
    if (val && typeof val === 'object' && !Array.isArray(val) && result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
      result[key] = { ...result[key], ...val };
    } else {
      result[key] = val;
    }
  }
  return result;
}

// ── Tabler-style outline icons (inline SVG) ────────────────────────────────

const Icon = ({ path, size = 15, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    {path}
  </svg>
);

const IconDashboard   = (p) => <Icon {...p} path={<><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></>} />;
const IconMessage     = (p) => <Icon {...p} path={<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>} />;
const IconBuilding    = (p) => <Icon {...p} path={<><path d="M3 21h18M9 8h1m-1 4h1m4-4h1m-1 4h1M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/></>} />;
const IconBulb        = (p) => <Icon {...p} path={<><path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 7 7 7 7 0 0 1-3.5 6.06V17a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-1.94A7 7 0 0 1 5 9a7 7 0 0 1 7-7z"/></>} />;
const IconFileText    = (p) => <Icon {...p} path={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></>} />;
const IconUsers       = (p) => <Icon {...p} path={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>} />;
const IconHistory     = (p) => <Icon {...p} path={<><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4"/></>} />;
const IconNetwork     = (p) => <Icon {...p} path={<><circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><line x1="12" y1="7" x2="5" y2="17"/><line x1="12" y1="7" x2="19" y2="17"/><line x1="5" y1="19" x2="19" y2="19"/></>} />;
const IconChevron     = (p) => <Icon {...p} path={<><polyline points="6 9 12 15 18 9"/></>} />;

// ── Knowledge score computation ────────────────────────────────────────────

const AREAS = [
  { id: 'negocio',     label: 'Negocio',           checks: [(p) => p?.general?.model, (p) => p?.general?.size, (p) => p?.general?.industry, (p) => p?.objectives?.shortTerm?.length, (p) => p?.objectives?.mediumTerm?.length, (p) => p?.objectives?.longTerm?.length] },
  { id: 'operaciones', label: 'Operaciones',        checks: [(p) => p?.processes?.length, (p) => p?.initiatives?.length, (p) => p?.decisions?.length] },
  { id: 'tecnologia',  label: 'Tecnología',         checks: [(p) => p?.technology?.length, (p) => p?.general?.digitalMaturity] },
  { id: 'finanzas',    label: 'Finanzas',           checks: [(p) => p?.kpis?.length, (p) => p?.risks?.length] },
  { id: 'marketing',   label: 'Marketing / ventas', checks: [(p) => p?.opportunities?.length, (p) => p?.pains?.length] },
  { id: 'personas',    label: 'Personas',           checks: [(p) => p?.stakeholders?.length] },
];

const AREA_COLORS = ['#1D9E75', '#378ADD', '#BA7517', '#1D9E75', '#378ADD', '#BA7517'];

const AREA_ID_MAP = {
  'tecnología': 'tecnologia', 'tecnologia': 'tecnologia',
  'negocio': 'negocio', 'operaciones': 'operaciones',
  'finanzas': 'finanzas', 'marketing': 'marketing',
  'personas': 'personas',
};

function areaScore(area, profile, learnings = []) {
  const profileFilled = area.checks.filter((fn) => fn(profile)).length;
  const areaLearnings = learnings.filter(
    (l) => (AREA_ID_MAP[l.area?.toLowerCase()?.trim()] ?? l.area?.toLowerCase()?.trim()) === area.id
  ).length;
  const profilePts = (profileFilled / area.checks.length) * 70;
  const learningPts = Math.min(30, areaLearnings * 15);
  return Math.round(profilePts + learningPts);
}

function overallScore(profile, learnings = []) {
  const scores = AREAS.map((a) => areaScore(a, profile, learnings));
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function confidenceLabel(score) {
  if (score >= 80) return 'Alta';
  if (score >= 60) return 'Media-alta';
  if (score >= 40) return 'Media';
  return 'Baja';
}

// ── Nav config ─────────────────────────────────────────────────────────────

const NAV = [
  { id: 'resumen',      label: 'Resumen',                icon: IconDashboard },
  { id: 'chat',         label: 'Conversar con Kai',      icon: IconMessage },
  { id: 'conocimiento', label: 'Conocimiento',           icon: IconBuilding },
  { id: 'aprendizajes', label: 'Aprendizajes',           icon: IconBulb },
  { id: 'ejecutivo',    label: 'Resumen ejecutivo',      icon: IconFileText },
  { id: 'participantes',label: 'Participantes',          icon: IconUsers },
  { id: 'historial',    label: 'Historial',              icon: IconHistory },
];

// ── Shared primitives ──────────────────────────────────────────────────────

function KaiAvatarSvg({ size = 32 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--kai-surface)', border: '0.5px solid var(--kai-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="3" fill="#1D9E75"/>
        <circle cx="12" cy="4"  r="2" fill="#1D9E75" opacity="0.7"/>
        <circle cx="19.2" cy="16" r="2" fill="#1D9E75" opacity="0.7"/>
        <circle cx="4.8"  cy="16" r="2" fill="#1D9E75" opacity="0.7"/>
        <line x1="12" y1="9"   x2="12"   y2="6"  stroke="#1D9E75" strokeWidth="1" opacity="0.5"/>
        <line x1="14.5" y1="13.5" x2="17.5" y2="15" stroke="#1D9E75" strokeWidth="1" opacity="0.5"/>
        <line x1="9.5"  y1="13.5" x2="6.5"  y2="15" stroke="#1D9E75" strokeWidth="1" opacity="0.5"/>
      </svg>
    </div>
  );
}

function Badge({ children, variant = 'neutral' }) {
  return <span className={`kcv-badge kcv-badge-${variant}`}>{children}</span>;
}

function FieldRow({ label, value, confidence }) {
  if (!value) return null;
  return (
    <div className="kcv-field-row">
      <span className="kcv-field-label">{label}</span>
      <span className="kcv-field-value">{Array.isArray(value) ? value.join(', ') : value}</span>
      {confidence && <span className="kcv-field-confidence">{confidence}</span>}
    </div>
  );
}

// ── Sections ───────────────────────────────────────────────────────────────

// Topics per area — maps area.id → [{ label, check }]
const AREA_TOPICS = {
  negocio:     [
    { label: 'Modelo de negocio',       check: (p) => p?.general?.model },
    { label: 'Tamaño de empresa',       check: (p) => p?.general?.size },
    { label: 'Industria',               check: (p) => p?.general?.industry },
    { label: 'Objetivos corto plazo',   check: (p) => p?.objectives?.shortTerm?.length },
    { label: 'Objetivos mediano plazo', check: (p) => p?.objectives?.mediumTerm?.length },
    { label: 'Objetivos largo plazo',   check: (p) => p?.objectives?.longTerm?.length },
  ],
  operaciones: [
    { label: 'Procesos críticos',   check: (p) => p?.processes?.length },
    { label: 'Iniciativas activas', check: (p) => p?.initiatives?.length },
    { label: 'Decisiones clave',    check: (p) => p?.decisions?.length },
  ],
  tecnologia:  [
    { label: 'Stack tecnológico', check: (p) => p?.technology?.length },
    { label: 'Madurez digital',   check: (p) => p?.general?.digitalMaturity },
  ],
  finanzas:    [
    { label: 'KPIs financieros',      check: (p) => p?.kpis?.length },
    { label: 'Riesgos identificados', check: (p) => p?.risks?.length },
  ],
  marketing:   [
    { label: 'Oportunidades',       check: (p) => p?.opportunities?.length },
    { label: 'Dolores del cliente', check: (p) => p?.pains?.length },
  ],
  personas:    [
    { label: 'Stakeholders clave', check: (p) => p?.stakeholders?.length },
  ],
};

const GAP_DESCRIPTIONS = {
  negocio:     'Sin claridad sobre el modelo de negocio, industria o proyección estratégica.',
  operaciones: 'Procesos internos poco documentados. Sin claridad sobre cuellos de botella.',
  tecnologia:  'Kai desconoce el stack técnico, deuda técnica y capacidad de escalar el producto.',
  finanzas:    'Sin información sobre costos reales, márgenes o proyecciones financieras.',
  marketing:   'Pipeline conocido superficialmente. Sin métricas de conversión ni canales definidos.',
  personas:    'No se han identificado los decisores clave ni sus áreas de influencia.',
};

const GAP_SUGGESTIONS = {
  negocio:     'Explorar modelo de negocio, industria y objetivos estratégicos',
  operaciones: 'Mapear el flujo operativo completo',
  tecnologia:  'Entrevistar al equipo técnico sobre arquitectura y roadmap',
  finanzas:    'Sesión sobre unit economics, márgenes y proyecciones',
  marketing:   'Revisar métricas comerciales y canales de adquisición',
  personas:    'Identificar decisores clave y sus áreas de influencia',
};

function CoverageAreaRow({ area, profile }) {
  const topics  = AREA_TOPICS[area.id] ?? [];
  const covered = topics.filter((t) => t.check(profile));
  const missing  = topics.filter((t) => !t.check(profile));
  const fillColor = area.score >= 70 ? '#1D9E75' : area.score > 0 ? area.color : 'transparent';
  return (
    <div className="kcv-cov-row">
      <div className="kcv-cov-header">
        <span className="kcv-cov-area-name">{area.label}</span>
        <div className="kcv-cov-bar-track">
          <div className="kcv-cov-bar-fill" style={{ width: `${area.score}%`, background: fillColor }} />
        </div>
        <span className="kcv-cov-pct" style={{ color: area.score >= 70 ? '#1D9E75' : 'var(--kai-text-faint)' }}>
          {area.score}%
        </span>
      </div>
      {topics.length > 0 && (covered.length > 0 || missing.length > 0) && (
        <div className="kcv-cov-topics">
          {covered.map((t, i) => (
            <span key={i} className="kcv-cov-topic kcv-cov-topic--covered">✓ {t.label}</span>
          ))}
          {missing.map((t, i) => (
            <span key={i} className="kcv-cov-topic kcv-cov-topic--missing">{t.label}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function GapCard({ area }) {
  const severity = area.score < 20 ? 'Crítico' : area.score < 50 ? 'Medio' : 'Bajo';
  const sevColor = severity === 'Crítico' ? '#E8734A' : severity === 'Medio' ? '#D4A017' : '#6B7280';
  const sevClass = severity === 'Crítico' ? 'kcv-gap-card--critico' : severity === 'Medio' ? 'kcv-gap-card--medio' : 'kcv-gap-card--bajo';
  return (
    <div className={`kcv-gap-card ${sevClass}`}>
      <div className="kcv-gap-header">
        <span className="kcv-gap-area-name">{area.label}</span>
        <span className="kcv-gap-severity" style={{ color: sevColor, background: `${sevColor}28` }}>
          {severity}
        </span>
      </div>
      <p className="kcv-gap-desc">{GAP_DESCRIPTIONS[area.id]}</p>
      <div className="kcv-gap-suggestion">→ {GAP_SUGGESTIONS[area.id]}</div>
    </div>
  );
}

const LEARNING_CHIP = {
  aprendizaje: { icon: '💡', label: 'Aprendizaje', color: '#6EE7B7', bg: '#0A2318' },
  dolor:       { icon: '⚠️', label: 'Dolor',        color: '#F4A48A', bg: '#2B1210' },
  oportunidad: { icon: '🚀', label: 'Oportunidad',  color: '#C4B5FD', bg: '#1A1533' },
};

function learningChipType(l) {
  if (l.type === 'dolor')       return 'dolor';
  if (l.type === 'oportunidad') return 'oportunidad';
  return 'aprendizaje';
}

function LearningsAreaGroup({ area, areaLearnings, areaColor, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const count = areaLearnings.length;
  return (
    <div className="kcv-lag">
      <button className="kcv-lag-header" onClick={() => setOpen((v) => !v)}>
        <span className="kcv-lag-dot" style={{ background: areaColor }} />
        <span className="kcv-lag-name">{area.label}</span>
        <span className="kcv-lag-count-text">{count} aprendizaje{count !== 1 ? 's' : ''}</span>
        <IconChevron size={12} style={{ color: 'var(--kai-text-faint)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
      </button>
      {open && (
        <div className="kcv-lag-items">
          {areaLearnings.map((l, i) => {
            const chip = LEARNING_CHIP[learningChipType(l)];
            return (
              <div key={i} className="kcv-lag-item">
                <span className="kcv-lag-tag" style={{ color: chip.color, background: chip.bg }}>
                  {chip.icon} {chip.label}
                </span>
                <span className="kcv-lag-content">{l.content}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Top findings ───────────────────────────────────────────────────────────

const FINDING_CHIP = {
  riesgo:      { icon: '⚠️', label: 'Riesgo',      color: '#F4A48A', bg: '#2B1210' },
  oportunidad: { icon: '🚀', label: 'Oportunidad', color: '#C4B5FD', bg: '#1A1533' },
  aprendizaje: { icon: '💡', label: 'Aprendizaje', color: '#6EE7B7', bg: '#0A2318' },
};

function FindingRow({ type, text }) {
  const chip = FINDING_CHIP[type] ?? FINDING_CHIP.aprendizaje;
  return (
    <div className="kcv-finding-row">
      <span className="kcv-finding-chip" style={{ color: chip.color, background: chip.bg }}>
        {chip.icon} {chip.label}
      </span>
      <span className="kcv-finding-text">{text}</span>
    </div>
  );
}

function TopFindings({ profile, learnings, transversals = [] }) {
  const findings = [];
  for (const r of (profile?.risks ?? []).slice(0, 2))
    findings.push({ type: 'riesgo', text: r });
  for (const o of (profile?.opportunities ?? []).slice(0, 2))
    findings.push({ type: 'oportunidad', text: o });
  const highLearnings = learnings.filter((l) => l.impact === 'alto').slice(0, 2);
  for (const l of highLearnings)
    findings.push({ type: 'aprendizaje', text: l.content });
  if (findings.length < 3) {
    const rest = learnings.filter((l) => l.impact !== 'alto').slice(0, 3 - findings.length);
    for (const l of rest) findings.push({ type: 'aprendizaje', text: l.content });
  }
  const hasContent = transversals.length > 0 || findings.length > 0;
  if (!hasContent) return null;
  return (
    <div>
      <div className="kcv-resumen-section-header">
        <span className="kcv-resumen-section-title">Hallazgos clave</span>
        <span className="kcv-resumen-section-sub">Top {Math.min(findings.length + transversals.length, 5)} señales del diagnóstico</span>
      </div>
      {transversals.slice(0, 2).map((t, i) => (
        <div key={i} className="kcv-topfinding-transversal">
          <div className="kcv-topfinding-transversal-header">
            <IconNetwork size={11} style={{ color: '#20C997' }} />
            <span className="kcv-topfinding-transversal-badge">Transversal</span>
            <span className="kcv-topfinding-transversal-sources">{t.sources_count} fuentes</span>
          </div>
          <p className="kcv-topfinding-transversal-title">{t.title}</p>
          <div className="kcv-topfinding-transversal-participants">
            {t.participants?.map((p, j) => <span key={j} className="kcv-topfinding-transversal-chip">{p}</span>)}
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: transversals.length ? 8 : 0 }}>
        {findings.slice(0, 5 - Math.min(transversals.length, 2)).map((f, i) => <FindingRow key={i} type={f.type} text={f.text} />)}
      </div>
    </div>
  );
}

// ── Risk / opportunity item ─────────────────────────────────────────────────

function RiskOppItem({ text, type, impact }) {
  const borderColor = type === 'riesgo' ? '#E8734A' : '#9B8FE4';
  const impactColor = impact === 'Alto' ? '#F87171' : '#F59E0B';
  return (
    <div className="kcv-riskop-item" style={{ borderLeftColor: borderColor }}>
      <div className="kcv-riskop-title">{text}</div>
      <span className="kcv-riskop-badge" style={{ color: impactColor, background: `${impactColor}18` }}>
        {impact}
      </span>
    </div>
  );
}

// ── Next session recommendation ────────────────────────────────────────────

const NEXT_SESSION_OBJECTIVES = {
  negocio:     'Entender el modelo de negocio, tamaño de mercado y objetivos estratégicos.',
  operaciones: 'Mapear los procesos clave, iniciativas en curso y cuellos de botella operativos.',
  tecnologia:  'Evaluar el stack tecnológico, madurez digital y bloqueadores técnicos.',
  finanzas:    'Entender la estructura de costos, márgenes y KPIs financieros clave.',
  marketing:   'Analizar el embudo de ventas, canales de adquisición y propuesta de valor.',
  personas:    'Conocer el equipo, estructura organizacional y dinámica de la empresa.',
};

function computeNextSession(profile, learnings) {
  const scored = AREAS.map((a, i) => ({
    ...a,
    score: areaScore(a, profile, learnings),
  }));

  const pending = scored.filter((a) => a.score < 70).sort((a, b) => a.score - b.score);
  if (!pending.length) return null;

  const target = pending[0];
  const risks  = profile?.risks ?? [];
  const relatedRisks = risks.filter((r) => {
    const text = (typeof r === 'string' ? r : (r.description ?? r.title ?? '')).toLowerCase();
    return text.includes(target.id) || text.includes(target.label.toLowerCase().split('/')[0].trim());
  }).length;

  const justification = relatedRisks > 0
    ? `${target.label} tiene solo ${target.score}% de cobertura y existen ${relatedRisks} riesgo${relatedRisks !== 1 ? 's' : ''} cuya validación depende de información de esta área.`
    : `${target.label} tiene solo ${target.score}% de cobertura — el área con menor conocimiento acumulado.`;

  const stakeholders = (profile?.stakeholders ?? []).slice(0, 2).map(
    (s) => (typeof s === 'string' ? s : (s.name ?? ''))
  ).filter(Boolean);

  const estimatedMinutes = target.score === 0 ? 20 : target.score < 40 ? 15 : 10;

  return {
    area:                target.id,
    label:               target.label,
    score:               target.score,
    objective:           NEXT_SESSION_OBJECTIVES[target.id] ?? `Profundizar el conocimiento sobre ${target.label}.`,
    suggestedParticipants: stakeholders,
    estimatedMinutes,
    justification,
  };
}

function NextSessionBlock({ profile, learnings, onStart }) {
  const session = computeNextSession(profile, learnings);
  if (!session) return null;

  return (
    <div className="kcv-next-session">
      <div className="kcv-resumen-section-header">
        <span className="kcv-resumen-section-title">Próxima sesión recomendada</span>
      </div>

      <div className="kcv-next-session-card">
        <div className="kcv-next-session-area-row">
          <span className="kcv-next-session-area-name">{session.label}</span>
          <span className="kcv-next-session-area-pct">{session.score}% cubierto</span>
        </div>

        <div className="kcv-next-session-field">
          <span className="kcv-next-session-field-label">Objetivo</span>
          <span className="kcv-next-session-field-value">{session.objective}</span>
        </div>

        {session.suggestedParticipants.length > 0 && (
          <div className="kcv-next-session-field">
            <span className="kcv-next-session-field-label">Participantes sugeridos</span>
            <div className="kcv-next-session-chips">
              {session.suggestedParticipants.map((name, i) => (
                <span key={i} className="kcv-next-session-chip">{name}</span>
              ))}
            </div>
          </div>
        )}

        <div className="kcv-next-session-field">
          <span className="kcv-next-session-field-label">Tiempo estimado</span>
          <span className="kcv-next-session-field-value">{session.estimatedMinutes} minutos</span>
        </div>

        <div className="kcv-next-session-why">
          <span className="kcv-next-session-why-label">¿Por qué esta sesión?</span>
          <p className="kcv-next-session-why-text">{session.justification}</p>
        </div>

        <button className="kcv-next-session-cta" onClick={() => onStart?.(session)}>
          Iniciar esta sesión →
        </button>
      </div>
    </div>
  );
}

// ── ResumenSection ──────────────────────────────────────────────────────────

// ── MobileCard — collapsible section card (mobile only) ───────────────────

function MobileCard({ title, subtitle, badge, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="kcv-mobile-card">
      {/* Mobile: collapsible toggle (hidden on desktop via CSS) */}
      <button className="kcv-mc-toggle" onClick={() => setOpen((v) => !v)}>
        <div className="kcv-mc-toggle-text">
          <span className="kcv-mc-toggle-title">{title}</span>
          {subtitle && <span className="kcv-mc-toggle-sub">{subtitle}</span>}
        </div>
        {badge != null && <span className="kcv-mc-badge">{badge}</span>}
        <span style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
          <IconChevron size={14} style={{ color: 'var(--kai-text-faint)', display: 'block' }} />
        </span>
      </button>
      {/* Body: always visible on desktop (CSS), toggle on mobile */}
      <div className={`kcv-mc-body${open ? ' kcv-mc-body--open' : ''}`}>
        {children}
      </div>
    </div>
  );
}

// ── ResumenSection ──────────────────────────────────────────────────────────

function ResumenSection({ profile, tenantMeta, learnings = [], transversals = [], onStartSession }) {
  const [coverageOpen, setCoverageOpen] = useState(false);

  const score      = overallScore(profile, learnings);
  const areaScores = AREAS.map((a, i) => ({ ...a, score: areaScore(a, profile, learnings), color: AREA_COLORS[i] }));
  const sortedAreas = [...areaScores].sort((a, b) => b.score - a.score);
  const gaps        = sortedAreas.filter((a) => a.score < 70);

  const risks        = profile?.risks ?? [];
  const opps         = profile?.opportunities ?? [];
  const stakeholders = profile?.stakeholders ?? [];

  const hasFindingsContent = transversals.length > 0 || risks.length > 0 || opps.length > 0 || learnings.length > 0;

  return (
    <div className="kcv-resumen-sections">

      {/* 1 — Métricas: 3×2 desktop / 2×2 mobile */}
      <div className="kcv-metrics-grid">
        <div className="kcv-metric-card">
          <div className="kcv-metric-label">Entendimiento</div>
          <div className="kcv-metric-value green">{score}%</div>
          <div className="kcv-metric-sub">{areaScores.filter((a) => a.score > 0).length} áreas</div>
        </div>
        <div className="kcv-metric-card">
          <div className="kcv-metric-label">Aprendizajes</div>
          <div className="kcv-metric-value">{learnings.length || '—'}</div>
          <div className="kcv-metric-sub">por Kai</div>
        </div>
        <div className="kcv-metric-card">
          <div className="kcv-metric-label">Riesgos</div>
          <div className={`kcv-metric-value${risks.length > 0 ? ' red' : ''}`}>{risks.length}</div>
          <div className="kcv-metric-sub">detectados</div>
        </div>
        <div className="kcv-metric-card kcv-metric-hide-mobile">
          <div className="kcv-metric-label">Oportunidades</div>
          <div className="kcv-metric-value">{opps.length || '—'}</div>
          <div className="kcv-metric-sub">identificadas</div>
        </div>
        <div className="kcv-metric-card kcv-metric-hide-mobile">
          <div className="kcv-metric-label">Stakeholders</div>
          <div className="kcv-metric-value">{stakeholders.length || '—'}</div>
          <div className="kcv-metric-sub">personas</div>
        </div>
        <div className="kcv-metric-card">
          <div className="kcv-metric-label">Confianza</div>
          <div className="kcv-metric-value" style={{ fontSize: 16 }}>{confidenceLabel(score)}</div>
          <div className="kcv-metric-sub">{score}% cobertura</div>
        </div>
      </div>

      {/* 2 — Hallazgos clave */}
      {hasFindingsContent && (
        <MobileCard title="Hallazgos clave">
          <TopFindings profile={profile} learnings={learnings} transversals={transversals} />
        </MobileCard>
      )}

      {/* 3 — Riesgos y oportunidades */}
      {(risks.length > 0 || opps.length > 0) && (
        <MobileCard title="Riesgos y oportunidades">
          <div className="kcv-resumen-section-header">
            <span className="kcv-resumen-section-title">Riesgos y oportunidades</span>
          </div>
          <div className="kcv-risks-opps-grid">
            <div>
              <div className="kcv-riskop-col-title" style={{ color: '#E8734A' }}>⚠️ Riesgos</div>
              {risks.length > 0
                ? risks.map((r, i) => <RiskOppItem key={i} text={r} type="riesgo" impact={i === 0 ? 'Alto' : 'Medio'} />)
                : <p className="kcv-riskop-empty">No se han detectado riesgos aún.</p>}
            </div>
            <div>
              <div className="kcv-riskop-col-title" style={{ color: '#9B8FE4' }}>🚀 Oportunidades</div>
              {opps.length > 0
                ? opps.map((o, i) => <RiskOppItem key={i} text={o} type="oportunidad" impact={i === 0 ? 'Alto' : 'Medio'} />)
                : <p className="kcv-riskop-empty">No se han detectado oportunidades aún.</p>}
            </div>
          </div>
        </MobileCard>
      )}

      {/* 4 — Stakeholders */}
      {stakeholders.length > 0 && (
        <MobileCard title="Stakeholders" badge={`${stakeholders.length} persona${stakeholders.length !== 1 ? 's' : ''}`}>
          <div className="kcv-resumen-section-header">
            <span className="kcv-resumen-section-title">Stakeholders identificados</span>
            <span className="kcv-resumen-section-sub">{stakeholders.length} persona{stakeholders.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="kcv-stakeholders-grid">
            {stakeholders.map((s, i) => {
              const name     = typeof s === 'string' ? s : (s.name ?? '');
              const roles    = typeof s === 'string' ? [] : (s.roles ?? []);
              const initials = name.split(' ').filter(Boolean).filter(w => /^[a-zA-ZÀ-ÿ]/.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
              return (
                <div key={i} className="kcv-stakeholder-card">
                  <div className="kcv-stakeholder-avatar">{initials}</div>
                  <div className="kcv-stakeholder-info">
                    <span className="kcv-stakeholder-name">{name}</span>
                    {roles.length > 0 && <span className="kcv-stakeholder-role-inline">{roles[0]}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </MobileCard>
      )}

      {/* 5 — Cobertura por área */}
      <MobileCard title="Cobertura por área">
        {/* Desktop: colapsable toggle (hidden on mobile via CSS) */}
        <button onClick={() => setCoverageOpen((v) => !v)} className="kcv-resumen-section-header kcv-resumen-section-toggle">
          <span className="kcv-resumen-section-title">Cobertura por área</span>
          <span className="kcv-resumen-section-caret">{coverageOpen ? '▼' : '▶'}</span>
        </button>
        {!coverageOpen && (
          <div className="kcv-coverage-preview">
            {sortedAreas.slice(0, 3).map((a, i) => (
              <span key={a.id} className="kcv-coverage-preview-item">
                {i > 0 && <span className="kcv-coverage-preview-sep">|</span>}
                <span className="kcv-coverage-preview-label">{a.label}</span>
                <span className="kcv-coverage-preview-pct">{a.score}%</span>
                <span className="kcv-coverage-preview-bar">
                  <span className="kcv-coverage-preview-fill" style={{ width: `${a.score}%`, background: a.color }} />
                </span>
              </span>
            ))}
            {sortedAreas.length > 3 && <span className="kcv-coverage-preview-more">+{sortedAreas.length - 3} más</span>}
          </div>
        )}
        {coverageOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {sortedAreas.map((a) => <CoverageAreaRow key={a.id} area={a} profile={profile} />)}
          </div>
        )}
        {/* Mobile: always show full list inside MobileCard body */}
        <div className="kcv-mc-coverage-full">
          {sortedAreas.map((a) => <CoverageAreaRow key={a.id} area={a} profile={profile} />)}
        </div>
      </MobileCard>

      {/* 6 — Vacíos de conocimiento */}
      {gaps.length > 0 && (
        <MobileCard title="Vacíos de conocimiento" subtitle="Qué aprender después">
          <div className="kcv-resumen-section-header">
            <span className="kcv-resumen-section-title">Vacíos de conocimiento</span>
            <span className="kcv-resumen-section-sub">Qué debería aprender Kai a continuación</span>
          </div>
          <div className="kcv-gap-grid">
            {gaps.map((a) => <GapCard key={a.id} area={a} />)}
          </div>
        </MobileCard>
      )}

      {/* 7 — Próxima sesión recomendada */}
      <MobileCard title="Próxima sesión recomendada">
        <NextSessionBlock profile={profile} learnings={learnings} onStart={onStartSession} />
      </MobileCard>

    </div>
  );
}

function ConfidenceBadge({ score }) {
  const { label, color } = score >= 70
    ? { label: 'Alta confianza',  color: '#1D9E75' }
    : score >= 40
    ? { label: 'Confianza media', color: '#E0A352' }
    : { label: 'Baja confianza',  color: '#9CA3AF' };
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
      color, background: `${color}18`, border: `0.5px solid ${color}40`,
      letterSpacing: '0.03em',
    }}>
      {label}
    </span>
  );
}

function SectionHeader({ title, score }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <span style={{ fontSize: 12, color: 'var(--kai-text-muted)' }}>{title}</span>
      {score !== undefined && <ConfidenceBadge score={score} />}
    </div>
  );
}

function ConocimientoSection({ profile, learnings = [] }) {
  const g   = profile?.general ?? {};
  const obj = profile?.objectives ?? {};
  const allEmpty = !g.industry && !g.model && !g.country && !obj.shortTerm?.length;

  const scoreFor = (areaId) => {
    const area = AREAS.find((a) => a.id === areaId);
    return area ? areaScore(area, profile, learnings) : 0;
  };

  if (allEmpty) {
    return (
      <p style={{ fontSize: 13, color: 'var(--kai-text-muted)', lineHeight: 1.7 }}>
        Kai aún está construyendo el conocimiento sobre tu empresa. Conversa con Kai para que pueda aprender más.
      </p>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <SectionHeader title="Información general" score={scoreFor('negocio')} />
        <FieldRow label="Industria"       value={g.industry} />
        <FieldRow label="Modelo"          value={g.model} />
        <FieldRow label="País"            value={g.country} />
        <FieldRow label="Tamaño"          value={g.size} />
        <FieldRow label="Madurez digital" value={g.digitalMaturity} />
      </div>

      {(obj.shortTerm?.length || obj.mediumTerm?.length || obj.longTerm?.length) && (
        <div style={{ marginBottom: 20 }}>
          <SectionHeader title="Objetivos estratégicos" score={scoreFor('negocio')} />
          {obj.shortTerm?.map((v, i)  => <FieldRow key={i} label="Corto plazo"    value={v} />)}
          {obj.mediumTerm?.map((v, i) => <FieldRow key={i} label="Mediano plazo"  value={v} />)}
          {obj.longTerm?.map((v, i)   => <FieldRow key={i} label="Largo plazo"    value={v} />)}
        </div>
      )}

      {profile?.pains?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <SectionHeader title="Dolores identificados" score={scoreFor('marketing')} />
          {profile.pains.map((v, i) => <FieldRow key={i} label={`#${i + 1}`} value={v} />)}
        </div>
      )}

      {profile?.risks?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <SectionHeader title="Riesgos detectados" score={scoreFor('finanzas')} />
          {profile.risks.map((v, i) => <FieldRow key={i} label={`#${i + 1}`} value={v} />)}
        </div>
      )}

      {profile?.opportunities?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <SectionHeader title="Oportunidades identificadas" score={scoreFor('marketing')} />
          {profile.opportunities.map((v, i) => <FieldRow key={i} label={`#${i + 1}`} value={v} />)}
        </div>
      )}

      {profile?.technology?.length > 0 && (
        <div>
          <SectionHeader title="Herramientas detectadas" score={scoreFor('tecnologia')} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {profile.technology.map((t, i) => (
              <span key={i} style={{ padding: '3px 10px', borderRadius: 10, fontSize: 12, background: 'var(--kai-surface)', border: '0.5px solid var(--kai-border)', color: 'var(--kai-text-muted)' }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TransversalCard({ t }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(t.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  return (
    <div className="kcv-transversal-card">
      <div className="kcv-transversal-badge-row">
        <IconNetwork size={12} style={{ color: '#20C997' }} />
        <span className="kcv-transversal-badge">Transversal</span>
        <span className="kcv-transversal-sources">{t.sources_count} fuentes</span>
        <Badge variant={t.impact === 'alto' ? 'red' : t.impact === 'medio' ? 'amber' : 'neutral'}>{t.impact}</Badge>
        <span className="kcv-transversal-date">{date}</span>
      </div>
      <div className="kcv-transversal-title">{t.title}</div>
      {t.description && <p className="kcv-transversal-desc">{t.description}</p>}
      {t.participants?.length > 0 && (
        <div className="kcv-transversal-participants">
          {t.participants.map((p, i) => (
            <span key={i} className="kcv-transversal-participant-chip">{p}</span>
          ))}
        </div>
      )}
      {t.evidence?.length > 0 && (
        <div className="kcv-transversal-evidence-section">
          <button className="kcv-transversal-evidence-toggle" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Ocultar evidencias' : `Ver ${t.evidence.length} evidencia${t.evidence.length !== 1 ? 's' : ''}`}
            <IconChevron size={10} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>
          {expanded && (
            <ul className="kcv-transversal-evidence-list">
              {t.evidence.map((ev, i) => (
                <li key={i} className="kcv-transversal-evidence-item">"{ev}"</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

const APRENDIZAJES_FILTERS = [
  { id: 'todos',         label: 'Todos',            color: '#1D9E75', bg: '#0A2318', border: '#1D9E7540' },
  { id: 'dolores',       label: '⚠️ Dolores',        color: '#E07B5A', bg: '#2A1208', border: '#E07B5A40' },
  { id: 'oportunidades', label: '🚀 Oportunidades',  color: '#9B8FE4', bg: '#1A1533', border: '#9B8FE440' },
  { id: 'transversales', label: '🔗 Transversales',  color: '#7B9FE0', bg: '#1a1a2e', border: '#7B9FE040' },
];

const PARTICIPANT_AVATAR_COLORS = [
  { bg: '#0A2318', color: '#20C997' },
  { bg: '#0F1D2E', color: '#378ADD' },
  { bg: '#1C1C1C', color: '#9CA3AF' },
  { bg: '#1A1533', color: '#9B8FE4' },
  { bg: '#2A1A0A', color: '#E0A352' },
];

function TransversalGroup({ transversals, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="kcv-lag">
      <button className="kcv-lag-header" onClick={() => setOpen((v) => !v)}>
        <IconNetwork size={10} style={{ color: '#7B9FE0', flexShrink: 0 }} />
        <span className="kcv-lag-name">Transversales</span>
        <span className="kcv-lag-count-text">
          {transversals.length} transversal{transversals.length !== 1 ? 'es' : ''}
        </span>
        <IconChevron size={14} style={{ color: 'var(--kai-text-faint)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
      </button>
      {open && (
        <div className="kcv-lag-body" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 12px 12px' }}>
          {transversals.map((t) => (
            <div key={t.id} className="kcv-featured-trans">
              <div className="kcv-featured-trans-header">
                <IconNetwork size={12} style={{ color: '#7B9FE0', flexShrink: 0 }} />
                <span className="kcv-featured-trans-label">Aprendizaje transversal</span>
                {t.sources_count > 0 && <span className="kcv-featured-trans-count">{t.sources_count} fuentes</span>}
              </div>
              <p className="kcv-featured-trans-title">{t.title}</p>
              {t.description && <p className="kcv-featured-trans-desc">{t.description}</p>}
              {t.participants?.length > 0 && (
                <div className="kcv-featured-trans-chips">
                  {t.participants.map((p, i) => <span key={i} className="kcv-featured-trans-chip">{p}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AprendizajesSection({ tenant }) {
  const [learnings, setLearnings]       = useState(null);
  const [transversals, setTransversals] = useState(null);
  const [filter, setFilter]             = useState('todos');

  useEffect(() => {
    Promise.all([
      fetch(`/api/kai/${tenant}/learnings`).then((r) => r.json()).then((d) => d.learnings ?? []),
      fetch(`/api/kai/${tenant}/transversals`).then((r) => r.json()).then((d) => d.transversals ?? []),
    ])
      .then(([ls, ts]) => { setLearnings(ls); setTransversals(ts); })
      .catch(() => { setLearnings([]); setTransversals([]); });
  }, [tenant]);

  if (!learnings || !transversals) return <p style={{ fontSize: 13, color: 'var(--kai-text-muted)' }}>Cargando…</p>;

  // Dynamic chips: Todos + areas that have learnings + Transversales if they exist
  const availableFilters = [
    { id: 'todos', label: 'Todos', color: '#1D9E75', bg: '#0A2318', border: '#1D9E7540' },
    ...AREAS
      .map((a, i) => ({ ...a, color: AREA_COLORS[i], bg: `${AREA_COLORS[i]}18`, border: `${AREA_COLORS[i]}40` }))
      .filter((a) => learnings.some((l) => {
        const aId = AREA_ID_MAP[l.area?.toLowerCase()?.trim()] ?? l.area?.toLowerCase()?.trim();
        return aId === a.id;
      }))
      .map((a) => ({ id: a.id, label: a.label, color: a.color, bg: a.bg, border: a.border })),
    ...(transversals.length > 0
      ? [{ id: 'transversales', label: '🔗 Transversales', color: '#7B9FE0', bg: '#1a1a2e', border: '#7B9FE040' }]
      : []),
  ];
  const activeFilter = availableFilters.find((f) => f.id === filter) ? filter : 'todos';

  const showTransversals = activeFilter === 'todos' || activeFilter === 'transversales';
  const showLearnings    = activeFilter !== 'transversales';

  const filteredLearnings = (activeFilter === 'todos' || activeFilter === 'transversales')
    ? learnings
    : learnings.filter((l) => {
        const aId = AREA_ID_MAP[l.area?.toLowerCase()?.trim()] ?? l.area?.toLowerCase()?.trim();
        return aId === activeFilter;
      });

  // Group by area
  const learningGroups = AREAS.map((a, i) => ({
    ...a,
    color: AREA_COLORS[i],
    items: filteredLearnings.filter((l) => {
      const aId = AREA_ID_MAP[l.area?.toLowerCase()?.trim()] ?? l.area?.toLowerCase()?.trim();
      return aId === a.id;
    }),
  })).filter((g) => g.items.length > 0);

  const ungrouped = filteredLearnings.filter((l) => {
    const aId = AREA_ID_MAP[l.area?.toLowerCase()?.trim()] ?? l.area?.toLowerCase()?.trim();
    return !AREAS.find((a) => a.id === aId);
  });

  const isEmpty = (showTransversals && transversals.length === 0 && !showLearnings) ||
                  (showLearnings && filteredLearnings.length === 0 && !showTransversals) ||
                  (learnings.length === 0 && transversals.length === 0);

  return (
    <div>
      {/* Filter chips — only categories that have data */}
      <div className="kcv-ap-filters">
        {availableFilters.map((f) => {
          const active = activeFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="kcv-ap-chip"
              style={{
                color:       active ? f.color : 'var(--kai-text-muted)',
                background:  active ? f.bg    : 'transparent',
                borderColor: active ? f.border : 'var(--kai-border)',
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {isEmpty && (
        <p style={{ fontSize: 13, color: 'var(--kai-text-muted)', lineHeight: 1.7, marginTop: 16 }}>
          {activeFilter === 'transversales'
            ? 'Los aprendizajes transversales aparecen cuando Kai detecta patrones comunes entre múltiples participantes.'
            : 'Kai genera aprendizajes conforme conversas. Aún no hay aprendizajes en esta categoría.'}
        </p>
      )}

      {/* Transversals — collapsible group */}
      {showTransversals && transversals.length > 0 && (
        <TransversalGroup transversals={transversals} defaultOpen={true} />
      )}

      {/* Learnings grouped by area */}
      {showLearnings && (
        <div className="kcv-lag-list">
          {learningGroups.map((g, i) => (
            <LearningsAreaGroup
              key={g.id}
              area={g}
              areaLearnings={g.items}
              areaColor={g.color}
              defaultOpen={i === 0}
            />
          ))}
          {ungrouped.length > 0 && (
            <LearningsAreaGroup
              area={{ id: 'otros', label: 'Sin área' }}
              areaLearnings={ungrouped}
              areaColor="#6B7280"
              defaultOpen={learningGroups.length === 0}
            />
          )}
        </div>
      )}
    </div>
  );
}

const EXEC_SECTIONS = [
  { key: 'estado_actual',           label: 'Estado actual de la empresa',    type: 'paragraph', accent: '#378ADD' },
  { key: 'hallazgos_clave',          label: 'Hallazgos clave',               type: 'list',      accent: '#1D9E75' },
  { key: 'transversales_destacados', label: 'Aprendizajes transversales',    type: 'list',      accent: '#20C997' },
  { key: 'riesgos',                  label: 'Riesgos identificados',          type: 'list',      accent: '#E05252' },
  { key: 'oportunidades',            label: 'Oportunidades detectadas',       type: 'list',      accent: '#1D9E75' },
  { key: 'aprendizajes_relevantes',  label: 'Aprendizajes más relevantes',   type: 'list',      accent: '#9B59B6' },
  { key: 'vacios_conocimiento',      label: 'Vacíos de conocimiento',         type: 'list',      accent: '#E0A352' },
  { key: 'proxima_sesion',           label: 'Próxima sesión recomendada',     type: 'paragraph', accent: '#378ADD' },
  { key: 'proximos_pasos',           label: 'Próximos pasos sugeridos',       type: 'steps',     accent: '#1D9E75' },
];

function buildPdfHtml(sections, generatedAt) {
  const date = new Date(generatedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  const para = (title, text) => !text ? '' : `<div class="s"><h2>${title}</h2><p>${text}</p></div>`;
  const list = (title, items, ordered) => !items?.length ? '' :
    `<div class="s"><h2>${title}</h2><${ordered ? 'ol' : 'ul'}>${items.map(x => `<li>${x}</li>`).join('')}</${ordered ? 'ol' : 'ul'}></div>`;
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Resumen Ejecutivo</title>
<style>
  body{font-family:Georgia,serif;max-width:700px;margin:60px auto;color:#111;line-height:1.75;font-size:14px}
  .hdr{border-bottom:2px solid #1D9E75;padding-bottom:16px;margin-bottom:32px}
  .hdr h1{font-size:22px;font-weight:600;margin:0 0 4px}
  .hdr small{font-size:11px;color:#666}
  .s{margin-bottom:28px}
  .s h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#888;border-bottom:1px solid #eee;padding-bottom:6px;margin-bottom:10px}
  .s p,.s li{font-size:14px;margin-bottom:6px}
  .s ul,.s ol{padding-left:20px;margin:0}
  .ftr{border-top:1px solid #eee;margin-top:40px;padding-top:12px;font-size:11px;color:#aaa}
  .btn{display:block;width:fit-content;margin:0 auto 24px auto;padding:8px 20px;background:#1D9E75;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px}
  @media print{.btn{display:none}}
</style>
</head><body>
<button class="btn" onclick="window.print()">Imprimir / Guardar PDF</button>
<div class="hdr"><h1>Resumen Ejecutivo</h1><small>Generado por Kai · ${date}</small></div>
${para('Estado actual de la empresa', sections.estado_actual)}
${list('Hallazgos clave', sections.hallazgos_clave)}
${list('Aprendizajes transversales destacados', sections.transversales_destacados)}
${list('Riesgos identificados', sections.riesgos)}
${list('Oportunidades detectadas', sections.oportunidades)}
${list('Aprendizajes más relevantes', sections.aprendizajes_relevantes)}
${list('Vacíos de conocimiento', sections.vacios_conocimiento)}
${para('Próxima sesión recomendada', sections.proxima_sesion)}
${list('Próximos pasos sugeridos', sections.proximos_pasos, true)}
<div class="ftr">Generado por Kai · ${date}</div>
</body></html>`;
}

function buildPlainText(sections, generatedAt) {
  const date = new Date(generatedAt).toLocaleDateString('es-ES');
  const para = (title, text) => text ? `${title.toUpperCase()}\n${text}` : '';
  const list = (title, items, ordered) => items?.length
    ? `${title.toUpperCase()}\n${items.map((x, i) => ordered ? `${i + 1}. ${x}` : `• ${x}`).join('\n')}`
    : '';
  return [
    `RESUMEN EJECUTIVO · ${date}`,
    '━'.repeat(48),
    para('Estado actual de la empresa', sections.estado_actual),
    list('Hallazgos clave', sections.hallazgos_clave),
    list('Aprendizajes transversales', sections.transversales_destacados),
    list('Riesgos identificados', sections.riesgos),
    list('Oportunidades detectadas', sections.oportunidades),
    list('Aprendizajes más relevantes', sections.aprendizajes_relevantes),
    list('Vacíos de conocimiento', sections.vacios_conocimiento),
    para('Próxima sesión recomendada', sections.proxima_sesion),
    list('Próximos pasos sugeridos', sections.proximos_pasos, true),
    '',
    `Generado por Kai · ${date}`,
  ].filter(Boolean).join('\n\n');
}

function EjecutivoSection({ tenant, isDemo = false }) {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied]     = useState(false);

  useEffect(() => {
    fetch(`/api/kai/${tenant}/executive-summary`)
      .then((r) => r.json())
      .then((d) => setData(d.sections ? d : null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [tenant]);

  const generate = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/kai/${tenant}/executive-summary`, { method: 'POST' });
      const d = await res.json();
      if (d.sections) setData(d);
    } catch { /* ignore */ }
    finally { setGenerating(false); }
  };

  const downloadPdf = () => {
    if (!data?.sections) return;
    const w = window.open('', '_blank');
    w.document.write(buildPdfHtml(data.sections, data.generatedAt));
    w.document.close();
  };

  const copyText = () => {
    if (!data?.sections) return;
    navigator.clipboard.writeText(buildPlainText(data.sections, data.generatedAt)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) return (
    <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--kai-text-muted)', fontSize: 13 }}>
      Cargando...
    </div>
  );

  if (!data) return (
    <div className="kcv-exec-empty">
      <IconFileText size={32} style={{ color: 'var(--kai-text-faint)' }} />
      <p className="kcv-exec-empty-title">Sin resumen ejecutivo</p>
      <p className="kcv-exec-empty-desc">
        Genera un documento estructurado basado en todo el conocimiento que Kai ha acumulado sobre esta empresa.
        Incluye hallazgos, riesgos, oportunidades y próximos pasos.
      </p>
      <button
        onClick={generate}
        disabled={generating}
        className="kcv-exec-generate-btn"
      >
        {generating ? 'Generando resumen…' : 'Generar resumen ejecutivo'}
      </button>
    </div>
  );

  const s = data.sections;
  const genDate = new Date(data.generatedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div>
      {/* Action bar */}
      <div className="kcv-exec-actions">
        <span className="kcv-exec-date">Generado el {genDate}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={downloadPdf} className="kcv-exec-btn" disabled={isDemo}>Descargar PDF</button>
          <button onClick={copyText} className="kcv-exec-btn" disabled={isDemo}>{copied ? '¡Copiado!' : 'Copiar texto'}</button>
          <button onClick={generate} disabled={generating || isDemo} className="kcv-exec-btn kcv-exec-btn-primary">
            {generating ? 'Generando…' : 'Regenerar'}
          </button>
        </div>
      </div>

      {/* Document */}
      <div className="kcv-exec-doc">

        {/* Estado actual — full width */}
        {s.estado_actual && (
          <div className="kcv-exec-section">
            <div className="kcv-exec-section-label" style={{ '--accent': '#378ADD' }}>Estado actual de la empresa</div>
            <p className="kcv-exec-paragraph">{s.estado_actual}</p>
          </div>
        )}

        {/* Two-column grid: hallazgos + transversales */}
        <div className="kcv-exec-grid-2">
          <div className="kcv-exec-section">
            <div className="kcv-exec-section-label" style={{ '--accent': '#1D9E75' }}>Hallazgos clave</div>
            <ul className="kcv-exec-list">
              {(s.hallazgos_clave ?? []).map((x, i) => <li key={i}>{x}</li>)}
            </ul>
          </div>
          {s.transversales_destacados?.length > 0 && (
            <div className="kcv-exec-section">
              <div className="kcv-exec-section-label" style={{ '--accent': '#20C997' }}>Aprendizajes transversales</div>
              <ul className="kcv-exec-list">
                {s.transversales_destacados.map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </div>
          )}
        </div>

        {/* Two-column grid: riesgos + oportunidades */}
        <div className="kcv-exec-grid-2">
          <div className="kcv-exec-section">
            <div className="kcv-exec-section-label" style={{ '--accent': '#E05252' }}>Riesgos identificados</div>
            <ul className="kcv-exec-list">
              {(s.riesgos ?? []).map((x, i) => <li key={i}>{x}</li>)}
            </ul>
          </div>
          <div className="kcv-exec-section">
            <div className="kcv-exec-section-label" style={{ '--accent': '#1D9E75' }}>Oportunidades detectadas</div>
            <ul className="kcv-exec-list">
              {(s.oportunidades ?? []).map((x, i) => <li key={i}>{x}</li>)}
            </ul>
          </div>
        </div>

        {/* Aprendizajes relevantes — full width */}
        {s.aprendizajes_relevantes?.length > 0 && (
          <div className="kcv-exec-section">
            <div className="kcv-exec-section-label" style={{ '--accent': '#9B59B6' }}>Aprendizajes más relevantes</div>
            <ul className="kcv-exec-list">
              {s.aprendizajes_relevantes.map((x, i) => <li key={i}>{x}</li>)}
            </ul>
          </div>
        )}

        {/* Vacíos — full width */}
        {s.vacios_conocimiento?.length > 0 && (
          <div className="kcv-exec-section kcv-exec-section-dim">
            <div className="kcv-exec-section-label" style={{ '--accent': '#E0A352' }}>Vacíos de conocimiento</div>
            <ul className="kcv-exec-list">
              {s.vacios_conocimiento.map((x, i) => <li key={i}>{x}</li>)}
            </ul>
          </div>
        )}

        {/* Two-column: próxima sesión + próximos pasos */}
        <div className="kcv-exec-grid-2">
          {s.proxima_sesion && (
            <div className="kcv-exec-section kcv-exec-section-highlight">
              <div className="kcv-exec-section-label" style={{ '--accent': '#378ADD' }}>Próxima sesión recomendada</div>
              <p className="kcv-exec-paragraph">{s.proxima_sesion}</p>
            </div>
          )}
          {s.proximos_pasos?.length > 0 && (
            <div className="kcv-exec-section">
              <div className="kcv-exec-section-label" style={{ '--accent': '#1D9E75' }}>Próximos pasos sugeridos</div>
              <ol className="kcv-exec-steps">
                {s.proximos_pasos.map((x, i) => <li key={i}>{x}</li>)}
              </ol>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function ParticipantCard({ p, profile, learnings, isTop, idx = 0 }) {
  const initials    = p.participant.split(' ').filter(Boolean).filter(w => /^[a-zA-ZÀ-ÿ]/.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  const avatarColor = PARTICIPANT_AVATAR_COLORS[idx % PARTICIPANT_AVATAR_COLORS.length];

  const areaScoresMap = Object.fromEntries(
    AREAS.map((a) => [a.id, areaScore(a, profile, learnings)])
  );
  const coveredAreas = AREAS.map((a) => {
    const isCovered = p.covered_areas.includes(a.id);
    if (!isCovered) return null;
    const partial = (areaScoresMap[a.id] ?? 0) < 70;
    return { ...a, partial };
  }).filter(Boolean);

  const hasActivity  = p.conversation_count > 0 || p.learning_count > 0;
  const hasLearnings = p.learning_count > 0;

  return (
    <div className={`kcv-participant-card${isTop ? ' kcv-participant-card--top' : ''}`}>
      {/* Header — badge inline after name */}
      <div className="kcv-participant-header">
        <div className="kcv-participant-avatar" style={{ background: avatarColor.bg, color: avatarColor.color }}>
          {initials}
        </div>
        <div className="kcv-participant-identity">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span className="kcv-participant-name">{p.participant}</span>
            {isTop && <span className="kcv-participant-top-badge">Fuente principal</span>}
          </div>
          {p.role && <span className="kcv-participant-role">{p.role}</span>}
        </div>
      </div>

      {!hasActivity && (
        <p className="kcv-participant-no-data">Aún no ha conversado con Kai.</p>
      )}

      {hasActivity && (
        <>
          {/* Stats */}
          <div className="kcv-participant-stats">
            <div className="kcv-participant-stat">
              <span className="kcv-participant-stat-val">{p.conversation_count}</span>
              <span className="kcv-participant-stat-label">
                {p.conversation_count === 1 ? 'conversación' : 'conversaciones'}
              </span>
            </div>
            <div className="kcv-participant-stat-sep" />
            <div className="kcv-participant-stat">
              <span className="kcv-participant-stat-val" style={hasLearnings ? { color: '#20C997' } : {}}>
                {p.learning_count}
              </span>
              <span className="kcv-participant-stat-label">
                {p.learning_count === 1 ? 'aprendizaje' : 'aprendizajes'}
              </span>
            </div>
          </div>

          {!hasLearnings && (
            <p className="kcv-participant-no-data" style={{ marginTop: 0 }}>
              Aún sin aprendizajes registrados.
            </p>
          )}

          {/* Contribuciones clave — max 3 */}
          {hasLearnings && p.top_learnings?.length > 0 && (
            <div className="kcv-participant-section">
              <span className="kcv-participant-section-label">Contribuciones clave</span>
              <ul className="kcv-participant-contributions">
                {p.top_learnings.slice(0, 3).map((text, i) => (
                  <li key={i} className="kcv-participant-contribution-item">{text}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Áreas cubiertas */}
          {hasLearnings && coveredAreas.length > 0 && (
            <div className="kcv-participant-section">
              <span className="kcv-participant-section-label">Áreas</span>
              <div className="kcv-participant-areas-list">
                {coveredAreas.map((a) => (
                  <div key={a.id} className={`kcv-participant-area-row${a.partial ? ' partial' : ''}`}>
                    <span className="kcv-participant-area-icon">{a.partial ? '△' : '✓'}</span>
                    <span className="kcv-participant-area-name">
                      {a.label} · {a.partial ? 'parcial' : 'completada'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ParticipantesSection({ tenant, profile, learnings }) {
  const [data, setData]         = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = () => {
    fetch(`/api/kai/${tenant}/participants`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData({ participants: [] }));
  };

  useEffect(() => { load(); }, [tenant]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/kai/${tenant}/participants`, { method: 'POST' });
      const d   = await res.json();
      setData(d);
    } catch {
      load();
    } finally {
      setRefreshing(false);
    }
  };

  const participants   = data?.participants ?? [];
  const activeLearners = participants.filter((p) => p.learning_count > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="kcv-philosophy-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <p className="kcv-philosophy-text" style={{ margin: 0 }}>
          Las personas conversan. Kai aprende. La empresa acumula conocimiento.
        </p>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            flexShrink: 0, background: 'none', border: '0.5px solid var(--kai-border)',
            color: refreshing ? 'var(--kai-text-faint)' : 'var(--kai-text-muted)',
            borderRadius: 7, padding: '4px 10px', fontSize: 11, cursor: refreshing ? 'default' : 'pointer',
            fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}
        >
          {refreshing ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      {!data && (
        <p style={{ fontSize: 13, color: 'var(--kai-text-muted)' }}>Cargando…</p>
      )}

      {data && participants.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--kai-text-muted)', lineHeight: 1.7 }}>
          Aún no hay participantes registrados. Conversa con Kai para empezar a acumular conocimiento.
        </p>
      )}

      {activeLearners.length === 1 && (
        <div className="kcv-participant-single-source">
          <p className="kcv-participant-single-source-text">
            Kai ha construido el conocimiento actual principalmente a partir de conversaciones con{' '}
            <strong>{activeLearners[0].participant}</strong>.
            Invita a más participantes para enriquecer el diagnóstico.
          </p>
        </div>
      )}

      {participants.map((p, i) => (
        <ParticipantCard key={i} idx={i} p={p} profile={profile} learnings={learnings} isTop={i === 0 && p.learning_count > 0} />
      ))}
    </div>
  );
}

const AREA_LABELS = {
  negocio: 'Negocio', operaciones: 'Operaciones', tecnologia: 'Tecnología',
  finanzas: 'Finanzas', marketing: 'Marketing', personas: 'Personas',
};

const IMPACT_COLORS = { alto: '#E05252', medio: '#E0A352', bajo: '#9CA3AF' };

function relTime(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const h  = ms / 3600000;
  if (h < 1)  return 'hace unos min';
  if (h < 24) return `hace ${Math.floor(h)} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d} día${d !== 1 ? 's' : ''}`;
  const mo = Math.floor(d / 30);
  return `hace ${mo} ${mo === 1 ? 'mes' : 'meses'}`;
}

function SessionCard({ session, tenant }) {
  const [open, setOpen]       = useState(false);
  const [detail, setDetail]   = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const toggleDetail = async () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (detail || detailLoading) return;
    setDetailLoading(true);
    try {
      const res  = await fetch(`/api/kai/${tenant}/sessions?id=${session.id}`);
      const data = await res.json();
      setDetail(data);
    } catch { /* ignore */ }
    finally { setDetailLoading(false); }
  };

  const date    = new Date(session.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  const time    = new Date(session.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const hasData = session.learning_count > 0;

  return (
    <div className={`kcv-session-card${open ? ' kcv-session-card-open' : ''}`}>
      <button className="kcv-session-header" onClick={toggleDetail} aria-expanded={open}>
        {/* Left: date + participant */}
        <div className="kcv-session-meta">
          <span className="kcv-session-date">{date} · {time}</span>
          {session.participant
            ? <span className="kcv-session-participant">{session.participant}{session.role ? <span className="kcv-session-role"> · {session.role}</span> : null}</span>
            : <span className="kcv-session-participant kcv-session-no-participant">Sin identificar</span>
          }
        </div>

        {/* Center: areas */}
        <div className="kcv-session-areas">
          {session.areas.map((a) => (
            <span key={a} className="kcv-session-area-chip">{AREA_LABELS[a] ?? a}</span>
          ))}
        </div>

        {/* Right: stats + chevron */}
        <div className="kcv-session-stats">
          <span className="kcv-session-stat" title="Aprendizajes">
            <span className="kcv-session-stat-num">{session.learning_count}</span>
            <span className="kcv-session-stat-label">aprend.</span>
          </span>
          {session.risk_count !== null && (
            <span className="kcv-session-stat" title="Riesgos">
              <span className="kcv-session-stat-num" style={{ color: '#E05252' }}>{session.risk_count}</span>
              <span className="kcv-session-stat-label">riesgos</span>
            </span>
          )}
          {session.opportunity_count !== null && (
            <span className="kcv-session-stat" title="Oportunidades">
              <span className="kcv-session-stat-num" style={{ color: '#1D9E75' }}>{session.opportunity_count}</span>
              <span className="kcv-session-stat-label">oport.</span>
            </span>
          )}
          {session.score_before !== null && session.score_after !== null && session.score_after > session.score_before && (
            <span className="kcv-session-delta">
              {session.score_before}% → {session.score_after}%
            </span>
          )}
          <IconChevron size={14} style={{ color: 'var(--kai-text-faint)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
        </div>
      </button>

      {open && (
        <div className="kcv-session-detail">
          {detailLoading && <p className="kcv-session-detail-loading">Cargando detalle…</p>}
          {detail && (
            <>
              {detail.learnings?.length > 0 && (
                <div className="kcv-session-detail-section">
                  <div className="kcv-session-detail-title">Qué aprendió Kai en esta sesión</div>
                  <ul className="kcv-session-detail-list">
                    {detail.learnings.map((l) => (
                      <li key={l.id} className="kcv-session-detail-item">
                        <span className="kcv-session-detail-impact" style={{ color: IMPACT_COLORS[l.impact] ?? '#9CA3AF' }}>●</span>
                        <span>{l.content}</span>
                        {l.area && <span className="kcv-session-detail-area">{AREA_LABELS[l.area] ?? l.area}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {detail.risks?.length > 0 && (
                <div className="kcv-session-detail-section">
                  <div className="kcv-session-detail-title" style={{ color: '#E05252' }}>Riesgos detectados</div>
                  <ul className="kcv-session-detail-list">
                    {detail.risks.map((r, i) => <li key={i} className="kcv-session-detail-item"><span className="kcv-session-detail-impact" style={{ color: '#E05252' }}>●</span><span>{r}</span></li>)}
                  </ul>
                </div>
              )}

              {detail.opportunities?.length > 0 && (
                <div className="kcv-session-detail-section">
                  <div className="kcv-session-detail-title" style={{ color: '#1D9E75' }}>Oportunidades identificadas</div>
                  <ul className="kcv-session-detail-list">
                    {detail.opportunities.map((o, i) => <li key={i} className="kcv-session-detail-item"><span className="kcv-session-detail-impact" style={{ color: '#1D9E75' }}>●</span><span>{o}</span></li>)}
                  </ul>
                </div>
              )}

              {session.areas.length > 0 && (
                <div className="kcv-session-detail-section">
                  <div className="kcv-session-detail-title">Áreas exploradas</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {session.areas.map((a) => (
                      <span key={a} className="kcv-session-area-chip kcv-session-area-chip-lg">{AREA_LABELS[a] ?? a}</span>
                    ))}
                  </div>
                </div>
              )}

              {!detail.learnings?.length && !detail.risks?.length && !detail.opportunities?.length && (
                <p className="kcv-session-detail-empty">Sin aprendizajes registrados en esta sesión.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MobileSessionRow({ session, tenant, isRecent, isLast }) {
  const [open,    setOpen]    = useState(false);
  const [detail,  setDetail]  = useState(null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (detail || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/kai/${tenant}/sessions?id=${session.id}`);
      setDetail(await res.json());
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const shortDate = new Date(session.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  const areaLabel = AREA_LABELS[session.areas?.[0]] ?? session.areas?.[0] ?? 'General';
  const delta     = (session.score_before !== null && session.score_after !== null)
    ? session.score_after - session.score_before : null;

  const LTYPE = {
    dolor:       { icon: '⚠️', color: '#E07B5A', bg: '#2A1208' },
    oportunidad: { icon: '🚀', color: '#9B8FE4', bg: '#1A1535' },
  };
  const allItems = detail
    ? detail.learnings?.length
      ? detail.learnings.map((l) => {
          const t = LTYPE[l.type] ?? { icon: '💡', color: '#1D9E75', bg: '#0d1f19' };
          return { ...t, text: l.content };
        })
      : [
          ...(detail.risks        ?? []).map((r) => ({ icon: '⚠️', color: '#E07B5A', bg: '#2A1208', text: r })),
          ...(detail.opportunities ?? []).map((o) => ({ icon: '🚀', color: '#9B8FE4', bg: '#1A1535', text: o })),
        ]
    : [];

  return (
    <div className="kcv-tl-row">
      <div className="kcv-tl-col">
        <div className={`kcv-tl-dot${isRecent ? ' kcv-tl-dot--filled' : ''}`} />
        {!isLast && <div className="kcv-tl-line" />}
      </div>
      <div className={`kcv-tl-card${open ? ' kcv-tl-card--open' : ''}`} onClick={toggle}>
        <div className="kcv-tl-card-top">
          <span className="kcv-tl-card-area">{areaLabel}</span>
          <span className="kcv-tl-card-date">{shortDate} · {relTime(session.createdAt)}</span>
        </div>
        {session.participant && (
          <p className="kcv-tl-card-participant">
            {session.participant}{session.role ? ` · ${session.role}` : ''}
          </p>
        )}
        <div className="kcv-tl-chips">
          {session.learning_count > 0 && (
            <span className="kcv-tl-chip kcv-tl-chip--ap">
              💡 {session.learning_count} {session.learning_count === 1 ? 'aprendizaje' : 'aprendizajes'}
            </span>
          )}
          {(session.risk_count ?? 0) > 0 && (
            <span className="kcv-tl-chip kcv-tl-chip--risk">
              ⚠️ {session.risk_count} {session.risk_count === 1 ? 'riesgo' : 'riesgos'}
            </span>
          )}
          {(session.opportunity_count ?? 0) > 0 && (
            <span className="kcv-tl-chip kcv-tl-chip--opp">
              🚀 {session.opportunity_count} {session.opportunity_count === 1 ? 'oportunidad' : 'oportunidades'}
            </span>
          )}
        </div>
        {delta !== null && delta > 0 && (
          <div className="kcv-tl-coverage">
            <span className="kcv-tl-cov-from">{session.score_before}%</span>
            <span className="kcv-tl-cov-arrow">→</span>
            <span className="kcv-tl-cov-to">{session.score_after}%</span>
            <span className="kcv-tl-cov-gain">+{delta}%</span>
          </div>
        )}
        {open && (
          <div className="kcv-tl-detail">
            {loading && <p className="kcv-tl-detail-empty">Cargando…</p>}
            {detail && allItems.length > 0 && (
              <>
                <p className="kcv-tl-detail-label">QUÉ APRENDIÓ KAI</p>
                {allItems.map((item, i) => (
                  <div key={i} className="kcv-tl-detail-item">
                    <span className="kcv-tl-detail-icon" style={{ background: item.bg, color: item.color }}>{item.icon}</span>
                    <span className="kcv-tl-detail-text">{item.text}</span>
                  </div>
                ))}
              </>
            )}
            {detail && allItems.length === 0 && (
              <p className="kcv-tl-detail-empty">Sin aprendizajes en esta sesión.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function HistorialSection({ tenant, tenantMeta }) {
  const [sessions, setSessions] = useState(null);

  useEffect(() => {
    fetch(`/api/kai/${tenant}/sessions`)
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions ?? []))
      .catch(() => setSessions([]));
  }, [tenant]);

  if (!sessions) return <p style={{ fontSize: 13, color: 'var(--kai-text-muted)' }}>Cargando…</p>;

  if (!sessions.length) return (
    <div style={{ padding: '40px 0' }}>
      <p style={{ fontSize: 13, color: 'var(--kai-text-muted)', lineHeight: 1.75 }}>
        Cuando {tenantMeta?.name ? `el equipo de ${tenantMeta.name}` : 'los participantes'} conversen con Kai, aquí aparecerá cómo fue creciendo el conocimiento de la empresa.
      </p>
    </div>
  );

  const now     = new Date();
  const isRecent = (s) => {
    const d = new Date(s.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  const monthGroups = [];
  const monthMap    = {};
  for (const s of sessions) {
    const key = new Date(s.createdAt).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();
    if (!monthMap[key]) { monthMap[key] = []; monthGroups.push({ key, items: monthMap[key] }); }
    monthMap[key].push(s);
  }

  return (
    <>
      {/* Desktop: flat list */}
      <div className="kcv-session-list kcv-historial-desktop">
        {sessions.map((s) => <SessionCard key={s.id} session={s} tenant={tenant} />)}
      </div>

      {/* Mobile: vertical timeline grouped by month */}
      <div className="kcv-historial-tl">
        {monthGroups.map(({ key, items }) => (
          <div key={key} className="kcv-historial-tl-month">
            <p className="kcv-historial-tl-month-label">{key}</p>
            {items.map((s, i) => (
              <MobileSessionRow
                key={s.id}
                session={s}
                tenant={tenant}
                isRecent={isRecent(s)}
                isLast={i === items.length - 1}
              />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

// ── Session feed config ────────────────────────────────────────────────────

function SidebarAreas({ profile, learnings }) {
  return (
    <div className="kcv-sidebar-areas">
      <div className="kcv-sidebar-areas-label">Cobertura por área</div>
      {AREAS.map((a, i) => {
        const s = areaScore(a, profile, learnings);
        const color = s >= 70 ? '#1D9E75' : s > 0 ? AREA_COLORS[i] : '#2a2a2a';
        return (
          <div key={a.id} className="kcv-sidebar-area-row">
            <div className="kcv-sidebar-area-top">
              <span className="kcv-sidebar-area-name">{a.label}</span>
              <span className="kcv-sidebar-area-pct" style={{ color: s > 0 ? color : '#444' }}>{s}%</span>
            </div>
            <div className="kcv-sidebar-area-track">
              <div className="kcv-sidebar-area-fill" style={{ width: `${s}%`, background: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Discovery progress (active session) ───────────────────────────────────

function DiscoveryProgress({ areaStatuses, currentArea, score }) {
  const completa = AREAS.filter((a) => (areaStatuses[a.id] ?? 'pendiente') === 'completa').length;
  const pendiente = AREAS.filter((a) => (areaStatuses[a.id] ?? 'pendiente') === 'pendiente').length;

  let estado, estadoClass;
  if (completa >= AREAS.length) {
    estado = 'Completado';
    estadoClass = 'completo';
  } else if (currentArea) {
    estado = 'En curso';
    estadoClass = 'en-curso';
  } else {
    estado = 'Sin iniciar';
    estadoClass = 'sin-iniciar';
  }

  return (
    <div className="kcv-discovery-progress">
      <div className="kcv-discovery-header">
        {currentArea && <span className="kcv-discovery-pulse" />}
        <span className="kcv-discovery-label">{currentArea ? 'Sesión en curso' : 'Discovery'}</span>
      </div>
      <div className="kcv-discovery-title">Discovery empresarial</div>
      <div className="kcv-discovery-bar-track">
        <div className="kcv-discovery-bar-fill" style={{ width: `${score || 2}%` }} />
      </div>
      <div className="kcv-discovery-pct">{score}% completado</div>
      {pendiente > 0 && (
        <div className="kcv-discovery-sub">
          {pendiente} {pendiente === 1 ? 'área pendiente' : 'áreas pendientes'}
        </div>
      )}
      <div className="kcv-discovery-estado">
        Estado: <span className={`kcv-discovery-estado-val kcv-discovery-estado--${estadoClass}`}>{estado}</span>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function KaiClientView({ tenant, tenantMeta, profile }) {
  const [activeSection, setActiveSection] = useState('resumen');
  const [learnings, setLearnings]         = useState([]);
  const [transversals, setTransversals]   = useState([]);
  const [isDemoMode, setIsDemoMode]       = useState(!!tenantMeta.isDemo);
  const [drawerOpen, setDrawerOpen]       = useState(false);

  // Demo-specific: animated profile (starts empty, fills as demo plays)
  const [demoProfile, setDemoProfile]     = useState({});
  const demoStepRef                       = useRef({ sepCount: 0 });
  const progression                       = isDemoMode ? getDemoProgression(tenant) : null;

  // Sidebar flash on each separator reveal
  const [flashSeq,  setFlashSeq]  = useState(0);
  const [flashGlow, setFlashGlow] = useState(false);
  const flashTimer = useRef(null);
  useEffect(() => () => clearTimeout(flashTimer.current), []);

  // Session state — lifted so it persists across section switches
  const [currentArea, setCurrentArea]     = useState(null);
  const [areaStatuses, setAreaStatuses]   = useState({});
  const [sessionDiscoveries, setSessionDiscoveries] = useState(0);

  // In demo mode use demoProfile for the sidebar/score; the real profile
  // (from server props) is still passed to Resumen/Conocimiento sections.
  const scoreProfile = isDemoMode ? demoProfile : profile;
  const score = overallScore(scoreProfile, learnings);

  useEffect(() => {
    if (isDemoMode) return; // learnings managed by demo player callbacks
    fetch(`/api/kai/${tenant}/learnings`)
      .then((r) => r.json())
      .then((d) => setLearnings(d.learnings ?? []))
      .catch(() => {});
    fetch(`/api/kai/${tenant}/transversals`)
      .then((r) => r.json())
      .then((d) => setTransversals(d.transversals ?? []))
      .catch(() => {});
  }, [tenant, isDemoMode]);

  const handleDemoStep = useCallback((type, stepData) => {
    if (!progression) return;

    if (type === 'reset') {
      setDemoProfile({});
      setLearnings([]);
      setCurrentArea(null);
      setAreaStatuses({});
      setSessionDiscoveries(0);
      demoStepRef.current.sepCount = 0;
      return;
    }

    if (type === 'session_start') {
      const entry = progression.find((e) => e.trigger === 'session_start');
      if (entry?.patch) setDemoProfile((prev) => mergeProfile(prev, entry.patch));
      // Activate "En curso" with the area from the plan card
      const areaId = stepData?.label?.toLowerCase() ?? 'operaciones';
      const areaLabel = stepData?.label ?? 'Operaciones';
      setCurrentArea({ area: areaId, label: areaLabel });
      setAreaStatuses((prev) => ({ ...prev, [areaId]: 'explorando' }));
      return;
    }

    if (type === 'separator') {
      const seps = progression.filter((e) => e.trigger === 'separator');
      const entry = seps[demoStepRef.current.sepCount++] ?? null;
      if (!entry) return;
      if (entry.patch) setDemoProfile((prev) => mergeProfile(prev, entry.patch));
      if (entry.learning) {
        setLearnings((prev) => [...prev, { ...entry.learning, createdAt: new Date().toISOString() }]);
        setSessionDiscoveries((prev) => prev + 1);
      }
      // Trigger synchronized sidebar flash
      setFlashSeq((n) => n + 1);
      clearTimeout(flashTimer.current);
      setFlashGlow(true);
      flashTimer.current = setTimeout(() => setFlashGlow(false), 1300);
    }
  }, [progression]);

  // Persist discovery status to KV whenever session state changes
  useEffect(() => {
    if (!currentArea) return;
    const completa = AREAS.filter((a) => (areaStatuses[a.id] ?? 'pendiente') === 'completa');
    const pendiente = AREAS.filter((a) => (areaStatuses[a.id] ?? 'pendiente') === 'pendiente');
    fetch(`/api/kai/${tenant}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        progress: Math.round((completa.length / AREAS.length) * 100),
        covered_topics: completa.map((a) => a.id),
        missing_topics: pendiente.map((a) => a.id),
        estimated_minutes_remaining: pendiente.length * 5,
        updated_at: new Date().toISOString(),
      }),
    }).catch(() => {});
  }, [areaStatuses, currentArea, tenant]);

  const handleSessionUpdate = ({ sessionStart, currentArea: newArea, checkpoint, sessionUpdates, newLearnings }) => {
    if (sessionStart) {
      setCurrentArea({ area: sessionStart.area, label: sessionStart.label });
      setAreaStatuses((prev) => ({ ...prev, [sessionStart.area]: 'explorando' }));
    }
    if (newArea) {
      setCurrentArea(newArea);
      setAreaStatuses((prev) => ({ ...prev, [newArea.area]: 'explorando' }));
    }
    if (checkpoint) {
      setAreaStatuses((prev) => {
        const next = { ...prev, [checkpoint.area]: 'completa' };
        if (checkpoint.nextArea) next[checkpoint.nextArea] = 'explorando';
        return next;
      });
      if (checkpoint.nextArea) setCurrentArea({ area: checkpoint.nextArea, label: checkpoint.nextLabel });
    }
    if (newLearnings?.length) {
      setLearnings((prev) => [...prev, ...newLearnings]);
    }
    const count = (sessionUpdates?.length ?? 0) + (newLearnings?.length ?? 0);
    if (count > 0) setSessionDiscoveries((prev) => prev + count);
  };

  const sectionTitles = {
    resumen:       'Resumen',
    chat:          'Conversar con Kai',
    conocimiento:  'Conocimiento de la empresa',
    aprendizajes:  'Aprendizajes',
    ejecutivo:     'Resumen ejecutivo',
    participantes: 'Participantes',
    historial:     'Historial de sesiones',
  };

  const learningCount = learnings.length + transversals.length;

  const navBadges = {
    aprendizajes: learningCount || null,
    riesgos:      (profile?.risks ?? []).length || null,
  };


  const companyInitial = (tenantMeta.name ?? 'K').charAt(0).toUpperCase();
  const companySub = [tenantMeta.country, tenantMeta.industry].filter(Boolean).join(' · ');

  return (
    <div className="kcv-root kai-root">

      {/* ── Drawer overlay (mobile only) ── */}
      <div
        className={`kcv-drawer-overlay${drawerOpen ? ' kcv-drawer-overlay--open' : ''}`}
        onClick={() => setDrawerOpen(false)}
      />

      {/* ── Sidebar / Drawer ── */}
      <aside className={`kcv-sidebar${drawerOpen ? ' kcv-sidebar--open' : ''}`}>

        {/* Mobile drawer header (company initial + name + ×) */}
        <div className="kcv-mobile-header">
          <div className="kcv-mobile-header-avatar">{companyInitial}</div>
          <div className="kcv-mobile-header-info">
            <span className="kcv-mobile-header-name">{tenantMeta.name}{tenantMeta.isDemo ? ' (Demo)' : ''}</span>
            {companySub && <span className="kcv-mobile-header-sub">{companySub}</span>}
          </div>
          <button className="kcv-drawer-close-btn" onClick={() => setDrawerOpen(false)} aria-label="Cerrar menú">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Desktop sidebar header */}
        <div className="kcv-sidebar-header">
          <KaiAvatarSvg size={32} />
          <div className="kcv-sidebar-brand">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="kcv-sidebar-name">Kai</span>
              {tenantMeta.isDemo && <span className="kcv-demo-badge">DEMO</span>}
            </div>
            <span className="kcv-sidebar-company">{tenantMeta.name}</span>
          </div>
        </div>

        {/* Knowledge indicator */}
        <div className={`kcv-knowledge-block${isDemoMode && flashGlow ? ' kcv-knowledge-block--glow' : ''}`}>
          <div className="kcv-knowledge-label">Conocimiento global</div>
          <div key={isDemoMode ? (flashSeq || 'init') : undefined} className={`kcv-knowledge-pct${isDemoMode && flashSeq > 0 ? ' kcv-pct-pop' : ''}`}>{score}%</div>
          <div className="kcv-knowledge-bar-track">
            <div className="kcv-knowledge-bar-fill" style={{ width: `${score}%` }} />
          </div>
          {sessionDiscoveries > 0 ? (
            <div key={isDemoMode ? `disc-${sessionDiscoveries}` : undefined} className={`kcv-knowledge-sub kcv-knowledge-session${isDemoMode ? ' kcv-disc-in' : ''}`}>
              Esta sesión: <span>{sessionDiscoveries} descubrimiento{sessionDiscoveries !== 1 ? 's' : ''}</span>
            </div>
          ) : (
            <div className="kcv-knowledge-sub">
              {learningCount > 0 ? `${learningCount} aprendizajes` : '—'}
              {' · '}
              {AREAS.filter((a) => areaScore(a, profile, learnings) > 0).length} áreas cubiertas
            </div>
          )}
        </div>

        {/* Nav */}
        <div className="kcv-nav">
          {NAV.map((item) => {
            const active = activeSection === item.id;
            const badge = navBadges[item.id];
            return (
              <button
                key={item.id}
                className={`kcv-nav-item${active ? ' active' : ''}`}
                onClick={() => { setActiveSection(item.id); setDrawerOpen(false); }}
              >
                <item.icon size={15} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {badge ? (
                  <span key={`${item.id}-${badge}`} className={`kcv-nav-badge${item.id === 'riesgos' ? ' kcv-nav-badge-danger' : ''}${item.id === 'aprendizajes' && flashSeq > 0 ? ' kcv-badge-pop' : ''}`}>
                    {badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Area coverage bars */}
        <SidebarAreas profile={scoreProfile} learnings={learnings} />

        {/* Discovery progress */}
        <DiscoveryProgress areaStatuses={areaStatuses} currentArea={currentArea} score={score} />

        {/* Footer */}
        <div className="kcv-sidebar-footer">
          <div className="kcv-sidebar-footer-dot" />
          <span className="kcv-sidebar-footer-text">1 participante activo</span>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="kcv-main">
        {/* Chat — full height, no header */}
        {activeSection === 'chat' && (
          isDemoMode
            ? <DemoChatPlayer
                tenant={tenant}
                tenantName={tenantMeta.name}
                knowledgeScore={score}
                onStepRevealed={handleDemoStep}
              />
            : <KaiClientChat
                tenant={tenant}
                tenantName={tenantMeta.name}
                knowledgeScore={score}
                currentArea={currentArea}
                areaStatuses={areaStatuses}
                onSessionUpdate={handleSessionUpdate}
                onMenuOpen={() => setDrawerOpen(true)}
              />
        )}

        {/* Other sections */}
        {activeSection !== 'chat' && (
          <>
            {/* Mobile topbar — only visible on small screens */}
            <div className="kcv-mobile-topbar">
              <button className="kcv-mobile-hamburger" onClick={() => setDrawerOpen(true)} aria-label="Abrir menú">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </button>
              <span className="kcv-mobile-topbar-title">{sectionTitles[activeSection]}</span>
              {activeSection === 'aprendizajes' && learningCount > 0 && (
                <span className="kcv-mobile-topbar-badge">{learningCount}</span>
              )}
              {activeSection === 'resumen' && (
                <button
                  onClick={() => setActiveSection('ejecutivo')}
                  style={{ background: 'none', border: 'none', color: 'var(--kai-text-muted)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
                  title="Resumen ejecutivo"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </button>
              )}
            </div>
            <div className="kcv-section-header">
              <h1 className="kcv-section-title">{sectionTitles[activeSection]}</h1>
            </div>
            <div className="kcv-section-body">
              {activeSection === 'resumen'       && <ResumenSection       profile={profile} tenantMeta={tenantMeta} learnings={learnings} transversals={transversals} onStartSession={(s) => setActiveSection('chat')} />}
              {activeSection === 'conocimiento'  && <ConocimientoSection  profile={profile} learnings={learnings} />}
              {activeSection === 'aprendizajes'  && <AprendizajesSection  tenant={tenant} />}
              {activeSection === 'ejecutivo'     && <EjecutivoSection     tenant={tenant} isDemo={isDemoMode} />}
              {activeSection === 'participantes' && <ParticipantesSection tenant={tenant} profile={profile} learnings={learnings} />}
              {activeSection === 'historial'     && <HistorialSection     tenant={tenant} tenantMeta={tenantMeta} />}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
