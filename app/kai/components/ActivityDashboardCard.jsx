'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';

const POLL_MS = 4000;

export default function ActivityDashboardCard({ tenant, activity, onFinished }) {
  const [status, setStatus] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef(null);

  const joinUrl = typeof window !== 'undefined' && activity?.code
    ? `${window.location.origin}/kai/activity/${activity.code}`
    : '';

  const fetchStatus = useCallback(async () => {
    if (!activity?.id) return;
    try {
      const res = await fetch(`/api/kai/${tenant}/activities/${activity.id}/status`);
      if (!res.ok) return;
      const data = await res.json();
      setStatus(data);
      if (data.meta?.status === 'finished') {
        clearInterval(pollRef.current);
      }
    } catch { /* ignora fallos puntuales de polling */ }
  }, [tenant, activity?.id]);

  useEffect(() => {
    if (!activity?.id) return;
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [activity?.id, fetchStatus]);

  useEffect(() => {
    if (!joinUrl) return;
    QRCode.toDataURL(joinUrl, { width: 160, margin: 1, color: { dark: '#0D1117', light: '#FFFFFF' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [joinUrl]);

  const handleAdvance = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/kai/${tenant}/activities/${activity.id}/advance`, { method: 'POST' });
      if (res.ok) setStatus(await res.json());
    } finally {
      setBusy(false);
    }
  };

  const handleFinish = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/kai/${tenant}/activities/${activity.id}/finish`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        clearInterval(pollRef.current);
      }
    } finally {
      setBusy(false);
    }
  };

  if (!activity?.id) return null;

  const meta = status?.meta ?? activity;
  const isFinished = meta.status === 'finished';
  const questionCount = status?.questionCount ?? 0;
  const connectedCount = status?.connectedCount ?? 0;
  const answeredCount = status?.answeredCount ?? 0;

  return (
    <div className="kai-actdash">
      <div className="kai-actdash-header">
        <span className="kai-actdash-badge">{isFinished ? 'Finalizada' : 'Activity en curso'}</span>
        <h4 className="kai-actdash-title">{meta.name}</h4>
      </div>

      {!isFinished && (
        <div className="kai-actdash-body">
          <div className="kai-actdash-qr">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR de acceso" width={120} height={120} />
            ) : (
              <div className="kai-actdash-qr-skeleton" style={{ width: 120, height: 120 }} />
            )}
            <span className="kai-actdash-code">{meta.code}</span>
          </div>
          <div className="kai-actdash-stats">
            <div className="kai-actdash-stat">
              <span className="kai-actdash-stat-value">{connectedCount}</span>
              <span className="kai-actdash-stat-label">conectados</span>
            </div>
            <div className="kai-actdash-stat">
              <span className="kai-actdash-stat-value">{answeredCount}/{connectedCount}</span>
              <span className="kai-actdash-stat-label">respondieron</span>
            </div>
            <div className="kai-actdash-stat">
              <span className="kai-actdash-stat-value">{(meta.currentQuestionIndex ?? 0) + 1}/{questionCount}</span>
              <span className="kai-actdash-stat-label">pregunta</span>
            </div>
          </div>
        </div>
      )}

      {isFinished ? (
        <p className="kai-actdash-summary">
          {status?.connectedCount ?? 0} participantes · pedile a Aria el análisis cuando quieras.
        </p>
      ) : (
        <div className="kai-actdash-actions">
          <button type="button" className="kai-actdash-btn kai-actdash-btn--primary" onClick={handleAdvance} disabled={busy}>
            Siguiente pregunta →
          </button>
          <button type="button" className="kai-actdash-btn" onClick={handleFinish} disabled={busy}>
            Finalizar Activity
          </button>
        </div>
      )}
    </div>
  );
}
