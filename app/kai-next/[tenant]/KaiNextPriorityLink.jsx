'use client';

import { useEffect, useState } from 'react';

// Vínculo opcional de una prioridad de la semana a un proyecto, prueba o tarea (Perfil). La
// prioridad guarda { type, id, projectId, label, projectName }; el estado se lee al día desde
// /api/kai-next/[tenant]/priority-links.

const TYPE_LABEL = { proyecto: 'Proyecto', prueba: 'Prueba', tarea: 'Tarea' };
const TABS = [['proyecto', 'Proyectos'], ['prueba', 'Pruebas'], ['tarea', 'Tareas']];

export function linkHref(basePath, tenant, link) {
  const base = `${basePath}/${tenant}/proyectos?p=${encodeURIComponent(link.projectId)}`;
  return link.type === 'prueba' ? `${base}&tab=pruebas` : link.type === 'tarea' ? `${base}&tab=trabajo` : base;
}

// Lista de destinos, cargada una vez y compartida por todas las tarjetas.
export function usePriorityLinkItems(tenant, enabled) {
  const [items, setItems] = useState(null);
  useEffect(() => {
    if (!enabled || items) return;
    fetch(`/api/kai-next/${tenant}/priority-links`).then((r) => (r.ok ? r.json() : { items: [] })).then((d) => setItems(d.items ?? [])).catch(() => setItems([]));
  }, [tenant, enabled, items]);
  return items;
}

export function PriorityLinkChip({ link, items, basePath, tenant, onRemove }) {
  const live = items?.find((x) => x.type === link.type && x.id === link.id);
  return (
    <span className="knx-plink">
      <a className="knx-plink-main" href={linkHref(basePath, tenant, link)} title={`Abrir ${TYPE_LABEL[link.type]?.toLowerCase()}`}>
        <span className="knx-plink-type">↗ {TYPE_LABEL[link.type]}</span>
        <span className="knx-plink-label">{live?.label ?? link.label}</span>
        {live ? <span className={`knx-plink-st knx-plink-st--${live.tone}`}>· {live.status}</span> : items ? <span className="knx-plink-st knx-plink-st--off">· Ya no está disponible</span> : null}
      </a>
      {onRemove && <button type="button" className="knx-plink-x" aria-label="Quitar vínculo" onClick={onRemove}>×</button>}
    </span>
  );
}

export function PriorityLinkPicker({ items, onPick, onClose }) {
  const [q, setQ] = useState('');
  const present = TABS.filter(([k]) => items?.some((x) => x.type === k));
  const [tab, setTab] = useState(present.find(([k]) => k === 'prueba')?.[0] ?? present[0]?.[0] ?? 'proyecto');
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  const needle = q.trim().toLowerCase();
  const list = (items ?? [])
    .filter((x) => (needle ? true : x.type === tab))
    .filter((x) => !needle || x.label.toLowerCase().includes(needle) || (x.projectName ?? '').toLowerCase().includes(needle))
    .slice(0, 40);

  return (
    <>
      <div className="knx-tp-scrim" onClick={onClose} />
      <div className="knx-plp" role="dialog" aria-label="Vincular a proyecto, prueba o tarea">
        <div className="knx-plp-top">
          <label htmlFor="knx-plp-q" className="knx-sr-only">Buscar</label>
          <input id="knx-plp-q" className="knx-dlg-input" placeholder="Buscar proyecto, prueba o tarea…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          {!needle && present.length > 1 && (
            <div className="knx-plp-tabs" role="tablist">
              {present.map(([k, l]) => (
                <button key={k} type="button" role="tab" aria-selected={tab === k} className={`knx-fbc-pill${tab === k ? ' knx-fbc-pill--on' : ''}`} onClick={() => setTab(k)}>{l}</button>
              ))}
            </div>
          )}
        </div>
        <ul className="knx-plp-list">
          {items === null && <li className="knx-tp-empty">Cargando…</li>}
          {items && !list.length && <li className="knx-tp-empty">{needle ? 'Nada coincide.' : 'No hay nada para vincular todavía.'}</li>}
          {list.map((x) => (
            <li key={`${x.type}:${x.id}`}>
              <button type="button" onClick={() => onPick({ type: x.type, id: x.id, projectId: x.projectId, label: x.label, projectName: x.projectName })}>
                <span className="knx-plp-label">{needle && <em>{TYPE_LABEL[x.type]} · </em>}{x.label}</span>
                <span className="knx-plp-meta">{[x.status, x.projectName].filter(Boolean).join(' · ')}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
