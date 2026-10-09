'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';

const FICHA_FIELDS = [
  { key: 'objetivo', label: 'Objetivo' },
  { key: 'problema', label: 'Problema' },
  { key: 'prioridad', label: 'Prioridad' },
  { key: 'exito', label: 'Éxito' },
  { key: 'restricciones', label: 'Restricciones' },
];

function initials(name) {
  return String(name ?? '?').slice(0, 2).toUpperCase();
}

const IconQrSmall = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="15" y="15" width="2.5" height="2.5" /><rect x="19" y="15" width="2.5" height="2.5" />
    <rect x="15" y="19" width="2.5" height="2.5" /><rect x="19" y="19" width="2.5" height="2.5" />
  </svg>
);

// Port del estado "organizador" del FichaPanel de Aria (WorkshopCanvasPresentation.jsx):
// barra colapsable, "todavía nadie se unió" con CTA grande para compartir, lista de
// participantes con progreso una vez que alguien entra, y "Consolidar respuestas". El lado
// del participante (unirse por QR/código y responder las 5 preguntas) es infraestructura
// compartida sin tocar — /kai/activity/[code], la misma que ya usa cualquier Activity self_paced.
// Arrancar la ficha es tool del chat (start_ficha_for_group); polling, compartir, consolidar y
// guardar son acciones de UI directas — no tiene sentido pedirle a Claude que "revise si alguien
// ya respondió".
export default function KaiNextGroupFicha({ tenant, activityId, questionId, group, onSaved }) {
  const [status, setStatus] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [draft, setDraft] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingSaved, setEditingSaved] = useState(false);
  const [savedValues, setSavedValues] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const pollRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    const res = await fetch(`/api/kai-next/${tenant}/activities/${activityId}/canvas-ficha?questionId=${encodeURIComponent(questionId)}&groupId=${encodeURIComponent(group.id)}`);
    if (res.ok) setStatus(await res.json());
  }, [tenant, activityId, questionId, group.id]);

  useEffect(() => {
    if (!group.fichaActivityId || group.ficha) return;
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, 4000);
    return () => clearInterval(pollRef.current);
  }, [group.fichaActivityId, group.ficha, fetchStatus]);

  const joinUrl = typeof window !== 'undefined' && status?.fichaCode
    ? `${window.location.origin}/kai/activity/${status.fichaCode}`
    : '';

  useEffect(() => {
    if (!joinUrl) { setQrDataUrl(null); return; }
    QRCode.toDataURL(joinUrl, { width: 160, margin: 1, color: { dark: '#0B1020', light: '#FFFFFF' } })
      .then(setQrDataUrl).catch(() => setQrDataUrl(null));
  }, [joinUrl]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard no disponible */ }
  };

  if (!group.fichaActivityId) return null;

  const saveEditedFicha = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/activities/${activityId}/canvas-ficha`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, groupId: group.id, action: 'save', ficha: savedValues }),
      });
      if (res.ok) {
        setEditingSaved(false);
        onSaved?.();
      }
    } finally {
      setBusy(false);
    }
  };

  if (group.ficha) {
    return (
      <div className="knx-canvas-ficha knx-canvas-ficha--saved">
        <button
          type="button"
          className="knx-canvas-ficha-row"
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}
          onClick={() => { setSavedValues(group.ficha); setEditingSaved(false); setViewOpen(true); }}
        >
          <span className="knx-activity-status knx-activity-status--finished">Ficha guardada</span>
          <span className="knx-canvas-ficha-progress">{group.ficha.participantCount} respuesta{group.ficha.participantCount !== 1 ? 's' : ''}</span>
        </button>

        {viewOpen && savedValues && (
          <div className="knx-ficha-share-backdrop" onClick={() => setViewOpen(false)}>
            <div className="knx-ficha-review-modal" onClick={(e) => e.stopPropagation()}>
              <div className="knx-ficha-review-head">
                <div>
                  <span className="knx-ficha-review-badge">{editingSaved ? 'Editar ficha' : 'Ficha'}</span>
                  <h3 className="knx-ficha-review-title">{group.name}</h3>
                </div>
                <button type="button" className="knx-side-panel-close" aria-label="Cerrar" onClick={() => setViewOpen(false)}>×</button>
              </div>
              <div className="knx-ficha-review-grid">
                {FICHA_FIELDS.map((f) => (
                  <div key={f.key} className="knx-ficha-review-field">
                    <label>{f.label}</label>
                    {editingSaved ? (
                      <textarea
                        rows={4}
                        value={savedValues[f.key] ?? ''}
                        disabled={busy}
                        onChange={(e) => setSavedValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      />
                    ) : (
                      <p>{group.ficha[f.key]}</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="knx-canvas-ficha-draft-actions">
                {editingSaved ? (
                  <>
                    <button type="button" className="knx-canvas-mini" disabled={busy} onClick={() => { setSavedValues(group.ficha); setEditingSaved(false); }}>Cancelar</button>
                    <button type="button" className="knx-analisis-sources-save" disabled={busy} onClick={saveEditedFicha}>Guardar</button>
                  </>
                ) : (
                  <button type="button" className="knx-canvas-mini" onClick={() => setEditingSaved(true)}>Editar</button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const participants = status?.status?.participants ?? [];
  const totalQuestions = participants[0]?.total ?? status?.status?.questionCount ?? 5;
  const completedCount = participants.filter((p) => p.answeredCount === p.total).length;
  const avgAnswered = participants.length
    ? Math.round(participants.reduce((sum, p) => sum + p.answeredCount, 0) / participants.length)
    : 0;

  const consolidate = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/activities/${activityId}/canvas-ficha`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, groupId: group.id, action: 'consolidate' }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'No se pudo consolidar.'); return; }
      clearInterval(pollRef.current);
      setDraft(data.draft);
    } catch {
      setErr('Error de conexión.');
    } finally {
      setBusy(false);
    }
  };

  const saveFicha = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/activities/${activityId}/canvas-ficha`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, groupId: group.id, action: 'save', ficha: draft }),
      });
      if (res.ok) {
        setDraft(null);
        onSaved?.();
      }
    } finally {
      setBusy(false);
    }
  };

  const draftModal = draft && (
    <div className="knx-ficha-share-backdrop">
      <div className="knx-ficha-review-modal">
        <div className="knx-ficha-review-head">
          <div>
            <span className="knx-ficha-review-badge">Revisar ficha</span>
            <h3 className="knx-ficha-review-title">{group.name}</h3>
          </div>
        </div>
        <div className="knx-ficha-review-grid">
          {FICHA_FIELDS.map((f) => (
            <div key={f.key} className="knx-ficha-review-field">
              <label>{f.label}</label>
              <textarea
                rows={4}
                value={draft[f.key] ?? ''}
                disabled={busy}
                onChange={(e) => setDraft((prev) => ({ ...prev, [f.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <div className="knx-canvas-ficha-draft-actions">
          <button type="button" className="knx-canvas-mini" onClick={() => setDraft(null)} disabled={busy}>Descartar</button>
          <button type="button" className="knx-analisis-sources-save" onClick={saveFicha} disabled={busy}>Guardar ficha</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="knx-canvas-ficha">
      <button type="button" className="knx-canvas-ficha-bar" onClick={() => setExpanded((v) => !v)}>
        <span className="knx-canvas-ficha-dot" />
        <span className="knx-canvas-ficha-bar-text">
          <span className="knx-activity-status knx-activity-status--active">Ficha en curso</span>
          <span className="knx-canvas-ficha-progress">{completedCount}/{participants.length} respondieron · {avgAnswered}/{totalQuestions}</span>
        </span>
        <span className={`knx-canvas-ficha-chevron${expanded ? ' knx-canvas-ficha-chevron--open' : ''}`}>⌄</span>
      </button>

      {expanded && (
        <div className="knx-canvas-ficha-body">
          {err && <p className="knx-canvas-error">{err}</p>}
          {participants.length === 0 ? (
            <>
              <p className="knx-knowledge-empty">Compartí el link o el QR — todavía nadie se unió.</p>
              <button type="button" className="knx-analisis-sources-save knx-canvas-ficha-share-btn" onClick={() => setShareOpen(true)}><IconQrSmall /> Compartir</button>
            </>
          ) : (
            <>
              <div className="knx-canvas-ficha-participants">
                {participants.map((p) => (
                  <div key={p.id} className="knx-canvas-ficha-participant-row">
                    <span className="knx-canvas-avatar knx-canvas-avatar--sm">{initials(p.name)}</span>
                    <span className="knx-canvas-ficha-participant-name">{p.name}</span>
                    <span className="knx-canvas-ficha-participant-progress">{p.answeredCount}/{p.total}</span>
                  </div>
                ))}
              </div>
              <div className="knx-canvas-ficha-row">
                <button type="button" className="knx-analisis-sources-save" disabled={busy} onClick={consolidate}>
                  {busy ? 'Consolidando…' : 'Consolidar respuestas'}
                </button>
                <button type="button" className="knx-canvas-icon-btn" aria-label="Compartir" title="Compartir — por si se suma alguien más" onClick={() => setShareOpen(true)}>
                  <IconQrSmall />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {shareOpen && (
        <div className="knx-ficha-share-backdrop" onClick={() => setShareOpen(false)}>
          <div className="knx-ficha-share-modal" onClick={(e) => e.stopPropagation()}>
            <div className="knx-ficha-share-head">
              <span className="knx-side-panel-title">Compartir — {group.name}</span>
              <button type="button" className="knx-side-panel-close" aria-label="Cerrar" onClick={() => setShareOpen(false)}>×</button>
            </div>
            {qrDataUrl && <img className="knx-ficha-share-qr" src={qrDataUrl} alt="QR para unirse a la ficha" />}
            <p className="knx-ficha-share-code">{status?.fichaCode}</p>
            <button type="button" className="knx-canvas-mini" onClick={handleCopyLink}>{copied ? '✓ Copiado' : '🔗 Copiar link'}</button>
          </div>
        </div>
      )}

      {draftModal}
    </div>
  );
}
