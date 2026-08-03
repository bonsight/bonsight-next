'use client';

import { useEffect, useState } from 'react';

const IconChevronDown = ({ className }) => (
  <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const IconCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconX = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconPencil = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </svg>
);

const IconMeeting = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="16" y1="2" x2="16" y2="6" />
  </svg>
);

function slug(s) {
  return String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-');
}

const PRIORITIES = ['Alta', 'Media', 'Baja'];

function EntitySelect({ label, value, options, onSelect, onCreateNew }) {
  const [open, setOpen] = useState(false);
  const suggested = value?.reason ? value : null;

  return (
    <div className="aria-sd-subsection">
      <div className="aria-sd-subsection-label">{label}</div>
      <div className="aria-sd-entity-anchor">
        <div className="aria-sd-entity-trigger" onClick={() => setOpen((v) => !v)}>
          <span className="aria-sd-entity-icon"><IconCheck /></span>
          <span className="aria-sd-entity-text">
            {value?.name || 'Sin definir'}
            {value?.reason && <span className="aria-sd-entity-conf">{value.isNew ? 'Sugerido por Aria — nuevo · ' : 'Sugerido por Aria · '}{value.reason}</span>}
          </span>
          <IconChevronDown className={`aria-sd-entity-chev${open ? ' aria-sd-entity-chev--open' : ''}`} />
        </div>
        {open && (
          <>
            <div className="aria-canvas-col-menu-backdrop" onClick={() => setOpen(false)} />
            <div className="aria-sd-entity-dropdown">
              {suggested && (
                <div className="aria-sd-entity-opt aria-sd-entity-opt--suggested" onClick={() => { onSelect(value); setOpen(false); }}>
                  <span>{value.name}</span>
                  <span className="aria-sd-tag-suggested">Sugerido</span>
                </div>
              )}
              {options.filter((o) => o.id !== value?.id).map((o) => (
                <div key={o.id} className="aria-sd-entity-opt" onClick={() => { onSelect({ id: o.id, name: o.name, isNew: false, reason: '' }); setOpen(false); }}>
                  <span>{o.name}</span>
                </div>
              ))}
              <div className="aria-sd-entity-divider" />
              <div
                className="aria-sd-entity-opt aria-sd-entity-opt--new"
                onClick={() => {
                  const name = prompt(`Nombre para el/la nuevo/a ${label.toLowerCase()}:`, value?.isNew ? value.name : '');
                  if (name?.trim()) onCreateNew(name.trim());
                  setOpen(false);
                }}
              >
                + Crear {label.toLowerCase()} nuevo/a
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TaskRow({ task, talento, onToggle, onEdit, onPriority, onResponsable }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);

  const commit = () => {
    setEditing(false);
    if (draft.trim() && draft.trim() !== task.title) onEdit(draft.trim());
  };

  return (
    <div className="aria-sd-task-row">
      <input type="checkbox" className="aria-sd-task-check" checked={task.included} onChange={(e) => onToggle(e.target.checked)} />
      <div className="aria-sd-task-body">
        {editing ? (
          <input
            className="aria-board-input"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Enter' && commit()}
          />
        ) : (
          <div className="aria-sd-task-title">{task.title}</div>
        )}
        <div className="aria-sd-task-meta">
          <span className={`aria-board-priority-dot aria-board-priority-dot--${slug(task.priority)}`} />
          <select className="aria-sd-priority-select" value={task.priority} onChange={(e) => onPriority(e.target.value)}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select
            className={`aria-sd-priority-select${task.responsableId ? '' : ' aria-canvas-meta-select--empty'}`}
            value={task.responsableId ?? ''}
            onChange={(e) => {
              const t = talento.find((x) => x.id === e.target.value);
              onResponsable(t ? t.id : null, t ? t.name : null);
            }}
          >
            <option value="">Sin responsable</option>
            {talento.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>
      {!editing && (
        <span className="aria-sd-task-edit" onClick={() => setEditing(true)}><IconPencil /></span>
      )}
    </div>
  );
}

function GroupCard({ group, proyectos, iniciativas, talento, sprintLabel, onConfirm, onSkip, confirming }) {
  const [expanded, setExpanded] = useState(group.status === 'pending' ? false : false);
  const [proyecto, setProyecto] = useState(group.proyecto);
  const [iniciativa, setIniciativa] = useState(group.iniciativa);
  const [tasks, setTasks] = useState(group.tasks);
  const [meetingConfirmed, setMeetingConfirmed] = useState(group.meeting ? null : undefined);
  const [status, setStatus] = useState('pending');

  const iniciativaOptions = proyecto?.id ? iniciativas.filter((i) => i.proyectoId === proyecto.id) : [];
  const includedCount = tasks.filter((t) => t.included).length;

  const updateTask = (idx, patch) => setTasks((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)));

  const handleConfirm = async () => {
    const ok = await onConfirm({
      proyecto,
      iniciativa,
      tasks: tasks.filter((t) => t.included).map((t) => ({ title: t.title, priority: t.priority, responsableId: t.responsableId ?? null })),
    });
    if (ok) { setStatus('confirmed'); setExpanded(false); }
  };

  if (status === 'confirmed') {
    return (
      <div className="aria-sd-group-card">
        <div className="aria-sd-group-header">
          <span className="aria-sd-group-name">{group.groupName}</span>
          <span className="aria-sd-status-chip aria-sd-status-chip--confirmed">Confirmada</span>
          <span className="aria-sd-group-summary">{includedCount} tareas · {sprintLabel}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="aria-sd-group-card">
      <div className="aria-sd-group-header" onClick={() => setExpanded((v) => !v)}>
        <span className="aria-sd-group-name">{group.groupName}</span>
        <span className="aria-sd-status-chip aria-sd-status-chip--pending">Pendiente</span>
        <span className="aria-sd-group-summary">{includedCount} tareas · {proyecto?.isNew ? 'proyecto nuevo' : 'proyecto existente'}</span>
        <IconChevronDown className={`aria-sd-chev${expanded ? ' aria-sd-chev--open' : ''}`} />
      </div>

      {expanded && (
        <div className="aria-sd-group-body">
          <EntitySelect
            label="Proyecto"
            value={proyecto}
            options={proyectos}
            onSelect={(v) => { setProyecto(v); setIniciativa({ id: null, name: '', isNew: true, reason: '' }); }}
            onCreateNew={(name) => { setProyecto({ id: null, name, isNew: true, reason: '' }); setIniciativa({ id: null, name: '', isNew: true, reason: '' }); }}
          />

          <EntitySelect
            label="Iniciativa"
            value={iniciativa}
            options={iniciativaOptions}
            onSelect={setIniciativa}
            onCreateNew={(name) => setIniciativa({ id: null, name, isNew: true, reason: '' })}
          />

          <div className="aria-sd-subsection">
            <div className="aria-sd-subsection-label">Tareas generadas</div>
            {tasks.map((t, i) => (
              <TaskRow
                key={i}
                task={t}
                talento={talento}
                onToggle={(included) => updateTask(i, { included })}
                onEdit={(title) => updateTask(i, { title })}
                onPriority={(priority) => updateTask(i, { priority })}
                onResponsable={(responsableId, responsableName) => updateTask(i, { responsableId, responsableName })}
              />
            ))}
          </div>

          {group.meeting && (
            <div className="aria-sd-subsection">
              <div className="aria-sd-subsection-label">Vínculo con reunión</div>
              <div className="aria-sd-meeting-link">
                <span className="aria-sd-meeting-icon"><IconMeeting /></span>
                <span className="aria-sd-meeting-text"><b>{group.meeting.title}</b> — {group.meeting.reason || 'reunión relacionada, extraída por Kai'}</span>
                <div className="aria-sd-meeting-confirm">
                  <div className={`aria-sd-icon-btn-sm aria-sd-icon-btn-sm--yes${meetingConfirmed === true ? ' aria-sd-icon-btn-sm--active' : ''}`} onClick={() => setMeetingConfirmed(true)}><IconCheck /></div>
                  <div className={`aria-sd-icon-btn-sm aria-sd-icon-btn-sm--no${meetingConfirmed === false ? ' aria-sd-icon-btn-sm--active' : ''}`} onClick={() => setMeetingConfirmed(false)}><IconX /></div>
                </div>
              </div>
            </div>
          )}

          <div className="aria-sd-group-footer">
            <span className="aria-sd-sprint-target">Destino: <b>{sprintLabel}</b></span>
            <div className="aria-sd-spacer" />
            <button type="button" className="aria-canvas-mini" onClick={() => { onSkip(); setExpanded(false); }}>Dejar pendiente</button>
            <button type="button" className="aria-canvas-mini aria-canvas-mini--primary" disabled={confirming || includedCount === 0} onClick={handleConfirm}>
              {confirming ? 'Confirmando…' : 'Confirmar agrupación'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SprintDraftReviewPresentation({ tenant, investigationId, groupIds }) {
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [packagingMode, setPackagingMode] = useState('recommended');
  const [slots, setSlots] = useState([]);
  const [lockPackaging, setLockPackaging] = useState(false);
  const [confirmingGroupId, setConfirmingGroupId] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/aria/${tenant}/investigations/${investigationId}/sprint-draft`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ groupIds }),
        });
        const data = await res.json();
        if (!res.ok) { setErr(data.error || 'No se pudo generar el borrador.'); return; }
        setDraft(data);
        const count = data.recommendedSprintCount || 1;
        setSlots(
          Array.from({ length: count }, (_, i) =>
            i === 0 && data.currentSprint
              ? { sprintId: data.currentSprint.id, label: `${data.currentSprint.title} — ${data.currentSprint.status}` }
              : { sprintId: null, label: 'Sprint nuevo' }
          )
        );
      } catch {
        setErr('Error de conexión.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tenant, investigationId]);

  if (loading) return <div className="aria-presentation"><p className="aria-board-hint">Generando borrador de sprint…</p></div>;
  if (err) return <div className="aria-presentation"><p className="aria-canvas-error">{err}</p></div>;
  if (!draft) return null;

  const effectiveCount = packagingMode === 'single' ? 1 : (draft.recommendedSprintCount || 1);
  const slotForGroup = (idx) => idx % effectiveCount;

  const confirmGroup = async (group, groupIndex, payload) => {
    setConfirmingGroupId(group.groupId);
    try {
      const slotIndex = slotForGroup(groupIndex);
      const slot = slots[slotIndex];
      const body = {
        proyecto: payload.proyecto,
        iniciativa: payload.iniciativa,
        tasks: payload.tasks,
        sprintId: slot?.sprintId ?? null,
        createNewSprint: !slot?.sprintId,
      };
      const res = await fetch(`/api/aria/${tenant}/investigations/${investigationId}/sprint-draft/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'No se pudo confirmar la agrupación.'); return false; }
      if (!slot?.sprintId) {
        setSlots((prev) => prev.map((s, i) => (i === slotIndex ? { sprintId: data.sprintId, label: 'Sprint nuevo — creado' } : s)));
      }
      setLockPackaging(true);
      return true;
    } catch {
      setErr('Error de conexión al confirmar.');
      return false;
    } finally {
      setConfirmingGroupId(null);
    }
  };

  return (
    <div className="aria-presentation">
      <div className="aria-card">
        <div className="aria-canvas-header-eyebrow-row">
          <span className="aria-canvas-header-eyebrow">Workshop</span>
        </div>
        <h3 className="aria-canvas-title">Revisión de borrador de sprint</h3>
        <p className="aria-sd-page-sub">Aria generó este borrador a partir de las agrupaciones, fichas consolidadas y reuniones vinculadas.</p>

        <div className="aria-sd-summary-bar">
          <span className="aria-sd-summary-stat"><b>{draft.groupCount}</b> agrupaciones</span>
          <span className="aria-sd-summary-sep">·</span>
          <span className="aria-sd-summary-stat"><b>{draft.totalTasks}</b> tareas generadas</span>
          <span className="aria-sd-summary-sep">·</span>
          <span className="aria-sd-summary-stat">Aria recomienda <b>{draft.recommendedSprintCount} sprint{draft.recommendedSprintCount === 1 ? '' : 's'}</b></span>
          <div className="aria-sd-spacer" />
          <div className="aria-sd-packaging">
            <span
              className={`aria-sd-packaging-opt${packagingMode === 'recommended' ? ' aria-sd-packaging-opt--active' : ''}`}
              onClick={() => !lockPackaging && setPackagingMode('recommended')}
            >
              Seguir recomendación ({draft.recommendedSprintCount})
            </span>
            <span
              className={`aria-sd-packaging-opt${packagingMode === 'single' ? ' aria-sd-packaging-opt--active' : ''}`}
              onClick={() => !lockPackaging && setPackagingMode('single')}
            >
              Reagrupar en 1
            </span>
          </div>
        </div>
      </div>

      {err && <p className="aria-canvas-error">{err}</p>}

      {draft.groups.map((g, idx) => (
        <GroupCard
          key={g.groupId}
          group={g}
          proyectos={draft.proyectos}
          iniciativas={draft.iniciativas}
          talento={draft.talento}
          sprintLabel={slots[slotForGroup(idx)]?.label ?? 'Sprint nuevo'}
          confirming={confirmingGroupId === g.groupId}
          onConfirm={(payload) => confirmGroup(g, idx, payload)}
          onSkip={() => {}}
        />
      ))}
    </div>
  );
}
