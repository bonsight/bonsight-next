'use client';

import { useEffect, useState } from 'react';

// Port directo de app/aria/components/GroupFusionPresentation.jsx — compara grupos de
// preguntas DISTINTAS del canvas (nunca de la misma pregunta, para eso está el ícono de
// fusión manual en la tarjeta) y sugiere cuáles fusionar antes de armar fichas por separado.
function ConflictPicker({ label, valueA, valueB, selected, onSelect }) {
  const options = [...new Set([valueA, valueB].filter(Boolean))];
  if (options.length < 2) return null;

  return (
    <div className="knx-fusion-conflict">
      <span className="knx-fusion-conflict-label">{label} — elegí cuál queda:</span>
      <div className="knx-fusion-conflict-opts">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`knx-fusion-conflict-opt${selected === opt ? ' knx-fusion-conflict-opt--active' : ''}`}
            onClick={() => onSelect(opt)}
          >
            {opt}
          </button>
        ))}
        <button
          type="button"
          className={`knx-fusion-conflict-opt${!selected ? ' knx-fusion-conflict-opt--active' : ''}`}
          onClick={() => onSelect(null)}
        >
          Sin definir
        </button>
      </div>
    </div>
  );
}

function FusionCard({ suggestion, tenant, activityId, onCanvasUpdate }) {
  const { groupA, groupB, strength, reason, preview } = suggestion;
  const [status, setStatus] = useState('pending'); // pending | merging | merged | kept
  const [err, setErr] = useState(null);

  // Si hay conflicto, se pre-elige el valor del grupo con más iniciativas — el humano puede
  // cambiarlo antes de confirmar.
  const heavier = groupA.itemCount >= groupB.itemCount ? groupA : groupB;
  const [area, setArea] = useState(groupA.area === groupB.area ? groupA.area : heavier.area);
  const [responsable, setResponsable] = useState(groupA.responsable === groupB.responsable ? groupA.responsable : heavier.responsable);

  const handleMerge = async () => {
    setStatus('merging');
    setErr(null);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/activities/${activityId}/canvas`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'merge_groups_cross_question',
          params: {
            sourceQuestionId: groupA.questionId,
            sourceGroupId: groupA.groupId,
            targetQuestionId: groupB.questionId,
            targetGroupId: groupB.groupId,
            area,
            responsable,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'No se pudo fusionar.'); setStatus('pending'); return; }
      setStatus('merged');
      onCanvasUpdate?.(data.canvas);
    } catch {
      setErr('Error de conexión.');
      setStatus('pending');
    }
  };

  if (status === 'merged') {
    return (
      <div className="knx-fusion-card knx-fusion-card--done">
        <span className="knx-fusion-done-text">✓ Fusionadas: "{groupA.name}" + "{groupB.name}"</span>
      </div>
    );
  }
  if (status === 'kept') {
    return (
      <div className="knx-fusion-card knx-fusion-card--done">
        <span className="knx-fusion-done-text">"{groupA.name}" y "{groupB.name}" quedaron separadas.</span>
      </div>
    );
  }

  return (
    <div className="knx-fusion-card">
      <div className="knx-fusion-groups">
        <div className="knx-fusion-chip">
          <div className="knx-fusion-chip-source">{groupA.questionText}</div>
          <div className="knx-fusion-chip-name">{groupA.name}</div>
          <div className="knx-fusion-chip-meta">{groupA.itemCount} iniciativas · {groupA.involucradosCount} involucrados</div>
        </div>
        <div className="knx-fusion-plus">+</div>
        <div className="knx-fusion-chip">
          <div className="knx-fusion-chip-source">{groupB.questionText}</div>
          <div className="knx-fusion-chip-name">{groupB.name}</div>
          <div className="knx-fusion-chip-meta">{groupB.itemCount} iniciativas · {groupB.involucradosCount} involucrados</div>
        </div>
      </div>

      <div className={`knx-fusion-reason${strength === 'débil' ? ' knx-fusion-reason--weak' : ''}`}>
        <b>{strength === 'fuerte' ? 'Por qué Kai sugiere esto' : 'Match débil — revisalo con cuidado'}:</b> {reason}
      </div>

      <ConflictPicker label="Categoría" valueA={groupA.area} valueB={groupB.area} selected={area} onSelect={setArea} />
      <ConflictPicker label="Responsable" valueA={groupA.responsable} valueB={groupB.responsable} selected={responsable} onSelect={setResponsable} />

      <p className="knx-fusion-preview">
        Resultado si fusionás: 1 agrupación · {preview.combinedIniciativas} iniciativas · {preview.combinedInvolucrados} involucrados (sin duplicados)
      </p>

      {err && <p className="knx-canvas-error">{err}</p>}

      <div className="knx-fusion-actions">
        <button type="button" className="knx-canvas-mini" disabled={status === 'merging'} onClick={() => setStatus('kept')}>
          Mantener separadas
        </button>
        <button type="button" className="knx-canvas-mini knx-canvas-mini--primary" disabled={status === 'merging'} onClick={handleMerge}>
          {status === 'merging' ? 'Fusionando…' : 'Fusionar'}
        </button>
      </div>
    </div>
  );
}

export default function KaiNextGroupFusion({ tenant, activityId, onDone, onCanvasUpdate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/kai-next/${tenant}/activities/${activityId}/group-fusion`, { method: 'POST' });
        const json = await res.json();
        if (!active) return;
        if (!res.ok) { setErr(json.error || 'No se pudieron sugerir fusiones.'); return; }
        setData(json);
      } catch {
        if (active) setErr('Error de conexión.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [tenant, activityId]);

  return (
    <div className="knx-fusion-page">
      <button type="button" className="knx-analisis-compare" onClick={onDone} style={{ marginBottom: 10 }}>← Volver al canvas</button>
      <h2 className="knx-fusion-title">Sugerencias de fusión de agrupaciones</h2>
      <p className="knx-fusion-sub">
        Kai detectó agrupaciones de preguntas distintas que podrían ser el mismo tema. Fusionarlas ahora, antes de crear fichas, evita iniciativas fragmentadas y concentra las respuestas en una sola ficha más potente.
      </p>

      {loading ? (
        <p className="knx-knowledge-empty">Buscando agrupaciones relacionadas entre preguntas…</p>
      ) : err ? (
        <p className="knx-canvas-error">{err}</p>
      ) : !data ? null : (
        <>
          {data.suggestions.length === 0 ? (
            <p className="knx-knowledge-empty">Kai no encontró coincidencias entre preguntas distintas esta vez.</p>
          ) : (
            <div className="knx-fusion-list">
              {data.suggestions.map((s) => (
                <FusionCard
                  key={`${s.groupA.groupId}-${s.groupB.groupId}`}
                  suggestion={s}
                  tenant={tenant}
                  activityId={activityId}
                  onCanvasUpdate={onCanvasUpdate}
                />
              ))}
            </div>
          )}

          {data.skippedCount > 0 && (
            <p className="knx-fusion-skip-note">
              {data.suggestions.length > 0
                ? `Las ${data.skippedCount} agrupaciones restantes no tuvieron coincidencias sugeridas.`
                : `Ninguna de las ${data.skippedCount} agrupaciones tuvo coincidencias sugeridas.`}
            </p>
          )}
        </>
      )}
    </div>
  );
}
