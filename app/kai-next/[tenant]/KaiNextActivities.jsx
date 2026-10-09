'use client';

import { useEffect, useState } from 'react';
import KaiNextSidebar from './KaiNextSidebar';
import KaiNextConfirmDialog from './KaiNextConfirmDialog';
import KaiNextActivityDraftCard from './KaiNextActivityDraftCard';
import KaiNextActivityDashboardCard from './KaiNextActivityDashboardCard';
import KaiNextWorkshopCanvas from './KaiNextWorkshopCanvas';
import { renderMessage } from '@/lib/shared/markdown';

const STATUS_LABEL = {
  draft: 'Borrador',
  ready: 'Lista para empezar',
  active: 'En curso',
  finished: 'Terminada',
};

const MODE_LABEL = {
  broadcast: 'Workshop en vivo',
  self_paced: 'Ficha autogestionada',
};

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
}

function ResultsPanel({ results }) {
  if (!results) return null;
  const { meta, participantCount, responses } = results;
  return (
    <div className="knx-activity-results">
      <div className="knx-activity-results-head">
        <span>{participantCount} participante{participantCount !== 1 ? 's' : ''}</span>
        {meta.finishedAt && <span>Terminada {formatDate(meta.finishedAt)}</span>}
      </div>
      {responses.map((r, i) => (
        <div className="knx-activity-response" key={i}>
          <div className="knx-activity-response-head">
            <span className="knx-activity-response-name">{r.participant}</span>
            <span className={`knx-activity-response-status knx-activity-response-status--${r.status}`}>
              {r.status === 'completed' ? 'Completó' : r.status === 'abandoned' ? 'No terminó' : 'En curso'}
            </span>
            <span className="knx-activity-response-progress">{r.questionsCompleted}/{r.questionsTotal}</span>
          </div>
          {r.answers.filter((a) => a.items.length).map((a, j) => (
            <div className="knx-activity-answer" key={j}>
              <p className="knx-activity-answer-q">{a.question}</p>
              <ul className="knx-activity-answer-items">
                {a.items.map((item, k) => <li key={k}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      ))}
      {!responses.length && <p className="knx-knowledge-empty">Todavía no respondió nadie.</p>}
    </div>
  );
}

function ActivityRow({ tenant, activity, onOpenCanvas }) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const isFicha = activity.mode === 'self_paced';
  // El panel de control (QR, iniciar/avanzar/finalizar pregunta) solo tiene sentido para un
  // workshop en vivo que ya tiene código (ready/active) — una ficha no tiene organizador ni
  // "pregunta actual" global (cada quien avanza solo), y un borrador todavía no tiene código.
  const isLiveControl = !isFicha && ['ready', 'active'].includes(activity.status);
  // Un workshop terminado no muestra el listado plano de respuestas — abre el canvas completo
  // (agrupado por Kai, con fichas por grupo). Una ficha standalone (sin canvas propio) sigue
  // mostrando el listado plano de respuestas tal cual.
  const isCanvasWorkshop = !isFicha && activity.status === 'finished';

  const toggle = async () => {
    if (isCanvasWorkshop) { onOpenCanvas(activity); return; }
    const next = !open;
    setOpen(next);
    if (next && !results && !isLiveControl) {
      setLoading(true);
      try {
        const res = await fetch(`/api/kai-next/${tenant}/activities/${activity.id}/results`);
        if (res.ok) setResults(await res.json());
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="knx-activity-row">
      <button type="button" className="knx-activity-row-main" onClick={toggle}>
        <span className={`knx-activity-type-dot knx-activity-type-dot--${isFicha ? 'ficha' : 'workshop'}`} title={isFicha ? 'Ficha autogestionada' : 'Workshop en vivo'} />
        <div className="knx-activity-row-text">
          <span className="knx-activity-row-title">{activity.name || 'Sin nombre'}</span>
          <span className="knx-activity-row-sub">
            {MODE_LABEL[activity.mode] ?? activity.mode} · {formatDate(activity.createdAt)}
            {activity.objective ? ` · ${activity.objective}` : ''}
          </span>
        </div>
        <span className={`knx-activity-status knx-activity-status--${activity.status}`}>
          {STATUS_LABEL[activity.status] ?? activity.status}
        </span>
        <svg className={`knx-activity-chevron${open ? ' knx-activity-chevron--open' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
      </button>
      {open && (
        isLiveControl ? (
          <div className="knx-activity-results">
            <KaiNextActivityDashboardCard tenant={tenant} activity={activity} />
          </div>
        ) : loading ? <p className="knx-knowledge-empty">Cargando…</p> : <ResultsPanel results={results} />
      )}
    </div>
  );
}

// Diseñar una Activity es una conversación con Kai (marcadores [ACTIVITY_DRAFT]/[ACTIVITY_LOCK],
// ver lib/kaiNext/prompt.js + app/api/kai-next/[tenant]/route.js) — "+ Nueva actividad" abre un
// chat embebido acá mismo (no en el chat general) para que todo el flujo quede contenido en esta
// sección, como pediste. El mismo backend de control (start/advance/finish/QR) que ya corre en
// Kai Legacy, reusado tal cual vía las rutas /api/kai-next/[tenant]/activities/[activityId]/*.
export default function KaiNextActivities({
  tenant, tenantName, basePath, userName, userHandle, isTeamUser, initialActivities,
}) {
  const [loggingOut, setLoggingOut] = useState(false);
  const [chats, setChats] = useState([]);
  const [activities, setActivities] = useState(initialActivities ?? []);
  const [deleteChatTarget, setDeleteChatTarget] = useState(null);

  const [creating, setCreating] = useState(false);
  const [designMessages, setDesignMessages] = useState([]);
  const [designConversationId, setDesignConversationId] = useState(null);
  const [designSending, setDesignSending] = useState(false);
  const [designWorkingLabel, setDesignWorkingLabel] = useState(null);
  const [designInput, setDesignInput] = useState('');

  useEffect(() => {
    fetch(`/api/kai-next/${tenant}`)
      .then((r) => r.json())
      .then((d) => setChats(d.conversations ?? []))
      .catch(() => null);
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

  const [canvasActivity, setCanvasActivity] = useState(null);
  // Una ficha nacida de un grupo del canvas (source.investigationId seteado, ver
  // lib/kaiNext/tools/activityCanvas.js:executeStartFichaForGroupTool) no es una activity de
  // primer nivel — vive anidada dentro de su workshop (KaiNextWorkshopCanvas), no en esta
  // lista. Lo que sí queda acá: workshops (broadcast) y una ficha standalone real, si existiera.
  const topLevelActivities = activities.filter((a) => !a.source?.investigationId);

  const upsertActivity = (activity) => {
    if (!activity?.id) return;
    setActivities((prev) => {
      const next = prev.filter((a) => a.id !== activity.id);
      return [activity, ...next];
    });
  };

  async function sendDesignMessage(text) {
    const trimmed = (text ?? '').trim();
    if (!trimmed || designSending) return;
    setDesignMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setDesignSending(true);
    setDesignWorkingLabel('Kai está pensando…');
    try {
      const res = await fetch(`/api/kai-next/${tenant}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          conversationId: designConversationId,
          ref: designConversationId ? undefined : { type: 'activity_design', refId: null, label: 'Diseñar actividad' },
        }),
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
            setDesignWorkingLabel(`${evt.label}…`);
          } else if (evt.type === 'done') {
            setDesignSending(false);
            setDesignWorkingLabel(null);
            setDesignMessages((prev) => [...prev, {
              role: 'assistant', content: evt.reply, activityDraft: evt.activityDraft, activityStart: evt.activityStart,
            }]);
            if (!designConversationId && evt.conversationId) setDesignConversationId(evt.conversationId);
            if (evt.activityStart?.code) upsertActivity(evt.activityStart);
          } else if (evt.type === 'error') {
            setDesignSending(false);
            setDesignWorkingLabel(null);
            setDesignMessages((prev) => [...prev, { role: 'assistant', content: evt.reply }]);
          }
        }
      }
    } catch {
      setDesignSending(false);
      setDesignWorkingLabel(null);
      setDesignMessages((prev) => [...prev, { role: 'assistant', content: 'Algo salió mal. Intenta de nuevo.' }]);
    }
  }

  const startDesign = () => {
    setCreating(true);
    setDesignMessages([]);
    setDesignConversationId(null);
    sendDesignMessage('Quiero crear una actividad nueva.');
  };

  return (
    <div className="knx-shell">
      <KaiNextSidebar
        tenant={tenant} tenantName={tenantName} userName={userName} userHandle={userHandle}
        isTeamUser={isTeamUser} basePath={basePath} chats={chats}
        onDeleteChat={handleDeleteChat} onLogout={handleLogout} loggingOut={loggingOut} active="activities"
      />

      <main className="knx-main">
        <div className="knx-analisis-page">
          {canvasActivity ? (
            <KaiNextWorkshopCanvas tenant={tenant} activity={canvasActivity} onBack={() => setCanvasActivity(null)} />
          ) : creating ? (
            <>
              <div className="knx-analisis-top">
                <div className="knx-analisis-head">
                  <button type="button" className="knx-analisis-compare" onClick={() => setCreating(false)} style={{ marginBottom: 10 }}>← Volver a Activities</button>
                  <h1>Nueva actividad</h1>
                  <p>Diseñala conversando con Kai — nombre, objetivo y las preguntas para los participantes.</p>
                </div>
              </div>
              <div className="knx-activity-design-thread">
                {designMessages.map((m, i) => (
                  <div key={i} className={`knx-side-msg knx-side-msg--${m.role}`}>
                    {m.role === 'assistant' ? renderMessage(m.content, { prefix: 'knx' }) : m.content}
                    {m.activityStart ? (
                      <KaiNextActivityDashboardCard tenant={tenant} activity={m.activityStart} />
                    ) : m.activityDraft ? (
                      <KaiNextActivityDraftCard draft={m.activityDraft} />
                    ) : null}
                  </div>
                ))}
                {designSending && (
                  <div className="knx-side-thinking">
                    <span className="knx-thinking-dot" />
                    {designWorkingLabel}
                  </div>
                )}
              </div>
              <form
                className="knx-analisis-ask"
                onSubmit={(e) => { e.preventDefault(); const q = designInput; setDesignInput(''); sendDesignMessage(q); }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-11.9 7.8L4 21l1.7-5.1A8.5 8.5 0 1 1 21 11.5Z" /></svg>
                <input
                  value={designInput}
                  onChange={(e) => setDesignInput(e.target.value)}
                  placeholder="Escribe tu respuesta…"
                  disabled={designSending}
                />
              </form>
            </>
          ) : (
            <>
              <div className="knx-analisis-top">
                <div className="knx-analisis-head">
                  <h1>Activities</h1>
                  <p>Actividades hechas con el equipo de {tenantName} y sus resultados.</p>
                </div>
                <div className="knx-analisis-controls">
                  <button type="button" className="knx-analisis-sources-save" onClick={startDesign}>+ Nueva actividad</button>
                </div>
              </div>

              {!topLevelActivities.length ? (
                <div className="knx-analisis-empty">
                  <p>Todavía no hay ninguna actividad con este cliente.</p>
                </div>
              ) : (
                <div className="knx-activity-list">
                  {topLevelActivities.map((a) => (
                    <ActivityRow key={a.id} tenant={tenant} activity={a} onOpenCanvas={setCanvasActivity} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <KaiNextConfirmDialog
        open={!!deleteChatTarget}
        title="Eliminar conversación"
        message={`¿Eliminar "${deleteChatTarget?.title}"? Esta acción no se puede deshacer.`}
        onConfirm={confirmDeleteChat}
        onCancel={() => setDeleteChatTarget(null)}
      />
    </div>
  );
}
