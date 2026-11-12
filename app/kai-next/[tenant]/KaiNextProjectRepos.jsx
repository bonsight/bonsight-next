'use client';

import { useEffect, useState } from 'react';

// Repositorios de GitHub conectados a un proyecto de Desarrollo. Kai los lee en modo solo lectura
// para responder sobre módulos, código y commits. Elegirlos es de Supervisores del proyecto y
// Directores; el resto del equipo solo los ve.
function EditReposModal({ tenant, projectId, current, connections, onClose, onSaved }) {
  const [connectionId, setConnectionId] = useState(connections[0]?.id ?? null);
  const [available, setAvailable] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [selected, setSelected] = useState(() => current.map((r) => ({ fullName: r.fullName, branch: r.branch ?? '', connectionId: r.connectionId ?? null })));
  const [manual, setManual] = useState('');
  const [filter, setFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setAvailable(null);
    setLoadError(null);
    setFilter('');
    const qs = connectionId ? `&connectionId=${encodeURIComponent(connectionId)}` : '';
    fetch(`/api/kai-next/${tenant}/projects/${projectId}/repos?available=1${qs}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.availableError) setLoadError(d.availableError);
        setAvailable(d.available ?? []);
      })
      .catch(() => { setLoadError('No se pudo cargar la lista de repositorios.'); setAvailable([]); });
  }, [tenant, projectId, connectionId]);

  const connLabel = (id) => connections.find((c) => c.id === id)?.label ?? null;
  const isSelected = (fullName) => selected.some((s) => s.fullName.toLowerCase() === fullName.toLowerCase());
  const toggle = (fullName) => setSelected((prev) => (isSelected(fullName)
    ? prev.filter((s) => s.fullName.toLowerCase() !== fullName.toLowerCase())
    : [...prev, { fullName, branch: '', connectionId }]));
  const setBranch = (fullName, branch) => setSelected((prev) => prev.map((s) => (s.fullName === fullName ? { ...s, branch } : s)));
  const addManual = () => {
    const name = manual.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/+$/, '');
    if (!name) return;
    if (!isSelected(name)) setSelected((prev) => [...prev, { fullName: name, branch: '', connectionId }]);
    setManual('');
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/repos`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repos: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar.');
      onSaved(data.repos ?? []);
    } catch (e) {
      setError(e.message || 'No se pudo guardar.');
      setSaving(false);
    }
  };

  const q = filter.trim().toLowerCase();
  const visible = (available ?? []).filter((r) => !q || r.fullName.toLowerCase().includes(q));

  return (
    <div className="knx-ficha-share-backdrop" onClick={onClose}>
      <div className="knx-ficha-review-modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(520px, 92vw)' }}>
        <div className="knx-ficha-review-head">
          <div>
            <span className="knx-ficha-review-badge">Repositorios</span>
            <h3 className="knx-ficha-review-title">Conectar con GitHub</h3>
          </div>
          <button type="button" className="knx-side-panel-close" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>
        <p className="knx-canvas-meta-empty">Kai podrá leer estos repositorios, sin modificarlos, para responder sobre el código de este proyecto.</p>

        {selected.length > 0 && (
          <div className="knx-repos-selected">
            {selected.map((s) => (
              <div key={s.fullName} className="knx-repos-selected-row">
                <span className="knx-repos-name">
                  {s.fullName}
                  {connections.length > 1 && connLabel(s.connectionId) && <small style={{ display: 'block', fontWeight: 400, opacity: 0.6 }}>vía {connLabel(s.connectionId)}</small>}
                </span>
                <input
                  className="knx-canvas-meta-select"
                  placeholder="Rama (opcional, por defecto la principal)"
                  value={s.branch}
                  onChange={(e) => setBranch(s.fullName, e.target.value)}
                />
                <button type="button" className="knx-side-panel-close" aria-label={`Quitar ${s.fullName}`} onClick={() => toggle(s.fullName)}>×</button>
              </div>
            ))}
          </div>
        )}

        {connections.length > 1 && (
          <div style={{ margin: '12px 0 2px' }}>
            <span className="knx-canvas-meta-field-label">Cuenta de GitHub</span>
            <select className="knx-canvas-meta-select" value={connectionId ?? ''} onChange={(e) => setConnectionId(e.target.value)} style={{ marginTop: 4 }}>
              {connections.map((c) => (
                <option key={c.id} value={c.id}>{c.label} · {c.repoCount} repo{c.repoCount === 1 ? '' : 's'}</option>
              ))}
            </select>
          </div>
        )}

        {available === null ? (
          <p className="knx-canvas-meta-empty">Cargando repositorios…</p>
        ) : (
          <>
            {loadError && <p className="knx-canvas-error">{loadError}</p>}
            {available.length > 0 && (
              <>
                <input className="knx-canvas-meta-select" placeholder="Buscar repositorio…" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ margin: '10px 0 6px' }} />
                <div className="knx-canvas-meta-checklist knx-repos-list">
                  {visible.map((r) => (
                    <label key={r.fullName} className="knx-canvas-meta-checkbox">
                      <input type="checkbox" checked={isSelected(r.fullName)} onChange={() => toggle(r.fullName)} />
                      <span className="knx-canvas-meta-checkbox-box" />
                      {r.fullName}{r.private ? ' · privado' : ''}
                    </label>
                  ))}
                  {!visible.length && <p className="knx-canvas-meta-empty">Ningún repositorio coincide.</p>}
                </div>
              </>
            )}
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <input
                className="knx-canvas-meta-select"
                placeholder="O escribe owner/repositorio"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addManual()}
              />
              <button type="button" className="knx-canvas-mini" onClick={addManual}>Agregar</button>
            </div>
          </>
        )}

        {error && <p className="knx-canvas-error">{error}</p>}
        <div className="knx-canvas-ficha-draft-actions" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="knx-canvas-mini" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="button" className="knx-analisis-sources-save" onClick={save} disabled={saving}>{saving ? 'Validando…' : 'Guardar'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function KaiNextProjectRepos({ tenant, projectId }) {
  const [state, setState] = useState(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetch(`/api/kai-next/${tenant}/projects/${projectId}/repos`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setState(d))
      .catch(() => setState(null));
  }, [tenant, projectId]);

  if (!state) return null;
  const { repos, githubConnected, canEdit, connections = [] } = state;
  if (!repos.length && !canEdit) return null;

  return (
    <div className="knx-repos-bar">
      <span className="knx-canvas-meta-field-label">Repositorios</span>
      {repos.map((r) => (
        <a key={r.fullName} className="knx-repos-chip" href={r.url ?? `https://github.com/${r.fullName}`} target="_blank" rel="noreferrer">
          {r.fullName}{r.branch ? ` · ${r.branch}` : ''}
        </a>
      ))}
      {!repos.length && (
        <span className="knx-canvas-ficha-progress">
          {githubConnected ? 'Sin repositorio conectado.' : 'GitHub no está conectado. Se configura en Admin → Fuentes.'}
        </span>
      )}
      {canEdit && githubConnected && (
        <button type="button" className="knx-canvas-mini" onClick={() => setEditing(true)}>{repos.length ? 'Editar' : 'Conectar repositorio'}</button>
      )}
      {editing && (
        <EditReposModal
          tenant={tenant}
          projectId={projectId}
          current={repos}
          connections={connections}
          onClose={() => setEditing(false)}
          onSaved={(next) => { setState((s) => ({ ...s, repos: next })); setEditing(false); }}
        />
      )}
    </div>
  );
}
