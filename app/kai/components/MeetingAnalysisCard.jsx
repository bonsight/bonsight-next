'use client';

import { useState, useEffect } from 'react';

const AREA_LABELS = {
  negocio: 'Negocio',
  operaciones: 'Operaciones',
  tecnologia: 'Tecnología',
  finanzas: 'Finanzas',
  marketing: 'Marketing',
  personas: 'Personas',
};

const CONFIDENCE_LABELS = { alta: 'Alta', media: 'Media', baja: 'Baja' };

function KnowledgeItem({ item, index, busy, onDecide, tenants, defaultTenant }) {
  const [targetTenant, setTargetTenant] = useState(defaultTenant);
  const isPending = item.status === 'pending';

  return (
    <div className={`kai-meeting-knowledge-item kai-meeting-knowledge-item--${item.status}`}>
      <div className="kai-meeting-knowledge-tags">
        <span className="kai-meeting-tag">{AREA_LABELS[item.area] ?? item.area}</span>
        <span className={`kai-meeting-tag kai-meeting-tag--confidence-${item.confidence}`}>
          Confianza {CONFIDENCE_LABELS[item.confidence] ?? item.confidence}
        </span>
      </div>
      <p className="kai-meeting-knowledge-text">{item.statement}</p>
      {isPending ? (
        <div className="kai-meeting-knowledge-actions">
          {tenants.length > 1 && (
            <select
              className="kai-meeting-tenant-select"
              value={targetTenant}
              disabled={busy}
              onChange={(e) => setTargetTenant(e.target.value)}
            >
              {tenants.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
            </select>
          )}
          <button type="button" className="kai-meeting-btn kai-meeting-btn--accept" disabled={busy} onClick={() => onDecide(index, 'accept', targetTenant)}>
            Aceptar
          </button>
          <button type="button" className="kai-meeting-btn kai-meeting-btn--reject" disabled={busy} onClick={() => onDecide(index, 'reject', targetTenant)}>
            Rechazar
          </button>
        </div>
      ) : (
        <span className={`kai-meeting-status-label kai-meeting-status-label--${item.status}`}>
          {item.status === 'accepted'
            ? `✓ Incorporado al conocimiento de ${tenants.find((t) => t.slug === item.acceptedTenant)?.name ?? item.acceptedTenant ?? 'Kai'}`
            : '✕ Rechazado'}
        </span>
      )}
    </div>
  );
}

export default function MeetingAnalysisCard({ tenant, conversationId, messageIndex, analysis, onUpdate }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [tenants, setTenants] = useState([{ slug: tenant, name: tenant }]);

  useEffect(() => {
    fetch('/api/kai/tenants')
      .then((res) => res.json())
      .then((data) => {
        const list = (data.tenants ?? []).map((t) => ({ slug: t.slug, name: t.name || t.slug }));
        if (list.length) setTenants(list);
      })
      .catch(() => {});
  }, []);

  if (!analysis) return null;
  const { meetingTitle, summary, decisions = [], tasks = [], knowledge = [], contradictions = [] } = analysis;

  const handleDecide = async (itemIndex, decision, targetTenant) => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/kai/${tenant}/meetings/knowledge`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, messageIndex, itemIndex, decision, targetTenant }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'No se pudo actualizar.'); return; }
      onUpdate?.(data.meetingAnalysis);
    } catch {
      setErr('Error de conexión.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="kai-meeting-card">
      <div className="kai-meeting-header">
        <span className="kai-actdash-badge">Reunión analizada</span>
        <h4 className="kai-meeting-title">{meetingTitle}</h4>
      </div>

      {summary && (
        <div className="kai-meeting-section">
          <p className="kai-meeting-section-label">Resumen</p>
          <p className="kai-meeting-summary">{summary}</p>
        </div>
      )}

      {decisions.length > 0 && (
        <div className="kai-meeting-section">
          <p className="kai-meeting-section-label">Decisiones</p>
          <ul className="kai-meeting-list">
            {decisions.map((d, i) => (
              <li key={i}><strong>{d.title}</strong>{d.reason ? ` — ${d.reason}` : ''}</li>
            ))}
          </ul>
        </div>
      )}

      {tasks.length > 0 && (
        <div className="kai-meeting-section">
          <p className="kai-meeting-section-label">Tareas</p>
          <ul className="kai-meeting-list">
            {tasks.map((t, i) => (
              <li key={i}><strong>{t.owner}:</strong> {t.task}{t.deadline ? ` (${t.deadline})` : ''}</li>
            ))}
          </ul>
        </div>
      )}

      {knowledge.length > 0 && (
        <div className="kai-meeting-section">
          <p className="kai-meeting-section-label">Nuevo conocimiento</p>
          <div className="kai-meeting-knowledge-list">
            {knowledge.map((item, i) => (
              <KnowledgeItem key={i} item={item} index={i} busy={busy} onDecide={handleDecide} tenants={tenants} defaultTenant={tenant} />
            ))}
          </div>
        </div>
      )}

      {contradictions.length > 0 && (
        <div className="kai-meeting-section">
          <p className="kai-meeting-section-label">Posibles contradicciones</p>
          <div className="kai-meeting-contradiction-list">
            {contradictions.map((c, i) => (
              <div key={i} className="kai-meeting-contradiction">
                <p className="kai-meeting-contradiction-reason">{c.reason}</p>
                <p><span className="kai-meeting-contradiction-label">Antes:</span> {c.existing}</p>
                <p><span className="kai-meeting-contradiction-label">Ahora:</span> {c.new}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {err && <p className="kai-meeting-error">{err}</p>}
    </div>
  );
}
