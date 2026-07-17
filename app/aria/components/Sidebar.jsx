'use client';

import { useEffect, useRef, useState } from 'react';

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'ahora';
  if (mins < 60) return `hace ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days}d`;
  const weeks = Math.floor(days / 7);
  return `hace ${weeks}sem`;
}

export default function Sidebar({
  investigations,
  activeId,
  onSelect,
  onNew,
  onArchive,
  onRestore,
  onDelete,
  counters = {},
  sources = [],
  onIntelFilter,
  isOpen = false,
  onClose,
  loading = false,
  activeSources = new Set(),
}) {
  const [search, setSearch]               = useState('');
  const [hoveredId, setHoveredId]         = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [showArchived, setShowArchived]   = useState(false);
  const [pulsing, setPulsing]             = useState({});
  const [activeTab, setActiveTab]         = useState('investigaciones');
  const [collapsedTopics, setCollapsedTopics] = useState({});
  const prevCounters = useRef(counters);

  useEffect(() => {
    const next = {};
    for (const key of ['hallazgos', 'riesgos', 'recomendaciones', 'oportunidades']) {
      if ((counters[key] ?? 0) > (prevCounters.current[key] ?? 0)) next[key] = true;
    }
    if (Object.keys(next).length) {
      setPulsing(next);
      setTimeout(() => setPulsing({}), 700);
    }
    prevCounters.current = counters;
  }, [counters]);

  const q        = search.toLowerCase().trim();
  const active   = investigations.filter((inv) => inv.estado !== 'archivada');
  const archived = investigations.filter((inv) => inv.estado === 'archivada');

  function matchesQuery(inv) {
    if (!q) return true;
    const fields = [
      inv.titulo,
      inv.topic,
      inv.area,
      inv.resumen_sesion,
      ...(inv.tags ?? []),
      ...(inv.nuevos_insights ?? []),
    ];
    return fields.some((f) => f && f.toLowerCase().includes(q));
  }

  const filtered = active.filter(matchesQuery);

  // Group by topic (free-form AI-generated), fallback to area, then 'General'
  const topicMap = new Map();
  for (const inv of filtered) {
    const key = inv.topic || inv.area || 'General';
    if (!topicMap.has(key)) topicMap.set(key, []);
    topicMap.get(key).push(inv);
  }
  const groups = [...topicMap.entries()].map(([topic, items]) => ({ topic, items }));

  function toggleTopic(topic) {
    setCollapsedTopics((prev) => ({ ...prev, [topic]: !prev[topic] }));
  }

  function handleDeleteClick(e, id) {
    e.stopPropagation();
    if (confirmDeleteId === id) {
      onDelete(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
    }
  }

  function handleArchiveClick(e, id) {
    e.stopPropagation();
    onArchive(id);
  }

  function handleRestoreClick(e, id) {
    e.stopPropagation();
    onRestore(id);
  }

  function renderItem(inv, isArchived = false) {
    const isActive     = inv.id === activeId;
    const isHovered    = hoveredId === inv.id;
    const isConfirming = confirmDeleteId === inv.id;

    return (
      <div
        key={inv.id}
        role="button"
        tabIndex={0}
        className={`aria-sidebar-item${isActive ? ' aria-sidebar-item-active' : ''}`}
        onClick={() => { setSearch(''); onSelect(inv.id); }}
        onKeyDown={(e) => e.key === 'Enter' && onSelect(inv.id)}
        onMouseEnter={() => setHoveredId(inv.id)}
        onMouseLeave={() => { setHoveredId(null); setConfirmDeleteId(null); }}
        title={inv.titulo}
      >
        <span className="aria-sidebar-item-emoji">{inv.emoji}</span>
        <span className="aria-sidebar-item-body">
          <span className="aria-sidebar-item-title">{inv.titulo}</span>
          <span className="aria-sidebar-item-time">{formatRelativeTime(inv.updatedAt)}</span>
        </span>
        {isHovered ? (
          <span className="aria-sidebar-item-actions">
            {!isArchived ? (
              <button
                type="button"
                className="aria-sidebar-action-btn"
                onClick={(e) => handleArchiveClick(e, inv.id)}
                title="Archivar"
              >
                ↓
              </button>
            ) : (
              <button
                type="button"
                className="aria-sidebar-action-btn"
                onClick={(e) => handleRestoreClick(e, inv.id)}
                title="Restaurar"
              >
                ↩
              </button>
            )}
            <button
              type="button"
              className={`aria-sidebar-action-btn${isConfirming ? ' aria-sidebar-action-confirm' : ''}`}
              onClick={(e) => handleDeleteClick(e, inv.id)}
              title={isConfirming ? 'Clic para confirmar eliminación' : 'Eliminar'}
            >
              {isConfirming ? '✓' : '×'}
            </button>
          </span>
        ) : (
          <span className={`aria-sidebar-status-dot aria-sidebar-status-${inv.estado}`} />
        )}
      </div>
    );
  }

  const { hallazgos = 0, riesgos = 0, recomendaciones = 0, oportunidades = 0 } = counters;

  return (
    <aside className={`aria-sidebar${isOpen ? ' aria-sidebar--open' : ''}`}>
      {onClose && (
        <button className="aria-sidebar-close-btn" onClick={onClose} type="button" aria-label="Cerrar menú">
          ×
        </button>
      )}

      <button className="aria-sidebar-new" onClick={onNew}>
        + Nueva investigación
      </button>

      <div className="aria-sidebar-search-wrap">
        <input
          className="aria-sidebar-search"
          type="text"
          placeholder="Buscar…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tab switcher */}
      <div className="aria-sidebar-tabs">
        <button
          type="button"
          className={`aria-sidebar-tab${activeTab === 'investigaciones' ? ' aria-sidebar-tab--active' : ''}`}
          onClick={() => setActiveTab('investigaciones')}
        >
          Investigaciones
        </button>
        <button
          type="button"
          className={`aria-sidebar-tab${activeTab === 'contexto' ? ' aria-sidebar-tab--active' : ''}`}
          onClick={() => setActiveTab('contexto')}
        >
          Contexto
        </button>
      </div>

      {/* ── Tab: Investigaciones ──────────────────────────────── */}
      {activeTab === 'investigaciones' && (
        <div className="aria-sidebar-tab-content">
          {groups.length === 0 && q && (
            <p className="aria-sidebar-empty">Sin resultados para &ldquo;{search}&rdquo;</p>
          )}

          {groups.map(({ topic, items }) => (
            <div key={topic} className="aria-sidebar-topic-group">
              <button
                type="button"
                className="aria-sidebar-topic-header"
                onClick={() => toggleTopic(topic)}
              >
                <span className="aria-sidebar-topic-name">{topic}</span>
                <span className="aria-sidebar-topic-count">{items.length}</span>
                <span className={`aria-sidebar-topic-chevron${collapsedTopics[topic] ? ' collapsed' : ''}`}>
                  ›
                </span>
              </button>
              {!collapsedTopics[topic] && items.map((inv) => renderItem(inv))}
            </div>
          ))}

          {archived.length > 0 && (
            <div className="aria-sidebar-archived-section">
              <button
                type="button"
                className="aria-sidebar-archived-toggle"
                onClick={() => setShowArchived((v) => !v)}
              >
                <span>{showArchived ? '▾' : '▸'}</span>
                <span>Archivadas ({archived.length})</span>
              </button>
              {showArchived && archived.map((inv) => renderItem(inv, true))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Contexto ─────────────────────────────────────── */}
      {activeTab === 'contexto' && (
        <div className="aria-sidebar-tab-content">
          <div className="aria-sidebar-intel-block">
            <div className="aria-sidebar-section-header">
              <p className="aria-sidebar-section-label">Inteligencia</p>
              <span className="aria-sidebar-scope-label">Cuenta completa</span>
            </div>
            <div className="aria-sidebar-intel-counters">
              {[
                { key: 'hallazgos',       val: hallazgos,       color: '#3B82F6', icon: '💡', label: 'Hallazgos',       type: 'hallazgo' },
                { key: 'riesgos',         val: riesgos,         color: '#EF4444', icon: '⚠️', label: 'Riesgos',         type: 'riesgo' },
                { key: 'recomendaciones', val: recomendaciones, color: '#8B5CF6', icon: '🎯', label: 'Recomendaciones',  type: 'recomendacion' },
                { key: 'oportunidades',   val: oportunidades,   color: '#10B981', icon: '🚀', label: 'Oportunidades',    type: 'oportunidad' },
              ].map(({ key, val, color, icon, label, type }) => (
                <button
                  key={key}
                  className={`aria-sidebar-intel-counter${onIntelFilter ? ' aria-sidebar-intel-counter--clickable' : ''}`}
                  onClick={onIntelFilter ? () => onIntelFilter(type) : undefined}
                  type="button"
                >
                  <span
                    className={`aria-sidebar-intel-val${pulsing[key] ? ' aria-sidebar-intel-val--pulse' : ''}`}
                    style={{ color: val > 0 ? color : undefined }}
                  >
                    {val}
                  </span>
                  <span className="aria-sidebar-intel-key">{icon} {label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="aria-sidebar-sources-block">
            <p className="aria-sidebar-section-label">
              Fuentes
              {loading && <span className="aria-sidebar-sources-spinner" />}
            </p>
            <div className="aria-sidebar-source aria-sidebar-source--active">
              <span className="aria-sidebar-source-dot" />
              <span className="aria-sidebar-source-label">Kai</span>
            </div>
            {sources.map((src) => {
              const isUsed = !loading && activeSources.has(src.id);
              const cls = [
                'aria-sidebar-source',
                src.active ? 'aria-sidebar-source--active' : '',
                isUsed ? 'aria-sidebar-source--used' : '',
              ].filter(Boolean).join(' ');
              return (
                <div key={src.id} className={cls}>
                  <span className="aria-sidebar-source-dot" />
                  <span className="aria-sidebar-source-label">{src.name}</span>
                  {isUsed && <span className="aria-sidebar-source-tag">usada ahora</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
