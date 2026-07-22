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

const PRIORITIES = ['Alta', 'Media', 'Baja'];
const SEVERITIES = ['Crítica', 'Alta', 'Media', 'Baja'];
const TASK_TYPES = ['Desarrollo', 'Soporte', 'Bug', 'Mejora', 'Reunión'];
// Severidad describe qué tan grave es el incidente en sí — solo tiene sentido
// en tareas de Soporte/Bug. Prioridad (el orden de trabajo) sigue aplicando siempre.
const SEVERITY_APPLIES_TO = new Set(['Soporte', 'Bug']);
const SIN_TIPO = '__sin_tipo__';

function initials(name) {
  return String(name ?? '?').slice(0, 2).toUpperCase();
}

function slug(s) {
  return String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isOverdue(dueDate, status) {
  if (!dueDate || status === 'Done') return false;
  return new Date(`${dueDate}T00:00:00`).getTime() < new Date().setHours(0, 0, 0, 0);
}

function TaskCard({ task, columns, viewMode, busy, onAction, sprints, currentSprintId }) {
  const otherColumns = viewMode === 'estado' ? columns.filter((c) => c.id !== task.status) : [];
  const otherSprints = sprints.filter((s) => s.id !== currentSprintId);

  return (
    <div className={`aria-canvas-item${task.outOfPlan ? ' aria-board-item--outofplan' : ''}`}>
      <div className="aria-canvas-item-who">
        <span className="aria-canvas-avatar">{initials(task.responsableName)}</span>
        <span className="aria-canvas-item-name">{task.responsableName ?? 'Sin responsable'}</span>
        <a
          href={task.url}
          target="_blank"
          rel="noopener noreferrer"
          className="aria-board-card-link"
          title="Abrir en Notion"
        >
          <IconExternal />
        </a>
        <button
          type="button"
          className="aria-board-card-remove"
          title="Quitar del tablero (no borra la tarea en Notion)"
          disabled={busy}
          onClick={() => onAction('remove_task', { pageId: task.id })}
        >
          <IconX />
        </button>
      </div>
      <p className="aria-canvas-item-text">{task.title}</p>
      {task.parentName && <p className="aria-board-parent-tag">↳ {task.parentName}</p>}
      <div className="aria-board-card-tags">
        {task.outOfPlan && <span className="aria-board-tag aria-board-tag--outofplan">Fuera de plan</span>}
        {isOverdue(task.dueDate, task.status) && <span className="aria-board-tag aria-board-tag--overdue">Vencida {formatDate(task.dueDate)}</span>}
        {!isOverdue(task.dueDate, task.status) && task.dueDate && <span className="aria-board-tag">Vence {formatDate(task.dueDate)}</span>}
        {viewMode === 'tipo' && (
          <span className="aria-board-tag">{columns.find((c) => c.id === task.status)?.name ?? task.status}</span>
        )}
        {task.taskType && <span className={`aria-board-tag aria-board-tag--type-${slug(task.taskType)}`}>{task.taskType}</span>}
        {task.severity && <span className={`aria-board-tag aria-board-tag--priority-${slug(task.severity)}`}>Sev. {task.severity}</span>}
        {task.priority && <span className={`aria-board-tag aria-board-tag--priority-${slug(task.priority)}`}>{task.priority}</span>}
        {task.clienteName && <span className="aria-board-tag">{task.clienteName}</span>}
        {task.proyectoName && <span className="aria-board-tag">{task.proyectoName}</span>}
        {task.iniciativaName && <span className="aria-board-tag">🎯 {task.iniciativaName}</span>}
      </div>
      {otherColumns.length > 0 && (
        <select
          className="aria-canvas-move-select"
          value=""
          disabled={busy}
          onChange={(e) => {
            if (e.target.value) onAction('move_task', { pageId: task.id, status: e.target.value });
          }}
        >
          <option value="">Mover a…</option>
          {otherColumns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}
      {otherSprints.length > 0 && (
        <select
          className="aria-canvas-move-select"
          value=""
          disabled={busy}
          onChange={(e) => {
            if (e.target.value) onAction('move_task_sprint', { pageId: task.id, targetSprintId: e.target.value });
          }}
        >
          <option value="">Mover a otro sprint…</option>
          {otherSprints.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
      )}
    </div>
  );
}

function BoardColumn({ column, tasks, columns, viewMode, busy, onAction, sprints, currentSprintId }) {
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
            onAction={onAction}
            sprints={sprints}
            currentSprintId={currentSprintId}
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

function AddTaskForm({ proyectos, talento, iniciativas, columns, busy, onCreate, onClose }) {
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState(columns[0]?.id ?? '');
  const [proyectoId, setProyectoId] = useState('');
  const [responsableId, setResponsableId] = useState('');
  const [priority, setPriority] = useState('');
  const [taskType, setTaskType] = useState('');
  const [severity, setSeverity] = useState('');
  const [iniciativaId, setIniciativaId] = useState('');

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
    });
    setTitle('');
  };

  return (
    <div className="aria-board-form">
      <input
        className="aria-board-input"
        placeholder="Nombre de la tarea…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        autoFocus
      />
      <div className="aria-board-form-row">
        <select className="aria-canvas-move-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          {columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          className="aria-canvas-move-select"
          value={taskType}
          onChange={(e) => {
            setTaskType(e.target.value);
            if (!SEVERITY_APPLIES_TO.has(e.target.value)) setSeverity('');
          }}
        >
          <option value="">Tipo de tarea…</option>
          {TASK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="aria-board-form-row">
        <select className="aria-canvas-move-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">Prioridad…</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        {SEVERITY_APPLIES_TO.has(taskType) && (
          <select className="aria-canvas-move-select" value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="">Severidad…</option>
            {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>
      <div className="aria-board-form-row">
        <select
          className="aria-canvas-move-select"
          value={proyectoId}
          onChange={(e) => { setProyectoId(e.target.value); setIniciativaId(''); }}
        >
          <option value="">Proyecto…</option>
          {proyectos.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select
          className="aria-canvas-move-select"
          value={iniciativaId}
          onChange={(e) => setIniciativaId(e.target.value)}
          disabled={!proyectoId}
        >
          <option value="">{proyectoId ? 'Iniciativa…' : 'Elegí un proyecto primero'}</option>
          {iniciativasDelProyecto.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </div>
      {proyectoId && iniciativasDelProyecto.length === 0 && (
        <p className="aria-board-hint">Sin iniciativas para este proyecto — créala en Notion.</p>
      )}
      <div className="aria-board-form-row">
        <select className="aria-canvas-move-select" value={responsableId} onChange={(e) => setResponsableId(e.target.value)}>
          <option value="">Responsable…</option>
          {talento.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div className="aria-canvas-newcol-actions">
        <button type="button" className="aria-canvas-mini" onClick={submit} disabled={busy || !title.trim()}>Crear</button>
        <button type="button" className="aria-canvas-mini" onClick={onClose}>Cancelar</button>
      </div>
    </div>
  );
}

function ImportTaskSearch({ tenant, busy, onImport, onClose }) {
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

  return (
    <div className="aria-board-form">
      <input
        className="aria-board-input"
        placeholder="Buscar tarea existente en Notion…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />
      {searching && <p className="aria-board-hint">Buscando…</p>}
      {!searching && query.trim().length >= 2 && results.length === 0 && (
        <p className="aria-board-hint">Sin resultados.</p>
      )}
      <div className="aria-board-search-results">
        {results.map((r) => (
          <div key={r.id} className="aria-board-search-result">
            <span className="aria-board-search-result-title">{r.title}</span>
            <button type="button" className="aria-canvas-mini" disabled={busy} onClick={() => onImport(r.id)}>
              Agregar
            </button>
          </div>
        ))}
      </div>
      <div className="aria-canvas-newcol-actions">
        <button type="button" className="aria-canvas-mini" onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}

function CreateSprintForm({ nextLabel, busy, onCreate, onClose }) {
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
        <button type="button" className="aria-canvas-mini" onClick={submit} disabled={busy || !startDate || !endDate}>Crear sprint</button>
        {onClose && <button type="button" className="aria-canvas-mini" onClick={onClose}>Cancelar</button>}
      </div>
    </div>
  );
}

function SprintHeader({ sprint, sprints, busy, onClosePlanning, onNewSprintClick, onSelectSprint }) {
  const [confirming, setConfirming] = useState(false);

  const handleClose = () => {
    if (confirming) { setConfirming(false); onClosePlanning(); }
    else setConfirming(true);
  };

  return (
    <div className="aria-board-sprint-header">
      <div>
        <span className={`aria-board-sprint-badge aria-board-sprint-badge--${slug(sprint.status)}`}>
          {sprint.status}
        </span>
        {sprints.length > 1 ? (
          <select
            className="aria-board-sprint-select"
            value={sprint.id}
            disabled={busy}
            onChange={(e) => onSelectSprint(e.target.value)}
          >
            {sprints.map((s) => <option key={s.id} value={s.id}>{s.title} — {s.status}</option>)}
          </select>
        ) : (
          <span className="aria-board-sprint-title">{sprint.title}</span>
        )}
        <span className="aria-board-sprint-dates">{formatDate(sprint.startDate)} → {formatDate(sprint.endDate)}</span>
        {(sprint.committedHours != null || sprint.loggedHours != null) && (
          <span className="aria-board-sprint-dates">
            {' · '}{sprint.loggedHours ?? 0}h / {sprint.committedHours ?? 0}h comprometidas
            {sprint.totalTasks != null && ` · ${sprint.totalTasks} tareas`}
          </span>
        )}
        {sprint.objetivo && <p className="aria-board-sprint-objetivo">{sprint.objetivo}</p>}
      </div>
      <div className="aria-board-header-actions">
        {sprint.status === 'Planificado' ? (
          <button
            type="button"
            className={`aria-canvas-revert-btn${confirming ? ' aria-canvas-revert-btn--confirm' : ''}`}
            disabled={busy}
            onClick={handleClose}
            onBlur={() => setConfirming(false)}
          >
            <IconCheck /> {confirming ? '¿Terminar planificación?' : 'Terminar planificación'}
          </button>
        ) : (
          <button type="button" className="aria-header-link" onClick={onNewSprintClick}>
            + Nuevo sprint
          </button>
        )}
      </div>
    </div>
  );
}

export default function SprintBoardPresentation({ tenant, initialSprintNumber }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [mode, setMode] = useState(null); // null | 'add' | 'import' | 'new_sprint'
  const [viewMode, setViewMode] = useState('estado'); // 'estado' | 'tipo'

  const load = async (opts = {}) => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    load(initialSprintNumber ? { sprintNumber: initialSprintNumber } : {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant]);

  const handleAction = async (action, params) => {
    setBusy(true);
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
          onCreate={(p) => handleAction('create_sprint', p)}
          onClose={sprint ? () => setMode(null) : null}
        />
      </div>
    );
  }

  const displayColumns = viewMode === 'estado'
    ? columns
    : [...typeColumns.map((t) => ({ id: t, name: t })), { id: SIN_TIPO, name: 'Sin tipo' }];

  const tasksForColumn = (col) => (viewMode === 'estado'
    ? tasks.filter((t) => t.status === col.id)
    : tasks.filter((t) => (t.taskType ?? SIN_TIPO) === col.id));

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
          <div className="aria-board-header-actions">
            <button type="button" className="aria-canvas-mini" onClick={() => setMode(mode === 'import' ? null : 'import')}>
              <IconSearch /> Traer tarea existente
            </button>
            <button type="button" className="aria-canvas-export-btn" onClick={() => setMode(mode === 'add' ? null : 'add')}>
              <IconPlus /> Nueva tarea
            </button>
          </div>
        </div>
        <SprintHeader
          sprint={sprint}
          sprints={sprints}
          busy={busy}
          onClosePlanning={() => handleAction('close_planning', { sprintId: sprint.id })}
          onNewSprintClick={() => setMode('new_sprint')}
          onSelectSprint={(sprintId) => load({ sprintId })}
        />
        <div className="aria-canvas-stats-row">
          <div className="aria-canvas-stat aria-canvas-stat--main">
            <div>
              <p className="aria-canvas-stat-num">{tasks.length}</p>
              <p className="aria-canvas-stat-label">Tareas en tablero</p>
            </div>
          </div>
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

      {mode === 'add' && (
        <AddTaskForm
          proyectos={proyectos}
          talento={talento}
          iniciativas={iniciativas}
          columns={columns}
          busy={busy}
          onCreate={(p) => handleAction('create_task', p)}
          onClose={() => setMode(null)}
        />
      )}

      {mode === 'import' && (
        <ImportTaskSearch
          tenant={tenant}
          busy={busy}
          onImport={(pageId) => handleAction('add_existing_task', { pageId })}
          onClose={() => setMode(null)}
        />
      )}

      <div className="aria-canvas-board">
        {displayColumns.map((col) => (
          <BoardColumn
            key={col.id}
            column={col}
            tasks={tasksForColumn(col)}
            columns={columns}
            viewMode={viewMode}
            busy={busy}
            onAction={handleAction}
            sprints={sprints}
            currentSprintId={sprint.id}
          />
        ))}
      </div>
    </div>
  );
}
