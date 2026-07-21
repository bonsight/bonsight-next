'use client';

import { useState } from 'react';

const IconChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const IconMerge = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" />
    <path d="M6 8.5v3a4 4 0 0 0 4 4h5.5" /><polyline points="12.5 12.5 15.5 15.5 12.5 18.5" />
  </svg>
);

const IconTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
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

function initials(name) {
  return String(name ?? '?').slice(0, 2).toUpperCase();
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
  return (
    <div className="aria-canvas-item">
      <div className="aria-canvas-item-who">
        <span className="aria-canvas-avatar">{initials(item.participant)}</span>
        <span className="aria-canvas-item-name">{item.participant}</span>
      </div>
      <p className="aria-canvas-item-text">{item.text}</p>
      {otherGroups.length > 0 && (
        <select
          className="aria-canvas-move-select"
          value=""
          disabled={busy}
          onChange={(e) => {
            if (e.target.value) onAction('move_item', { itemIndex: item.itemIndex, fromGroupId: group.id, toGroupId: e.target.value });
          }}
        >
          <option value="">Mover a…</option>
          {otherGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      )}
    </div>
  );
}

function GroupColumn({ group, items, otherGroups, busy, onAction }) {
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(group.name);
  const [expanded, setExpanded] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);

  const resolvedItems = (group.itemIndexes ?? []).map((idx) => ({ ...items[idx], itemIndex: idx })).filter((it) => it.text);
  const shown = expanded ? resolvedItems : resolvedItems.slice(0, 2);
  const restCount = resolvedItems.length - shown.length;

  const saveName = () => {
    const name = nameInput.trim();
    if (name && name !== group.name) onAction('rename_group', { groupId: group.id, name });
    setEditing(false);
  };

  return (
    <div className="aria-canvas-col">
      <div className="aria-canvas-col-head">
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
          </span>
        )}
        <div className="aria-canvas-col-icons">
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

export default function WorkshopCanvasPresentation({ canvas, tenant, investigationId, messageIndex, onCanvasUpdate }) {
  const [activeQ, setActiveQ] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [confirmingRevert, setConfirmingRevert] = useState(false);

  if (!canvas) return null;
  const { workshopName, summary, questions = [], itemsByQuestion = {} } = canvas;
  const question = questions[activeQ];
  const updatedLabel = canvas.updatedAt ? formatRelativeTime(canvas.updatedAt) : null;
  const hasOriginal = !!canvas.originalGroupsByQuestion?.[question?.questionId];

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
          <button type="button" className="aria-canvas-export-btn" disabled={exporting} onClick={handleExport}>
            <IconDownload /> {exporting ? 'Generando…' : 'Exportar consolidado'}
          </button>
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
          {(questions.length === 1 || hasOriginal) && (
            <div className="aria-canvas-question-head">
              {questions.length === 1 && <p className="aria-canvas-question-title">{question.questionText}</p>}
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
