'use client';

import { useEffect, useState } from 'react';

// Alcance de empresa elegido en el selector de la barra lateral ("Todas mis empresas" o una
// puntual). Vive en el navegador (localStorage, por tenant) y se avisa con un evento para que la
// barra, las pantallas y el chat cambien juntos. Si el tenant no usa empresas, hasEmpresas es
// false y nada de esto se muestra.
const EVENT = 'knx-empresa-scope';
const storageKey = (tenant) => `knx:${tenant}:empresa`;

function readScope(tenant) {
  try { return localStorage.getItem(storageKey(tenant)) || 'all'; } catch { return 'all'; }
}

const cache = new Map(); // tenant -> promesa de /empresas, una sola vez por carga de página

export function useEmpresaScope(tenant) {
  const [all, setAll] = useState(null); // empresas asignadas (null = cargando)
  const [scope, setScopeState] = useState('all');

  useEffect(() => {
    setScopeState(readScope(tenant));
    if (!cache.has(tenant)) {
      cache.set(tenant, fetch(`/api/kai-next/${tenant}/empresas`).then((r) => (r.ok ? r.json() : { empresas: [] })).catch(() => ({ empresas: [] })));
    }
    let alive = true;
    cache.get(tenant).then((d) => { if (alive) setAll(d.empresas ?? []); });
    const onChange = (e) => { if (e.detail?.tenant === tenant) setScopeState(e.detail.scope); };
    window.addEventListener(EVENT, onChange);
    return () => { alive = false; window.removeEventListener(EVENT, onChange); };
  }, [tenant]);

  // En el selector: visibles y con al menos un proyecto que esta persona pueda ver.
  const selectable = (all ?? []).filter((e) => e.visible !== false && e.projectCount > 0);
  const effective = scope !== 'all' && !selectable.some((e) => e.id === scope) ? 'all' : scope;

  const setScope = (next) => {
    try { localStorage.setItem(storageKey(tenant), next); } catch { /* sin storage: solo esta pestaña */ }
    setScopeState(next);
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { tenant, scope: next } }));
  };

  return {
    loading: all === null,
    hasEmpresas: (all ?? []).length > 0,
    empresas: all ?? [],
    selectable,
    scope: selectable.length === 1 ? selectable[0].id : effective,
    fixed: selectable.length <= 1,
    setScope,
  };
}
