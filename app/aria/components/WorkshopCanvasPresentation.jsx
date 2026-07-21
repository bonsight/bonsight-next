'use client';

import { useState } from 'react';

function GroupCard({ group, items, otherGroups, busy, onAction }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(group.name);
  const [mergeTarget, setMergeTarget] = useState('');

  const resolvedItems = (group.itemIndexes ?? []).map((idx) => ({ ...items[idx], itemIndex: idx })).filter((it) => it.text);

  const saveName = () => {
    const name = nameInput.trim();
    if (name && name !== group.name) onAction('rename_group', { groupId: group.id, name });
    setEditing(false);
  };

  const handleMerge = () => {
    if (!mergeTarget) return;
    onAction('merge_groups', { sourceGroupId: group.id, targetGroupId: mergeTarget });
  };

  return (
    <div className="aria-canvas-group">
      <div className="aria-canvas-group-header">
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
          <span className="aria-canvas-group-name" onClick={() => setEditing(true)} title="Click para renombrar">
            {group.name}
          </span>
        )}
        <span className="aria-canvas-group-count">{resolvedItems.length}</span>
      </div>

      <p className="aria-canvas-group-text">{group.consolidatedText}</p>

      <div className="aria-canvas-group-actions">
        <button type="button" className="aria-canvas-mini" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Ocultar respuestas' : `Ver ${resolvedItems.length} respuesta${resolvedItems.length === 1 ? '' : 's'}`}
        </button>
        {otherGroups.length > 0 && (
          <>
            <select
              className="aria-canvas-mini-select"
              value={mergeTarget}
              onChange={(e) => setMergeTarget(e.target.value)}
              disabled={busy}
            >
              <option value="">Fusionar con…</option>
              {otherGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            {mergeTarget && (
              <button type="button" className="aria-canvas-mini" onClick={handleMerge} disabled={busy}>Confirmar fusión</button>
            )}
          </>
        )}
        <button
          type="button"
          className="aria-canvas-mini aria-canvas-mini--danger"
          onClick={() => onAction('delete_group', { groupId: group.id })}
          disabled={busy}
        >
          Eliminar grupo
        </button>
      </div>

      {expanded && (
        <ul className="aria-canvas-group-items">
          {resolvedItems.map((it) => (
            <li key={it.itemIndex} className="aria-canvas-item-row">
              <span><strong>{it.participant}:</strong> {it.text}</span>
              {otherGroups.length > 0 && (
                <select
                  className="aria-canvas-mini-select"
                  value=""
                  disabled={busy}
                  onChange={(e) => {
                    if (e.target.value) onAction('move_item', { itemIndex: it.itemIndex, fromGroupId: group.id, toGroupId: e.target.value });
                  }}
                >
                  <option value="">Mover a…</option>
                  {otherGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NewGroupForm({ busy, onCreate }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  if (!open) {
    return (
      <button type="button" className="aria-canvas-newgroup-btn" onClick={() => setOpen(true)}>
        + Nuevo grupo
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
    <div className="aria-canvas-newgroup-form">
      <input
        className="aria-canvas-group-name-input"
        placeholder="Nombre del grupo…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        autoFocus
      />
      <button type="button" className="aria-canvas-mini" onClick={submit} disabled={busy}>Crear</button>
      <button type="button" className="aria-canvas-mini" onClick={() => setOpen(false)}>Cancelar</button>
    </div>
  );
}

function QuestionSection({ question, itemsByQuestion, busy, onAction }) {
  const items = itemsByQuestion[question.questionId] ?? [];
  const groups = question.groups ?? [];

  return (
    <div className="aria-canvas-question">
      <p className="aria-canvas-question-title">{question.questionText}</p>
      <div className="aria-canvas-groups">
        {groups.map((g) => (
          <GroupCard
            key={g.id}
            group={g}
            items={items}
            otherGroups={groups.filter((og) => og.id !== g.id)}
            busy={busy}
            onAction={(action, params) => onAction(action, { questionId: question.questionId, ...params })}
          />
        ))}
      </div>
      <NewGroupForm
        busy={busy}
        onCreate={(name) => onAction('create_group', {
          questionId: question.questionId,
          id: `g${Date.now().toString(36)}`,
          name,
          consolidatedText: '',
        })}
      />
    </div>
  );
}

export default function WorkshopCanvasPresentation({ canvas, tenant, investigationId, messageIndex, onCanvasUpdate }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  if (!canvas) return null;
  const { workshopName, summary, questions = [], itemsByQuestion = {} } = canvas;

  const handleAction = async (action, params) => {
    if (!tenant || !investigationId || typeof messageIndex !== 'number') return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/aria/${tenant}/investigations/${investigationId}/canvas`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIndex, action, ...params }),
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

  return (
    <div className="aria-presentation">
      <div className="aria-card">
        <p className="aria-card-title">Workshop</p>
        <h3 className="aria-canvas-title">{workshopName}</h3>
        <div className="aria-kpi-grid">
          <div className="aria-kpi">
            <p className="aria-kpi-label">Participantes</p>
            <p className="aria-kpi-value">{summary?.participantCount ?? '—'}</p>
          </div>
          <div className="aria-kpi">
            <p className="aria-kpi-label">Preguntas</p>
            <p className="aria-kpi-value">{summary?.questionCount ?? '—'}</p>
          </div>
          <div className="aria-kpi">
            <p className="aria-kpi-label">Iniciativas</p>
            <p className="aria-kpi-value">{summary?.totalItems ?? '—'}</p>
          </div>
          <div className="aria-kpi">
            <p className="aria-kpi-label">Grupos</p>
            <p className="aria-kpi-value">{summary?.groupCount ?? '—'}</p>
          </div>
        </div>
      </div>

      {err && <p className="aria-canvas-error">{err}</p>}

      {questions.map((q) => (
        <QuestionSection key={q.questionId} question={q} itemsByQuestion={itemsByQuestion} busy={busy} onAction={handleAction} />
      ))}
    </div>
  );
}
