'use client';

import { useEffect, useRef, useState } from 'react';
import KaiNextSidebar from './KaiNextSidebar';
import KaiNextConfirmDialog from './KaiNextConfirmDialog';
import KaiNextAnalysisView from './KaiNextAnalysisView';
import KaiNextDocumentCard from './KaiNextDocumentCard';
import { renderMessage } from '@/lib/shared/markdown';
import { SOURCE_CATALOG } from '@/lib/kaiNext/sourceCatalog';

const PERIOD_OPTIONS = [
  { id: '7d', label: 'Últimos 7 días', promptLabel: 'los últimos 7 días' },
  { id: '30d', label: 'Últimos 30 días', promptLabel: 'los últimos 30 días' },
  { id: 'mes', label: 'Mes actual', promptLabel: 'el mes actual' },
];

function formatRelative(iso) {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'justo ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `hace ${days} d`;
}

// Página "Análisis": a diferencia del chat, no muestra mensajes sueltos sino un dashboard por
// área que Kai genera bajo demanda (ver app/api/kai-next/[tenant]/analysis/[areaId]/generate) y
// que persiste como un único snapshot por área — abrir la pestaña no dispara una pregunta nueva,
// solo muestra (o genera, si nunca se generó) la última lectura.
export default function KaiNextAnalisis({
  tenant, tenantName, basePath, userName, userHandle, isTeamUser,
  initialAreas, initialSnapshots, connectedSources,
}) {
  const [loggingOut, setLoggingOut] = useState(false);
  const [chats, setChats] = useState([]);
  const [deleteChatTarget, setDeleteChatTarget] = useState(null);

  const [areas, setAreas] = useState(initialAreas ?? []);
  const [snapshots, setSnapshots] = useState(initialSnapshots ?? {});
  const [activeAreaId, setActiveAreaId] = useState(initialAreas?.[0]?.id ?? null);
  const [periodId, setPeriodId] = useState('30d');
  const [compare, setCompare] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState('');
  const [genError, setGenError] = useState('');
  const autoTriggered = useRef(new Set());

  const [addingArea, setAddingArea] = useState(false);
  const [areaInput, setAreaInput] = useState('');
  const [removeAreaTarget, setRemoveAreaTarget] = useState(null);
  const [askInput, setAskInput] = useState('');

  // Qué fuentes puede consultar Kai para el área activa (ver lib/kaiNext/analysisAreas.js) —
  // esto es lo que hace que "Web" y "Comercial" no terminen mirando lo mismo: cada área acota
  // su propio tools[] en el generate route. El usuario puede corregirlo acá en cualquier momento.
  const [sourcesDraft, setSourcesDraft] = useState(initialAreas?.[0]?.sources ?? []);
  const [savingSources, setSavingSources] = useState(false);

  // KPIs fijos del área activa (ver lib/kaiNext/analysisAreas.js) — esto es lo que hace que la
  // página deje de sentirse "distinta cada vez que se regenera": en vez de dejar que Kai elija
  // libremente qué KPIs mostrar, el usuario los define una vez y quedan fijos (mismo set, mismo
  // orden) en cada regeneración; solo los valores se recalculan con datos reales.
  const [kpisDraft, setKpisDraft] = useState(initialAreas?.[0]?.kpis ?? []);
  const [kpiInput, setKpiInput] = useState('');
  const [savingKpis, setSavingKpis] = useState(false);

  // Panel lateral de Kai — "Preguntar sobre esto" y la barra de pregunta de cada área abren
  // esto, NUNCA navegan fuera de Análisis (eso era el bug reportado: sacaba al usuario a /chat).
  // Es un chat de verdad (misma API que el chat principal), solo que se muestra en un panel
  // angosto a la derecha en vez de ocupar toda la pantalla.
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMessages, setPanelMessages] = useState([]);
  const [panelSending, setPanelSending] = useState(false);
  const [panelWorkingLabel, setPanelWorkingLabel] = useState(null);
  const [panelInput, setPanelInput] = useState('');
  const [panelConversationId, setPanelConversationId] = useState(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/kai-next/${tenant}`);
      if (res.ok) {
        const data = await res.json();
        setChats(data.conversations ?? []);
      }
    })();
  }, [tenant]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      if (isTeamUser) await fetch('/api/team/logout', { method: 'POST' });
      else await fetch(`/api/kai/${tenant}/tenant-users/me`, { method: 'DELETE' });
    } finally {
      window.location.href = `${basePath}/${tenant}`;
    }
  };

  const handleDeleteChat = (id) => {
    const chat = chats.find((c) => c.id === id);
    setDeleteChatTarget({ id, title: chat?.title || 'Nuevo chat' });
  };

  const confirmDeleteChat = async () => {
    const id = deleteChatTarget?.id;
    setDeleteChatTarget(null);
    if (!id) return;
    await fetch(`/api/kai-next/${tenant}?conversationId=${id}`, { method: 'DELETE' });
    setChats((prev) => prev.filter((c) => c.id !== id));
  };

  const activeArea = areas.find((a) => a.id === activeAreaId) ?? null;
  const snapshot = activeAreaId ? snapshots[activeAreaId] : null;
  const period = PERIOD_OPTIONS.find((p) => p.id === periodId) ?? PERIOD_OPTIONS[1];

  useEffect(() => {
    const area = areas.find((a) => a.id === activeAreaId);
    setSourcesDraft(area?.sources ?? []);
    setKpisDraft(area?.kpis ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAreaId]);

  const toggleSource = (id) => {
    setSourcesDraft((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const sourcesChanged = JSON.stringify([...sourcesDraft].sort())
    !== JSON.stringify([...(activeArea?.sources ?? [])].sort());

  const saveSourcesAndRegenerate = async () => {
    if (!activeAreaId) return;
    setSavingSources(true);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/analysis/${activeAreaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources: sourcesDraft }),
      });
      const data = await res.json();
      if (res.ok && data.areas) setAreas(data.areas);
    } finally {
      setSavingSources(false);
    }
    handleGenerate(activeAreaId);
  };

  const addKpi = () => {
    const label = kpiInput.trim();
    setKpiInput('');
    if (!label || kpisDraft.some((k) => k.label.toLowerCase() === label.toLowerCase())) return;
    setKpisDraft((prev) => [...prev, { id: `tmp-${Date.now()}`, label }]);
  };

  const removeKpi = (id) => setKpisDraft((prev) => prev.filter((k) => k.id !== id));

  const moveKpi = (id, dir) => setKpisDraft((prev) => {
    const idx = prev.findIndex((k) => k.id === id);
    const nextIdx = idx + dir;
    if (idx < 0 || nextIdx < 0 || nextIdx >= prev.length) return prev;
    const next = [...prev];
    [next[idx], next[nextIdx]] = [next[nextIdx], next[idx]];
    return next;
  });

  const kpisChanged = JSON.stringify(kpisDraft.map((k) => k.label))
    !== JSON.stringify((activeArea?.kpis ?? []).map((k) => k.label));

  const saveKpisAndRegenerate = async () => {
    if (!activeAreaId) return;
    setSavingKpis(true);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/analysis/${activeAreaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kpis: kpisDraft }),
      });
      const data = await res.json();
      if (res.ok && data.areas) setAreas(data.areas);
    } finally {
      setSavingKpis(false);
    }
    handleGenerate(activeAreaId);
  };

  const handleGenerate = async (areaId) => {
    if (!areaId || generating) return;
    setGenerating(true);
    setGenError('');
    setGenStatus('Kai está arrancando el análisis…');
    try {
      const res = await fetch(`/api/kai-next/${tenant}/analysis/${areaId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: period.promptLabel, compare }),
      });
      if (!res.ok || !res.body) throw new Error('No se pudo generar el análisis.');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let done = false;
      let finished = false;
      while (!done) {
        const chunk = await reader.read();
        done = chunk.done;
        buf += decoder.decode(chunk.value ?? new Uint8Array(), { stream: !done });
        let nl;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (!line.trim()) continue;
          const evt = JSON.parse(line);
          if (evt.type === 'tool_start') {
            setGenStatus(`${evt.label}…`);
          } else if (evt.type === 'done') {
            finished = true;
            setSnapshots((prev) => ({ ...prev, [areaId]: evt.snapshot }));
          } else if (evt.type === 'error') {
            finished = true;
            setGenError(evt.error || 'Algo salió mal generando el análisis.');
          }
        }
      }
      if (!finished) setGenError('La conexión se interrumpió antes de terminar. Intenta de nuevo.');
    } catch (err) {
      setGenError(err.message || 'Algo salió mal generando el análisis.');
    } finally {
      setGenerating(false);
      setGenStatus('');
    }
  };

  async function sendToPanel(text) {
    const trimmed = (text ?? '').trim();
    if (!trimmed || panelSending) return;
    setPanelOpen(true);
    setPanelMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setPanelSending(true);
    setPanelWorkingLabel('Kai está pensando…');
    try {
      const res = await fetch(`/api/kai-next/${tenant}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, conversationId: panelConversationId }),
      });
      if (!res.ok || !res.body) throw new Error('fail');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let done = false;
      while (!done) {
        const chunk = await reader.read();
        done = chunk.done;
        buf += decoder.decode(chunk.value ?? new Uint8Array(), { stream: !done });
        let nl;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (!line.trim()) continue;
          const evt = JSON.parse(line);
          if (evt.type === 'tool_start') {
            setPanelWorkingLabel(`${evt.label}…`);
          } else if (evt.type === 'done') {
            setPanelSending(false);
            setPanelWorkingLabel(null);
            setPanelMessages((prev) => [...prev, {
              role: 'assistant', content: evt.reply, toolTrace: evt.toolTrace, presentation: evt.presentation, documents: evt.documents,
            }]);
            if (!panelConversationId && evt.conversationId) {
              setPanelConversationId(evt.conversationId);
              fetch(`/api/kai-next/${tenant}`).then((r) => r.json()).then((d) => setChats(d.conversations ?? [])).catch(() => null);
            }
          } else if (evt.type === 'error') {
            setPanelSending(false);
            setPanelWorkingLabel(null);
            setPanelMessages((prev) => [...prev, { role: 'assistant', content: evt.reply }]);
          }
        }
      }
    } catch {
      setPanelSending(false);
      setPanelWorkingLabel(null);
      setPanelMessages((prev) => [...prev, { role: 'assistant', content: 'Algo salió mal. Intenta de nuevo.' }]);
    }
  }

  // Primera vez que se abre una pestaña sin snapshot todavía, se genera sola — después queda
  // en manos del botón "Actualizar análisis" (no se regenera solo en cada visita).
  useEffect(() => {
    if (!activeAreaId) return;
    if (snapshots[activeAreaId]) return;
    if (autoTriggered.current.has(activeAreaId)) return;
    autoTriggered.current.add(activeAreaId);
    handleGenerate(activeAreaId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAreaId]);

  const handleAddArea = async () => {
    const label = areaInput.trim();
    setAreaInput('');
    setAddingArea(false);
    if (!label) return;
    const res = await fetch(`/api/kai-next/${tenant}/analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label }),
    });
    const data = await res.json();
    if (res.ok && data.areas) {
      setAreas(data.areas);
      const created = data.areas[data.areas.length - 1];
      if (created) setActiveAreaId(created.id);
    }
  };

  const confirmRemoveArea = async () => {
    const id = removeAreaTarget?.id;
    setRemoveAreaTarget(null);
    if (!id) return;
    const res = await fetch(`/api/kai-next/${tenant}/analysis/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok && data.areas) {
      setAreas(data.areas);
      setSnapshots((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (activeAreaId === id) setActiveAreaId(data.areas[0]?.id ?? null);
    }
  };

  const handleAsk = (e) => {
    e.preventDefault();
    const q = askInput.trim();
    setAskInput('');
    if (!q) return;
    sendToPanel(q);
  };

  return (
    <div className="knx-shell">
      <KaiNextSidebar
        tenant={tenant} tenantName={tenantName} userName={userName} userHandle={userHandle}
        isTeamUser={isTeamUser} basePath={basePath} chats={chats}
        onDeleteChat={handleDeleteChat} onLogout={handleLogout} loggingOut={loggingOut} active="analisis"
      />

      <main className="knx-main">
        <div className="knx-analisis-page">
          <div className="knx-analisis-top">
            <div className="knx-analisis-head">
              <h1>Análisis</h1>
              <p>Los datos de {tenantName}, leídos por Kai con el contexto de la empresa.</p>
            </div>
            <div className="knx-analisis-controls">
              <select
                className="knx-analisis-period"
                value={periodId}
                onChange={(e) => setPeriodId(e.target.value)}
              >
                {PERIOD_OPTIONS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
              <button
                type="button"
                className={`knx-analisis-compare${compare ? ' knx-analisis-compare--active' : ''}`}
                onClick={() => setCompare((v) => !v)}
              >
                Comparar con período anterior
              </button>
            </div>
          </div>

          <div className="knx-analisis-tabs">
            {areas.map((a) => (
              <div key={a.id} className="knx-analisis-tab-wrap">
                <button
                  type="button"
                  className={`knx-analisis-tab${a.id === activeAreaId ? ' knx-analisis-tab--active' : ''}`}
                  onClick={() => setActiveAreaId(a.id)}
                >
                  {a.label}
                </button>
                {areas.length > 1 && (
                  <button
                    type="button"
                    className="knx-analisis-tab-remove"
                    aria-label={`Eliminar área ${a.label}`}
                    onClick={() => setRemoveAreaTarget({ id: a.id, label: a.label })}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {addingArea ? (
              <form
                className="knx-analisis-tab-add-form"
                onSubmit={(e) => { e.preventDefault(); handleAddArea(); }}
              >
                <input
                  autoFocus
                  value={areaInput}
                  onChange={(e) => setAreaInput(e.target.value)}
                  onBlur={() => { if (!areaInput.trim()) setAddingArea(false); }}
                  placeholder="Nombre del área"
                />
              </form>
            ) : (
              <button type="button" className="knx-analisis-tab-new" onClick={() => setAddingArea(true)}>
                + Nueva área
              </button>
            )}
          </div>

          {activeArea && (
            <form className="knx-analisis-ask" onSubmit={handleAsk}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-11.9 7.8L4 21l1.7-5.1A8.5 8.5 0 1 1 21 11.5Z" /></svg>
              <input
                value={askInput}
                onChange={(e) => setAskInput(e.target.value)}
                placeholder={`Pregúntale a Kai sobre ${activeArea.label.toLowerCase()}`}
              />
            </form>
          )}

          {activeArea && (
            <div className="knx-analisis-sources">
              <span className="knx-analisis-sources-label">Fuentes de esta área</span>
              {SOURCE_CATALOG.map((s) => {
                const connected = !!connectedSources?.[s.id];
                const active = sourcesDraft.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={!connected}
                    title={connected ? undefined : 'No conectada para este cliente'}
                    className={`knx-source-pill${active ? ' knx-source-pill--active' : ''}`}
                    onClick={() => toggleSource(s.id)}
                  >
                    {s.label}
                  </button>
                );
              })}
              {sourcesChanged && (
                <button
                  type="button"
                  className="knx-analisis-sources-save"
                  onClick={saveSourcesAndRegenerate}
                  disabled={savingSources}
                >
                  {savingSources ? 'Guardando…' : 'Guardar y regenerar'}
                </button>
              )}
            </div>
          )}

          {activeArea && (
            <div className="knx-analisis-kpis">
              <span className="knx-analisis-sources-label">KPIs de esta área</span>
              <div className="knx-kpi-config-list">
                {kpisDraft.map((k, i) => (
                  <span className="knx-kpi-config-chip" key={k.id}>
                    <button type="button" disabled={i === 0} onClick={() => moveKpi(k.id, -1)} aria-label="Subir">↑</button>
                    <button type="button" disabled={i === kpisDraft.length - 1} onClick={() => moveKpi(k.id, 1)} aria-label="Bajar">↓</button>
                    {k.label}
                    <button type="button" className="knx-kpi-config-remove" onClick={() => removeKpi(k.id)} aria-label={`Quitar ${k.label}`}>×</button>
                  </span>
                ))}
                {!kpisDraft.length && <span className="knx-analisis-hint-inline">Sin configurar — Kai elige los KPIs libremente.</span>}
              </div>
              <form className="knx-kpi-config-add" onSubmit={(e) => { e.preventDefault(); addKpi(); }}>
                <input
                  value={kpiInput}
                  onChange={(e) => setKpiInput(e.target.value)}
                  placeholder="Ej: CAC, Sesiones totales…"
                />
                <button type="submit" disabled={!kpiInput.trim()}>+ Agregar</button>
              </form>
              {kpisChanged && (
                <button
                  type="button"
                  className="knx-analisis-sources-save"
                  onClick={saveKpisAndRegenerate}
                  disabled={savingKpis}
                >
                  {savingKpis ? 'Guardando…' : 'Guardar y regenerar'}
                </button>
              )}
            </div>
          )}

          {!activeArea ? null : generating ? (
            <div className="knx-analisis-loading">
              <span className="knx-thinking-dot" />
              {genStatus || `Kai está leyendo los datos de ${activeArea.label.toLowerCase()}…`}
            </div>
          ) : genError ? (
            <div className="knx-analisis-error">
              <p>{genError}</p>
              <button type="button" onClick={() => handleGenerate(activeAreaId)}>Reintentar</button>
            </div>
          ) : snapshot ? (
            <>
              <div className="knx-analisis-meta">
                Actualizado {formatRelative(snapshot.generatedAt)}
                <button type="button" onClick={() => handleGenerate(activeAreaId)}>Actualizar análisis</button>
              </div>
              <KaiNextAnalysisView presentation={snapshot.presentation} basePath={basePath} tenant={tenant} onAsk={sendToPanel} />
            </>
          ) : (
            <div className="knx-analisis-empty">
              <p>Todavía no hay un análisis generado para esta área.</p>
              <button type="button" onClick={() => handleGenerate(activeAreaId)}>Generar análisis</button>
            </div>
          )}
        </div>
      </main>

      {panelOpen && (
        <div className="knx-side-panel">
          <div className="knx-side-panel-header">
            <span className="knx-side-panel-title">Kai</span>
            <button type="button" className="knx-side-panel-close" onClick={() => setPanelOpen(false)} aria-label="Cerrar panel">×</button>
          </div>
          <div className="knx-side-panel-thread">
            {panelMessages.map((m, i) => (
              <div key={i} className={`knx-side-msg knx-side-msg--${m.role}`}>
                {m.role === 'assistant' ? renderMessage(m.content, { prefix: 'knx' }) : m.content}
                {m.toolTrace?.length > 0 && (
                  <div className="knx-side-msg-trace">Consultó: {m.toolTrace.map((t) => t.label).join(', ')}</div>
                )}
                {m.presentation && (
                  <KaiNextAnalysisView presentation={m.presentation} basePath={basePath} tenant={tenant} onAsk={sendToPanel} />
                )}
                {m.documents?.map((doc, di) => (
                  <KaiNextDocumentCard key={di} doc={doc} tenant={tenant} />
                ))}
              </div>
            ))}
            {panelSending && (
              <div className="knx-side-thinking">
                <span className="knx-thinking-dot" />
                {panelWorkingLabel}
              </div>
            )}
          </div>
          <form className="knx-side-panel-input" onSubmit={(e) => { e.preventDefault(); const q = panelInput; setPanelInput(''); sendToPanel(q); }}>
            <input
              value={panelInput}
              onChange={(e) => setPanelInput(e.target.value)}
              placeholder="Escribe tu pregunta…"
              disabled={panelSending}
            />
            <button type="submit" disabled={panelSending || !panelInput.trim()}>Enviar</button>
          </form>
        </div>
      )}

      <KaiNextConfirmDialog
        open={!!deleteChatTarget}
        title="Eliminar conversación"
        message={`¿Eliminar "${deleteChatTarget?.title}"? Esta acción no se puede deshacer.`}
        onConfirm={confirmDeleteChat}
        onCancel={() => setDeleteChatTarget(null)}
      />
      <KaiNextConfirmDialog
        open={!!removeAreaTarget}
        title="Eliminar área"
        message={`¿Eliminar el área "${removeAreaTarget?.label}"? Se pierde el análisis generado para ella.`}
        onConfirm={confirmRemoveArea}
        onCancel={() => setRemoveAreaTarget(null)}
      />
    </div>
  );
}
