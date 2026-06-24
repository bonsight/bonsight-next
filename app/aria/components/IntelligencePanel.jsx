'use client';

import { useEffect, useState } from 'react';

const TYPE_CFG = {
  riesgo:        { icon: '⚠️', label: 'Riesgo',          accent: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
  hallazgo:      { icon: '💡', label: 'Hallazgo',         accent: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
  recomendacion: { icon: '🎯', label: 'Recomendación',    accent: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
  oportunidad:   { icon: '🚀', label: 'Oportunidad',      accent: '#10B981', bg: 'rgba(16,185,129,0.08)' },
};

const PRIORITY_CFG = {
  alta:  { label: '🔴 Alta',  color: '#EF4444' },
  media: { label: '🟡 Media', color: '#F59E0B' },
  baja:  { label: '🟢 Baja',  color: '#10B981' },
};

const GROUP_ORDER = ['riesgo', 'hallazgo', 'recomendacion', 'oportunidad'];
const GROUP_LABELS = {
  riesgo:        '⚠️ Riesgos activos',
  hallazgo:      '💡 Hallazgos clave',
  recomendacion: '🎯 Acciones recomendadas',
  oportunidad:   '🚀 Oportunidades',
};

function IntelligenceCard({ item }) {
  const [showNew, setShowNew] = useState(item.isNew);
  const cfg = TYPE_CFG[item.type] ?? TYPE_CFG.hallazgo;
  const priority = PRIORITY_CFG[item.priority] ?? PRIORITY_CFG.media;

  useEffect(() => {
    if (!item.isNew) return;
    const t = setTimeout(() => setShowNew(false), 3000);
    return () => clearTimeout(t);
  }, [item.isNew]);

  return (
    <div className="aria-intel-card" style={{ borderLeftColor: cfg.accent, background: cfg.bg }}>
      <div className="aria-intel-card-header">
        <span className="aria-intel-card-type" style={{ color: cfg.accent }}>
          {cfg.icon} {cfg.label}
        </span>
        <div className="aria-intel-card-badges">
          <span className="aria-intel-priority" style={{ color: priority.color }}>{priority.label}</span>
          {showNew && <span className="aria-intel-new-badge">nuevo</span>}
        </div>
      </div>
      <p className="aria-intel-card-text">{item.text}</p>
      <div className="aria-intel-card-actions">
        <button className="aria-intel-action">Guardar</button>
        <button className="aria-intel-action">Tarea</button>
        <button className="aria-intel-action aria-intel-action--discard">Descartar</button>
      </div>
    </div>
  );
}

export default function IntelligencePanel({ items, mainInsight, counters, filter, onClearFilter, onClose }) {
  const visibleItems = filter ? items.filter((i) => i.type === filter) : items;
  const groups = GROUP_ORDER
    .map(type => ({ type, label: GROUP_LABELS[type], items: visibleItems.filter(i => i.type === type) }))
    .filter(g => g.items.length > 0);

  const totalItems = items.length;
  const confidence = Math.min(95, Math.max(15, Math.round(totalItems * 12 + 20)));

  return (
    <aside className="aria-intel-panel">
      <div className="aria-intel-panel-hdr">
        <span className="aria-intel-panel-title">
          {filter ? `${TYPE_CFG[filter]?.icon ?? ''} ${TYPE_CFG[filter]?.label ?? filter}` : 'Inteligencia'}
        </span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {filter && (
            <button className="aria-intel-filter-clear" onClick={onClearFilter} title="Ver todo">
              ✕ Todo
            </button>
          )}
          <button className="aria-intel-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
      </div>

      {mainInsight && (
        <div className="aria-intel-main">
          <div className="aria-intel-main-label">🎯 Insight principal</div>
          <p className="aria-intel-main-text">{mainInsight}</p>
        </div>
      )}

      <div className="aria-intel-exec">
        <div className="aria-intel-exec-stat">
          <span className="aria-intel-exec-val">{counters.hallazgos + counters.riesgos}</span>
          <span className="aria-intel-exec-label">Hallazgos</span>
        </div>
        <div className="aria-intel-exec-sep" />
        <div className="aria-intel-exec-stat">
          <span className="aria-intel-exec-val" style={{ color: counters.riesgos > 0 ? '#EF4444' : undefined }}>
            {counters.riesgos}
          </span>
          <span className="aria-intel-exec-label">Riesgos</span>
        </div>
        <div className="aria-intel-exec-sep" />
        <div className="aria-intel-exec-stat">
          <span className="aria-intel-exec-val" style={{ color: '#8B5CF6' }}>{confidence}%</span>
          <span className="aria-intel-exec-label">Confianza</span>
        </div>
      </div>

      <div className="aria-intel-scroll">
        {groups.length === 0 && (
          <p className="aria-intel-empty">Aria generará inteligencia durante el análisis.</p>
        )}
        {groups.map(group => (
          <div key={group.type} className="aria-intel-group">
            <p className="aria-intel-group-label">{group.label}</p>
            {group.items.map(item => <IntelligenceCard key={item.id} item={item} />)}
          </div>
        ))}
      </div>
    </aside>
  );
}
