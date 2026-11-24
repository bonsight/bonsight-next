'use client';

import { useState } from 'react';

// Equipo del proyecto (meta.supervisorIds): quién está adentro. Lo arma el Director, o un
// Supervisor en los proyectos donde ya está. Se usa en Proyectos y en Empresas.
// lockedId: quien no es Director no puede sacarse a sí mismo (perdería el acceso al proyecto).
export default function KaiNextProjectTeamModal({ tenant, project, people, lockedId = null, onClose, onSaved }) {
  const [supervisorIds, setSupervisorIds] = useState(project.supervisorIds ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const toggle = (id) => {
    if (id === lockedId) return;
    setSupervisorIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/projects/${project.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ supervisorIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar.');
      onSaved(data.meta);
    } catch (e) {
      setError(e.message || 'No se pudo guardar.');
      setSaving(false);
    }
  };

  return (
    <div className="knx-ficha-share-backdrop" onClick={onClose}>
      <div className="knx-ficha-review-modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(460px, 92vw)' }}>
        <div className="knx-ficha-review-head">
          <div>
            <span className="knx-ficha-review-badge">{project.name}</span>
            <h3 className="knx-ficha-review-title">Equipo del proyecto</h3>
          </div>
          <button type="button" className="knx-side-panel-close" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>
        <div className="knx-ficha-review-field">
          <label>Equipo</label>
          <div className="knx-canvas-meta-checklist">
            {!people.length ? (
              <p className="knx-canvas-meta-empty">No hay personas en el equipo todavía.</p>
            ) : people.map((p) => (
              <label key={p.id} className="knx-canvas-meta-checkbox">
                <input type="checkbox" checked={supervisorIds.includes(p.id)} onChange={() => toggle(p.id)} disabled={p.id === lockedId} />
                <span className="knx-canvas-meta-checkbox-box" />
                {p.name || p.email}{p.id === lockedId ? ' (tú)' : ''}
              </label>
            ))}
          </div>
        </div>
        {error && <p className="knx-canvas-error">{error}</p>}
        <div className="knx-canvas-ficha-draft-actions" style={{ marginTop: 16 }}>
          <button type="button" className="knx-canvas-mini" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="button" className="knx-analisis-sources-save" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  );
}
