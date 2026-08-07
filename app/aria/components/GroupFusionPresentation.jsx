'use client';

import { useEffect, useState } from 'react';

function ConflictPicker({ label, valueA, valueB, selected, onSelect }) {
  const options = [...new Set([valueA, valueB].filter(Boolean))];
  if (options.length < 2) return null;

  return (
    <div className="aria-fusion-conflict">
      <span className="aria-fusion-conflict-label">{label} — elegí cuál queda:</span>
      <div className="aria-fusion-conflict-opts">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`aria-fusion-conflict-opt${selected === opt ? ' aria-fusion-conflict-opt--active' : ''}`}
            onClick={() => onSelect(opt)}
          >
            {opt}
          </button>
        ))}
        <button
          type="button"
          className={`aria-fusion-conflict-opt${!selected ? ' aria-fusion-conflict-opt--active' : ''}`}
          onClick={() => onSelect(null)}
        >
          Sin definir
        </button>
      </div>
    </div>
  );
}

function FusionCard({ suggestion, tenant, investigationId, messageIndex, onCanvasUpdate }) {
  const { groupA, groupB, strength, reason, preview } = suggestion;
  const [status, setStatus] = useState('pending'); // pending | merging | merged | kept
  const [err, setErr] = useState(null);

  // Aria pre-elige: si hay conflicto, se queda con el valor del grupo que trae más
  // iniciativas — el humano puede cambiarlo antes de confirmar.
  const heavier = groupA.itemCount >= groupB.itemCount ? groupA : groupB;
  const [area, setArea] = useState(groupA.area === groupB.area ? groupA.area : heavier.area);
  const [responsable, setResponsable] = useState(groupA.responsable === groupB.responsable ? groupA.responsable : heavier.responsable);

  const handleMerge = async () => {
    setStatus('merging');
    setErr(null);
    try {
      const res = await fetch(`/api/aria/${tenant}/investigations/${investigationId}/canvas`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageIndex,
          action: 'merge_groups_cross_question',
          sourceQuestionId: groupA.questionId,
          sourceGroupId: groupA.groupId,
          targetQuestionId: groupB.questionId,
          targetGroupId: groupB.groupId,
          area,
          responsable,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'No se pudo fusionar.'); setStatus('pending'); return; }
      setStatus('merged');
      // Sin esto, la vista del workshop (fuera de esta pantalla de revisión) queda con el
      // canvas viejo hasta un reload — nadie más se entera de que el canvas cambió acá.
      onCanvasUpdate?.(messageIndex, data.canvas);
    } catch {
      setErr('Error de conexión.');
      setStatus('pending');
    }
  };

  if (status === 'merged') {
    return (
      <div className="aria-fusion-card aria-fusion-card--done">
        <span className="aria-fusion-done-text">✓ Fusionadas: "{groupA.name}" + "{groupB.name}"</span>
      </div>
    );
  }
  if (status === 'kept') {
    return (
      <div className="aria-fusion-card aria-fusion-card--done">
        <span className="aria-fusion-done-text">"{groupA.name}" y "{groupB.name}" quedaron separadas.</span>
      </div>
    );
  }

  return (
    <div className="aria-fusion-card">
      <div className="aria-fusion-groups">
        <div className="aria-fusion-chip">
          <div className="aria-fusion-chip-source">{groupA.questionText}</div>
          <div className="aria-fusion-chip-name">{groupA.name}</div>
          <div className="aria-fusion-chip-meta">{groupA.itemCount} iniciativas · {groupA.involucradosCount} involucrados</div>
        </div>
        <div className="aria-fusion-plus">+</div>
        <div className="aria-fusion-chip">
          <div className="aria-fusion-chip-source">{groupB.questionText}</div>
          <div className="aria-fusion-chip-name">{groupB.name}</div>
          <div className="aria-fusion-chip-meta">{groupB.itemCount} iniciativas · {groupB.involucradosCount} involucrados</div>
        </div>
      </div>

      <div className={`aria-fusion-reason${strength === 'débil' ? ' aria-fusion-reason--weak' : ''}`}>
        <b>{strength === 'fuerte' ? 'Por qué Aria sugiere esto' : 'Match débil — revisalo con cuidado'}:</b> {reason}
      </div>

      <ConflictPicker label="Categoría" valueA={groupA.area} valueB={groupB.area} selected={area} onSelect={setArea} />
      <ConflictPicker label="Responsable" valueA={groupA.responsable} valueB={groupB.responsable} selected={responsable} onSelect={setResponsable} />

      <p className="aria-fusion-preview">
        Resultado si fusionás: 1 agrupación · {preview.combinedIniciativas} iniciativas · {preview.combinedInvolucrados} involucrados (sin duplicados)
      </p>

      {err && <p className="aria-canvas-error">{err}</p>}

      <div className="aria-fusion-actions">
        <button type="button" className="aria-canvas-mini" disabled={status === 'merging'} onClick={() => setStatus('kept')}>
          Mantener separadas
        </button>
        <button type="button" className="aria-canvas-mini aria-canvas-mini--primary" disabled={status === 'merging'} onClick={handleMerge}>
          {status === 'merging' ? 'Fusionando…' : 'Fusionar'}
        </button>
      </div>
    </div>
  );
}

export default function GroupFusionPresentation({ tenant, investigationId, onDone, onCanvasUpdate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/aria/${tenant}/investigations/${investigationId}/group-fusion`, { method: 'POST' });
        const json = await res.json();
        if (!res.ok) { setErr(json.error || 'No se pudieron sugerir fusiones.'); return; }
        setData(json);
      } catch {
        setErr('Error de conexión.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tenant, investigationId]);

  if (loading) return <div className="aria-presentation"><p className="aria-board-hint">Buscando agrupaciones relacionadas entre preguntas…</p></div>;
  if (err) return <div className="aria-presentation"><p className="aria-canvas-error">{err}</p></div>;
  if (!data) return null;

  return (
    <div className="aria-presentation">
      <div className="aria-card">
        <p className="aria-canvas-header-eyebrow">Workshop</p>
        <h3 className="aria-canvas-title">Sugerencias de fusión de agrupaciones</h3>
        <p className="aria-sd-page-sub">
          Aria detectó agrupaciones de preguntas distintas que podrían ser el mismo tema. Fusionarlas ahora, antes de crear fichas, evita iniciativas fragmentadas y concentra las respuestas en una sola ficha más potente.
        </p>
      </div>

      {data.suggestions.length === 0 ? (
        <p className="aria-board-hint">Aria no encontró coincidencias entre preguntas distintas esta vez.</p>
      ) : (
        data.suggestions.map((s, i) => (
          <FusionCard
            key={`${s.groupA.groupId}-${s.groupB.groupId}`}
            suggestion={s}
            tenant={tenant}
            investigationId={investigationId}
            messageIndex={data.messageIndex}
            onCanvasUpdate={onCanvasUpdate}
          />
        ))
      )}

      {data.skippedCount > 0 && (
        <p className="aria-fusion-skip-note">
          {data.suggestions.length > 0
            ? `Las ${data.skippedCount} agrupaciones restantes no tuvieron coincidencias sugeridas por Aria.`
            : `Ninguna de las ${data.skippedCount} agrupaciones tuvo coincidencias sugeridas por Aria.`}
        </p>
      )}

      <div className="aria-fusion-cta-row">
        <button type="button" className="aria-canvas-mini" onClick={() => onDone?.(data.messageIndex)}>Cancelar</button>
        <button type="button" className="aria-canvas-mini aria-canvas-mini--primary" onClick={() => onDone?.(data.messageIndex)}>Continuar → crear fichas</button>
      </div>
    </div>
  );
}
