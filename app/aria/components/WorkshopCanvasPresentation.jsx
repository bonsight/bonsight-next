'use client';

import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';

const IconChevronDown = ({ className }) => (
  <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const IconMerge = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" />
    <path d="M6 8.5v3a4 4 0 0 0 4 4h5.5" /><polyline points="12.5 12.5 15.5 15.5 12.5 18.5" />
  </svg>
);

const IconMoreHorizontal = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
  </svg>
);

const IconQrSmall = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="15" y="15" width="2.5" height="2.5" /><rect x="19" y="15" width="2.5" height="2.5" />
    <rect x="15" y="19" width="2.5" height="2.5" /><rect x="19" y="19" width="2.5" height="2.5" />
  </svg>
);

const IconTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const IconPencil = ({ className }) => (
  <svg className={className} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
  </svg>
);

const IconPlus = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconBulb = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18h6M10 22h4M12 2a6 6 0 0 0-4 10.5c.8.8 1.3 1.5 1.5 2.5h5c.2-1 .7-1.7 1.5-2.5A6 6 0 0 0 12 2z" />
  </svg>
);

const IconGrid = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const IconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconHelp = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconDownload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconRevert = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
);

const Spinner = () => <span className="aria-board-spinner" aria-hidden="true" />;

const IconCopy = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const IconCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconMove = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);

const IconComment = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const IconClipboard = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="3" width="6" height="4" rx="1" />
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
  </svg>
);

function initials(name) {
  return String(name ?? '?').slice(0, 2).toUpperCase();
}

const AREA_OPTIONS = ['Ventas', 'Producto / UX', 'Tecnología cliente', 'Desarrollo', 'Datos (BI/Tagueo)', 'Transformación y Agilidad'];

const FICHA_FIELDS = [
  { key: 'objetivo', label: 'Objetivo', emoji: '🎯' },
  { key: 'problema', label: 'Problema / situación actual', emoji: '⚠️' },
  { key: 'prioridad', label: 'Por qué es prioritario ahora', emoji: '🔥' },
  { key: 'exito', label: 'Cómo se ve el éxito', emoji: '🏆' },
  { key: 'restricciones', label: 'Restricciones y condiciones', emoji: '🚧' },
];

// Formato WhatsApp (*negrita*) — mismo criterio que el copiar de reuniones en Kai.
function buildFichaCopyText({ groupName, workshopName, ficha }) {
  const lines = [`*📋 Ficha: ${groupName}*`];
  if (workshopName) lines.push(`Workshop: ${workshopName}`);
  lines.push('');
  for (const f of FICHA_FIELDS) {
    lines.push(`*${f.emoji} ${f.label}*`, ficha?.[f.key] || '—', '');
  }
  if (ficha?.participantNames?.length) lines.push(`_Respondida por: ${ficha.participantNames.join(', ')}_`);
  return lines.join('\n').trim();
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'editado ahora';
  if (mins < 60) return `editado hace ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `editado hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'editado ayer';
  if (days < 7) return `editado hace ${days}d`;
  const weeks = Math.floor(days / 7);
  return `editado hace ${weeks}sem`;
}

function InitiativeCard({ item, group, otherGroups, busy, onAction }) {
  const [commenting, setCommenting] = useState(false);
  const [comment, setComment] = useState(item.comment ?? '');
  const [moveOpen, setMoveOpen] = useState(false);

  const saveComment = () => {
    const trimmed = comment.trim();
    if (trimmed !== (item.comment ?? '')) onAction('comment_item', { itemIndex: item.itemIndex, comment: trimmed });
    setCommenting(false);
  };

  return (
    <div className="aria-canvas-item">
      <div className="aria-canvas-item-head">
        <div className="aria-canvas-item-who">
          <span className="aria-canvas-avatar">{initials(item.participant)}</span>
          <span className="aria-canvas-item-name">{item.participant}</span>
        </div>
        <div className="aria-canvas-item-icons">
          <button type="button" className="aria-canvas-icon-btn" aria-label="Comentar" title="Comentar" onClick={() => setCommenting((v) => !v)}>
            <IconComment />
          </button>
          {otherGroups.length > 0 && (
            <button type="button" className="aria-canvas-icon-btn" aria-label="Mover a otro grupo" title="Mover a otro grupo" onClick={() => setMoveOpen((v) => !v)}>
              <IconMove />
            </button>
          )}
        </div>
      </div>
      {moveOpen && (
        <select
          className="aria-canvas-move-select"
          autoFocus
          value=""
          disabled={busy}
          onChange={(e) => {
            if (e.target.value) { onAction('move_item', { itemIndex: item.itemIndex, fromGroupId: group.id, toGroupId: e.target.value }); setMoveOpen(false); }
          }}
        >
          <option value="">Mover a…</option>
          {otherGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      )}
      <p className="aria-canvas-item-text">{item.text}</p>
      {commenting ? (
        <input
          className="aria-canvas-comment-input"
          value={comment}
          disabled={busy}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && saveComment()}
          onBlur={saveComment}
          placeholder="Agregar comentario…"
          autoFocus
        />
      ) : item.comment ? (
        <p className="aria-canvas-item-comment" onClick={() => setCommenting(true)} title="Click para editar">💬 {item.comment}</p>
      ) : null}
    </div>
  );
}

function GroupMetaRow({ group, busy, workshopParticipants = [], onSave }) {
  const [checklistOpen, setChecklistOpen] = useState(false);

  // Solo gente que de verdad participó de este workshop — nada de la lista genérica
  // de known_participants del tenant. Si el responsable/involucrado ya guardado no
  // está en esta lista (dato viejo), lo agrego igual para no perderlo silenciosamente.
  const extra = [group.responsable, ...(group.involucrados ?? [])].filter(
    (n) => n && !workshopParticipants.includes(n)
  );
  const nameOptions = [...new Set([...workshopParticipants, ...extra])];

  const toggleInvolucrado = (name) => {
    const current = group.involucrados ?? [];
    const next = current.includes(name) ? current.filter((n) => n !== name) : [...current, name];
    onSave({ involucrados: next });
  };

  return (
    <div className="aria-canvas-meta-form">
      <div className="aria-canvas-meta-form-row">
        <div className="aria-canvas-meta-field">
          <label className="aria-canvas-meta-field-label">Categoría</label>
          <select
            className={`aria-canvas-meta-select${group.area ? '' : ' aria-canvas-meta-select--empty'}`}
            value={group.area ?? ''}
            disabled={busy}
            onChange={(e) => onSave({ area: e.target.value })}
          >
            <option value="">Sin definir</option>
            {AREA_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="aria-canvas-meta-field">
          <label className="aria-canvas-meta-field-label">Responsable</label>
          <select
            className={`aria-canvas-meta-select${group.responsable ? '' : ' aria-canvas-meta-select--empty'}`}
            value={group.responsable ?? ''}
            disabled={busy}
            onChange={(e) => onSave({ responsable: e.target.value })}
          >
            <option value="">Sin definir</option>
            {nameOptions.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {checklistOpen ? (
        <>
          <p className="aria-canvas-meta-checklist-title">Involucrados <span>· agregar desde este workshop</span></p>
          <div className="aria-canvas-meta-checklist">
            {nameOptions.length === 0 ? (
              <p className="aria-canvas-meta-empty">Nadie de este workshop todavía.</p>
            ) : (
              nameOptions.map((n) => (
                <label key={n} className="aria-canvas-meta-checkbox">
                  <input type="checkbox" checked={(group.involucrados ?? []).includes(n)} disabled={busy} onChange={() => toggleInvolucrado(n)} />
                  <span className="aria-canvas-meta-checkbox-box" />
                  {n}
                </label>
              ))
            )}
          </div>
          <button type="button" className="aria-canvas-mini aria-canvas-mini--primary" onClick={() => setChecklistOpen(false)}>Guardar</button>
        </>
      ) : group.involucrados?.length > 0 ? (
        <div className="aria-canvas-meta-line aria-canvas-meta-line--column">
          <span className="aria-canvas-meta-field-label aria-canvas-involucrados-heading" onClick={() => setChecklistOpen(true)}>
            Involucrados <IconPencil className="aria-canvas-col-name-pencil" />
          </span>
          <div className="aria-canvas-involucrados-list">
            {group.involucrados.map((n) => (
              <span key={n} className="aria-canvas-item-who">
                <span className="aria-canvas-avatar aria-canvas-avatar--sm">{initials(n)}</span>
                <span className="aria-canvas-item-name">{n}</span>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="aria-canvas-meta-line aria-canvas-meta-line--column">
          <span className="aria-canvas-meta-field-label">Involucrados</span>
          <button type="button" className="aria-canvas-add-item-btn" onClick={() => setChecklistOpen(true)}>
            <IconPlus /> Agregar involucrados
          </button>
        </div>
      )}
    </div>
  );
}

function AddItemRow({ busy, onSubmit }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');

  if (!open) {
    return (
      <button type="button" className="aria-canvas-add-item-btn" onClick={() => setOpen(true)}>
        <IconPlus /> Agregar iniciativa
      </button>
    );
  }

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setText('');
    setOpen(false);
  };

  return (
    <div className="aria-canvas-newcol-form">
      <input
        className="aria-canvas-group-name-input"
        placeholder="Nueva iniciativa…"
        value={text}
        disabled={busy}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        autoFocus
      />
      <div className="aria-canvas-newcol-actions">
        <button type="button" className="aria-canvas-mini" disabled={busy} onClick={submit}>Agregar</button>
        <button type="button" className="aria-canvas-mini" onClick={() => setOpen(false)}>Cancelar</button>
      </div>
    </div>
  );
}

// Modal único para ver, editar y revisar-antes-de-guardar una ficha — así "Editar"
// y "Revisar" después de consolidar nunca vuelven a caer en el formulario angosto viejo.
// Si "ficha" viene explícito (draft recién consolidado, todavía sin guardar), cancelar
// descarta todo; si no, cancelar solo vuelve al modo lectura de lo ya guardado.
function FichaModal({ group, ficha, initialEditing = false, tenant, investigationId, messageIndex, questionId, workshopName, onClose, onCanvasUpdate }) {
  const isDraftReview = !!ficha && !group.ficha;
  const sourceFicha = ficha ?? group.ficha;
  const [editing, setEditing] = useState(initialEditing);
  const [values, setValues] = useState({
    objetivo: sourceFicha?.objetivo ?? '',
    problema: sourceFicha?.problema ?? '',
    prioridad: sourceFicha?.prioridad ?? '',
    exito: sourceFicha?.exito ?? '',
    restricciones: sourceFicha?.restricciones ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildFichaCopyText({ groupName: group.name, workshopName, ficha: sourceFicha }));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard no disponible */ }
  };

  const handleCancelEdit = () => {
    if (isDraftReview) { onClose(); return; }
    setValues({
      objetivo: sourceFicha?.objetivo ?? '',
      problema: sourceFicha?.problema ?? '',
      prioridad: sourceFicha?.prioridad ?? '',
      exito: sourceFicha?.exito ?? '',
      restricciones: sourceFicha?.restricciones ?? '',
    });
    setEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/aria/${tenant}/investigations/${investigationId}/canvas`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIndex, action: 'save_ficha', questionId, groupId: group.id, ficha: { ...sourceFicha, ...values } }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'No se pudo guardar la ficha.'); return; }
      onCanvasUpdate?.(data.canvas);
      if (isDraftReview) onClose(); else setEditing(false);
    } catch {
      setErr('Error de conexión.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      const filename = `ficha-${group.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '.pdf';
      const res = await fetch(`/api/aria/${tenant}/generate-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: 'ficha_pdf',
          filename,
          title: group.name,
          subtitle: workshopName,
          date: new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }),
          ficha: sourceFicha,
          participantCount: sourceFicha?.participantCount,
          participantNames: sourceFicha?.participantNames,
        }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch { /* silencioso — no hay mucho que hacer si falla la descarga */ }
  };

  return (
    <div className="aria-ficha-modal-backdrop" onClick={isDraftReview ? undefined : onClose}>
      <div className="aria-ficha-modal" onClick={(e) => e.stopPropagation()}>
        <div className="aria-ficha-modal-header">
          <div>
            <span className="aria-ficha-badge">{isDraftReview ? 'Revisar ficha' : editing ? 'Editar ficha' : 'Ficha'}</span>
            <h3 className="aria-ficha-modal-title">{group.name}</h3>
          </div>
          <div className="aria-canvas-header-actions">
            {!editing && (
              <>
                <button type="button" className="aria-canvas-icon-btn" aria-label="Copiar ficha" title="Copiar" onClick={handleCopy}>
                  {copied ? <IconCheck /> : <IconCopy />}
                </button>
                <button type="button" className="aria-canvas-mini" onClick={() => setEditing(true)}>Editar</button>
                <button type="button" className="aria-canvas-mini" onClick={handleExportPdf}>PDF</button>
              </>
            )}
            {!isDraftReview && (
              <button type="button" className="aria-canvas-icon-btn" aria-label="Cerrar" title="Cerrar" onClick={onClose}>✕</button>
            )}
          </div>
        </div>
        {err && <p className="aria-canvas-error">{err}</p>}
        <div className="aria-ficha-modal-grid">
          {FICHA_FIELDS.map((f) => (
            <div key={f.key} className="aria-ficha-field">
              <p className="aria-ficha-field-label">{f.label}</p>
              {editing ? (
                <textarea
                  className="aria-ficha-textarea"
                  rows={4}
                  value={values[f.key]}
                  disabled={saving}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                />
              ) : (
                <p className="aria-ficha-field-text">{sourceFicha?.[f.key]}</p>
              )}
            </div>
          ))}
        </div>
        {editing && (
          <div className="aria-canvas-newcol-actions aria-ficha-modal-actions">
            <button type="button" className="aria-canvas-mini" disabled={saving} onClick={handleSave}>Guardar</button>
            <button type="button" className="aria-canvas-mini" onClick={handleCancelEdit}>Cancelar</button>
          </div>
        )}
      </div>
    </div>
  );
}

function FichaPanel({ group, tenant, investigationId, messageIndex, questionId, workshopName, onCanvasUpdate }) {
  const [status, setStatus] = useState(null);
  const [draft, setDraft] = useState(null);
  const [consolidating, setConsolidating] = useState(false);
  const [err, setErr] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [copied, setCopied] = useState(false);
  const [statusExpanded, setStatusExpanded] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const pollRef = useRef(null);

  const activityId = group.fichaActivityId;
  const hasSavedFicha = !!group.ficha;
  const joinUrl = typeof window !== 'undefined' && group.fichaCode
    ? `${window.location.origin}/kai/activity/${group.fichaCode}`
    : '';

  useEffect(() => {
    if (!joinUrl) { setQrDataUrl(null); return; }
    QRCode.toDataURL(joinUrl, { width: 160, margin: 1, color: { dark: '#1a1a2e', light: '#FFFFFF' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [joinUrl]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard no disponible */ }
  };

  useEffect(() => {
    if (!activityId || hasSavedFicha) return undefined;
    const poll = async () => {
      try {
        const res = await fetch(`/api/aria/${tenant}/investigations/${investigationId}/ficha?activityId=${activityId}`);
        const data = await res.json();
        if (res.ok) setStatus(data);
      } catch { /* ignora fallos puntuales de polling */ }
    };
    poll();
    pollRef.current = setInterval(poll, 4000);
    return () => clearInterval(pollRef.current);
  }, [activityId, hasSavedFicha, tenant, investigationId]);

  const handleConsolidate = async () => {
    setConsolidating(true);
    setErr(null);
    try {
      const res = await fetch(`/api/aria/${tenant}/investigations/${investigationId}/ficha`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'No se pudo consolidar.'); return; }
      clearInterval(pollRef.current);
      setDraft(data.ficha);
    } catch {
      setErr('Error de conexión.');
    } finally {
      setConsolidating(false);
    }
  };

  // Ya guardada: el ícono "Ver ficha" del header del grupo (GroupColumn) maneja
  // todo — ver, editar, copiar, PDF — dentro del mismo modal. Acá no hay nada más
  // que mostrar en ese caso.
  if (hasSavedFicha) return null;

  if (draft) {
    return (
      <FichaModal
        group={group}
        ficha={draft}
        initialEditing
        tenant={tenant}
        investigationId={investigationId}
        messageIndex={messageIndex}
        questionId={questionId}
        workshopName={workshopName}
        onClose={() => setDraft(null)}
        onCanvasUpdate={onCanvasUpdate}
      />
    );
  }

  if (!activityId) return null;

  const participants = status?.participants ?? [];
  const totalQuestions = participants[0]?.total ?? status?.questionCount ?? 5;
  const completedCount = participants.filter((p) => p.answeredCount === p.total).length;
  const avgAnswered = participants.length
    ? Math.round(participants.reduce((sum, p) => sum + p.answeredCount, 0) / participants.length)
    : 0;

  return (
    <div className="aria-ficha-status">
      <div className="aria-ficha-status-bar" onClick={() => setStatusExpanded((v) => !v)}>
        <span className="aria-canvas-status-dot" />
        <div className="aria-ficha-status-lines">
          <span className="aria-ficha-badge">Ficha en curso</span>
          <span className="aria-ficha-status-text">
            {completedCount}/{participants.length} respondieron · {avgAnswered}/{totalQuestions}
          </span>
        </div>
        <IconChevronDown className={`aria-ficha-status-chevron${statusExpanded ? ' aria-ficha-status-chevron--open' : ''}`} />
      </div>

      {shareOpen && (
        <div className="aria-ficha-modal-backdrop" onClick={() => setShareOpen(false)}>
          <div className="aria-ficha-modal aria-ficha-share-modal" onClick={(e) => e.stopPropagation()}>
            <div className="aria-ficha-modal-header">
              <div>
                <span className="aria-ficha-badge">Compartir</span>
                <h3 className="aria-ficha-modal-title">{group.name}</h3>
              </div>
              <button type="button" className="aria-canvas-icon-btn" aria-label="Cerrar" title="Cerrar" onClick={() => setShareOpen(false)}>✕</button>
            </div>
            <div className="aria-ficha-share-modal-body">
              {qrDataUrl && <img className="aria-ficha-qr-big" src={qrDataUrl} alt="QR para unirse a la ficha" />}
              <p className="aria-ficha-code aria-ficha-code-big">{group.fichaCode}</p>
              <button type="button" className="aria-canvas-mini" onClick={handleCopyLink}>
                {copied ? '✓ Copiado' : '🔗 Copiar link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {statusExpanded && (
        <div className="aria-ficha-status-body">
          {err && <p className="aria-canvas-error">{err}</p>}
          {participants.length === 0 ? (
            <>
              <p className="aria-board-hint">Compartí el link o el QR — todavía nadie se unió.</p>
              <button type="button" className="aria-canvas-export-btn aria-ficha-primary-btn" onClick={() => setShareOpen(true)}>
                <IconQrSmall /> Compartir
              </button>
            </>
          ) : (
            <>
              <div className="aria-ficha-participants">
                {participants.map((p) => (
                  <div key={p.id} className="aria-ficha-participant-row">
                    <span className="aria-canvas-avatar aria-canvas-avatar--sm">{initials(p.name)}</span>
                    <span className="aria-ficha-participant-name">{p.name}</span>
                    <span className="aria-ficha-participant-progress">{p.answeredCount}/{p.total}</span>
                  </div>
                ))}
              </div>
              <div className="aria-ficha-status-actions">
                <button type="button" className="aria-canvas-export-btn aria-ficha-primary-btn" disabled={consolidating} onClick={handleConsolidate}>
                  {consolidating ? 'Consolidando…' : 'Consolidar respuestas'}
                </button>
                <button type="button" className="aria-canvas-icon-btn" aria-label="Compartir" title="Compartir — por si se suma alguien más" onClick={() => setShareOpen(true)}>
                  <IconQrSmall />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function GroupColumn({ group, items, otherGroups, busy, onAction, tenant, investigationId, messageIndex, questionId, workshopName, workshopParticipants, onCanvasUpdate, orderEntry }) {
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(group.name);
  const [expanded, setExpanded] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [startingFicha, setStartingFicha] = useState(false);
  const [fichaModalOpen, setFichaModalOpen] = useState(false);
  const [orderTooltipOpen, setOrderTooltipOpen] = useState(false);

  const resolvedItems = (group.itemIndexes ?? []).map((idx) => ({ ...items[idx], itemIndex: idx })).filter((it) => it.text);
  const shown = expanded ? resolvedItems : resolvedItems.slice(0, 2);
  const restCount = resolvedItems.length - shown.length;
  const hasFicha = !!(group.fichaActivityId || group.ficha);

  const saveName = () => {
    const name = nameInput.trim();
    if (name && name !== group.name) onAction('rename_group', { groupId: group.id, name });
    setEditing(false);
  };

  const handleStartFicha = async () => {
    setStartingFicha(true);
    try {
      const res = await fetch(`/api/aria/${tenant}/investigations/${investigationId}/ficha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIndex, questionId, groupId: group.id, groupName: group.name }),
      });
      const data = await res.json();
      if (res.ok) onCanvasUpdate?.(data.canvas);
    } catch { /* silencioso — se puede reintentar apretando el ícono de nuevo */ } finally {
      setStartingFicha(false);
    }
  };

  return (
    <div className="aria-canvas-col">
      <div className="aria-canvas-col-head">
        {orderEntry && (
          <span className="aria-order-badge-anchor">
            <button
              type="button"
              className={`aria-order-badge${orderEntry.hasSignal ? '' : ' aria-order-badge--tie'}`}
              onClick={() => setOrderTooltipOpen((v) => !v)}
              title="Orden sugerido para lanzar la ficha"
            >
              {orderEntry.order}
            </button>
            {orderTooltipOpen && (
              <>
                <div className="aria-canvas-col-menu-backdrop" onClick={() => setOrderTooltipOpen(false)} />
                <div className={`aria-order-tooltip${orderEntry.hasSignal ? '' : ' aria-order-tooltip--tie'}`}>
                  <span className="aria-order-tooltip-tag">{orderEntry.hasSignal ? 'Alineación estratégica' : 'Sin señal clara'}</span>
                  <p>{orderEntry.reason}</p>
                </div>
              </>
            )}
          </span>
        )}
        {editing ? (
          <input
            className="aria-canvas-group-name-input"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveName()}
            onBlur={saveName}
            autoFocus
          />
        ) : (
          <span className="aria-canvas-col-name" onClick={() => setEditing(true)} title="Click para renombrar">
            {group.name}
            <IconPencil className="aria-canvas-col-name-pencil" />
          </span>
        )}
        <div className="aria-canvas-col-icons">
          {!hasFicha && (
            <button type="button" className="aria-canvas-icon-btn" aria-label="Armar ficha" title="Armar ficha" disabled={startingFicha} onClick={handleStartFicha}>
              <IconClipboard />
            </button>
          )}
          {group.ficha && (
            <button type="button" className="aria-canvas-icon-btn" aria-label="Ver ficha" title="Ver ficha" onClick={() => setFichaModalOpen(true)}>
              <IconClipboard />
            </button>
          )}
          {otherGroups.length > 0 && (
            <button type="button" className="aria-canvas-icon-btn" aria-label="Fusionar grupo" title="Fusionar con otro grupo" onClick={() => setMergeOpen((v) => !v)}>
              <IconMerge />
            </button>
          )}
          <button
            type="button"
            className="aria-canvas-icon-btn aria-canvas-icon-btn--danger"
            aria-label="Eliminar grupo"
            title="Eliminar grupo"
            disabled={busy}
            onClick={() => onAction('delete_group', { groupId: group.id })}
          >
            <IconTrash />
          </button>
        </div>
      </div>

      {mergeOpen && (
        <select
          className="aria-canvas-move-select"
          autoFocus
          value=""
          disabled={busy}
          onChange={(e) => {
            if (e.target.value) { onAction('merge_groups', { sourceGroupId: group.id, targetGroupId: e.target.value }); setMergeOpen(false); }
          }}
        >
          <option value="">Fusionar con…</option>
          {otherGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      )}

      <FichaPanel
        group={group}
        tenant={tenant}
        investigationId={investigationId}
        messageIndex={messageIndex}
        questionId={questionId}
        workshopName={workshopName}
        onCanvasUpdate={onCanvasUpdate}
      />

      <GroupMetaRow group={group} busy={busy} workshopParticipants={workshopParticipants} onSave={(meta) => onAction('update_group_meta', { groupId: group.id, ...meta })} />

      <span className="aria-canvas-col-count">{resolvedItems.length} iniciativa{resolvedItems.length === 1 ? '' : 's'}</span>

      <div className="aria-canvas-cards">
        {shown.map((it) => (
          <InitiativeCard key={it.itemIndex} item={it} group={group} otherGroups={otherGroups} busy={busy} onAction={onAction} />
        ))}
      </div>

      {restCount > 0 && (
        <button type="button" className="aria-canvas-expand-btn" onClick={() => setExpanded(true)}>
          Ver {restCount} más <IconChevronDown />
        </button>
      )}

      <AddItemRow busy={busy} onSubmit={(text) => onAction('create_item', { groupId: group.id, text })} />

      {fichaModalOpen && group.ficha && (
        <FichaModal
          group={group}
          tenant={tenant}
          investigationId={investigationId}
          messageIndex={messageIndex}
          questionId={questionId}
          workshopName={workshopName}
          onClose={() => setFichaModalOpen(false)}
          onCanvasUpdate={onCanvasUpdate}
        />
      )}
    </div>
  );
}

function NewGroupColumn({ busy, onCreate }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  if (!open) {
    return (
      <button type="button" className="aria-canvas-newcol" onClick={() => setOpen(true)}>
        <IconPlus /> Nuevo grupo
      </button>
    );
  }

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setName('');
    setOpen(false);
  };

  return (
    <div className="aria-canvas-col aria-canvas-newcol-form">
      <input
        className="aria-canvas-group-name-input"
        placeholder="Nombre del grupo…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        autoFocus
      />
      <div className="aria-canvas-newcol-actions">
        <button type="button" className="aria-canvas-mini" onClick={submit} disabled={busy}>Crear</button>
        <button type="button" className="aria-canvas-mini" onClick={() => setOpen(false)}>Cancelar</button>
      </div>
    </div>
  );
}

export default function WorkshopCanvasPresentation({ canvas, tenant, investigationId, messageIndex, onCanvasUpdate, onSprintFlowStarted, onGroupFusionStarted }) {
  const [activeQ, setActiveQ] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [confirmingRevert, setConfirmingRevert] = useState(false);
  const [startingDraft, setStartingDraft] = useState(false);
  const [startingFusion, setStartingFusion] = useState(false);
  const [fichaOrderByQuestion, setFichaOrderByQuestion] = useState({});
  const [orderLoading, setOrderLoading] = useState(false);

  const activeQuestionId = canvas?.questions?.[activeQ]?.questionId;
  const activeGroupCount = canvas?.questions?.[activeQ]?.groups?.length ?? 0;

  const fetchFichaOrder = async (questionId) => {
    if (!tenant || !investigationId || !questionId) return;
    setOrderLoading(true);
    try {
      const res = await fetch(`/api/aria/${tenant}/investigations/${investigationId}/ficha-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId }),
      });
      const data = await res.json();
      if (res.ok) setFichaOrderByQuestion((prev) => ({ ...prev, [questionId]: data.groups }));
    } catch {
      // silencioso — es una sugerencia, no bloquea nada del workshop
    } finally {
      setOrderLoading(false);
    }
  };

  useEffect(() => {
    if (!activeQuestionId || activeGroupCount < 2 || fichaOrderByQuestion[activeQuestionId]) return;
    fetchFichaOrder(activeQuestionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQuestionId, activeGroupCount]);

  if (!canvas) return null;
  const { workshopName, summary, questions = [], itemsByQuestion = {} } = canvas;
  const question = questions[activeQ];
  // Gente que de verdad participó de este workshop puntual — se prioriza sobre la
  // lista global de known_participants al elegir responsable/involucrados de una épica.
  const workshopParticipants = [...new Set((itemsByQuestion[question?.questionId] ?? []).map((it) => it.participant).filter(Boolean))];
  const hasAnyFicha = questions.some((q) => (q.groups ?? []).some((g) => g.ficha));
  const canReviewFusions = !hasAnyFicha && questions.length > 1;
  const updatedLabel = canvas.updatedAt ? formatRelativeTime(canvas.updatedAt) : null;
  const hasOriginal = !!canvas.originalGroupsByQuestion?.[question?.questionId];
  const canUndo = (canvas.historyByQuestion?.[question?.questionId]?.length ?? 0) > 0;

  const handleAction = async (action, params) => {
    if (!tenant || !investigationId || typeof messageIndex !== 'number' || !question) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/aria/${tenant}/investigations/${investigationId}/canvas`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIndex, action, questionId: question.questionId, ...params }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'No se pudo actualizar.'); return; }
      onCanvasUpdate?.(data.canvas);
    } catch {
      setErr('Error de conexión.');
    } finally {
      setBusy(false);
    }
  };

  const handleStartSprintDraft = async () => {
    setStartingDraft(true);
    setErr(null);
    try {
      const res = await fetch(`/api/aria/${tenant}/investigations/${investigationId}/sprint-triage/start`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'No se pudo iniciar el triage.'); return; }
      onSprintFlowStarted?.(data.messages);
    } catch {
      setErr('Error de conexión.');
    } finally {
      setStartingDraft(false);
    }
  };

  const handleStartGroupFusion = async () => {
    setStartingFusion(true);
    setErr(null);
    try {
      const res = await fetch(`/api/aria/${tenant}/investigations/${investigationId}/group-fusion/start`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'No se pudo iniciar la revisión de fusiones.'); return; }
      onGroupFusionStarted?.(data.messages);
    } catch {
      setErr('Error de conexión.');
    } finally {
      setStartingFusion(false);
    }
  };

  const handleRevertClick = () => {
    if (confirmingRevert) {
      setConfirmingRevert(false);
      handleAction('revert_groups', {});
    } else {
      setConfirmingRevert(true);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setErr(null);
    try {
      const doc = {
        format: 'workshop_canvas_pdf',
        filename: `${(workshopName || 'workshop').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-consolidado.pdf`,
        title: workshopName,
        date: new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }),
        summary,
        questions: questions.map((q) => ({
          questionText: q.questionText,
          groups: (q.groups ?? []).map((g) => ({
            name: g.name,
            consolidatedText: g.consolidatedText,
            items: (g.itemIndexes ?? [])
              .map((idx) => itemsByQuestion[q.questionId]?.[idx])
              .filter((it) => it?.text),
          })),
        })),
      };
      const res = await fetch(`/api/aria/${tenant}/generate-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `Error ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setErr(error.message || 'No se pudo exportar el consolidado.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="aria-presentation">
      <div className="aria-card">
        <div className="aria-canvas-header-top">
          <div>
            <div className="aria-canvas-header-eyebrow-row">
              <span className="aria-canvas-header-eyebrow">Workshop</span>
              {updatedLabel && (
                <>
                  <span className="aria-canvas-status-dot" />
                  <span className="aria-canvas-status-text">{updatedLabel}</span>
                </>
              )}
            </div>
            <h3 className="aria-canvas-title">{workshopName}</h3>
          </div>
          <div className="aria-canvas-header-actions-group">
            {canReviewFusions && (
              <button type="button" className="aria-canvas-export-btn" disabled={startingFusion} onClick={handleStartGroupFusion}>
                {startingFusion ? 'Buscando…' : 'Revisar fusiones sugeridas'}
              </button>
            )}
            {hasAnyFicha && (
              <button type="button" className="aria-canvas-export-btn aria-ficha-primary-btn" disabled={startingDraft} onClick={handleStartSprintDraft}>
                {startingDraft ? 'Generando…' : 'Generar borrador de sprint'}
              </button>
            )}
            <button type="button" className="aria-canvas-export-btn" disabled={exporting} onClick={handleExport}>
              <IconDownload /> {exporting ? 'Generando…' : 'Exportar consolidado'}
            </button>
          </div>
        </div>
        <div className="aria-canvas-stats-row">
          <div className="aria-canvas-stat aria-canvas-stat--main">
            <IconBulb />
            <div>
              <p className="aria-canvas-stat-num">{summary?.totalItems ?? '—'}</p>
              <p className="aria-canvas-stat-label">Iniciativas</p>
            </div>
          </div>
          <div className="aria-canvas-stat aria-canvas-stat--main">
            <IconGrid />
            <div>
              <p className="aria-canvas-stat-num">{summary?.groupCount ?? '—'}</p>
              <p className="aria-canvas-stat-label">Grupos</p>
            </div>
          </div>
          <div className="aria-canvas-divider" />
          <div className="aria-canvas-stat">
            <IconUsers />
            <div>
              <p className="aria-canvas-stat-num aria-canvas-stat-num--sm">{summary?.participantCount ?? '—'}</p>
              <p className="aria-canvas-stat-label">Participantes</p>
            </div>
          </div>
          <div className="aria-canvas-stat">
            <IconHelp />
            <div>
              <p className="aria-canvas-stat-num aria-canvas-stat-num--sm">{summary?.questionCount ?? '—'}</p>
              <p className="aria-canvas-stat-label">Preguntas</p>
            </div>
          </div>
        </div>
      </div>

      {err && <p className="aria-canvas-error">{err}</p>}

      {questions.length > 1 && (
        <div className="aria-canvas-tabs">
          {questions.map((q, i) => (
            <button
              key={q.questionId}
              type="button"
              className={`aria-canvas-tab${i === activeQ ? ' aria-canvas-tab--active' : ''}`}
              onClick={() => { setActiveQ(i); setConfirmingRevert(false); }}
            >
              {i + 1}. {q.questionText} <span className="aria-canvas-tab-badge">{(itemsByQuestion[q.questionId] ?? []).length}</span>
            </button>
          ))}
        </div>
      )}

      {question && (
        <div className="aria-canvas-question">
          {(questions.length === 1 || hasOriginal || canUndo || activeGroupCount >= 2) && (
            <div className="aria-canvas-question-head">
              {questions.length === 1 && <p className="aria-canvas-question-title">{question.questionText}</p>}
              <div className="aria-board-header-actions">
                {activeGroupCount >= 2 && (
                  <button
                    type="button"
                    className="aria-canvas-icon-btn"
                    aria-label="Actualizar orden sugerido de fichas"
                    title="Actualizar orden sugerido de fichas"
                    disabled={orderLoading}
                    onClick={() => fetchFichaOrder(question.questionId)}
                  >
                    {orderLoading ? <Spinner /> : <IconRevert />}
                  </button>
                )}
                {canUndo && (
                  <button
                    type="button"
                    className="aria-canvas-mini"
                    disabled={busy}
                    onClick={() => handleAction('undo', {})}
                  >
                    <IconRevert /> Deshacer
                  </button>
                )}
                {hasOriginal && (
                  <button
                    type="button"
                    className={`aria-canvas-revert-btn${confirmingRevert ? ' aria-canvas-revert-btn--confirm' : ''}`}
                    disabled={busy}
                    onClick={handleRevertClick}
                    onBlur={() => setConfirmingRevert(false)}
                  >
                    <IconRevert /> {confirmingRevert ? '¿Perder cambios manuales?' : 'Volver a original'}
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="aria-canvas-board">
            {question.groups?.map((g) => (
              <GroupColumn
                key={g.id}
                group={g}
                items={itemsByQuestion[question.questionId] ?? []}
                otherGroups={question.groups.filter((og) => og.id !== g.id)}
                busy={busy}
                onAction={handleAction}
                tenant={tenant}
                investigationId={investigationId}
                messageIndex={messageIndex}
                questionId={question.questionId}
                workshopName={workshopName}
                workshopParticipants={workshopParticipants}
                onCanvasUpdate={onCanvasUpdate}
                orderEntry={fichaOrderByQuestion[question.questionId]?.find((o) => o.groupId === g.id)}
              />
            ))}
            <NewGroupColumn
              busy={busy}
              onCreate={(name) => handleAction('create_group', { id: `g${Date.now().toString(36)}`, name, consolidatedText: '' })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
