'use client';

import { useState, useEffect, useRef } from 'react';
import { renderMessage } from '@/lib/shared/markdown';
import KaiNextCanvasGroup, { NewGroupCard } from './KaiNextCanvasGroup';
import KaiNextGroupFusion from './KaiNextGroupFusion';

const ANALYZE_PROMPT = 'Analiza los resultados de esta actividad y agrupalos por temática.';

// Vista completa de una activity analizada: el canvas (tarjetas agrupadas por Kai) es el
// contenido principal, a pantalla completa — el chat es un panel lateral que se abre bajo
// demanda, igual que el de Análisis (ver KaiNextAnalisis.jsx / sendToPanel), no una columna
// fija permanentemente visible. "Analizar resultados" dispara la misma conversación con Kai
// por detrás pero sin abrir el panel: el resultado (las tarjetas) habla por sí solo.
export default function KaiNextWorkshopCanvas({ tenant, activity, onBack }) {
  const [canvas, setCanvas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [fusionReviewOpen, setFusionReviewOpen] = useState(false);
  const threadRef = useRef(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/kai-next/${tenant}/activities/${activity.id}/chat`)
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        setCanvas(d.canvas ?? null);
        setChatMessages((d.history ?? []).map((m) => ({ role: m.role, content: m.content })));
        if (d.canvas?.questions?.length) setActiveQuestionId(d.canvas.questions[0].questionId);
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [tenant, activity.id]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [chatMessages, sending]);

  const refreshCanvas = () => {
    fetch(`/api/kai-next/${tenant}/activities/${activity.id}/chat`)
      .then((r) => r.json())
      .then((d) => setCanvas(d.canvas ?? null));
  };

  // Ediciones mecánicas directas (renombrar/fusionar/eliminar/mover/comentar/categoría/
  // responsable/involucrados/agregar iniciativa/deshacer/volver a original) — pegan directo
  // a /canvas, sin pasar por Claude (ver app/api/kai-next/[tenant]/activities/[activityId]/canvas/route.js).
  const mutateCanvas = async (action, params) => {
    setMutating(true);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/activities/${activity.id}/canvas`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, params }),
      });
      const data = await res.json();
      if (res.ok) setCanvas(data.canvas);
    } finally {
      setMutating(false);
    }
  };

  const sendMessage = async (text, { openPanel = true } = {}) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    if (openPanel) setPanelOpen(true);
    setChatMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setSending(true);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/activities/${activity.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'fail');
      setChatMessages((prev) => [...prev, { role: 'assistant', content: data.reply || 'Listo.' }]);
      if (data.canvas) {
        setCanvas(data.canvas);
        setActiveQuestionId((prev) => prev ?? data.canvas.questions?.[0]?.questionId ?? null);
      }
    } catch {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: 'Algo salió mal. Intenta de nuevo.' }]);
    } finally {
      setSending(false);
    }
  };

  // Acción primaria cuando todavía no hay canvas — sin esto, la única forma de arrancar
  // la "magia" era escribirle algo al chat, lo que lo hacía sentir protagonista en vez del
  // canvas. El resultado (las tarjetas) aparece directo en pantalla completa, sin abrir el panel.
  const startAnalysis = () => sendMessage(ANALYZE_PROMPT, { openPanel: false });
  const analyzing = sending && !canvas;

  const exportReport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/generate-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: 'activity_canvas_pdf',
          activityId: activity.id,
          filename: `${(canvas?.workshopName || activity.name || 'activity').replace(/[^a-zA-Z0-9-]+/g, '-')}.pdf`,
        }),
      });
      if (!res.ok) throw new Error('fail');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(canvas?.workshopName || activity.name || 'activity').replace(/[^a-zA-Z0-9-]+/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // El botón vuelve a habilitarse — no hay nada crítico que preservar en este caso.
    } finally {
      setExporting(false);
    }
  };

  const question = canvas?.questions?.find((q) => q.questionId === activeQuestionId);
  // "Revisar fusiones sugeridas" solo tiene sentido ANTES de que exista cualquier ficha (después,
  // cada grupo ya arrastra respuestas consolidadas propias) y con más de una pregunta (la fusión
  // es siempre entre grupos de preguntas distintas) — mismo criterio que WorkshopCanvasPresentation.jsx.
  const hasAnyFicha = !!canvas?.questions?.some((q) => q.groups.some((g) => g.fichaActivityId || g.ficha));
  const canReviewFusions = !!canvas && canvas.questions.length > 1 && !hasAnyFicha;

  return (
    <div className="knx-canvas-page">
      <div className="knx-analisis-top">
        <div className="knx-analisis-head">
          <button type="button" className="knx-analisis-compare" onClick={onBack} style={{ marginBottom: 10 }}>← Volver a Activities</button>
          <h1>{canvas?.workshopName || activity.name}</h1>
          {canvas && (
            <div className="knx-kpi-grid" style={{ marginTop: 12 }}>
              <div className="knx-kpi-card"><span className="knx-kpi-label">Iniciativas</span><span className="knx-kpi-value">{canvas.summary?.totalItems ?? 0}</span></div>
              <div className="knx-kpi-card"><span className="knx-kpi-label">Grupos</span><span className="knx-kpi-value">{canvas.summary?.groupCount ?? 0}</span></div>
              <div className="knx-kpi-card"><span className="knx-kpi-label">Participantes</span><span className="knx-kpi-value">{canvas.summary?.participantCount ?? 0}</span></div>
              <div className="knx-kpi-card"><span className="knx-kpi-label">Preguntas</span><span className="knx-kpi-value">{canvas.summary?.questionCount ?? 0}</span></div>
            </div>
          )}
        </div>
        {canvas && (
          <div className="knx-analisis-controls">
            {canReviewFusions && (
              <button type="button" className="knx-analisis-compare" onClick={() => setFusionReviewOpen(true)}>Revisar fusiones sugeridas</button>
            )}
            <button type="button" className="knx-analisis-compare" onClick={() => setPanelOpen(true)}>Pedile algo a Kai</button>
            <button type="button" className="knx-analisis-sources-save" onClick={exportReport} disabled={exporting}>
              {exporting ? 'Generando…' : 'Exportar reporte'}
            </button>
          </div>
        )}
      </div>

      <main className="knx-canvas-main-full">
        {fusionReviewOpen ? (
          <KaiNextGroupFusion
            tenant={tenant}
            activityId={activity.id}
            onDone={() => setFusionReviewOpen(false)}
            onCanvasUpdate={setCanvas}
          />
        ) : loading ? (
          <p className="knx-knowledge-empty">Cargando…</p>
        ) : !canvas ? (
          analyzing ? (
            <div className="knx-analisis-loading">
              <span className="knx-thinking-dot" />
              Kai está analizando y agrupando las respuestas…
            </div>
          ) : (
            <div className="knx-analisis-empty">
              <p>Todavía no se analizaron los resultados de esta actividad.</p>
              <button type="button" onClick={startAnalysis}>Analizar resultados</button>
            </div>
          )
        ) : (
          <>
            {canvas.questions.length > 1 && (
              <div className="knx-knowledge-filters">
                {canvas.questions.map((q) => (
                  <button
                    key={q.questionId}
                    type="button"
                    className={`knx-filter-pill${q.questionId === activeQuestionId ? ' knx-filter-pill--active' : ''}`}
                    onClick={() => setActiveQuestionId(q.questionId)}
                  >
                    {q.questionText} · {q.groups.reduce((n, g) => n + (g.itemIndexes?.length ?? 0), 0)}
                  </button>
                ))}
              </div>
            )}
            {question && (() => {
              const items = canvas.itemsByQuestion?.[question.questionId] ?? [];
              const nameOptions = [...new Set(items.map((it) => it.participant).filter(Boolean))];
              const canUndo = (canvas.historyByQuestion?.[question.questionId]?.length ?? 0) > 0;
              const canRevert = !!canvas.originalGroupsByQuestion?.[question.questionId];
              const action = (name, params) => mutateCanvas(name, { questionId: question.questionId, ...params });
              return (
                <>
                  <div className="knx-canvas-toolbar">
                    <button type="button" disabled={!canUndo || mutating} onClick={() => action('undo', {})}>↺ Deshacer</button>
                    <button type="button" disabled={!canRevert || mutating} onClick={() => action('revert_groups', {})}>↻ Volver a original</button>
                  </div>
                  <div className="knx-canvas-groups">
                    {question.groups.map((g) => (
                      <KaiNextCanvasGroup
                        key={g.id}
                        tenant={tenant}
                        activityId={activity.id}
                        question={question}
                        group={g}
                        items={items}
                        otherGroups={question.groups.filter((other) => other.id !== g.id)}
                        nameOptions={nameOptions}
                        busy={mutating}
                        onAction={action}
                        onSaved={refreshCanvas}
                      />
                    ))}
                    <NewGroupCard
                      busy={mutating}
                      onCreate={(name) => action('create_group', { id: `g${Date.now().toString(36)}`, name, consolidatedText: '' })}
                    />
                  </div>
                </>
              );
            })()}
          </>
        )}
      </main>

      {panelOpen && (
        <div className="knx-side-panel">
          <div className="knx-side-panel-header">
            <span className="knx-side-panel-title">Pedile a Kai</span>
            <button type="button" className="knx-side-panel-close" onClick={() => setPanelOpen(false)} aria-label="Cerrar panel">×</button>
          </div>
          <div className="knx-side-panel-thread" ref={threadRef}>
            {!chatMessages.length && (
              <p className="knx-knowledge-empty">
                Pedile que ajuste grupos, sugiera fusiones u orden de fichas, o que arranque una ficha para profundizar.
              </p>
            )}
            {chatMessages.map((m, i) => (
              <div key={i} className={`knx-side-msg knx-side-msg--${m.role}`}>
                {m.role === 'assistant' ? renderMessage(m.content, { prefix: 'knx' }) : m.content}
              </div>
            ))}
            {sending && (
              <div className="knx-side-thinking">
                <span className="knx-thinking-dot" />
                Kai está trabajando…
              </div>
            )}
          </div>
          <form
            className="knx-side-panel-input"
            onSubmit={(e) => { e.preventDefault(); const q = chatInput; setChatInput(''); sendMessage(q); }}
          >
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Escribe tu pedido…"
              disabled={sending}
            />
            <button type="submit" disabled={sending || !chatInput.trim()}>Enviar</button>
          </form>
        </div>
      )}
    </div>
  );
}
