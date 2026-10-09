'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';

const POLL_MS = 4000;
const DEFAULT_DURATION = 120;

function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

// Mismo backend y lógica que app/kai/components/ActivityDashboardCard.jsx (lib/kai/activities.js,
// cero storage nuevo) — solo con clases .knx-* y pegado a las rutas /api/kai-next/. El link de
// participantes sigue siendo /kai/activity/{code} tal cual, no se duplica esa superficie pública.
export default function KaiNextActivityDashboardCard({ tenant, activity }) {
  const [status, setStatus] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [durationInput, setDurationInput] = useState(String(DEFAULT_DURATION));
  const [savingDuration, setSavingDuration] = useState(false);
  const pollRef = useRef(null);
  const tickRef = useRef(null);

  const joinUrl = typeof window !== 'undefined' && activity?.code
    ? `${window.location.origin}/kai/activity/${activity.code}`
    : '';

  const fetchStatus = useCallback(async () => {
    if (!activity?.id) return;
    try {
      const res = await fetch(`/api/kai-next/${tenant}/activities/${activity.id}/status`);
      if (!res.ok) return;
      const data = await res.json();
      setStatus(data);
      if (data.meta?.status === 'finished') {
        clearInterval(pollRef.current);
        clearInterval(tickRef.current);
      }
    } catch { /* ignora fallos puntuales de polling */ }
  }, [tenant, activity?.id]);

  useEffect(() => {
    if (!activity?.id) return;
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, POLL_MS);
    tickRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(pollRef.current);
      clearInterval(tickRef.current);
    };
  }, [activity?.id, fetchStatus]);

  useEffect(() => {
    if (!joinUrl) return;
    QRCode.toDataURL(joinUrl, { width: 160, margin: 1, color: { dark: '#0B1020', light: '#FFFFFF' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [joinUrl]);

  useEffect(() => {
    if (status?.meta?.questionDurationSeconds) {
      setDurationInput(String(status.meta.questionDurationSeconds));
    }
  }, [status?.meta?.questionDurationSeconds]);

  const act = async (path) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/activities/${activity.id}/${path}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (path === 'finish') { clearInterval(pollRef.current); clearInterval(tickRef.current); }
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSaveDuration = async () => {
    setSavingDuration(true);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/activities/${activity.id}/duration`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seconds: Number(durationInput) }),
      });
      if (res.ok) setStatus(await res.json());
    } finally {
      setSavingDuration(false);
    }
  };

  if (!activity?.id) return null;

  const meta = status?.meta ?? activity;
  const isFinished = meta.status === 'finished';
  const isReady = meta.status === 'ready';
  const isActive = meta.status === 'active';
  const questionStarted = !!meta.currentQuestionStartedAt;
  const questionCount = status?.questionCount ?? 0;
  const connectedCount = status?.connectedCount ?? 0;
  const answeredCount = status?.answeredCount ?? 0;

  const sessionElapsed = meta.startedAt
    ? ((isFinished && meta.finishedAt ? new Date(meta.finishedAt).getTime() : now) - new Date(meta.startedAt).getTime()) / 1000
    : 0;

  const questionRemaining = questionStarted
    ? (meta.questionDurationSeconds ?? DEFAULT_DURATION) - (now - new Date(meta.currentQuestionStartedAt).getTime()) / 1000
    : null;

  const badgeLabel = isFinished ? 'Finalizada' : isReady ? 'Lista para iniciar' : 'En curso';

  return (
    <div className="knx-actdash">
      <div className="knx-actdash-header">
        <span className={`knx-activity-status knx-activity-status--${isFinished ? 'finished' : isReady ? 'ready' : 'active'}`}>{badgeLabel}</span>
        <h4 className="knx-actdash-title">{meta.name}</h4>
        <span className="knx-actdash-timer" title="Tiempo total de la sesión">⏱ {formatDuration(sessionElapsed)}</span>
      </div>

      {!isFinished && (
        <div className="knx-actdash-body">
          <div className="knx-actdash-qr">
            {qrDataUrl ? <img src={qrDataUrl} alt="QR de acceso" width={120} height={120} /> : <div className="knx-actdash-qr-skeleton" />}
            <span className="knx-actdash-code">{meta.code}</span>
          </div>
          <div className="knx-actdash-stats">
            <div className="knx-actdash-stat"><span className="knx-actdash-stat-value">{connectedCount}</span><span className="knx-actdash-stat-label">conectados</span></div>
            <div className="knx-actdash-stat"><span className="knx-actdash-stat-value">{answeredCount}/{connectedCount}</span><span className="knx-actdash-stat-label">respondieron</span></div>
            <div className="knx-actdash-stat"><span className="knx-actdash-stat-value">{(meta.currentQuestionIndex ?? 0) + 1}/{questionCount}</span><span className="knx-actdash-stat-label">pregunta</span></div>
            <div className="knx-actdash-stat">
              <span className={`knx-actdash-stat-value${questionRemaining !== null && questionRemaining <= 0 ? ' knx-actdash-stat-value--expired' : ''}`}>
                {questionRemaining !== null ? formatDuration(questionRemaining) : '—:—'}
              </span>
              <span className="knx-actdash-stat-label">tiempo/pregunta</span>
            </div>
          </div>
        </div>
      )}

      {isFinished ? (
        <p className="knx-actdash-summary">{status?.connectedCount ?? 0} participantes — resultados listos abajo.</p>
      ) : (
        <>
          <div className="knx-actdash-actions">
            {isReady && (
              <>
                <button type="button" className="knx-analisis-sources-save" onClick={() => act('start')} disabled={busy}>Iniciar Workshop</button>
                <button type="button" onClick={() => act('finish')} disabled={busy}>Cancelar</button>
              </>
            )}
            {isActive && !questionStarted && (
              <>
                <button type="button" className="knx-analisis-sources-save" onClick={() => act('start-question')} disabled={busy}>Iniciar pregunta {(meta.currentQuestionIndex ?? 0) + 1} →</button>
                <button type="button" onClick={() => act('finish')} disabled={busy}>Finalizar</button>
              </>
            )}
            {isActive && questionStarted && (
              <>
                <button type="button" className="knx-analisis-sources-save" onClick={() => act('advance')} disabled={busy}>Siguiente pregunta →</button>
                <button type="button" onClick={() => act('finish')} disabled={busy}>Finalizar</button>
              </>
            )}
          </div>
          <div className="knx-actdash-duration">
            <label htmlFor="knx-actdash-duration-input">Segundos por pregunta:</label>
            <input id="knx-actdash-duration-input" type="number" min={10} max={1800} value={durationInput} onChange={(e) => setDurationInput(e.target.value)} />
            <button type="button" onClick={handleSaveDuration} disabled={savingDuration}>Guardar</button>
          </div>
        </>
      )}
    </div>
  );
}
