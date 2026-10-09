'use client';

import { useState } from 'react';
import KaiNextGroupFicha from './KaiNextGroupFicha';

// Port directo de app/aria/components/WorkshopCanvasPresentation.jsx (GroupColumn/InitiativeCard/
// GroupMetaRow/AddItemRow) — mismos iconos, mismo AREA_OPTIONS, misma lógica de edición mecánica
// (fusionar/eliminar/comentar/mover/categoría/responsable/involucrados/agregar iniciativa),
// pero disparando onAction directo a /activities/[activityId]/canvas (ver KaiNextWorkshopCanvas.jsx)
// en vez de ir por Claude — son ediciones deterministas, no algo que haga falta "pedirle" al chat.
const AREA_OPTIONS = ['Ventas', 'Producto / UX', 'Tecnología cliente', 'Desarrollo', 'Datos (BI/Tagueo)', 'Transformación y Agilidad'];

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
    <div className="knx-canvas-item">
      <div className="knx-canvas-item-head">
        <div className="knx-canvas-item-who">
          <span className="knx-canvas-avatar">{initials(item.participant)}</span>
          <span className="knx-canvas-item-name">{item.participant}</span>
        </div>
        <div className="knx-canvas-item-icons">
          <button type="button" className="knx-canvas-icon-btn" aria-label="Comentar" title="Comentar" onClick={() => setCommenting((v) => !v)}>
            <IconComment />
          </button>
          {otherGroups.length > 0 && (
            <button type="button" className="knx-canvas-icon-btn" aria-label="Mover a otro grupo" title="Mover a otro grupo" onClick={() => setMoveOpen((v) => !v)}>
              <IconMove />
            </button>
          )}
        </div>
      </div>
      {moveOpen && (
        <select
          className="knx-canvas-move-select"
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
      <p className="knx-canvas-item-text">{item.text}</p>
      {commenting ? (
        <input
          className="knx-canvas-comment-input"
          value={comment}
          disabled={busy}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && saveComment()}
          onBlur={saveComment}
          placeholder="Agregar comentario…"
          autoFocus
        />
      ) : item.comment ? (
        <p className="knx-canvas-item-comment" onClick={() => setCommenting(true)} title="Click para editar">💬 {item.comment}</p>
      ) : null}
    </div>
  );
}

function GroupMetaRow({ group, busy, nameOptions, onSave }) {
  const [checklistOpen, setChecklistOpen] = useState(false);

  const toggleInvolucrado = (name) => {
    const current = group.involucrados ?? [];
    const next = current.includes(name) ? current.filter((n) => n !== name) : [...current, name];
    onSave({ involucrados: next });
  };

  return (
    <div className="knx-canvas-meta-form">
      <div className="knx-canvas-meta-form-row">
        <div className="knx-canvas-meta-field">
          <label className="knx-canvas-meta-field-label">Categoría</label>
          <select
            className={`knx-canvas-meta-select${group.area ? '' : ' knx-canvas-meta-select--empty'}`}
            value={group.area ?? ''}
            disabled={busy}
            onChange={(e) => onSave({ area: e.target.value })}
          >
            <option value="">Sin definir</option>
            {AREA_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="knx-canvas-meta-field">
          <label className="knx-canvas-meta-field-label">Responsable</label>
          <select
            className={`knx-canvas-meta-select${group.responsable ? '' : ' knx-canvas-meta-select--empty'}`}
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
          <p className="knx-canvas-meta-checklist-title">Involucrados <span>· agregar desde esta actividad</span></p>
          <div className="knx-canvas-meta-checklist">
            {nameOptions.length === 0 ? (
              <p className="knx-canvas-meta-empty">Nadie de esta actividad todavía.</p>
            ) : (
              nameOptions.map((n) => (
                <label key={n} className="knx-canvas-meta-checkbox">
                  <input type="checkbox" checked={(group.involucrados ?? []).includes(n)} disabled={busy} onChange={() => toggleInvolucrado(n)} />
                  <span className="knx-canvas-meta-checkbox-box" />
                  {n}
                </label>
              ))
            )}
          </div>
          <button type="button" className="knx-canvas-mini knx-canvas-mini--primary" onClick={() => setChecklistOpen(false)}>Guardar</button>
        </>
      ) : group.involucrados?.length > 0 ? (
        <div className="knx-canvas-meta-line knx-canvas-meta-line--column">
          <span className="knx-canvas-meta-field-label knx-canvas-involucrados-heading" onClick={() => setChecklistOpen(true)}>
            Involucrados <IconPencil className="knx-canvas-col-name-pencil" />
          </span>
          <div className="knx-canvas-involucrados-list">
            {group.involucrados.map((n) => (
              <span key={n} className="knx-canvas-item-who">
                <span className="knx-canvas-avatar knx-canvas-avatar--sm">{initials(n)}</span>
                <span className="knx-canvas-item-name">{n}</span>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="knx-canvas-meta-line knx-canvas-meta-line--column">
          <span className="knx-canvas-meta-field-label">Involucrados</span>
          <button type="button" className="knx-canvas-add-item-btn" onClick={() => setChecklistOpen(true)}>
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
      <button type="button" className="knx-canvas-add-item-btn" onClick={() => setOpen(true)}>
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
    <div className="knx-canvas-newcol-form">
      <input
        className="knx-canvas-group-name-input"
        placeholder="Nueva iniciativa…"
        value={text}
        disabled={busy}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        autoFocus
      />
      <div className="knx-canvas-newcol-actions">
        <button type="button" className="knx-canvas-mini" disabled={busy} onClick={submit}>Agregar</button>
        <button type="button" className="knx-canvas-mini" onClick={() => setOpen(false)}>Cancelar</button>
      </div>
    </div>
  );
}

export function NewGroupCard({ busy, onCreate }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  if (!open) {
    return (
      <button type="button" className="knx-canvas-newgroup" onClick={() => setOpen(true)}>
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
    <div className="knx-canvas-group knx-canvas-newcol-form">
      <input
        className="knx-canvas-group-name-input"
        placeholder="Nombre del grupo…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        autoFocus
      />
      <div className="knx-canvas-newcol-actions">
        <button type="button" className="knx-canvas-mini" onClick={submit} disabled={busy}>Crear</button>
        <button type="button" className="knx-canvas-mini" onClick={() => setOpen(false)}>Cancelar</button>
      </div>
    </div>
  );
}

export default function KaiNextCanvasGroup({
  tenant, activityId, question, group, items, otherGroups, nameOptions, busy, onAction, onSaved,
}) {
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(group.name);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [startingFicha, setStartingFicha] = useState(false);

  const resolvedItems = (group.itemIndexes ?? []).map((idx) => ({ ...items[idx], itemIndex: idx })).filter((it) => it.text);
  const hasFicha = !!(group.fichaActivityId || group.ficha);

  const saveName = () => {
    const name = nameInput.trim();
    if (name && name !== group.name) onAction('rename_group', { groupId: group.id, name });
    setEditing(false);
  };

  // Acción mecánica igual que las demás (no hace falta pedírselo a Claude), pero necesita su
  // propia llamada porque crea una Activity nueva (la ficha) — no encaja en el dispatch genérico
  // de update_workshop_canvas. Misma lógica que la tool start_ficha_for_group del chat, compartida
  // vía startFichaForCanvasGroup (lib/kai/ficha.js).
  const handleStartFicha = async () => {
    setStartingFicha(true);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/activities/${activityId}/canvas-ficha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: question.questionId, groupId: group.id }),
      });
      if (res.ok) onSaved?.();
    } finally {
      setStartingFicha(false);
    }
  };

  return (
    <div className="knx-canvas-group">
      <div className="knx-canvas-group-head">
        {editing ? (
          <input
            className="knx-canvas-group-name-input"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveName()}
            onBlur={saveName}
            autoFocus
          />
        ) : (
          <span className="knx-canvas-group-name" onClick={() => setEditing(true)} title="Click para renombrar">
            {group.name}
            <IconPencil className="knx-canvas-col-name-pencil" />
          </span>
        )}
        <div className="knx-canvas-col-icons">
          {!hasFicha && (
            <button type="button" className="knx-canvas-icon-btn" aria-label="Armar ficha" title="Armar ficha" disabled={startingFicha} onClick={handleStartFicha}>
              <IconClipboard />
            </button>
          )}
          {otherGroups.length > 0 && (
            <button type="button" className="knx-canvas-icon-btn" aria-label="Fusionar grupo" title="Fusionar con otro grupo" onClick={() => setMergeOpen((v) => !v)}>
              <IconMerge />
            </button>
          )}
          <button
            type="button"
            className="knx-canvas-icon-btn knx-canvas-icon-btn--danger"
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
          className="knx-canvas-move-select"
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

      <KaiNextGroupFicha tenant={tenant} activityId={activityId} questionId={question.questionId} group={group} onSaved={onSaved} />

      <GroupMetaRow group={group} busy={busy} nameOptions={nameOptions} onSave={(meta) => onAction('update_group_meta', { groupId: group.id, ...meta })} />

      <span className="knx-canvas-group-count">{resolvedItems.length} iniciativa{resolvedItems.length === 1 ? '' : 's'}</span>

      {group.consolidatedText && <p className="knx-canvas-group-text">{group.consolidatedText}</p>}

      <div className="knx-canvas-cards">
        {resolvedItems.map((it) => (
          <InitiativeCard key={it.itemIndex} item={it} group={group} otherGroups={otherGroups} busy={busy} onAction={onAction} />
        ))}
      </div>

      <AddItemRow busy={busy} onSubmit={(text) => onAction('create_item', { groupId: group.id, text })} />
    </div>
  );
}
