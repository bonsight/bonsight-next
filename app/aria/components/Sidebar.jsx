'use client';

import { useEffect, useRef, useState } from 'react';

const AREA_ORDER = ['Bonsight Website', 'Kai', 'Quiniela', 'General'];

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

export default function Sidebar({ investigations, activeId, onSelect, onNew, onArchive, onRestore, onDelete, counters = {}, sources = [], onIntelFilter }) {
  const [search, setSearch] = useState('');
  const [hoveredId, setHoveredId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [pulsing, setPulsing] = useState({});
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

  const q = search.toLowerCase().trim();
  const active = investigations.filter((inv) => inv.estado !== 'archivada');
  const archived = investigations.filter((inv) => inv.estado === 'archivada');

  function matchesQuery(inv) {
    if (!q) return true;
    const fields = [
      inv.titulo,
      inv.area,
      inv.resumen_sesion,
      ...(inv.tags ?? []),
      ...(inv.nuevos_insights ?? []),
      ...(inv.decisiones_confirmadas ?? []),
      ...(inv.preguntas_abiertas ?? []),
    ];
    return fields.some((f) => f && f.toLowerCase().includes(q));
  }

  const filtered = active.filter(matchesQuery);

  const groups = AREA_ORDER.map((area) => ({
    area,
    items: filtered.filter((inv) => (inv.area || 'General') === area),
  })).filter((g) => g.items.length > 0);

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
    const isActive = inv.id === activeId;
    const isHovered = hoveredId === inv.id;
    const isConfirming = confirmDeleteId === inv.id;

    const tags = inv.tags ?? [];

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
          {tags.length > 0 && (
            <span className="aria-sidebar-item-tags">
              {tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className={`aria-sidebar-tag${q && tag.toLowerCase().includes(q) ? ' aria-sidebar-tag-match' : ''}`}
                >
                  {tag}
                </span>
              ))}
            </span>
          )}
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
    <aside className="aria-sidebar">
      <p className="aria-sidebar-section-label">Análisis</p>

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

      {groups.length === 0 && q && (
        <p className="aria-sidebar-empty">Sin resultados para &ldquo;{search}&rdquo;</p>
      )}

      {groups.map((group) => (
        <div key={group.area}>
          <p className="aria-sidebar-group-label">{group.area}</p>
          {group.items.map((inv) => renderItem(inv))}
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

      {/* Inteligencia block */}
      <div className="aria-sidebar-intel-block">
        <p className="aria-sidebar-section-label">Inteligencia</p>
        <div className="aria-sidebar-intel-counters">
          {[
            { key: 'hallazgos',      val: hallazgos,      color: '#3B82F6', icon: '💡', label: 'Hallazgos',      type: 'hallazgo' },
            { key: 'riesgos',        val: riesgos,        color: '#EF4444', icon: '⚠️', label: 'Riesgos',        type: 'riesgo' },
            { key: 'recomendaciones',val: recomendaciones,color: '#8B5CF6', icon: '🎯', label: 'Recomendaciones', type: 'recomendacion' },
            { key: 'oportunidades',  val: oportunidades,  color: '#10B981', icon: '🚀', label: 'Oportunidades',   type: 'oportunidad' },
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

      {/* Fuentes block */}
      <div className="aria-sidebar-sources-block">
        <p className="aria-sidebar-section-label">Fuentes</p>
        <div className="aria-sidebar-source aria-sidebar-source--active">
          <span className="aria-sidebar-source-dot" />
          Kai
        </div>
        {sources.map((src) => (
          <div key={src.id} className={`aria-sidebar-source${src.active ? ' aria-sidebar-source--active' : ''}`}>
            <span className="aria-sidebar-source-dot" />
            {src.name}
          </div>
        ))}
        {sources.length === 0 && (
          <>
            <div className="aria-sidebar-source">
              <span className="aria-sidebar-source-dot" />
              GA4
            </div>
            <div className="aria-sidebar-source">
              <span className="aria-sidebar-source-dot" />
              BigQuery
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
