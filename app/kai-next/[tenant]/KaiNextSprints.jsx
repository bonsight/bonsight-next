'use client';

import { useEffect, useState } from 'react';
import KaiNextSidebar from './KaiNextSidebar';
import KaiNextConfirmDialog from './KaiNextConfirmDialog';
import { useSidePanelClose } from '@/lib/kaiNext/useSidePanelClose';
import { sortByOrder, dropsBefore, computeDropOrder } from '@/lib/kaiNext/dragOrder';

const PRIORITIES = ['Alta', 'Media', 'Baja'];
const TASK_TYPES = ['Desarrollo', 'Soporte', 'Bug', 'Mejora', 'Reunión'];
const SEVERITIES = ['Crítica', 'Alta', 'Media', 'Baja'];
const SEVERITY_APPLIES_TO = new Set(['Bug']);

// Mismo fix que KaiNextProjectDesarrollo.jsx: una fecha "YYYY-MM-DD" sin forzar UTC se corre un
// día para atrás en cualquier timezone detrás de UTC (toda Latinoamérica).
function fmtDate(iso) {
  if (!iso) return null;
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('es', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '·';
}

function truncate(text, max) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

function NotionLinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><path d="M15 3h6v6M10 14 21 3" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" />
    </svg>
  );
}

// ── Tarjeta de tarea ─────────────────────────────────────────────────────────
function TaskCard({ task, columns, busy, onOpen, onStatusChange, onRemove, onDragStart, onDragEnd, dragging, entering, dropIndicator, onDragOverCard, onDropCard }) {
  const start = task.committedStartDate ?? task.startDate;
  const hasDates = start || task.dueDate;
  return (
    <div
      className={`knx-board-card${dragging ? ' knx-board-card--dragging' : ''}${entering ? ' knx-board-card--entering' : ''}${dropIndicator ? ` knx-board-card--over-${dropIndicator}` : ''}`}
      onClick={() => onOpen(task.id)}
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', task.id); onDragStart(task.id); }}
      onDragEnd={onDragEnd}
      onDragOver={onDragOverCard}
      onDrop={onDropCard}
    >
      <div className="knx-board-card-top">
        {task.outOfPlan ? <span className="knx-board-card-flag">Fuera de plan</span> : <span />}
        <div className="knx-board-card-top-actions">
          {task.url && (
            <a
              className="knx-board-card-icon-btn"
              href={task.url} target="_blank" rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Abrir en Notion"
            >
              <NotionLinkIcon />
            </a>
          )}
          <button
            type="button"
            className="knx-board-card-icon-btn"
            onClick={(e) => { e.stopPropagation(); onRemove(task.id); }}
            title="Eliminar tarea"
          >
            <TrashIcon />
          </button>
        </div>
      </div>
      <p className="knx-board-card-title">{task.title}</p>
      {task.description && <p className="knx-board-card-desc">{truncate(task.description, 90)}</p>}
      <div className="knx-board-card-tags">
        {task.taskType && <span className="knx-board-tag">{task.taskType}</span>}
        {task.priority && <span className={`knx-board-tag knx-board-tag--priority-${task.priority.toLowerCase()}`}>{task.priority}</span>}
        {task.severity && <span className="knx-board-tag knx-board-tag--severity">{task.severity}</span>}
      </div>
      {hasDates && (
        <div className="knx-board-card-dates">
          {start ? fmtDate(start) : '—'} → {task.dueDate ? fmtDate(task.dueDate) : '—'}
        </div>
      )}
      <div className="knx-board-card-foot">
        <span className="knx-board-card-resp">
          {task.responsableName ? <span className="knx-board-card-avatar">{initials(task.responsableName)}</span> : null}
          {task.responsableName ?? 'Sin asignar'}
        </span>
        {task.estimatedHours != null && <span className="knx-board-card-hours">{task.estimatedHours}h</span>}
      </div>
      {task.childIds?.length > 0 && (
        <div className="knx-board-card-children">{task.childrenDoneCount}/{task.childIds.length} subtareas</div>
      )}
      <select
        className="knx-board-card-status"
        value={task.status}
        disabled={busy}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onStatusChange(task, e.target.value)}
      >
        {columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </div>
  );
}

// ── Panel de detalle / edición ───────────────────────────────────────────────
function TaskDetailPanel({ task, data, busy, onClose, onAction, onRemove }) {
  const [closing, handleClose] = useSidePanelClose(onClose);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [startDate, setStartDate] = useState(task.committedStartDate ?? task.startDate ?? '');
  const [endDate, setEndDate] = useState(task.dueDate ?? '');
  const [estimatedHours, setEstimatedHours] = useState(task.estimatedHours ?? '');
  const [actualHours, setActualHours] = useState(task.actualHours ?? '');

  const saveTitle = () => { if (title.trim() && title !== task.title) onAction('update_task_details', { pageId: task.id, title: title.trim() }); };
  const saveDescription = () => { if (description !== (task.description ?? '')) onAction('update_task_details', { pageId: task.id, description }); };
  const saveSchedule = () => onAction('update_task_schedule', { pageId: task.id, startDate, endDate, estimatedHours: estimatedHours === '' ? null : Number(estimatedHours) });
  const saveActualHours = () => onAction('update_task_actual_hours', { pageId: task.id, actualHours: actualHours === '' ? null : Number(actualHours) });

  return (
    <div className={`knx-side-panel${closing ? ' knx-side-panel--closing' : ''}`}>
      <div className="knx-side-panel-header">
        <span className="knx-side-panel-title">Tarea</span>
        {task.url && (
          <a className="knx-block-ask" href={task.url} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', marginRight: 10 }}>
            <NotionLinkIcon /> Ver en Notion
          </a>
        )}
        <button type="button" className="knx-side-panel-close" onClick={handleClose} aria-label="Cerrar">×</button>
      </div>
      <div className="knx-side-panel-thread knx-board-detail-body">
        <div className="knx-board-field">
          <label>Título</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={saveTitle} disabled={busy} />
        </div>
        <div className="knx-board-field">
          <label>Descripción</label>
          <textarea rows={8} value={description} onChange={(e) => setDescription(e.target.value)} onBlur={saveDescription} disabled={busy} />
        </div>
        <div className="knx-board-field-row">
          <div className="knx-board-field">
            <label>Responsable</label>
            <select
              value={task.responsableId ?? ''}
              disabled={busy}
              onChange={(e) => onAction('update_task_responsable', { pageId: task.id, responsableId: e.target.value || null })}
            >
              <option value="">Sin asignar</option>
              {data.talento.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="knx-board-field">
            <label>Estado</label>
            <select
              value={task.status}
              disabled={busy}
              onChange={(e) => onAction('move_task', { pageId: task.id, status: e.target.value })}
            >
              {data.columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div className="knx-board-field-row">
          <div className="knx-board-field">
            <label>Inicio</label>
            <input type="date" value={startDate ?? ''} onChange={(e) => setStartDate(e.target.value)} onBlur={saveSchedule} disabled={busy} />
          </div>
          <div className="knx-board-field">
            <label>Fin</label>
            <input type="date" value={endDate ?? ''} onChange={(e) => setEndDate(e.target.value)} onBlur={saveSchedule} disabled={busy} />
          </div>
          <div className="knx-board-field">
            <label>Estimación (hs)</label>
            <input type="number" min="0" step="0.5" value={estimatedHours ?? ''} onChange={(e) => setEstimatedHours(e.target.value)} onBlur={saveSchedule} disabled={busy} />
          </div>
        </div>
        <div className="knx-board-field">
          <label>Horas reales</label>
          <input type="number" min="0" step="0.5" value={actualHours ?? ''} onChange={(e) => setActualHours(e.target.value)} onBlur={saveActualHours} disabled={busy} />
        </div>
        {task.parentName && <p className="knx-board-detail-meta">Subtarea de: {task.parentName}</p>}
        <button type="button" className="knx-doc-card-error" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 8 }} onClick={() => onRemove(task.id)} disabled={busy}>
          Eliminar tarea
        </button>
      </div>
    </div>
  );
}

// ── Formulario de nueva tarea ────────────────────────────────────────────────
function NewTaskForm({ data, busy, sprint, defaultProyectoId, onCreate, onClose }) {
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState(data.columns.find((c) => c.id === 'Not started')?.id ?? data.columns[0]?.id ?? '');
  // Si la pantalla ya está filtrada a un proyecto puntual, la tarea nueva nace en ese proyecto —
  // no tiene sentido volver a preguntarlo. Si el filtro es "Todos los proyectos", sigue en blanco
  // (muchas tareas viejas quedaron sin este campo asignado, así que no hay un valor "correcto"
  // para adivinar en ese caso).
  const [proyectoId, setProyectoId] = useState(defaultProyectoId || '');
  const [responsableId, setResponsableId] = useState('');
  const [priority, setPriority] = useState('');
  const [taskType, setTaskType] = useState('');
  const [severity, setSeverity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [description, setDescription] = useState('');
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const missingFieldLabels = [
    !title.trim() && 'nombre de la tarea',
    !startDate && 'fecha de inicio',
    !endDate && 'fecha de fin',
    estimatedHours.toString().trim() === '' && 'estimación de horas',
  ].filter(Boolean);
  const missingRequired = missingFieldLabels.length > 0;

  const submit = () => {
    if (missingRequired) { setAttemptedSubmit(true); return; }
    onCreate({
      title, status, proyectoId: proyectoId || undefined, responsableId: responsableId || undefined,
      priority: priority || undefined, taskType: taskType || undefined, severity: severity || undefined,
      startDate, endDate, estimatedHours,
      description: description || undefined,
    });
  };

  return (
    <div className="knx-board-popover">
      <div className="knx-board-field">
        <label>Nombre de la tarea</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} autoFocus placeholder="¿Qué hay que hacer?" />
      </div>
      <div className="knx-board-field-row">
        <div className="knx-board-field">
          <label>Estado</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {data.columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="knx-board-field">
          <label>Tipo</label>
          <select value={taskType} onChange={(e) => { setTaskType(e.target.value); if (!SEVERITY_APPLIES_TO.has(e.target.value)) setSeverity(''); }}>
            <option value="">Sin definir</option>
            {TASK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="knx-board-field-row">
        <div className="knx-board-field">
          <label>Prioridad</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="">Sin definir</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        {SEVERITY_APPLIES_TO.has(taskType) && (
          <div className="knx-board-field">
            <label>Severidad</label>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="">Sin definir</option>
              {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
      </div>
      <div className="knx-board-field-row">
        <div className="knx-board-field">
          <label>Proyecto</label>
          <select value={proyectoId} onChange={(e) => setProyectoId(e.target.value)}>
            <option value="">Sin definir</option>
            {data.proyectos.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="knx-board-field">
          <label>Responsable</label>
          <select value={responsableId} onChange={(e) => setResponsableId(e.target.value)}>
            <option value="">Sin definir</option>
            {data.talento.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>
      <div className="knx-board-field-row">
        <div className="knx-board-field">
          <label>Inicio — obligatorio</label>
          <input type="date" value={startDate} min={sprint?.startDate || undefined} max={sprint?.endDate || undefined} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="knx-board-field">
          <label>Fin — obligatorio</label>
          <input type="date" value={endDate} min={sprint?.startDate || undefined} max={sprint?.endDate || undefined} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="knx-board-field">
          <label>Estimación (hs) — obligatorio</label>
          <input type="number" min="0" step="0.5" value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} />
        </div>
      </div>
      <div className="knx-board-field">
        <label>Descripción</label>
        <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
      </div>
      {attemptedSubmit && missingRequired && (
        <p className="knx-doc-card-error">Falta completar: {missingFieldLabels.join(', ')}.</p>
      )}
      <div className="knx-board-popover-actions">
        <button type="button" className="knx-analisis-sources-save" onClick={submit} disabled={busy}>{busy ? 'Creando…' : 'Crear'}</button>
        <button type="button" onClick={onClose}>Cancelar</button>
      </div>
    </div>
  );
}

function NewSprintForm({ busy, onCreate, onClose }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const missing = !startDate || !endDate;
  return (
    <div className="knx-board-popover">
      <div className="knx-board-field-row">
        <div className="knx-board-field">
          <label>Inicio</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="knx-board-field">
          <label>Fin</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>
      <div className="knx-board-field">
        <label>Objetivo</label>
        <input value={objetivo} onChange={(e) => setObjetivo(e.target.value)} placeholder="Opcional" />
      </div>
      <div className="knx-board-popover-actions">
        <button type="button" className="knx-analisis-sources-save" disabled={busy || missing} onClick={() => onCreate({ startDate, endDate, objetivo })}>
          {busy ? 'Creando…' : 'Crear sprint'}
        </button>
        <button type="button" onClick={onClose}>Cancelar</button>
      </div>
    </div>
  );
}

// Acción independiente, disponible siempre que haya más de un sprint en el proyecto — no
// depende de haber creado ni cerrado nada recién. Dos pasos: elegir DE QUÉ sprint traer (any
// otro sprint del proyecto, cerrado o no) y, recién con eso cargado, elegir cuáles de sus tareas
// sin terminar traer al sprint que se está viendo ahora mismo. Todas arrancan marcadas (el caso
// más común es "traer todo lo pendiente"), pero se puede ajustar antes de confirmar.
function BringTasksModal({ tenant, currentSprintId, sprintOptions, onClose, onMoved }) {
  const [sourceId, setSourceId] = useState('');
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [sourceTasks, setSourceTasks] = useState(null); // null = todavía no se eligió sprint
  const [selected, setSelected] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const loadSourceTasks = async (id) => {
    setSourceId(id);
    setSourceTasks(null);
    setErr(null);
    if (!id) return;
    setLoadingTasks(true);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/board?sprintId=${id}`);
      const json = await res.json();
      if (!res.ok) { setErr(json.error || 'No se pudo cargar ese sprint.'); return; }
      const pending = (json.tasks ?? []).filter((t) => t.status !== 'Done');
      setSourceTasks(pending);
      setSelected(new Set(pending.map((t) => t.id)));
    } catch {
      setErr('Error de conexión.');
    } finally {
      setLoadingTasks(false);
    }
  };

  const toggle = (id) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const allSelected = sourceTasks?.length > 0 && sourceTasks.every((t) => selected.has(t.id));

  const confirm = async () => {
    const pageIds = [...selected];
    if (!pageIds.length) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/board`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'move_tasks_sprint', sprintId: currentSprintId, pageIds, targetSprintId: currentSprintId }),
      });
      const json = await res.json();
      if (!res.ok) { setErr(json.error || 'No se pudieron traer las tareas.'); return; }
      onMoved(json);
    } catch {
      setErr('Error de conexión.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="knx-confirm-backdrop" onClick={onClose}>
      <div className="knx-confirm-modal" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true">
        <h3>Traer tareas de otro sprint</h3>
        <div className="knx-board-field" style={{ marginBottom: 12 }}>
          <label>Desde</label>
          <select value={sourceId} onChange={(e) => loadSourceTasks(e.target.value)} autoFocus>
            <option value="">Elegí un sprint…</option>
            {sprintOptions.map((s) => <option key={s.id} value={s.id}>{s.title} · {s.status}</option>)}
          </select>
        </div>
        {loadingTasks && <p className="knx-knowledge-empty">Cargando…</p>}
        {sourceTasks && (
          sourceTasks.length === 0 ? (
            <p className="knx-knowledge-empty">Ese sprint no tiene tareas sin terminar.</p>
          ) : (
            <>
              <p>Tiene {sourceTasks.length} tarea{sourceTasks.length !== 1 ? 's' : ''} sin terminar. Elegí cuáles traer.</p>
              <div className="knx-board-popover-actions" style={{ marginBottom: 8 }}>
                <button type="button" onClick={() => setSelected(allSelected ? new Set() : new Set(sourceTasks.map((t) => t.id)))}>
                  {allSelected ? 'Ninguna' : 'Todas'}
                </button>
              </div>
              <div className="knx-meeting-attendee-list" style={{ maxHeight: 280, overflowY: 'auto', marginBottom: 12 }}>
                {sourceTasks.map((t) => (
                  <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer' }}>
                    <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggle(t.id)} />
                    <span>{t.title}</span>
                  </label>
                ))}
              </div>
            </>
          )
        )}
        {err && <p className="knx-login-error">{err}</p>}
        <div className="knx-confirm-actions">
          <button type="button" className="knx-confirm-cancel" onClick={onClose}>Cancelar</button>
          <button type="button" className="knx-analisis-sources-save" disabled={busy || !sourceTasks?.length || !selected.size} onClick={confirm}>
            {busy ? 'Trayendo…' : `Traer ${selected.size} tarea${selected.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// Tablero de Sprints propio de Kai Next — mismo backend 100% Notion que Aria (lib/aria/board.js,
// cero storage nuevo, ver app/api/kai-next/[tenant]/board), pero reconstruido con el estilo
// visual de Kai Next (.knx-*) en vez de reusar SprintBoardPresentation.jsx de Aria, que depende
// de aria.css (solo se carga en /aria/*) y hubiera chocado con kai-next.css.
export default function KaiNextSprints({
  tenant, tenantName, basePath, userName, userHandle, isTeamUser,
}) {
  const [loggingOut, setLoggingOut] = useState(false);
  const [chats, setChats] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState(null);
  const [detailTaskId, setDetailTaskId] = useState(null);
  const [doneHoursPrompt, setDoneHoursPrompt] = useState(null);
  const [doneHoursInput, setDoneHoursInput] = useState('');
  const [removeTarget, setRemoveTarget] = useState(null);
  const [closeTarget, setCloseTarget] = useState(null);
  const [deleteChatTarget, setDeleteChatTarget] = useState(null);
  const [responsableFilter, setResponsableFilter] = useState('');
  const [proyectoFilter, setProyectoFilter] = useState('');
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [justMovedTaskId, setJustMovedTaskId] = useState(null);
  const [dragOverTaskId, setDragOverTaskId] = useState(null);
  const [dragOverBefore, setDragOverBefore] = useState(true);
  // "Traer tareas de otro sprint" — acción independiente, no atada a crear ni cerrar nada (ver
  // BringTasksModal).
  const [bringTasksOpen, setBringTasksOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/kai-next/${tenant}`)
      .then((r) => r.json())
      .then((d) => setChats(d.conversations ?? []))
      .catch(() => null);
  }, [tenant]);

  const load = async (sprintId) => {
    setLoading(true);
    setErr(null);
    try {
      const url = sprintId ? `/api/kai-next/${tenant}/board?sprintId=${sprintId}` : `/api/kai-next/${tenant}/board`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) { setErr(json.error || 'No se pudo cargar el tablero.'); return; }
      setData(json);
    } catch {
      setErr('Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [tenant]); // eslint-disable-line react-hooks/exhaustive-deps

  // Se limpia recién después de que `data` ya trajo a la tarea en su nueva columna — así la
  // animación de "acabo de llegar" (.knx-board-card--entering) alcanza a jugar sobre la tarjeta
  // ya posicionada, no sobre la vieja.
  useEffect(() => {
    if (!justMovedTaskId) return;
    const t = setTimeout(() => setJustMovedTaskId(null), 450);
    return () => clearTimeout(t);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAction = async (action, params) => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/board`, {
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


  // Cambiar de estado (drag-and-drop, el <select> de la tarjeta, o confirmar horas al marcar
  // Hecho) actualiza la columna AL INSTANTE, sin esperar la ida y vuelta a Notion — antes la
  // tarjeta volvía a su columna original durante esos segundos y recién saltaba a la nueva
  // cuando llegaba la respuesta, lo que se sentía como que el drop "no pegaba". Si el PATCH
  // falla, se revierte al estado previo.
  const moveTaskOptimistic = async (task, status, actualHours, order) => {
    const prevData = data;
    setJustMovedTaskId(task.id);
    setData((prev) => (prev ? { ...prev, tasks: prev.tasks.map((t) => (t.id === task.id ? { ...t, status, ...(order != null ? { order } : {}) } : t)) } : prev));
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/board`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'move_task', sprintId: prevData?.sprint?.id, pageId: task.id, status, actualHours, order }),
      });
      const json = await res.json();
      if (!res.ok) { setErr(json.error || 'No se pudo actualizar.'); setData(prevData); return; }
      // Para la tarea que se acaba de mover, nos quedamos con lo que nosotros mismos escribimos
      // (status y, si el drag también reordenó, order) en vez de lo que esta lectura trajo —
      // leer Notion justo después de escribirle no siempre refleja el cambio todavía (tarda unos
      // segundos en quedar consistente), y antes eso hacía que la tarjeta "saltara" sola después
      // de soltarla bien. El resto de los datos (otras tareas, métricas) sí se refrescan normal.
      setData({ ...json, tasks: json.tasks.map((t) => (t.id === task.id ? { ...t, status, ...(order != null ? { order } : {}) } : t)) });
    } catch {
      setErr('Error de conexión.');
      setData(prevData);
    } finally {
      setBusy(false);
    }
  };

  // Drag vertical dentro de la misma columna (sin cambio de status) — mismo patrón optimista
  // que moveTaskOptimistic, pero a propósito NO pisa `data` con la respuesta cuando sale bien:
  // leer la base de Notion justo después de escribirle no siempre trae el valor recién guardado
  // (puede tardar unos segundos en quedar consistente), y reemplazar el order ya correcto por
  // esa lectura todavía vieja era lo que hacía que la tarjeta "saltara" sola después de soltarla.
  // El order que se acaba de escribir YA es la verdad; si el PATCH devolvió 200, confiamos en él.
  const reorderTaskOptimistic = async (task, order) => {
    const prevData = data;
    setData((prev) => (prev ? { ...prev, tasks: prev.tasks.map((t) => (t.id === task.id ? { ...t, order } : t)) } : prev));
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/board`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reorder_task', sprintId: prevData?.sprint?.id, pageId: task.id, order }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setErr(json.error || 'No se pudo reordenar.');
        setData(prevData);
      }
    } catch {
      setErr('Error de conexión.');
      setData(prevData);
    } finally {
      setBusy(false);
    }
  };

  // Migra a un order real las vecinas que todavía estaban en null (ver `backfill` en
  // computeDropOrder) — optimista en lo local, sin su propio ciclo de busy/error: la escritura
  // principal (moveTaskOptimistic/reorderTaskOptimistic) ya refresca `data` después.
  const backfillOrder = (taskId, order) => {
    setData((prev) => (prev ? { ...prev, tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, order } : t)) } : prev));
    fetch(`/api/kai-next/${tenant}/board`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reorder_task', sprintId: data?.sprint?.id, pageId: taskId, order }),
    }).catch(() => null);
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      if (isTeamUser) await fetch('/api/team/logout', { method: 'POST' });
      else await fetch(`/api/kai/${tenant}/tenant-users/me`, { method: 'DELETE' });
    } finally {
      window.location.href = `${basePath}/${tenant}`;
    }
  };

  const handleDeleteChat = (id) => {
    const chat = chats.find((c) => c.id === id);
    setDeleteChatTarget({ id, title: chat?.title || 'Nuevo chat' });
  };
  const confirmDeleteChat = async () => {
    const id = deleteChatTarget?.id;
    setDeleteChatTarget(null);
    if (!id) return;
    await fetch(`/api/kai-next/${tenant}?conversationId=${id}`, { method: 'DELETE' });
    setChats((prev) => prev.filter((c) => c.id !== id));
  };

  const onStatusChange = (task, status, order) => {
    if (status === 'Done') { setDoneHoursPrompt({ pageId: task.id, order }); setDoneHoursInput(task.estimatedHours ?? ''); return; }
    moveTaskOptimistic(task, status, undefined, order);
  };

  const confirmDoneWithHours = () => {
    const pageId = doneHoursPrompt?.pageId;
    const order = doneHoursPrompt?.order;
    setDoneHoursPrompt(null);
    if (!pageId) return;
    const task = data?.tasks?.find((t) => t.id === pageId);
    if (!task) return;
    moveTaskOptimistic(task, 'Done', doneHoursInput === '' ? undefined : Number(doneHoursInput), order);
  };

  if (loading && !data) {
    return (
      <div className="knx-shell">
        <KaiNextSidebar tenant={tenant} tenantName={tenantName} userName={userName} userHandle={userHandle} isTeamUser={isTeamUser} basePath={basePath} chats={chats} onDeleteChat={handleDeleteChat} onLogout={handleLogout} loggingOut={loggingOut} active="sprints" />
        <main className="knx-main"><div className="knx-analisis-page"><p className="knx-knowledge-empty">Cargando…</p></div></main>
      </div>
    );
  }

  if (err && !data) {
    return (
      <div className="knx-shell">
        <KaiNextSidebar tenant={tenant} tenantName={tenantName} userName={userName} userHandle={userHandle} isTeamUser={isTeamUser} basePath={basePath} chats={chats} onDeleteChat={handleDeleteChat} onLogout={handleLogout} loggingOut={loggingOut} active="sprints" />
        <main className="knx-main"><div className="knx-analisis-page"><div className="knx-analisis-error"><p>{err}</p></div></div></main>
      </div>
    );
  }

  const { sprint, sprints, columns, tasks, proyectos, talento, metrics } = data ?? {};
  const detailTask = detailTaskId ? tasks?.find((t) => t.id === detailTaskId) : null;
  const visibleTasks = (tasks ?? [])
    .filter((t) => !responsableFilter || t.responsableId === responsableFilter)
    .filter((t) => !proyectoFilter || t.proyectoId === proyectoFilter);
  // Solo responsables/proyectos con al menos una tarea en ESTE sprint — filtrar por algo sin nada
  // acá solo mostraría un tablero vacío, no tiene sentido ofrecerlo en el dropdown.
  const activeResponsableIds = new Set((tasks ?? []).map((t) => t.responsableId).filter(Boolean));
  const activeResponsables = (talento ?? []).filter((t) => activeResponsableIds.has(t.id));
  const activeProyectoIds = new Set((tasks ?? []).map((t) => t.proyectoId).filter(Boolean));
  const activeProyectos = (proyectos ?? []).filter((p) => activeProyectoIds.has(p.id));

  return (
    <div className="knx-shell">
      <KaiNextSidebar
        tenant={tenant} tenantName={tenantName} userName={userName} userHandle={userHandle}
        isTeamUser={isTeamUser} basePath={basePath} chats={chats}
        onDeleteChat={handleDeleteChat} onLogout={handleLogout} loggingOut={loggingOut} active="sprints"
      />

      <main className="knx-main">
        <div className="knx-analisis-page">
          <div className="knx-analisis-top">
            <div className="knx-analisis-head">
              <h1>Sprints</h1>
              <p>Tablero de tareas de {tenantName} (Notion).</p>
            </div>
            <div className="knx-analisis-controls">
              {sprints?.length > 0 && (
                <select className="knx-analisis-period" value={sprint?.id ?? ''} onChange={(e) => { setResponsableFilter(''); setProyectoFilter(''); load(e.target.value); }}>
                  {sprints.map((s) => <option key={s.id} value={s.id}>{s.title} · {s.status}</option>)}
                </select>
              )}
              <button type="button" className="knx-analisis-compare" onClick={() => setMode(mode === 'new_sprint' ? null : 'new_sprint')}>+ Nuevo sprint</button>
              {sprint && sprints?.length > 1 && (
                <button type="button" className="knx-analisis-compare" onClick={() => setBringTasksOpen(true)} disabled={busy}>Traer tareas de otro sprint</button>
              )}
              {sprint?.status === 'Planificado' && (
                <button type="button" className="knx-analisis-compare" onClick={() => handleAction('close_planning', {})} disabled={busy}>Cerrar planificación</button>
              )}
              {sprint?.status === 'En curso' && (
                <button type="button" className="knx-analisis-compare" onClick={() => setCloseTarget(sprint.id)} disabled={busy}>Cerrar sprint</button>
              )}
            </div>
          </div>

          {mode === 'new_sprint' && (
            <NewSprintForm busy={busy} onClose={() => setMode(null)} onCreate={(p) => handleAction('create_sprint', p)} />
          )}

          {err && <div className="knx-analisis-error" style={{ marginBottom: 16 }}><p>{err}</p></div>}

          {!sprint ? (
            <div className="knx-analisis-empty">
              <p>No hay ningún sprint todavía.</p>
            </div>
          ) : (
            <>
              <div className="knx-board-sprint-head">
                <div>
                  <span className="knx-activity-status knx-activity-status--active">{sprint.status}</span>
                  {sprint.startDate && <span className="knx-board-sprint-dates"> {fmtDate(sprint.startDate)} → {fmtDate(sprint.endDate)}</span>}
                  <span className="knx-board-sprint-dates">
                    {' '}· {sprint.loggedHours ?? 0}h / {sprint.committedHours ?? 0}h comprometidas · {tasks.length} tarea{tasks.length !== 1 ? 's' : ''}
                  </span>
                  {sprint.objetivo && <span className="knx-board-sprint-objetivo"> · {sprint.objetivo}</span>}
                </div>
                <div className="knx-board-sprint-actions">
                  {activeProyectos.length > 0 && (
                    <select className="knx-analisis-period" value={proyectoFilter} onChange={(e) => setProyectoFilter(e.target.value)}>
                      <option value="">Todos los proyectos</option>
                      {activeProyectos.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  )}
                  {activeResponsables.length > 0 && (
                    <select className="knx-analisis-period" value={responsableFilter} onChange={(e) => setResponsableFilter(e.target.value)}>
                      <option value="">Todos los responsables</option>
                      {activeResponsables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  )}
                  <button type="button" className="knx-analisis-sources-save" onClick={() => setMode(mode === 'new_task' ? null : 'new_task')}>+ Nueva tarea</button>
                </div>
              </div>

              {mode === 'new_task' && (
                <NewTaskForm data={data} sprint={sprint} busy={busy} defaultProyectoId={proyectoFilter} onClose={() => setMode(null)} onCreate={(p) => handleAction('create_task', p)} />
              )}

              {metrics && (
                <div className="knx-kpi-grid-wrap" style={{ marginBottom: 16 }}>
                  <div className="knx-kpi-grid">
                    <div className="knx-kpi-card">
                      <span className="knx-kpi-label">Tareas comprometidas</span>
                      <span className="knx-kpi-value">{metrics.committed?.completadas ?? 0}/{metrics.committed?.total ?? 0}</span>
                    </div>
                    <div className="knx-kpi-card">
                      <span className="knx-kpi-label">Horas comprometidas</span>
                      <span className="knx-kpi-value">{metrics.committedHours ?? '—'}</span>
                    </div>
                    <div className="knx-kpi-card">
                      <span className="knx-kpi-label">Horas registradas</span>
                      <span className="knx-kpi-value">{metrics.loggedHours ?? '—'}</span>
                    </div>
                    <div className="knx-kpi-card">
                      <span className="knx-kpi-label">Fuera de plan</span>
                      <span className="knx-kpi-value">{metrics.scopeCreep?.completadas ?? 0}/{metrics.scopeCreep?.total ?? 0}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="knx-board-columns">
                {columns.map((col) => {
                  const colTasks = sortByOrder(visibleTasks.filter((t) => t.status === col.id));
                  const clearDrag = () => { setDraggedTaskId(null); setDragOverCol(null); setDragOverTaskId(null); };
                  // Soltar sobre una tarjeta puntual: reordena dentro de la columna y, si además
                  // cambió de columna, cambia el status en el mismo gesto (ver onStatusChange con
                  // order — ese 3er argumento viaja hasta moveTaskOptimistic/reorderTaskOptimistic).
                  const dropOnCard = (e, overTask) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const taskId = draggedTaskId;
                    const before = dragOverBefore;
                    clearDrag();
                    if (!taskId) return;
                    const task = tasks.find((t) => t.id === taskId);
                    if (!task) return;
                    const { order, backfill } = computeDropOrder(colTasks, taskId, overTask.id, before);
                    backfill.forEach((b) => backfillOrder(b.id, b.order));
                    if (task.status !== col.id) onStatusChange(task, col.id, order);
                    else if (order !== task.order) reorderTaskOptimistic(task, order);
                  };
                  return (
                    <div className="knx-board-column" key={col.id}>
                      <div className="knx-board-column-head">
                        <span>{col.name}</span>
                        <span className="knx-board-column-count">{colTasks.length}</span>
                      </div>
                      <div
                        className={`knx-board-column-body${dragOverCol === col.id ? ' knx-board-column-body--over' : ''}`}
                        onDragEnter={(e) => { e.preventDefault(); if (dragOverCol !== col.id) setDragOverCol(col.id); }}
                        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragOverCol !== col.id) setDragOverCol(col.id); }}
                        onDragLeave={() => setDragOverCol((c) => (c === col.id ? null : c))}
                        onDrop={(e) => {
                          e.preventDefault();
                          // Confía en el estado de React, no en dataTransfer.getData() — es la
                          // misma pestaña/árbol de React, no hace falta el payload nativo para
                          // identificar la tarea, y getData() resultó poco confiable entre
                          // navegadores (la animación de arrastre sí funcionaba, el drop no).
                          const taskId = draggedTaskId;
                          clearDrag();
                          if (!taskId) return;
                          const task = tasks.find((t) => t.id === taskId);
                          if (!task) return;
                          // Soltar en zona vacía de la columna (no sobre una tarjeta): al final.
                          const { order, backfill } = computeDropOrder(colTasks, taskId, null, false);
                          backfill.forEach((b) => backfillOrder(b.id, b.order));
                          if (task.status !== col.id) onStatusChange(task, col.id, order);
                          else if (order !== task.order) reorderTaskOptimistic(task, order);
                        }}
                      >
                        {colTasks.map((t) => (
                          <TaskCard
                            key={t.id} task={t} columns={columns} busy={busy}
                            onOpen={setDetailTaskId} onStatusChange={onStatusChange} onRemove={(id) => setRemoveTarget(id)}
                            onDragStart={setDraggedTaskId} onDragEnd={clearDrag}
                            dragging={draggedTaskId === t.id}
                            entering={justMovedTaskId === t.id}
                            dropIndicator={dragOverTaskId === t.id && draggedTaskId !== t.id ? (dragOverBefore ? 'top' : 'bottom') : null}
                            onDragOverCard={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (dragOverCol !== col.id) setDragOverCol(col.id);
                              if (draggedTaskId === t.id) return;
                              setDragOverTaskId(t.id);
                              setDragOverBefore(dropsBefore(e, e.currentTarget));
                            }}
                            onDropCard={(e) => dropOnCard(e, t)}
                          />
                        ))}
                        {!colTasks.length && <p className="knx-board-column-empty">Sin tareas</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>

      {detailTask && (
        <TaskDetailPanel
          task={detailTask}
          data={data}
          busy={busy}
          onClose={() => setDetailTaskId(null)}
          onAction={handleAction}
          onRemove={(id) => setRemoveTarget(id)}
        />
      )}

      {doneHoursPrompt && (
        <div className="knx-confirm-backdrop" onClick={() => setDoneHoursPrompt(null)}>
          <div className="knx-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Horas reales</h3>
            <p>Obligatorio para marcar la tarea como Hecho.</p>
            <input
              type="number" min="0" step="0.5" autoFocus value={doneHoursInput}
              onChange={(e) => setDoneHoursInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmDoneWithHours()}
              className="knx-knowledge-add-form"
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 13px', border: '1px solid var(--knx-border)', borderRadius: 10, marginBottom: 12 }}
            />
            <div className="knx-confirm-actions">
              <button type="button" className="knx-confirm-cancel" onClick={() => setDoneHoursPrompt(null)}>Cancelar</button>
              <button type="button" className="knx-confirm-danger" disabled={doneHoursInput === ''} onClick={confirmDoneWithHours}>Marcar como Hecho</button>
            </div>
          </div>
        </div>
      )}

      <KaiNextConfirmDialog
        open={!!removeTarget}
        title="Eliminar tarea"
        message="¿Eliminar esta tarea del sprint? No se puede deshacer."
        onConfirm={() => { const id = removeTarget; setRemoveTarget(null); setDetailTaskId(null); handleAction('remove_task', { pageId: id }); }}
        onCancel={() => setRemoveTarget(null)}
      />
      <KaiNextConfirmDialog
        open={!!closeTarget}
        title="Cerrar sprint"
        message="¿Cerrar este sprint? Se congelan las métricas y no se puede reabrir."
        confirmLabel="Cerrar sprint"
        onConfirm={() => { setCloseTarget(null); handleAction('close_sprint', {}); }}
        onCancel={() => setCloseTarget(null)}
      />
      <KaiNextConfirmDialog
        open={!!deleteChatTarget}
        title="Eliminar conversación"
        message={`¿Eliminar "${deleteChatTarget?.title}"? Esta acción no se puede deshacer.`}
        onConfirm={confirmDeleteChat}
        onCancel={() => setDeleteChatTarget(null)}
      />
      {bringTasksOpen && (
        <BringTasksModal
          tenant={tenant}
          currentSprintId={data?.sprint?.id}
          sprintOptions={(sprints ?? []).filter((s) => s.id !== data?.sprint?.id)}
          onClose={() => setBringTasksOpen(false)}
          onMoved={(json) => { setData(json); setBringTasksOpen(false); }}
        />
      )}
    </div>
  );
}
