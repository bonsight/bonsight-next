'use client';

import { useState } from 'react';
import { draftChatUrl } from '@/lib/kaiNext/draftChat';

// Las 8 categorías del Business Profile que antes no se mostraban en ningún lado (confirmado
// leyendo Redis real: se guardaban bien, pero Empresa solo mostraba prioridades/objetivos/
// generales/aprendizajes). Todas vienen ya armadas en `bic` (lib/kai/bic.js) — no hace falta
// ningún prop ni fetch nuevo. `resolvable` marca las únicas 3 categorías que hoy tienen ledger
// de resolución + fusión de duplicados ya construidos (ver app/api/kai-next/[tenant]/profile/
// merge-duplicates/route.js) — Personas/Decisiones/Iniciativas/Tecnología/Procesos quedan de
// solo lectura por ahora.
export const MAPA_CATEGORIES = [
  { id: 'risks', label: 'Riesgos', resolveType: 'risk' },
  { id: 'pains', label: 'Dolores', resolveType: 'pain' },
  { id: 'opportunities', label: 'Oportunidades', resolveType: 'opportunity' },
  { id: 'stakeholders', label: 'Personas', resolveType: null },
  { id: 'decisions', label: 'Decisiones', resolveType: null },
  { id: 'initiatives', label: 'Iniciativas', resolveType: null },
  { id: 'technology', label: 'Tecnología', resolveType: null },
  { id: 'processes', label: 'Procesos', resolveType: null },
];

// Mismo helper que ya existe duplicado en bic.js/diagnosis.js/KaiNextEmpresa.jsx (tagText/
// tagLabel) — los ítems de stakeholders son objetos {name, roles}, el resto son strings.
function itemText(x) {
  if (typeof x === 'string') return x;
  if (x?.name) return x.roles?.length ? `${x.name} — ${x.roles.join(', ')}` : x.name;
  return x?.label ?? '';
}

function isResolved(resolvedRefs, type, ref) {
  return (resolvedRefs ?? []).some((r) => r.type === type && r.ref === ref);
}

export default function KaiNextEmpresaMapa({ tenant, tenantName, basePath, bic, resolvedRefs, onMarkResolved, onReopen }) {
  const [openId, setOpenId] = useState(null);
  const [tab, setTab] = useState('activos'); // 'activos' | 'resueltos', solo para resolvables
  const [busyRef, setBusyRef] = useState(null);

  const categories = MAPA_CATEGORIES.map((cat) => {
    const items = bic?.[cat.id] ?? [];
    const activeItems = cat.resolveType
      ? items.filter((it) => !isResolved(resolvedRefs, cat.resolveType, itemText(it)))
      : items;
    const resolvedItems = cat.resolveType ? items.filter((it) => isResolved(resolvedRefs, cat.resolveType, itemText(it))) : [];
    return { ...cat, items, activeItems, resolvedItems };
  });

  const open = categories.find((c) => c.id === openId) ?? null;

  const askKaiHref = (cat) => draftChatUrl(
    basePath, tenant,
    `Todavía no sé casi nada sobre ${cat.label.toLowerCase()} de ${tenantName}. Hazme las preguntas que necesites para entenderlo.`,
  );

  const handleToggleResolve = async (cat, text, currentlyResolved) => {
    setBusyRef(text);
    try {
      if (currentlyResolved) await onReopen(cat.resolveType, text);
      else await onMarkResolved(cat.resolveType, text);
    } finally {
      setBusyRef(null);
    }
  };

  return (
    <>
      <div className="knx-mapa-grid">
        {categories.map((cat) => {
          const isGap = cat.items.length === 0;
          const count = cat.resolveType ? cat.activeItems.length : cat.items.length;
          const preview = (cat.resolveType ? cat.activeItems : cat.items).slice(0, 3);
          return (
            <div
              key={cat.id}
              role="button"
              tabIndex={0}
              className={`knx-mapa-tile${isGap ? ' knx-mapa-tile--gap' : ''}`}
              onClick={() => { setOpenId(cat.id); setTab('activos'); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenId(cat.id); setTab('activos'); } }}
            >
              <div className="knx-mapa-tile-head">
                <b>{cat.label}</b>
                <em>{count}</em>
              </div>
              {isGap ? (
                <p>Kai todavía no sabe casi nada de esto.</p>
              ) : (
                <ul>
                  {preview.map((it, i) => <li key={i}>{itemText(it)}</li>)}
                </ul>
              )}
              <span className="knx-mapa-tile-more">{isGap ? 'Contarle a Kai →' : 'Ver todo →'}</span>
            </div>
          );
        })}
      </div>

      {open && (
        <div className="knx-meetings-modal-backdrop" onClick={() => setOpenId(null)}>
          <aside className="knx-mapa-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="knx-mapa-drawer-head">
              <h2>{open.label}</h2>
              <button type="button" className="knx-side-panel-close" aria-label="Cerrar" onClick={() => setOpenId(null)}>×</button>
            </div>
            {open.resolveType && (
              <div className="knx-knowledge-filters">
                <button type="button" className={`knx-filter-pill${tab === 'activos' ? ' knx-filter-pill--active' : ''}`} onClick={() => setTab('activos')}>Activos · {open.activeItems.length}</button>
                <button type="button" className={`knx-filter-pill${tab === 'resueltos' ? ' knx-filter-pill--active' : ''}`} onClick={() => setTab('resueltos')}>Resueltos · {open.resolvedItems.length}</button>
              </div>
            )}
            <div className="knx-mapa-drawer-body">
              {(() => {
                const list = open.resolveType ? (tab === 'activos' ? open.activeItems : open.resolvedItems) : open.items;
                if (!list.length) return <p className="knx-empresa-card-empty">{open.items.length === 0 ? 'Nada por acá todavía.' : 'Nada en esta pestaña.'}</p>;
                return list.map((it, i) => {
                  const text = itemText(it);
                  const resolved = tab === 'resueltos';
                  return (
                    <div className="knx-mapa-item" key={i}>
                      <span>{text}</span>
                      {open.resolveType && (
                        <button
                          type="button"
                          className="knx-pill-action knx-pill-action--secondary"
                          disabled={busyRef === text}
                          onClick={() => handleToggleResolve(open, text, resolved)}
                        >
                          {busyRef === text ? '…' : resolved ? 'Reabrir' : 'Marcar resuelto'}
                        </button>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
            {open.items.length === 0 && (
              <a className="knx-eje-action" href={askKaiHref(open)}>⚡ Contarle a Kai sobre {open.label.toLowerCase()}</a>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
