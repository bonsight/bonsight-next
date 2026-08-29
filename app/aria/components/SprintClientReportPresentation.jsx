'use client';

import { useEffect, useState } from 'react';

const HEALTH_LABEL = { good: 'En orden', warning: 'Atención', critical: 'Crítico' };
const HEALTH_CLASS = { good: 'aria-health-pill--good', warning: 'aria-health-pill--warning', critical: 'aria-health-pill--critical' };

// Reporte de servicio con marca Bonsight, a demanda — el usuario elige cliente + qué sprints
// entran (normalmente ~2 por mes) y arma un reporte mensual editable antes de exportarlo a
// PDF. No depende de cerrar un sprint puntual (eso vive en SprintBoardPresentation).
export default function SprintClientReportPresentation({ tenant }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [picker, setPicker] = useState(null); // { sprints, clientes }
  const [cliente, setCliente] = useState('');
  const [selectedSprintIds, setSelectedSprintIds] = useState(() => new Set());
  const [generating, setGenerating] = useState(false);

  const [meta, setMeta] = useState(null); // { clienteName, periodLabel, sprintTitles, metrics, health }
  const [draft, setDraft] = useState(null); // { titulo, resumenEjecutivo, hitos, secciones, valorEntregado, riesgos, proximosPasos }
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/aria/${tenant}/reports/sprint-client`)
      .then((r) => r.json())
      .then((d) => { if (d.error) setErr(d.error); else setPicker(d); })
      .catch(() => setErr('Error de conexión.'))
      .finally(() => setLoading(false));
  }, [tenant]);

  const toggleSprint = (id) => {
    setSelectedSprintIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setErr(null);
    try {
      const res = await fetch(`/api/aria/${tenant}/reports/sprint-client`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteName: cliente, sprintIds: [...selectedSprintIds] }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'No se pudo generar el reporte.'); return; }
      setMeta({ clienteName: data.clienteName, periodLabel: data.periodLabel, sprintTitles: data.sprintTitles, metrics: data.metrics, health: data.health });
      setDraft(data.draft);
    } catch {
      setErr('Error de conexión.');
    } finally {
      setGenerating(false);
    }
  };

  const handleBackToPicker = () => { setDraft(null); setMeta(null); setErr(null); };

  const updateSeccion = (i, patch) => {
    setDraft((d) => ({ ...d, secciones: d.secciones.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) }));
  };

  const handleExport = async () => {
    setExporting(true);
    setErr(null);
    try {
      const res = await fetch(`/api/aria/${tenant}/reports/sprint-client/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, clienteName: meta.clienteName, periodLabel: meta.periodLabel, metrics: meta.metrics, health: meta.health }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || 'No se pudo generar el PDF.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reporte-${meta.clienteName}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e.message || 'Error de conexión.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <div className="aria-presentation"><p className="aria-board-hint">Cargando…</p></div>;
  if (err && !picker) return <div className="aria-presentation"><p className="aria-canvas-error">{err}</p></div>;
  if (!picker) return null;

  // ── Paso 2: borrador editable ────────────────────────────────────────────
  if (draft) {
    return (
      <div className="aria-presentation">
        <div className="aria-card">
          <div className="aria-report-head">
            <div>
              <div className="aria-card-title">Reporte de servicio · borrador</div>
              <div className="aria-board-hint">{meta.clienteName} · {meta.periodLabel} · sprints: {meta.sprintTitles.join(', ')}</div>
            </div>
            <button type="button" className="aria-report-btn-ghost" onClick={handleBackToPicker}>← Elegir otro período</button>
          </div>

          <label className="aria-report-label">Título</label>
          <input className="aria-report-input" value={draft.titulo} onChange={(e) => setDraft((d) => ({ ...d, titulo: e.target.value }))} />

          <label className="aria-report-label">Resumen ejecutivo</label>
          <textarea className="aria-report-textarea" rows={3} value={draft.resumenEjecutivo} onChange={(e) => setDraft((d) => ({ ...d, resumenEjecutivo: e.target.value }))} />

          <label className="aria-report-label">🏆 Hitos del período</label>
          <textarea
            className="aria-report-textarea"
            rows={Math.max(3, draft.hitos.length)}
            value={draft.hitos.join('\n')}
            onChange={(e) => setDraft((d) => ({ ...d, hitos: e.target.value.split('\n') }))}
            placeholder="Un hito por línea"
          />

          <div className="aria-card-title" style={{ marginTop: 20 }}>Principales avances y temas abordados</div>
          {draft.secciones.map((sec, i) => (
            <div key={i} className="aria-report-seccion">
              <input className="aria-report-input" value={sec.titulo} onChange={(e) => updateSeccion(i, { titulo: e.target.value })} placeholder="Título de la sección" />
              <textarea className="aria-report-textarea" rows={2} value={sec.texto} onChange={(e) => updateSeccion(i, { texto: e.target.value })} placeholder="Párrafo de contexto" />
              <textarea
                className="aria-report-textarea"
                rows={Math.max(3, sec.bullets.length)}
                value={sec.bullets.join('\n')}
                onChange={(e) => updateSeccion(i, { bullets: e.target.value.split('\n') })}
                placeholder="Un punto por línea"
              />
            </div>
          ))}

          <label className="aria-report-label" style={{ marginTop: 16 }}>Valor entregado a {meta.clienteName}</label>
          <textarea
            className="aria-report-textarea"
            rows={Math.max(3, draft.valorEntregado.length)}
            value={draft.valorEntregado.join('\n')}
            onChange={(e) => setDraft((d) => ({ ...d, valorEntregado: e.target.value.split('\n') }))}
            placeholder="Un punto por línea"
          />

          <label className="aria-report-label" style={{ marginTop: 16 }}>⚠ Riesgos y observaciones</label>
          <textarea
            className="aria-report-textarea"
            rows={Math.max(2, draft.riesgos.length)}
            value={draft.riesgos.join('\n')}
            onChange={(e) => setDraft((d) => ({ ...d, riesgos: e.target.value.split('\n').filter((l) => l.trim()) }))}
            placeholder="Vacío si no hay nada que señalar"
          />

          <label className="aria-report-label" style={{ marginTop: 16 }}>Próximos pasos</label>
          <textarea
            className="aria-report-textarea"
            rows={Math.max(3, draft.proximosPasos.length)}
            value={draft.proximosPasos.join('\n')}
            onChange={(e) => setDraft((d) => ({ ...d, proximosPasos: e.target.value.split('\n') }))}
            placeholder="Un punto por línea"
          />

          <div className="aria-board-hint" style={{ marginTop: 14 }}>
            {meta.metrics.completadas} tareas completadas de {meta.metrics.total} trabajadas · {meta.metrics.sprints} sprints incluidos · {meta.metrics.iniciativas} frentes de trabajo
          </div>
          {meta.health && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <span className={`aria-health-pill ${HEALTH_CLASS[meta.health.cronograma]}`}>Cronograma: {HEALTH_LABEL[meta.health.cronograma]}</span>
              <span className={`aria-health-pill ${HEALTH_CLASS[meta.health.calidad]}`}>Calidad: {HEALTH_LABEL[meta.health.calidad]}</span>
            </div>
          )}

          {err && <p className="aria-canvas-error" style={{ marginTop: 10 }}>{err}</p>}

          <div className="aria-report-footer">
            <button type="button" className="aria-canvas-export-btn" disabled={exporting} onClick={handleExport}>
              {exporting ? 'Generando PDF…' : 'Descargar PDF →'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Paso 1: elegir cliente + sprints ─────────────────────────────────────
  return (
    <div className="aria-presentation">
      <div className="aria-card">
        <div className="aria-card-title">Reporte de servicio con marca Bonsight</div>
        <p className="aria-board-hint" style={{ marginBottom: 16 }}>Elegí el cliente y qué sprints entran (por ejemplo, los dos del mes) — se arma un borrador editable antes de exportar el PDF.</p>

        <label className="aria-report-label">Cliente</label>
        <select className="aria-report-input" value={cliente} onChange={(e) => setCliente(e.target.value)}>
          <option value="">Elegí un cliente…</option>
          {picker.clientes.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <label className="aria-report-label" style={{ marginTop: 14 }}>Sprints a incluir</label>
        {picker.sprints.length === 0 && <p className="aria-board-hint">Todavía no hay sprints cerrados.</p>}
        <div className="aria-report-sprint-list">
          {picker.sprints.map((s) => (
            <label key={s.id} className="aria-report-sprint-row">
              <input type="checkbox" checked={selectedSprintIds.has(s.id)} onChange={() => toggleSprint(s.id)} />
              <span>{s.title}</span>
              <span className="aria-board-hint">{s.startDate} → {s.endDate}</span>
            </label>
          ))}
        </div>

        {err && <p className="aria-canvas-error" style={{ marginTop: 10 }}>{err}</p>}

        <div className="aria-report-footer">
          <button
            type="button"
            className="aria-canvas-export-btn"
            disabled={generating || !cliente || selectedSprintIds.size === 0}
            onClick={handleGenerate}
          >
            {generating ? 'Sintetizando…' : 'Generar borrador →'}
          </button>
        </div>
      </div>
    </div>
  );
}
