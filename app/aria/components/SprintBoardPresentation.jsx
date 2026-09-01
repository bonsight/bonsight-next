'use client';

import { useEffect, useState } from 'react';

const IconPlus = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconSearch = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconX = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconExternal = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const IconMoreHorizontal = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
  </svg>
);

const IconChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const IconRefresh = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const IconPencil = ({ className }) => (
  <svg className={className} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
  </svg>
);

const IconCalendar = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const Spinner = () => <span className="aria-board-spinner" aria-hidden="true" />;

const PRIORITIES = ['Alta', 'Media', 'Baja'];
const SEVERITIES = ['Crítica', 'Alta', 'Media', 'Baja'];
const TASK_TYPES = ['Desarrollo', 'Soporte', 'Bug', 'Mejora', 'Reunión'];
// Severidad describe qué tan grave es el incidente en sí — solo tiene sentido
// en tareas de Soporte/Bug. Prioridad (el orden de trabajo) sigue aplicando siempre.
const SEVERITY_APPLIES_TO = new Set(['Soporte', 'Bug']);
const SIN_TIPO = '__sin_tipo__';
const SIN_RESPONSABLE = '__sin_responsable__';

function initials(name) {
  return String(name ?? '?').slice(0, 2).toUpperCase();
}

function slug(s) {
  return String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
}

// El valor real en Notion sigue siendo "Planificado" (as\u00ed lo espera todo el c\u00f3digo de
// negocio) \u2014 ac\u00e1 solo se relabelea para mostrar, porque "Planificado" suena a que la
// planificaci\u00f3n ya termin\u00f3 cuando en realidad todav\u00eda se est\u00e1 armando el sprint.
function statusLabel(status) {
  return status === 'Planificado' ? 'Planificando' : status;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isOverdue(dueDate, status) {
  if (!dueDate || status === 'Done') return false;
  return new Date(`${dueDate}T00:00:00`).getTime() < new Date().setHours(0, 0, 0, 0);
}

function TaskCard({ task, columns, viewMode, busy, pendingKey, onAction, sprints, currentSprintId, talento }) {
  const [moveOpen, setMoveOpen] = useState(false);
  const [responsableOpen, setResponsableOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDraft, setScheduleDraft] = useState(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(task.title);
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionInput, setDescriptionInput] = useState(task.description ?? '');
  const otherColumns = viewMode === 'estado' ? columns.filter((c) => c.id !== task.status) : [];
  const otherSprints = sprints.filter((s) => s.id !== currentSprintId && s.status !== 'Cerrado');
  const hasMoveOptions = otherColumns.length > 0 || otherSprints.length > 0;
  const removeKey = `remove:${task.id}`;
  const movePrefix = `move:${task.id}:`;
  const responsableKey = `responsable:${task.id}`;
  const scheduleKey = `schedule:${task.id}`;
  const isMoving = pendingKey?.startsWith(movePrefix);
  const isSavingSchedule = pendingKey === scheduleKey;
  const currentSprint = sprints.find((s) => s.id === currentSprintId);

  const saveTitle = () => {
    const trimmed = titleInput.trim();
    setEditingTitle(false);
    if (!trimmed || trimmed === task.title) { setTitleInput(task.title); return; }
    onAction('update_task_details', { pageId: task.id, title: trimmed }, `details-title:${task.id}`);
  };
  const saveDescription = () => {
    setEditingDescription(false);
    const next = descriptionInput.trim();
    if (next === (task.description ?? '')) return;
    onAction('update_task_details', { pageId: task.id, description: next }, `details-desc:${task.id}`);
  };

  const openSchedule = () => {
    setScheduleDraft({ startDate: task.startDate ?? '', endDate: task.dueDate ?? '', estimatedHours: task.estimatedHours ?? '' });
    setScheduleOpen(true);
  };
  const saveSchedule = () => {
    onAction('update_task_schedule', {
      pageId: task.id,
      startDate: scheduleDraft.startDate || null,
      endDate: scheduleDraft.endDate || null,
      estimatedHours: scheduleDraft.estimatedHours === '' ? null : scheduleDraft.estimatedHours,
    }, scheduleKey);
    setScheduleOpen(false);
  };

  // Prioridad, severidad, tipo y cliente son clasificación de rutina — van en una sola
  // línea de texto. Un solo acento de color (el punto de prioridad) para no diluir la
  // señal; severidad va como texto plano al lado, no con su propio punto.
  const metaParts = [task.severity ? `${task.severity} severidad` : null, task.taskType, task.clienteName].filter(Boolean);

  return (
    <div className={`aria-canvas-item${task.outOfPlan ? ' aria-board-item--outofplan' : ''}`}>
      <div className="aria-canvas-item-who">
        <div className="aria-board-responsable-anchor">
          <button type="button" className="aria-board-responsable-trigger" disabled={busy} onClick={() => setResponsableOpen((v) => !v)}>
            <span className="aria-canvas-avatar">{pendingKey === responsableKey ? <Spinner /> : initials(task.responsableName)}</span>
            <span className={`aria-canvas-item-name${task.responsableName ? '' : ' aria-canvas-meta-select--empty'}`}>{task.responsableName ?? 'Sin responsable'}</span>
          </button>
          {responsableOpen && (
            <>
              <div className="aria-canvas-col-menu-backdrop" onClick={() => setResponsableOpen(false)} />
              <div className="aria-canvas-col-menu aria-board-responsable-menu">
                <button type="button" disabled={busy} onClick={() => { onAction('update_task_responsable', { pageId: task.id, responsableId: null }, responsableKey); setResponsableOpen(false); }}>
                  Sin responsable
                </button>
                {talento.map((t) => (
                  <button key={t.id} type="button" disabled={busy} onClick={() => { onAction('update_task_responsable', { pageId: task.id, responsableId: t.id }, responsableKey); setResponsableOpen(false); }}>
                    {t.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="aria-board-card-icons">
          <a href={task.url} target="_blank" rel="noopener noreferrer" className="aria-board-card-link" title="Abrir en Notion">
            <IconExternal />
          </a>
          <div className="aria-board-responsable-anchor">
            <button type="button" className="aria-canvas-icon-btn" aria-label="Planificación" title="Inicio, fin y horas estimadas" disabled={busy} onClick={openSchedule}>
              {isSavingSchedule ? <Spinner /> : <IconCalendar />}
            </button>
            {scheduleOpen && (
              <>
                <div className="aria-canvas-col-menu-backdrop" onClick={() => setScheduleOpen(false)} />
                <div className="aria-canvas-col-menu aria-board-schedule-menu">
                  <label className="aria-board-schedule-label">
                    Inicio
                    <input
                      type="date" value={scheduleDraft.startDate}
                      min={currentSprint?.startDate || undefined} max={currentSprint?.endDate || undefined}
                      onChange={(e) => setScheduleDraft((d) => ({ ...d, startDate: e.target.value }))}
                    />
                  </label>
                  <label className="aria-board-schedule-label">
                    Fin
                    <input
                      type="date" value={scheduleDraft.endDate}
                      min={currentSprint?.startDate || undefined} max={currentSprint?.endDate || undefined}
                      onChange={(e) => setScheduleDraft((d) => ({ ...d, endDate: e.target.value }))}
                    />
                  </label>
                  <label className="aria-board-schedule-label">
                    Estimación (hs)
                    <input
                      type="number" min="0" step="0.5" value={scheduleDraft.estimatedHours}
                      onChange={(e) => setScheduleDraft((d) => ({ ...d, estimatedHours: e.target.value }))}
                    />
                  </label>
                  <button type="button" className="aria-board-schedule-save" disabled={busy} onClick={saveSchedule}>Guardar</button>
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            className="aria-board-card-remove"
            title="Quitar del tablero (no borra la tarea en Notion)"
            disabled={busy}
            onClick={() => onAction('remove_task', { pageId: task.id }, removeKey)}
          >
            {pendingKey === removeKey ? <Spinner /> : <IconX />}
          </button>
          {hasMoveOptions && (
            <button type="button" className="aria-canvas-icon-btn" aria-label="Mover" title="Mover a estado u otro sprint" disabled={busy} onClick={() => setMoveOpen((v) => !v)}>
              {isMoving ? <Spinner /> : <IconMoreHorizontal />}
            </button>
          )}
        </div>
      </div>
      {editingTitle ? (
        <input
          className="aria-canvas-item-text-input"
          value={titleInput}
          onChange={(e) => setTitleInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
          onBlur={saveTitle}
          autoFocus
        />
      ) : (
        <p className="aria-canvas-item-text aria-canvas-item-text--editable" onClick={() => { setTitleInput(task.title); setEditingTitle(true); }} title="Click para editar">
          {task.title}
          <IconPencil className="aria-canvas-col-name-pencil" />
        </p>
      )}

      {editingDescription ? (
        <textarea
          className="aria-board-description-input"
          rows={3}
          value={descriptionInput}
          onChange={(e) => setDescriptionInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveDescription(); } }}
          onBlur={saveDescription}
          placeholder="Descripción de la tarea…"
          autoFocus
        />
      ) : task.description ? (
        <p className="aria-board-description aria-board-description--editable" onClick={() => { setDescriptionInput(task.description ?? ''); setEditingDescription(true); }} title="Click para editar">
          {task.description}
          <IconPencil className="aria-canvas-col-name-pencil" />
        </p>
      ) : (
        <button type="button" className="aria-board-add-description" onClick={() => { setDescriptionInput(''); setEditingDescription(true); }}>
          + Agregar descripción
        </button>
      )}

      {task.parentName && <p className="aria-board-parent-tag">↳ {task.parentName}</p>}
      {task.previousSprintTitle && <p className="aria-board-parent-tag">↳ vino de {task.previousSprintTitle}</p>}

      {(task.priority || metaParts.length > 0) && (
        <p className="aria-board-meta-line">
          {task.priority && <span className={`aria-board-priority-dot aria-board-priority-dot--${slug(task.priority)}`} />}
          {task.priority && task.priority}
          {metaParts.map((part, i) => (
            <span key={i}>{(task.priority || i > 0) ? ' · ' : ''}{part}</span>
          ))}
        </p>
      )}

      <div className="aria-board-card-tags">
        {task.outOfPlan && <span className="aria-board-tag aria-board-tag--outofplan">Fuera de plan</span>}
        {task.startDate && task.dueDate && <span className="aria-board-tag">{formatDate(task.startDate)} → {formatDate(task.dueDate)}</span>}
        {task.startDate && !task.dueDate && <span className="aria-board-tag">Desde {formatDate(task.startDate)}</span>}
        {isOverdue(task.dueDate, task.status) && <span className="aria-board-tag aria-board-tag--overdue">Vencida {formatDate(task.dueDate)}</span>}
        {!isOverdue(task.dueDate, task.status) && task.dueDate && !task.startDate && <span className="aria-board-tag">Vence {formatDate(task.dueDate)}</span>}
        {task.estimatedHours != null && <span className="aria-board-tag">{task.estimatedHours}h est.</span>}
        {viewMode === 'tipo' && (
          <span className="aria-board-tag">{columns.find((c) => c.id === task.status)?.name ?? task.status}</span>
        )}
        {task.proyectoName && <span className="aria-board-tag">{task.proyectoName}</span>}
        {task.iniciativaName && <span className="aria-board-tag">🎯 {task.iniciativaName}</span>}
      </div>

      {moveOpen && (
        <>
          <div className="aria-canvas-col-menu-backdrop" onClick={() => setMoveOpen(false)} />
          <div className="aria-canvas-col-menu aria-board-card-menu">
            {otherColumns.length > 0 && (
              <>
                <p className="aria-board-card-menu-label">Mover a estado</p>
                {otherColumns.map((c) => (
                  <button key={c.id} type="button" disabled={busy} onClick={() => { onAction('move_task', { pageId: task.id, status: c.id }, `${movePrefix}status:${c.id}`); setMoveOpen(false); }}>
                    {c.name}
                  </button>
                ))}
              </>
            )}
            {otherSprints.length > 0 && (
              <>
                <p className="aria-board-card-menu-label">Mover a otro sprint</p>
                {otherSprints.map((s) => (
                  <button key={s.id} type="button" disabled={busy} onClick={() => { onAction('move_task_sprint', { pageId: task.id, targetSprintId: s.id }, `${movePrefix}sprint:${s.id}`); setMoveOpen(false); }}>
                    {s.title}
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function BoardColumn({ column, tasks, columns, viewMode, busy, pendingKey, onAction, sprints, currentSprintId, talento }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? tasks : tasks.slice(0, 6);
  const restCount = tasks.length - shown.length;

  return (
    <div className="aria-canvas-col">
      <div className="aria-canvas-col-head">
        <span className="aria-canvas-col-name">{column.name}</span>
      </div>
      <span className="aria-canvas-col-count">{tasks.length} tarea{tasks.length === 1 ? '' : 's'}</span>
      <div className="aria-canvas-cards">
        {shown.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            columns={columns}
            viewMode={viewMode}
            busy={busy}
            pendingKey={pendingKey}
            onAction={onAction}
            sprints={sprints}
            currentSprintId={currentSprintId}
            talento={talento}
          />
        ))}
      </div>
      {restCount > 0 && (
        <button type="button" className="aria-canvas-expand-btn" onClick={() => setExpanded(true)}>
          Ver {restCount} más
        </button>
      )}
    </div>
  );
}

function AddTaskForm({ proyectos, talento, iniciativas, columns, busy, pendingKey, initialTitle, sprint, onCreate, onClose }) {
  const [title, setTitle] = useState(initialTitle ?? '');
  const [status, setStatus] = useState(columns[0]?.id ?? '');
  const [proyectoId, setProyectoId] = useState('');
  const [responsableId, setResponsableId] = useState('');
  const [priority, setPriority] = useState('');
  const [taskType, setTaskType] = useState('');
  const [severity, setSeverity] = useState('');
  const [iniciativaId, setIniciativaId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [description, setDescription] = useState('');

  const iniciativasDelProyecto = proyectoId ? iniciativas.filter((i) => i.proyectoId === proyectoId) : [];

  const submit = () => {
    if (!title.trim()) return;
    onCreate({
      title,
      status,
      proyectoId: proyectoId || undefined,
      responsableId: responsableId || undefined,
      priority: priority || undefined,
      taskType: taskType || undefined,
      severity: severity || undefined,
      iniciativaId: iniciativaId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      estimatedHours: estimatedHours || undefined,
      description: description || undefined,
    });
    setTitle(''); setStartDate(''); setEndDate(''); setEstimatedHours(''); setDescription('');
  };

  return (
    <div className="aria-board-form aria-board-popover">
      <div className="aria-board-field">
        <label className="aria-board-field-label">Nombre de la tarea</label>
        <input
          className="aria-board-input"
          placeholder="¿Qué hay que hacer?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          autoFocus
        />
      </div>
      <div className="aria-board-form-row">
        <div className="aria-board-field">
          <label className="aria-board-field-label">Estado</label>
          <select className="aria-board-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            {columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="aria-board-field">
          <label className="aria-board-field-label">Tipo</label>
          <select
            className={`aria-board-select${taskType ? '' : ' aria-canvas-meta-select--empty'}`}
            value={taskType}
            onChange={(e) => {
              setTaskType(e.target.value);
              if (!SEVERITY_APPLIES_TO.has(e.target.value)) setSeverity('');
            }}
          >
            <option value="">Sin definir</option>
            {TASK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="aria-board-form-row">
        <div className="aria-board-field">
          <label className="aria-board-field-label">Prioridad</label>
          <select className={`aria-board-select${priority ? '' : ' aria-canvas-meta-select--empty'}`} value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="">Sin definir</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        {SEVERITY_APPLIES_TO.has(taskType) && (
          <div className="aria-board-field">
            <label className="aria-board-field-label">Severidad</label>
            <select className={`aria-board-select${severity ? '' : ' aria-canvas-meta-select--empty'}`} value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="">Sin definir</option>
              {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
      </div>
      <div className="aria-board-form-row">
        <div className="aria-board-field">
          <label className="aria-board-field-label">Proyecto</label>
          <select
            className={`aria-board-select${proyectoId ? '' : ' aria-canvas-meta-select--empty'}`}
            value={proyectoId}
            onChange={(e) => { setProyectoId(e.target.value); setIniciativaId(''); }}
          >
            <option value="">Sin definir</option>
            {proyectos.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="aria-board-field">
          <label className="aria-board-field-label">Iniciativa</label>
          <select
            className={`aria-board-select${iniciativaId ? '' : ' aria-canvas-meta-select--empty'}`}
            value={iniciativaId}
            onChange={(e) => setIniciativaId(e.target.value)}
            disabled={!proyectoId}
          >
            <option value="">{proyectoId ? 'Sin definir' : 'Elegí un proyecto primero'}</option>
            {iniciativasDelProyecto.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </div>
      </div>
      {proyectoId && iniciativasDelProyecto.length === 0 && (
        <p className="aria-board-hint">Sin iniciativas para este proyecto — créala en Notion.</p>
      )}
      <div className="aria-board-field">
        <label className="aria-board-field-label">Responsable</label>
        <select className={`aria-board-select${responsableId ? '' : ' aria-canvas-meta-select--empty'}`} value={responsableId} onChange={(e) => setResponsableId(e.target.value)}>
          <option value="">Sin definir</option>
          {talento.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div className="aria-board-form-row">
        <div className="aria-board-field">
          <label className="aria-board-field-label">Inicio</label>
          <input className="aria-board-input" type="date" value={startDate} min={sprint?.startDate || undefined} max={sprint?.endDate || undefined} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="aria-board-field">
          <label className="aria-board-field-label">Fin</label>
          <input className="aria-board-input" type="date" value={endDate} min={sprint?.startDate || undefined} max={sprint?.endDate || undefined} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>
      <div className="aria-board-field">
        <label className="aria-board-field-label">Estimación (hs)</label>
        <input className="aria-board-input" type="number" min="0" step="0.5" value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} />
      </div>
      <div className="aria-board-field">
        <label className="aria-board-field-label">Descripción</label>
        <textarea className="aria-board-input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
      </div>
      <div className="aria-canvas-newcol-actions">
        <button type="button" className="aria-canvas-mini aria-canvas-mini--primary" onClick={submit} disabled={busy || !title.trim()}>
          {pendingKey === 'create_task' ? <Spinner /> : 'Crear'}
        </button>
        <button type="button" className="aria-canvas-mini" onClick={onClose}>Cancelar</button>
      </div>
    </div>
  );
}

function ImportTaskSearch({ tenant, busy, pendingKey, excludeIds, onImport, onCreateNew }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/aria/${tenant}/board?search=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(res.ok ? data.results ?? [] : []);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query, tenant]);

  const q = query.trim();
  const excludeSet = new Set(excludeIds ?? []);
  const visibleResults = results.filter((r) => !excludeSet.has(r.id));

  return (
    <div className="aria-board-form aria-board-popover">
      <div className="aria-board-search-input-wrap">
        <span className="aria-board-search-icon"><IconSearch /></span>
        <input
          className="aria-board-input aria-board-search-input"
          placeholder="Buscar tarea existente en Notion…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>
      {searching && <p className="aria-board-hint">Buscando…</p>}
      {!searching && q.length >= 2 && visibleResults.length === 0 && (
        <div className="aria-board-search-empty">
          <p className="aria-board-hint">Sin resultados para “{q}”.</p>
          <button type="button" className="aria-canvas-mini aria-canvas-mini--primary" disabled={busy} onClick={() => onCreateNew(q)}>
            <IconPlus /> Crear “{q}” como tarea nueva
          </button>
        </div>
      )}
      <div className="aria-board-search-results">
        {visibleResults.map((r) => (
          <div key={r.id} className="aria-board-search-result">
            <div className="aria-board-search-result-info">
              <span className="aria-board-search-result-title">{r.title}</span>
              <span className="aria-board-search-result-ctx">
                {[r.clienteName, r.proyectoName, r.status].filter(Boolean).join(' · ')}
              </span>
            </div>
            <button type="button" className="aria-canvas-mini" disabled={busy} onClick={() => onImport(r.id)}>
              {pendingKey === `import:${r.id}` ? <Spinner /> : 'Agregar'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreateSprintForm({ nextLabel, busy, pendingKey, onCreate, onClose }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [objetivo, setObjetivo] = useState('');

  const submit = () => {
    if (!startDate || !endDate) return;
    onCreate({ startDate, endDate, objetivo: objetivo.trim() || undefined });
  };

  return (
    <div className="aria-board-form">
      <p className="aria-board-hint">{nextLabel}</p>
      <div className="aria-board-form-row">
        <label className="aria-board-date-label">
          Inicio
          <input type="date" className="aria-board-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label className="aria-board-date-label">
          Fin
          <input type="date" className="aria-board-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
      </div>
      <input
        className="aria-board-input"
        placeholder="Objetivo del sprint (opcional)…"
        value={objetivo}
        onChange={(e) => setObjetivo(e.target.value)}
      />
      <div className="aria-canvas-newcol-actions">
        <button type="button" className="aria-canvas-mini" onClick={submit} disabled={busy || !startDate || !endDate}>
          {pendingKey === 'create_sprint' ? <Spinner /> : 'Crear sprint'}
        </button>
        {onClose && <button type="button" className="aria-canvas-mini" onClick={onClose}>Cancelar</button>}
      </div>
    </div>
  );
}

function SprintSelector({ sprint, sprints, busy, onSelectSprint, onNewSprintClick }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="aria-board-sprint-selector">
      <button type="button" className="aria-board-sprint-select-btn" disabled={busy} onClick={() => setOpen((v) => !v)}>
        {sprint.title} — {statusLabel(sprint.status)} <IconChevronDown />
      </button>
      {open && (
        <>
          <div className="aria-canvas-col-menu-backdrop" onClick={() => setOpen(false)} />
          <div className="aria-board-sprint-dropdown">
            {sprints.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`aria-board-sprint-opt${s.id === sprint.id ? ' aria-board-sprint-opt--current' : ''}`}
                onClick={() => { onSelectSprint(s.id); setOpen(false); }}
              >
                {s.title} — {statusLabel(s.status)}
              </button>
            ))}
            <div className="aria-board-sprint-dropdown-divider" />
            <button type="button" className="aria-board-sprint-opt aria-board-sprint-opt--new" onClick={() => { onNewSprintClick(); setOpen(false); }}>
              + Nuevo sprint
            </button>
          </div>
        </>
      )}
    </span>
  );
}

function SprintHeader({ sprint, sprints, busy, pendingKey, refreshing, onRefresh, onClosePlanning, onCloseSprint, onNewSprintClick, onSelectSprint, onUpdateDates }) {
  const [confirming, setConfirming] = useState(false);
  const isPlanning = sprint.status === 'Planificado';

  const handleClose = () => {
    const action = isPlanning ? onClosePlanning : onCloseSprint;
    if (confirming) { setConfirming(false); action(); }
    else setConfirming(true);
  };

  return (
    <div className="aria-board-sprint-header">
      <div className="aria-board-sprint-header-row">
        <span className={`aria-board-sprint-badge aria-board-sprint-badge--${slug(sprint.status)}`}>
          {statusLabel(sprint.status)}
        </span>
        {sprints.length > 1 ? (
          <SprintSelector sprint={sprint} sprints={sprints} busy={busy} onSelectSprint={onSelectSprint} onNewSprintClick={onNewSprintClick} />
        ) : (
          <span className="aria-board-sprint-title">{sprint.title}</span>
        )}
        {isPlanning ? (
          <span className="aria-board-sprint-dates-edit">
            <input
              type="date"
              className="aria-board-date-input"
              value={sprint.startDate ?? ''}
              disabled={busy}
              onChange={(e) => onUpdateDates({ startDate: e.target.value, endDate: sprint.endDate })}
            />
            <span>→</span>
            <input
              type="date"
              className="aria-board-date-input"
              value={sprint.endDate ?? ''}
              disabled={busy}
              onChange={(e) => onUpdateDates({ startDate: sprint.startDate, endDate: e.target.value })}
            />
          </span>
        ) : (
          <span className="aria-board-sprint-dates">{formatDate(sprint.startDate)} → {formatDate(sprint.endDate)}</span>
        )}
        {(sprint.committedHours != null || sprint.loggedHours != null) && (
          <span className="aria-board-sprint-dates">
            {' · '}{sprint.loggedHours ?? 0}h / {sprint.committedHours ?? 0}h comprometidas
            {sprint.totalTasks != null && ` · ${sprint.totalTasks} tareas`}
          </span>
        )}
        <div className="aria-board-sprint-header-spacer" />
        <button
          type="button"
          className="aria-canvas-icon-btn"
          aria-label="Actualizar desde Notion"
          title="Actualizar desde Notion"
          disabled={busy || refreshing}
          onClick={onRefresh}
        >
          {refreshing ? <Spinner /> : <IconRefresh />}
        </button>
        {(sprint.status === 'Planificado' || sprint.status === 'En curso') && (
          <button
            type="button"
            className={`aria-canvas-revert-btn${confirming ? ' aria-canvas-revert-btn--confirm' : ''}`}
            disabled={busy}
            onClick={handleClose}
            onBlur={() => setConfirming(false)}
          >
            {pendingKey === 'close_sprint' ? <Spinner /> : <IconCheck />} {confirming
              ? (sprint.status === 'Planificado' ? '¿Terminar planificación?' : '¿Cerrar sprint?')
              : (sprint.status === 'Planificado' ? 'Terminar planificación' : 'Cerrar sprint')}
          </button>
        )}
      </div>
      {sprint.objetivo && <p className="aria-board-sprint-objetivo">{sprint.objetivo}</p>}
    </div>
  );
}

function MetricRow({ label, stat }) {
  const pct = stat.total ? Math.round((stat.completadas / stat.total) * 100) : 0;
  return (
    <div className="aria-review-row">
      <span className="aria-review-row-label">{label}</span>
      <div className="aria-confidence-bar">
        <div className="aria-confidence-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="aria-review-row-value">{stat.completadas}/{stat.total} · {pct}%</span>
    </div>
  );
}

function SprintReviewPanel({ metrics }) {
  if (!metrics) {
    return (
      <div className="aria-card aria-review-panel">
        <p className="aria-board-hint">Este sprint se cerró antes de que existiera el registro de métricas — no hay foto guardada.</p>
      </div>
    );
  }

  const { committed, scopeCreep, committedHours, loggedHours, byType, byResponsable, byCliente } = metrics;
  const committedPct = committed.total ? Math.round((committed.completadas / committed.total) * 100) : 0;

  return (
    <div className="aria-card aria-review-panel">
      <p className="aria-canvas-header-eyebrow">Review del sprint</p>
      <div className="aria-canvas-stats-row">
        <div className="aria-canvas-stat aria-canvas-stat--main">
          <div>
            <p className="aria-canvas-stat-num">{committedPct}%</p>
            <p className="aria-canvas-stat-label">Compromiso cumplido ({committed.completadas}/{committed.total})</p>
          </div>
        </div>
        <div className="aria-canvas-stat">
          <div>
            <p className="aria-canvas-stat-num">{scopeCreep.total}</p>
            <p className="aria-canvas-stat-label">Fuera de plan ({scopeCreep.completadas} completadas)</p>
          </div>
        </div>
        {(committedHours != null || loggedHours != null) && (
          <div className="aria-canvas-stat">
            <div>
              <p className="aria-canvas-stat-num">{loggedHours ?? 0}h</p>
              <p className="aria-canvas-stat-label">de {committedHours ?? 0}h comprometidas</p>
            </div>
          </div>
        )}
      </div>

      {Object.keys(byType).length > 0 && (
        <div className="aria-review-section">
          <p className="aria-review-section-label">Por tipo</p>
          {Object.entries(byType).map(([type, stat]) => <MetricRow key={type} label={type} stat={stat} />)}
        </div>
      )}

      {Object.keys(byResponsable).length > 0 && (
        <div className="aria-review-section">
          <p className="aria-review-section-label">Por responsable</p>
          {Object.entries(byResponsable).map(([name, stat]) => <MetricRow key={name} label={name} stat={stat} />)}
        </div>
      )}

      {Object.keys(byCliente).length > 1 && (
        <div className="aria-review-section">
          <p className="aria-review-section-label">Por cliente</p>
          {Object.entries(byCliente).map(([name, stat]) => <MetricRow key={name} label={name} stat={stat} />)}
        </div>
      )}
    </div>
  );
}

export default function SprintBoardPresentation({ tenant, initialSprintNumber }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingKey, setPendingKey] = useState(null);
  const [err, setErr] = useState(null);
  const [mode, setMode] = useState(null); // null | 'add' | 'import' | 'new_sprint'
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [viewMode, setViewMode] = useState('estado'); // 'estado' | 'tipo'
  const [responsableFilter, setResponsableFilter] = useState(''); // '' = todos

  // Cambiar de sprint invalida el filtro anterior — el responsable elegido puede no tener
  // ninguna tarea en el sprint nuevo (ver responsablesConTareas más abajo).
  useEffect(() => {
    setResponsableFilter('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.sprint?.id]);

  const load = async (opts = {}) => {
    const silent = opts.silent;
    silent ? setRefreshing(true) : setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams();
      if (opts.sprintId) params.set('sprintId', opts.sprintId);
      else if (opts.sprintNumber) params.set('sprintNumber', String(opts.sprintNumber));
      const qs = params.toString();
      const res = await fetch(`/api/aria/${tenant}/board${qs ? `?${qs}` : ''}`);
      const json = await res.json();
      if (!res.ok) { setErr(json.error || 'No se pudo cargar el tablero.'); return; }
      setData(json);
    } catch {
      setErr('Error de conexión.');
    } finally {
      silent ? setRefreshing(false) : setLoading(false);
    }
  };

  useEffect(() => {
    load(initialSprintNumber ? { sprintNumber: initialSprintNumber } : {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant]);

  const handleAction = async (action, params, key) => {
    setBusy(true);
    setPendingKey(key ?? action);
    setErr(null);
    try {
      const res = await fetch(`/api/aria/${tenant}/board`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, sprintId: data?.sprint?.id, ...params }),
      });
      const json = await res.json();
      if (!res.ok) { setErr(json.error || 'No se pudo actualizar.'); return; }
      setData(json);
      setMode(null);
    } catch {
      setErr('Error de conexión.');
    } finally {
      setBusy(false);
      setPendingKey(null);
    }
  };

  if (loading) return <div className="aria-presentation"><p className="aria-board-hint">Cargando tablero…</p></div>;
  if (err && !data) return <div className="aria-presentation"><p className="aria-canvas-error">{err}</p></div>;
  if (!data) return null;

  const { sprint, sprints, columns, typeColumns, tasks, proyectos, talento, iniciativas } = data;

  if (!sprint || mode === 'new_sprint') {
    return (
      <div className="aria-presentation">
        <div className="aria-card">
          <div className="aria-canvas-header-top">
            <div>
              <div className="aria-canvas-header-eyebrow-row">
                <span className="aria-canvas-header-eyebrow">Sprint</span>
              </div>
              <h3 className="aria-canvas-title">{sprint ? 'Nuevo sprint' : 'Crear el primer sprint'}</h3>
            </div>
          </div>
        </div>
        {err && <p className="aria-canvas-error">{err}</p>}
        <CreateSprintForm
          nextLabel={sprint ? `Se creará el Sprint #${sprint.number + 1}.` : 'Se creará el Sprint #1.'}
          busy={busy}
          pendingKey={pendingKey}
          onCreate={(p) => handleAction('create_sprint', p, 'create_sprint')}
          onClose={sprint ? () => setMode(null) : null}
        />
      </div>
    );
  }

  const displayColumns = viewMode === 'estado'
    ? columns
    : [...typeColumns.map((t) => ({ id: t, name: t })), { id: SIN_TIPO, name: 'Sin tipo' }];

  const responsablesConTareas = [...new Map(
    tasks.filter((t) => t.responsableId).map((t) => [t.responsableId, t.responsableName])
  ).entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const hayTareasSinResponsable = tasks.some((t) => !t.responsableId);

  const visibleTasks = responsableFilter
    ? tasks.filter((t) => (responsableFilter === SIN_RESPONSABLE ? !t.responsableId : t.responsableId === responsableFilter))
    : tasks;

  const tasksForColumn = (col) => (viewMode === 'estado'
    ? visibleTasks.filter((t) => t.status === col.id)
    : visibleTasks.filter((t) => (t.taskType ?? SIN_TIPO) === col.id));

  return (
    <div className="aria-presentation">
      <div className="aria-card">
        <div className="aria-canvas-header-top">
          <div>
            <div className="aria-canvas-header-eyebrow-row">
              <span className="aria-canvas-header-eyebrow">Sprint</span>
            </div>
            <h3 className="aria-canvas-title">Tablero de tareas</h3>
          </div>
          {sprint.status !== 'Cerrado' && (
            <div className="aria-board-header-actions">
              <span className="aria-board-popover-anchor">
                <button type="button" className="aria-canvas-mini" onClick={() => setMode(mode === 'import' ? null : 'import')}>
                  <IconSearch /> Traer tarea existente
                </button>
                {mode === 'import' && (
                  <>
                    <div className="aria-canvas-col-menu-backdrop" onClick={() => setMode(null)} />
                    <ImportTaskSearch
                      tenant={tenant}
                      busy={busy}
                      pendingKey={pendingKey}
                      excludeIds={tasks.map((t) => t.id)}
                      onImport={(pageId) => handleAction('add_existing_task', { pageId }, `import:${pageId}`)}
                      onCreateNew={(title) => { setNewTaskTitle(title); setMode('add'); }}
                    />
                  </>
                )}
              </span>
              <span className="aria-board-popover-anchor">
                <button type="button" className="aria-canvas-export-btn" onClick={() => { setNewTaskTitle(''); setMode(mode === 'add' ? null : 'add'); }}>
                  <IconPlus /> Nueva tarea
                </button>
                {mode === 'add' && (
                  <>
                    <div className="aria-canvas-col-menu-backdrop" onClick={() => setMode(null)} />
                    <AddTaskForm
                      proyectos={proyectos}
                      talento={talento}
                      iniciativas={iniciativas}
                      columns={columns}
                      busy={busy}
                      pendingKey={pendingKey}
                      initialTitle={newTaskTitle}
                      sprint={sprint}
                      onCreate={(p) => handleAction('create_task', p, 'create_task')}
                      onClose={() => setMode(null)}
                    />
                  </>
                )}
              </span>
            </div>
          )}
        </div>
        <SprintHeader
          sprint={sprint}
          sprints={sprints}
          busy={busy}
          pendingKey={pendingKey}
          refreshing={refreshing}
          onRefresh={() => load({ sprintId: sprint.id, silent: true })}
          onClosePlanning={() => handleAction('close_planning', { sprintId: sprint.id }, 'close_sprint')}
          onCloseSprint={() => handleAction('close_sprint', { sprintId: sprint.id }, 'close_sprint')}
          onNewSprintClick={() => setMode('new_sprint')}
          onSelectSprint={(sprintId) => load({ sprintId })}
          onUpdateDates={({ startDate, endDate }) => handleAction('update_sprint_dates', { sprintId: sprint.id, startDate, endDate }, 'update_sprint_dates')}
        />
        <div className="aria-canvas-stats-row">
          <div className="aria-canvas-stat aria-canvas-stat--main">
            <div>
              <p className="aria-canvas-stat-num">{visibleTasks.length}</p>
              <p className="aria-canvas-stat-label">Tareas en tablero{responsableFilter ? ` (de ${tasks.length})` : ''}</p>
            </div>
          </div>
          <select
            className={`aria-board-responsable-filter${responsableFilter ? ' aria-board-responsable-filter--active' : ''}`}
            value={responsableFilter}
            onChange={(e) => setResponsableFilter(e.target.value)}
          >
            <option value="">Todos los responsables</option>
            {responsablesConTareas.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            {hayTareasSinResponsable && <option value={SIN_RESPONSABLE}>Sin responsable</option>}
          </select>
          <div className="aria-board-view-toggle">
            <button type="button" className={`aria-board-view-btn${viewMode === 'estado' ? ' aria-board-view-btn--active' : ''}`} onClick={() => setViewMode('estado')}>
              Por estado
            </button>
            <button type="button" className={`aria-board-view-btn${viewMode === 'tipo' ? ' aria-board-view-btn--active' : ''}`} onClick={() => setViewMode('tipo')}>
              Por tipo
            </button>
          </div>
        </div>
      </div>

      {err && <p className="aria-canvas-error">{err}</p>}

      {sprint.status === 'Cerrado' && <SprintReviewPanel metrics={data.metrics} />}

      <div className="aria-canvas-board">
        {displayColumns.map((col) => (
          <BoardColumn
            key={col.id}
            column={col}
            tasks={tasksForColumn(col)}
            columns={columns}
            viewMode={viewMode}
            busy={busy}
            pendingKey={pendingKey}
            onAction={handleAction}
            sprints={sprints}
            talento={talento}
            currentSprintId={sprint.id}
          />
        ))}
      </div>
    </div>
  );
}
