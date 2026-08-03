'use client';

import { useEffect, useState } from 'react';

const IconArrowRight = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);

const QUADRANT_META = {
  wins: { label: 'Quick wins', className: 'aria-triage-cell--wins' },
  bets: { label: 'Grandes apuestas', className: 'aria-triage-cell--bets' },
  filler: { label: 'Rellenos', className: 'aria-triage-cell--filler' },
  avoid: { label: 'Evitar por ahora', className: 'aria-triage-cell--avoid' },
};

function TriageRow({ group, checked, onToggle }) {
  return (
    <label className="aria-triage-row">
      <input type="checkbox" className="aria-sd-task-check" checked={checked} onChange={(e) => onToggle(e.target.checked)} />
      <div className="aria-triage-row-body">
        <div className="aria-triage-row-name">{group.groupName}</div>
        <div className="aria-triage-row-reason">{group.reason}</div>
      </div>
      <div className="aria-triage-tags">
        <span className={`aria-triage-tag aria-triage-tag--valor-${group.valor}`}>Valor {group.valor}</span>
        <span className={`aria-triage-tag aria-triage-tag--esfuerzo-${group.esfuerzo}`}>Esfuerzo {group.esfuerzo}</span>
      </div>
    </label>
  );
}

export default function SprintTriagePresentation({ tenant, investigationId, onContinue }) {
  const [triage, setTriage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [checked, setChecked] = useState({});
  const [starting, setStarting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/aria/${tenant}/investigations/${investigationId}/sprint-triage`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok) { setErr(data.error || 'No se pudo generar el triage.'); return; }
        setTriage(data);
        setChecked(Object.fromEntries(data.groups.map((g) => [g.groupId, g.suggested])));
      } catch {
        setErr('Error de conexión.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tenant, investigationId]);

  if (loading) return <div className="aria-presentation"><p className="aria-board-hint">Analizando agrupaciones del workshop…</p></div>;
  if (err) return <div className="aria-presentation"><p className="aria-canvas-error">{err}</p></div>;
  if (!triage) return null;

  const selectedIds = Object.keys(checked).filter((id) => checked[id]);
  const byQuadrant = { wins: [], bets: [], filler: [], avoid: [] };
  for (const g of triage.groups) byQuadrant[g.quadrant]?.push(g);

  const handleContinue = async () => {
    setStarting(true);
    setErr(null);
    try {
      const res = await fetch(`/api/aria/${tenant}/investigations/${investigationId}/sprint-draft/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupIds: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'No se pudo continuar.'); return; }
      onContinue?.(data.messages);
      setDone(true);
    } catch {
      setErr('Error de conexión.');
    } finally {
      setStarting(false);
    }
  };

  if (done) {
    return (
      <div className="aria-presentation">
        <div className="aria-card">
          <p className="aria-canvas-header-eyebrow">Workshop</p>
          <h3 className="aria-canvas-title">Triage de iniciativas</h3>
          <p className="aria-sd-page-sub">{selectedIds.length} de {triage.groups.length} agrupaciones avanzaron a generación de tareas — el resto queda disponible para el próximo triage.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="aria-presentation">
      <div className="aria-card">
        <p className="aria-canvas-header-eyebrow">Workshop</p>
        <h3 className="aria-canvas-title">Triage de iniciativas</h3>
        <p className="aria-sd-page-sub">Antes de generar tareas de sprint, decidí qué agrupaciones avanzan ahora. Aria sugiere según valor para Bonsight y esfuerzo estimado.</p>

        <div className="aria-triage-quadrant">
          <div className="aria-triage-axis-y">VALOR PARA BONSIGHT</div>
          <div className="aria-triage-grid">
            {['wins', 'bets', 'filler', 'avoid'].map((key) => (
              <div key={key} className={`aria-triage-cell ${QUADRANT_META[key].className}`}>
                <div className="aria-triage-cell-label">{QUADRANT_META[key].label}</div>
                {byQuadrant[key].map((g) => (
                  <span key={g.groupId} className={`aria-triage-chip${checked[g.groupId] ? ' aria-triage-chip--selected' : ''}`}>
                    {g.groupName}
                  </span>
                ))}
              </div>
            ))}
          </div>
          <div className="aria-triage-axis-x">
            <span>Esfuerzo bajo</span>
            <span>Esfuerzo alto</span>
          </div>
        </div>
      </div>

      {err && <p className="aria-canvas-error">{err}</p>}

      <div className="aria-sd-subsection-label" style={{ margin: '16px 0 8px' }}>Selección para este batch</div>
      {triage.groups.map((g) => (
        <TriageRow
          key={g.groupId}
          group={g}
          checked={!!checked[g.groupId]}
          onToggle={(v) => setChecked((prev) => ({ ...prev, [g.groupId]: v }))}
        />
      ))}

      <div className="aria-triage-cta-row">
        <span className="aria-sd-page-sub" style={{ margin: 0 }}>{selectedIds.length} de {triage.groups.length} seleccionadas</span>
        <button type="button" className="aria-canvas-mini aria-canvas-mini--primary" disabled={starting || !selectedIds.length} onClick={handleContinue}>
          {starting ? 'Generando…' : <>Continuar con las seleccionadas <IconArrowRight /></>}
        </button>
      </div>
    </div>
  );
}
