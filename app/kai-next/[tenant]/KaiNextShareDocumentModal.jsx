'use client';

import { useEffect, useState } from 'react';

export default function KaiNextShareDocumentModal({ tenant, conversationId, doc, onClose }) {
  const [people, setPeople] = useState(null);
  const [existing, setExisting] = useState(null);
  const [type, setType] = useState('people');
  const [personIds, setPersonIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/kai-next/${tenant}/people`).then((r) => r.json()),
      fetch(`/api/kai-next/${tenant}/shared-documents?conversationId=${conversationId}`).then((r) => r.json()),
    ]).then(([peopleData, sharesData]) => {
      setPeople((peopleData.people ?? []).filter((p) => p.active !== false));
      const share = (sharesData.shares ?? []).find((s) => s.title === doc.title && s.format === doc.format);
      if (share) {
        setExisting(share);
        setType(share.audience.type);
        setPersonIds(share.audience.personIds);
      }
    }).catch(() => setError('No se pudo cargar el equipo. Intenta de nuevo.'));
  }, [tenant, conversationId, doc.title, doc.format]);

  const toggle = (id) => setPersonIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const run = async (request) => {
    setSaving(true);
    setError(null);
    try {
      const res = await request();
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar.');
      onClose();
    } catch (e) {
      setError(e.message || 'No se pudo guardar.');
      setSaving(false);
    }
  };

  const save = () => run(() => fetch(`/api/kai-next/${tenant}/shared-documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId, title: doc.title, format: doc.format, audience: { type, personIds } }),
  }));
  const unshare = () => run(() => fetch(`/api/kai-next/${tenant}/shared-documents?id=${existing.id}`, { method: 'DELETE' }));

  return (
    <div className="knx-ficha-share-backdrop" onClick={onClose}>
      <div className="knx-ficha-review-modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(460px, 92vw)' }}>
        <div className="knx-ficha-review-head">
          <div>
            <span className="knx-ficha-review-badge">Compartir documento</span>
            <h3 className="knx-ficha-review-title">{doc.title}</h3>
          </div>
          <button type="button" className="knx-side-panel-close" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>
        <p className="knx-canvas-meta-empty">Kai podrá usarlo y entregarlo solo a quienes elijas.</p>
        <div className="knx-knowledge-filters" style={{ margin: '12px 0' }}>
          <button type="button" className={`knx-filter-pill${type === 'people' ? ' knx-filter-pill--active' : ''}`} onClick={() => setType('people')}>Personas</button>
          <button type="button" className={`knx-filter-pill${type === 'team' ? ' knx-filter-pill--active' : ''}`} onClick={() => setType('team')}>Todo el equipo</button>
        </div>
        {type === 'people' && (
          <div className="knx-canvas-meta-checklist">
            {people === null ? (
              <p className="knx-canvas-meta-empty">Cargando equipo…</p>
            ) : people.map((p) => (
              <label key={p.id} className="knx-canvas-meta-checkbox">
                <input type="checkbox" checked={personIds.includes(p.id)} onChange={() => toggle(p.id)} />
                <span className="knx-canvas-meta-checkbox-box" />
                {p.name || p.email}
              </label>
            ))}
          </div>
        )}
        {error && <p className="knx-canvas-error">{error}</p>}
        <div className="knx-canvas-ficha-draft-actions" style={{ marginTop: 16, justifyContent: existing ? 'space-between' : 'flex-end' }}>
          {existing && <button type="button" className="knx-canvas-mini" onClick={unshare} disabled={saving}>Dejar de compartir</button>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="knx-canvas-mini" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="button" className="knx-analisis-sources-save" onClick={save} disabled={saving || people === null || (type === 'people' && !personIds.length)}>{saving ? 'Guardando…' : 'Compartir'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
