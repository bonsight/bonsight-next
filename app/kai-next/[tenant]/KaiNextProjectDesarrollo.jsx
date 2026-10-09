'use client';

import { useState, useEffect } from 'react';
import KaiNextConfirmDialog from './KaiNextConfirmDialog';

// Proyecto de Desarrollo — a diferencia de los otros 3 kinds, su contenido (Proyecto/
// Iniciativas/Épicas/Tareas) vive en el Notion interno de Bonsight, el mismo que ya usa
// Sprints (ver lib/kaiNext/projectsNotion.js + lib/aria/board.js). Se lee en vivo cada vez,
// sin caché — mismo criterio que ya usa getBoardData para el tablero de Sprints.

const FASE_OPTIONS = ['Preparación', 'Análisis', 'Diseño', 'Desarrollo', 'Pruebas', 'Producción', 'Monitoreo y Cierre'];
const FASE_COLORS = {
  'Preparación': '#9CA3AF', 'Análisis': '#A47148', 'Diseño': '#A78BFA', 'Desarrollo': '#60A5FA',
  'Pruebas': '#FBBF24', 'Producción': '#34D399', 'Monitoreo y Cierre': '#6B7280',
};

// Status "crudo" de Notion (ver STATUS_COLUMNS en lib/aria/board.js) → etiqueta/clase visual.
const STATUS_LABELS = { Backlog: 'Backlog', 'Not started': 'Por hacer', 'In progress': 'En curso', 'In Review': 'En revisión', Done: 'Hecho' };
const STATUS_BADGE_CLASS = { Done: 'knx-badge--active', 'In progress': 'knx-badge--progress', Backlog: 'knx-badge--off' };

// Mismos valores que ya usa el tablero real de Sprints (KaiNextSprints.jsx) — createTask ya los
// acepta todos, acá solo faltaba exponerlos en los formularios y tarjetas de este tablero.
const PRIORITIES = ['Alta', 'Media', 'Baja'];
const TASK_TYPES = ['Desarrollo', 'Soporte', 'Bug', 'Mejora', 'Reunión'];
const SEVERITIES = ['Crítica', 'Alta', 'Media', 'Baja'];
const SEVERITY_APPLIES_TO = new Set(['Bug']);

function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '·';
}

function truncateText(text, max) {
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

// Tarjeta compartida por Tablero y el tab Sprints — misma estructura/clases que TaskCard del
// tablero real (KaiNextSprints.jsx), para que una tarea se vea igual en los dos lugares.
function DevTaskCard({ task, columns, onOpen, onStatusChange, draggable, onDragStart, onDragEnd, dragging, entering, showStatusSelect = true }) {
  const hasDates = task.startDate || task.dueDate;
  return (
    <div
      className={`knx-board-card${dragging ? ' knx-board-card--dragging' : ''}${entering ? ' knx-board-card--entering' : ''}`}
      onClick={() => onOpen(task.id)}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="knx-board-card-top">
        {task.outOfPlan ? <span className="knx-board-card-flag">Fuera de plan</span> : <span />}
        {task.url && (
          <a className="knx-board-card-icon-btn" href={task.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} title="Abrir en Notion">
            <NotionLinkIcon />
          </a>
        )}
      </div>
      <p className="knx-board-card-title">{task.title}</p>
      {task.description && <p className="knx-board-card-desc">{truncateText(task.description, 90)}</p>}
      <div className="knx-board-card-tags">
        {task.taskType && <span className="knx-board-tag">{task.taskType}</span>}
        {task.priority && <span className={`knx-board-tag knx-board-tag--priority-${task.priority.toLowerCase()}`}>{task.priority}</span>}
        {task.severity && <span className="knx-board-tag knx-board-tag--severity">{task.severity}</span>}
      </div>
      {hasDates && (
        <div className="knx-board-card-dates">{task.startDate ? fmtDate(task.startDate) : '—'} → {task.dueDate ? fmtDate(task.dueDate) : '—'}</div>
      )}
      <div className="knx-board-card-foot">
        <span className="knx-board-card-resp">
          <span className={`knx-board-card-avatar${task.responsableName ? '' : ' knx-board-card-avatar--empty'}`}>
            {task.responsableName ? initials(task.responsableName) : ''}
          </span>
          {task.responsableName ?? 'Sin asignar'}
        </span>
        {task.estimatedHours != null && <span className="knx-board-card-hours">{task.estimatedHours}h</span>}
      </div>
      {showStatusSelect && (
        <select className="knx-board-card-status" value={task.status} onClick={(e) => e.stopPropagation()} onChange={(e) => onStatusChange(task, e.target.value)}>
          {columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}
    </div>
  );
}

// Panel de detalle/edición de una tarea — mismos campos/acciones que TaskDetailPanel del
// tablero real, pegando a /dev/board en vez de /board.
function DevTaskDetailPanel({ tenant, projectId, task, talento, columns, onClose, onAction, onRemove }) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [startDate, setStartDate] = useState(task.startDate ?? '');
  const [endDate, setEndDate] = useState(task.dueDate ?? '');
  const [estimatedHours, setEstimatedHours] = useState(task.estimatedHours ?? '');
  const [actualHours, setActualHours] = useState(task.actualHours ?? '');

  const saveTitle = () => { if (title.trim() && title !== task.title) onAction('update_task_details', { title: title.trim() }); };
  const saveDescription = () => { if (description !== (task.description ?? '')) onAction('update_task_details', { description }); };
  const saveSchedule = () => onAction('update_schedule', { startDate, endDate, estimatedHours: estimatedHours === '' ? null : Number(estimatedHours) });
  const saveActualHours = () => onAction('update_actual_hours', { actualHours: actualHours === '' ? null : Number(actualHours) });
  const saveTaskType = (taskType) => onAction('update_task_details', { taskType, ...(SEVERITY_APPLIES_TO.has(taskType) ? {} : { severity: '' }) });
  const savePriority = (priority) => onAction('update_task_details', { priority });
  const saveSeverity = (severity) => onAction('update_task_details', { severity });

  return (
    <div className="knx-side-panel">
      <div className="knx-side-panel-header">
        <span className="knx-side-panel-title">Tarea</span>
        {task.url && (
          <a className="knx-block-ask" href={task.url} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', marginRight: 10 }}>
            <NotionLinkIcon /> Ver en Notion
          </a>
        )}
        <button type="button" className="knx-side-panel-close" onClick={onClose} aria-label="Cerrar">×</button>
      </div>
      <div className="knx-side-panel-thread knx-board-detail-body">
        <div className="knx-board-field">
          <label>Título</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={saveTitle} />
        </div>
        <div className="knx-board-field">
          <label>Descripción</label>
          <textarea rows={8} value={description} onChange={(e) => setDescription(e.target.value)} onBlur={saveDescription} />
        </div>
        <div className="knx-board-field-row">
          <div className="knx-board-field">
            <label>Tipo</label>
            <select value={task.taskType ?? ''} onChange={(e) => saveTaskType(e.target.value)}>
              <option value="">Sin definir</option>
              {TASK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="knx-board-field">
            <label>Prioridad</label>
            <select value={task.priority ?? ''} onChange={(e) => savePriority(e.target.value)}>
              <option value="">Sin definir</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {SEVERITY_APPLIES_TO.has(task.taskType) && (
            <div className="knx-board-field">
              <label>Severidad</label>
              <select value={task.severity ?? ''} onChange={(e) => saveSeverity(e.target.value)}>
                <option value="">Sin definir</option>
                {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="knx-board-field-row">
          <div className="knx-board-field">
            <label>Responsable</label>
            <select value={task.responsableId ?? ''} onChange={(e) => onAction('update_responsable', { responsableId: e.target.value || null })}>
              <option value="">Sin asignar</option>
              {talento.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="knx-board-field">
            <label>Estado</label>
            <select value={task.status} onChange={(e) => onAction('move_task', { status: e.target.value })}>
              {columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div className="knx-board-field-row">
          <div className="knx-board-field">
            <label>Inicio</label>
            <input type="date" value={startDate ?? ''} onChange={(e) => setStartDate(e.target.value)} onBlur={saveSchedule} />
          </div>
          <div className="knx-board-field">
            <label>Fin</label>
            <input type="date" value={endDate ?? ''} onChange={(e) => setEndDate(e.target.value)} onBlur={saveSchedule} />
          </div>
          <div className="knx-board-field">
            <label>Estimación (hs)</label>
            <input type="number" min="0" step="0.5" value={estimatedHours ?? ''} onChange={(e) => setEstimatedHours(e.target.value)} onBlur={saveSchedule} />
          </div>
        </div>
        <div className="knx-board-field">
          <label>Horas reales</label>
          <input type="number" min="0" step="0.5" value={actualHours ?? ''} onChange={(e) => setActualHours(e.target.value)} onBlur={saveActualHours} />
        </div>
        <button type="button" className="knx-doc-card-error" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 8 }} onClick={onRemove}>
          Eliminar tarea
        </button>
      </div>
    </div>
  );
}

function formatShortDate(iso) {
  if (!iso) return '—';
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

// "Planificado" en Notion es el estado ANTES de cerrar la planificación — mostrarlo tal cual
// suena a que ya se terminó de planificar. Esto es solo de display, el valor real en Notion
// (y las comparaciones === 'Planificado' del resto del código) no cambian.
function sprintStatusLabel(status) {
  return status === 'Planificado' ? 'Planificando' : status;
}

function daysBetween(a, b) {
  const MS_DAY = 86400000;
  return Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / MS_DAY);
}

const ROADMAP_PX_PER_DAY = 10;
const ROADMAP_MIN_TRACK = 320;
const ROADMAP_INFO_WIDTH = 220;

function epicaDateStatus(e, todayIso) {
  if (todayIso < e.startDate) return 'planificada';
  if (todayIso > e.endDate) return 'completada';
  return 'en_curso';
}

const STATUS_FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'en_curso', label: 'En curso' },
  { id: 'planificada', label: 'Planificadas' },
  { id: 'completada', label: 'Completadas' },
];

function RoadmapView({ iniciativas, selectedEpicaId, onSelectEpica }) {
  const [statusFilter, setStatusFilter] = useState('all');

  const allEpicas = iniciativas.flatMap((i) => i.epicas.map((e) => ({ ...e, iniciativaName: i.name })));
  const withDates = allEpicas.filter((e) => e.startDate && e.endDate);
  const withoutDates = allEpicas.filter((e) => !(e.startDate && e.endDate));
  const todayIso = new Date().toISOString().slice(0, 10);
  const statusCounts = STATUS_FILTERS.map((f) => ({
    ...f,
    count: f.id === 'all' ? withDates.length : withDates.filter((e) => epicaDateStatus(e, todayIso) === f.id).length,
  }));

  if (!withDates.length) {
    return (
      <div className="knx-canvas-group" style={{ marginBottom: 16 }}>
        <div className="knx-canvas-group-head"><span className="knx-canvas-group-name">Roadmap</span></div>
        <p className="knx-knowledge-empty">Ninguna épica tiene fecha inicio/fin cargadas todavía — se completan al editarlas.</p>
        {withoutDates.length > 0 && (
          <div className="knx-roadmap-nodates">
            {withoutDates.map((e) => (
              <span key={e.id} className="knx-epica-fase-badge">
                <span className="knx-epica-dot" style={{ width: 8, height: 8, background: FASE_COLORS[e.fase] ?? '#9CA3AF' }} />
                {e.name}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  const domainStart = withDates.map((e) => e.startDate).sort()[0];
  const ends = withDates.map((e) => e.endDate).sort();
  const domainEnd = ends[ends.length - 1];
  // El track visual se extiende hasta fin del mes de la última épica (no corta el Gantt a mitad
  // de mes dejando un borde en blanco sin etiqueta) — las barras siguen posicionándose con las
  // fechas reales, esto solo extiende el eje/grilla.
  const displayEndDate = new Date(`${domainEnd}T00:00:00Z`);
  displayEndDate.setUTCMonth(displayEndDate.getUTCMonth() + 1, 0);
  const displayDomainEnd = displayEndDate.toISOString().slice(0, 10);
  const totalDays = Math.max(1, daysBetween(domainStart, displayDomainEnd)) + 1;
  const trackWidth = Math.max(ROADMAP_MIN_TRACK, totalDays * ROADMAP_PX_PER_DAY);
  const showToday = todayIso >= domainStart && todayIso <= displayDomainEnd;
  const todayLeft = ROADMAP_INFO_WIDTH + daysBetween(domainStart, todayIso) * ROADMAP_PX_PER_DAY;

  // Eje superior: un tick por mes (etiqueta) + una línea de grilla cada 7 días (semanas).
  const monthTicks = [];
  const monthCursor = new Date(`${domainStart}T00:00:00Z`);
  monthCursor.setUTCDate(1);
  while (monthCursor <= displayEndDate) {
    const iso = monthCursor.toISOString().slice(0, 10);
    const label = monthCursor.toLocaleDateString('es-ES', { month: 'long', timeZone: 'UTC' });
    monthTicks.push({ left: Math.max(0, daysBetween(domainStart, iso)) * ROADMAP_PX_PER_DAY, label: label.charAt(0).toUpperCase() + label.slice(1) });
    monthCursor.setUTCMonth(monthCursor.getUTCMonth() + 1);
  }
  const weekTicks = [];
  for (let d = 0; d <= totalDays; d += 7) weekTicks.push(d * ROADMAP_PX_PER_DAY);

  return (
    <div className="knx-canvas-group" style={{ marginBottom: 16 }}>
      <div className="knx-canvas-group-head">
        <span className="knx-canvas-group-name">Roadmap</span>
        <div className="knx-roadmap-status-filters">
          {statusCounts.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`knx-filter-pill${statusFilter === f.id ? ` knx-filter-pill--active${f.id !== 'all' ? `-${f.id}` : ''}` : ''}`}
              onClick={() => setStatusFilter(f.id)}
            >
              {f.label} · {f.count}
            </button>
          ))}
        </div>
      </div>
      <div className="knx-gantt-scroll">
        <div className="knx-gantt-wrap" style={{ width: ROADMAP_INFO_WIDTH + trackWidth, position: 'relative' }}>
          <div className="knx-gantt-grid" style={{ left: ROADMAP_INFO_WIDTH, width: trackWidth }}>
            {weekTicks.map((left) => <div key={left} style={{ left }} />)}
          </div>
          <div className="knx-gantt-axisrow">
            <div className="knx-gantt-corner" style={{ width: ROADMAP_INFO_WIDTH, flexShrink: 0 }} />
            <div className="knx-gantt-axis" style={{ width: trackWidth }}>
              {monthTicks.map((tk) => <span key={tk.left} style={{ left: tk.left }}>{tk.label}</span>)}
            </div>
          </div>
          {showToday && (
            <>
              <div className="knx-gantt-today" style={{ left: todayLeft }} title="Hoy" />
              <span className="knx-gantt-today-label" style={{ left: todayLeft }}>Hoy · {formatShortDate(todayIso)}</span>
            </>
          )}
          {iniciativas.map((ini) => {
            const epicasConFecha = ini.epicas
              .filter((e) => e.startDate && e.endDate)
              .filter((e) => statusFilter === 'all' || epicaDateStatus(e, todayIso) === statusFilter)
              .sort((a, b) => a.startDate.localeCompare(b.startDate));
            if (!epicasConFecha.length) return null;
            return (
              <div key={ini.id}>
                <div className="knx-gantt-fase"><span>{ini.name}</span></div>
                {epicasConFecha.map((e) => {
                  const barLeft = Math.max(0, daysBetween(domainStart, e.startDate)) * ROADMAP_PX_PER_DAY;
                  const barWidth = Math.max(ROADMAP_PX_PER_DAY, (daysBetween(e.startDate, e.endDate) + 1) * ROADMAP_PX_PER_DAY);
                  const selected = selectedEpicaId === e.id;
                  return (
                    <button
                      type="button"
                      key={e.id}
                      className={`knx-gantt-row knx-gantt-row--clickable${selected ? ' knx-gantt-row--selected' : ''}`}
                      onClick={() => onSelectEpica(e.id)}
                    >
                      <div className="knx-gantt-info" style={{ width: ROADMAP_INFO_WIDTH }}>
                        <div className="knx-gantt-task-name" title={e.name}>{e.name}</div>
                        <div className="knx-gantt-assignee">{e.fase ?? 'Sin fase'} · {formatShortDate(e.startDate)} → {formatShortDate(e.endDate)}</div>
                      </div>
                      <div className="knx-gantt-track" style={{ width: trackWidth }}>
                        <div className="knx-gantt-bar" style={{ left: barLeft, width: barWidth, background: FASE_COLORS[e.fase] ?? '#9CA3AF', borderColor: FASE_COLORS[e.fase] ?? '#9CA3AF' }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      {withoutDates.length > 0 && (
        <div className="knx-roadmap-nodates">
          <span className="knx-canvas-ficha-progress">Sin fecha todavía:</span>
          {withoutDates.map((e) => (
            <span key={e.id} className="knx-epica-fase-badge">
              <span className="knx-epica-dot" style={{ width: 8, height: 8, background: FASE_COLORS[e.fase] ?? '#9CA3AF' }} />
              {e.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Fila de una Iniciativa existente — nombre en modo lectura, con ✎ para renombrar inline y 🗑
// para borrar (soft delete en Notion, bloqueado del lado del servidor si todavía tiene épicas).
function IniciativaRow({ tenant, projectId, iniciativa, onReload, onRequestDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(iniciativa.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const save = async () => {
    if (!name.trim() || name.trim() === iniciativa.name) { setEditing(false); setName(iniciativa.name); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/dev/iniciativas/${iniciativa.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo renombrar.');
      setEditing(false);
      onReload();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      {editing ? (
        <input
          className="knx-canvas-meta-select"
          style={{ flex: 1, minWidth: 0 }}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          disabled={saving}
          autoFocus
        />
      ) : (
        <span>{iniciativa.name} <span className="knx-canvas-group-count">{iniciativa.epicas.length} épica{iniciativa.epicas.length !== 1 ? 's' : ''}</span></span>
      )}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {editing ? (
          <button type="button" className="knx-canvas-mini" disabled={saving} onClick={save}>Guardar</button>
        ) : (
          <button type="button" className="knx-canvas-mini" onClick={() => setEditing(true)}>✎</button>
        )}
        <button type="button" className="knx-canvas-mini" onClick={() => onRequestDelete(iniciativa)}>🗑</button>
      </div>
      {error && <p className="knx-canvas-error" style={{ margin: 0 }}>{error}</p>}
    </div>
  );
}

function NewIniciativaForm({ tenant, projectId, iniciativas, onCreate, onReload }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onCreate(name);
      setName('');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    const target = deleteTarget;
    setDeleteTarget(null);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/dev/iniciativas/${target.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo eliminar.');
      onReload();
    } catch (e) {
      setDeleteError(e.message);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button type="button" className="knx-new-chat" onClick={() => setOpen((v) => !v)}>+ Nueva iniciativa</button>
      {open && (
        <div className="knx-canvas-newcol-form knx-popover-form" style={{ width: 280 }}>
          {iniciativas.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
              {iniciativas.map((ini) => (
                <IniciativaRow key={ini.id} tenant={tenant} projectId={projectId} iniciativa={ini} onReload={onReload} onRequestDelete={setDeleteTarget} />
              ))}
            </div>
          )}
          {deleteError && <p className="knx-canvas-error">{deleteError}</p>}
          <input className="knx-canvas-meta-select" placeholder="Nombre de la iniciativa…" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="knx-canvas-newcol-actions">
            <button type="button" className="knx-canvas-mini" disabled={saving} onClick={submit}>Agregar</button>
            <button type="button" className="knx-canvas-mini" onClick={() => setOpen(false)}>Cerrar</button>
          </div>
        </div>
      )}
      <KaiNextConfirmDialog
        open={!!deleteTarget}
        title="Eliminar iniciativa"
        message={`¿Eliminar "${deleteTarget?.name}"? No se puede deshacer (se puede recuperar desde la papelera de Notion). Solo se puede borrar si no tiene épicas.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// Fila inline de una sola línea — fase y fechas quedan en blanco al crear, se completan después
// con el editor (lápiz ✎) que ya tiene cada épica, en vez de pedir todo de una al crearla.
function NewEpicaModal({ tenant, projectId, iniciativas, onClose, onCreated }) {
  const [iniciativaId, setIniciativaId] = useState(iniciativas[0]?.id || '');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    if (!name.trim()) { setError('Ponele un nombre a la épica.'); return; }
    if (!iniciativaId) { setError('Elegí una iniciativa.'); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/dev/epicas`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, iniciativaId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo crear.');
      onCreated();
    } catch (e) {
      setError(e.message || 'No se pudo crear.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="knx-ficha-share-backdrop" onClick={onClose}>
      <div className="knx-ficha-review-modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(420px, 92vw)' }}>
        <div className="knx-ficha-review-head">
          <div><h3 className="knx-ficha-review-title">Nueva épica</h3></div>
          <button type="button" className="knx-side-panel-close" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>
        {error && <p className="knx-canvas-error">{error}</p>}
        <div className="knx-ficha-review-field" style={{ marginBottom: 14 }}>
          <label>Iniciativa</label>
          <select className="knx-canvas-meta-select" value={iniciativaId} onChange={(e) => setIniciativaId(e.target.value)}>
            {iniciativas.map((ini) => <option key={ini.id} value={ini.id}>{ini.name}</option>)}
          </select>
        </div>
        <div className="knx-ficha-review-field">
          <label>Nombre</label>
          <input className="knx-canvas-meta-select" placeholder="Nombre de la épica…" value={name} onChange={(e) => setName(e.target.value)} autoFocus onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
        </div>
        <div className="knx-canvas-ficha-draft-actions" style={{ marginTop: 16 }}>
          <button type="button" className="knx-canvas-mini" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="button" className="knx-analisis-sources-save" onClick={submit} disabled={saving}>{saving ? 'Creando…' : 'Crear épica'}</button>
        </div>
      </div>
    </div>
  );
}

function NewTareaForm({ activeSprint, onCreate }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [addToSprint, setAddToSprint] = useState(!!activeSprint);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  if (!open) return <button type="button" className="knx-canvas-add-item-btn" onClick={() => setOpen(true)}>+ Nueva tarea</button>;

  const submit = async () => {
    if (!title.trim() || !startDate || !endDate || !estimatedHours) {
      setErr('Completá título, fechas y estimación.');
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await onCreate({ title, sprintId: addToSprint && activeSprint ? activeSprint.id : null, startDate, endDate, estimatedHours });
      setTitle(''); setStartDate(''); setEndDate(''); setEstimatedHours('');
      setOpen(false);
    } catch (e) {
      setErr(e.message || 'No se pudo crear.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="knx-canvas-newcol-form">
      {err && <p className="knx-canvas-error">{err}</p>}
      <input className="knx-canvas-meta-select" placeholder="Título de la tarea…" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      {activeSprint && (
        <label className="knx-canvas-meta-checkbox">
          <input type="checkbox" checked={addToSprint} onChange={(e) => setAddToSprint(e.target.checked)} />
          <span className="knx-canvas-meta-checkbox-box" />
          Agregar al sprint activo ({activeSprint.title})
        </label>
      )}
      <div className="knx-canvas-meta-form-row">
        <div className="knx-canvas-meta-field">
          <label className="knx-canvas-meta-field-label">Inicio</label>
          <input type="date" className="knx-canvas-meta-select" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="knx-canvas-meta-field">
          <label className="knx-canvas-meta-field-label">Fin</label>
          <input type="date" className="knx-canvas-meta-select" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>
      <input className="knx-canvas-meta-select" type="number" placeholder="Estimación (horas)" value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} />
      <div className="knx-canvas-newcol-actions">
        <button type="button" className="knx-canvas-mini" disabled={saving} onClick={submit}>Agregar</button>
        <button type="button" className="knx-canvas-mini" onClick={() => setOpen(false)}>Cancelar</button>
      </div>
    </div>
  );
}

// Strip liviano de HTML a texto plano (sin dependencia nueva) — preserva saltos de línea en
// elementos de bloque para que la IA todavía distinga títulos/párrafos/items al leerlo.
function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/(h1|h2|h3|h4|p|div|li|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeText(name) {
  return (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

const IMPORT_STEPS = [
  { id: 'documento', label: 'Documento' },
  { id: 'revisar', label: 'Revisar' },
];

function ImportDocModal({ tenant, projectId, iniciativas, onClose, onImported }) {
  const [iniciativaId, setIniciativaId] = useState(iniciativas[0]?.id || '');
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null); // { objetivo, epicas: [{name, notas, fase, historias:[{text, included, existing}], included, matchedEpicaId, expanded}] }
  const existingEpicas = iniciativas.find((i) => i.id === iniciativaId)?.epicas || [];

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || '');
      const isHtml = /\.html?$/i.test(file.name) || raw.trim().startsWith('<');
      setText(isHtml ? stripHtml(raw) : raw);
    };
    reader.readAsText(file);
  };

  const extract = async () => {
    if (!iniciativaId) { setError('Elegí una iniciativa primero.'); return; }
    if (!text.trim()) { setError('Pegá texto o subí un documento primero.'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/dev/import/extract`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo interpretar el documento.');
      const existingByName = new Map((existingEpicas || []).map((e) => [normalizeText(e.name), e]));

      // Para cada épica que matchea con una ya existente, traigo sus tareas actuales para
      // detectar qué historias ya están cargadas y no duplicarlas.
      const matches = (data.epicas || []).map((e) => existingByName.get(normalizeText(e.name)) || null);
      const existingTareasByEpicaId = new Map();
      await Promise.all(
        [...new Set(matches.filter(Boolean).map((m) => m.id))].map(async (epicaId) => {
          const r = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/dev/epicas/${epicaId}/tareas`);
          const d = await r.json();
          existingTareasByEpicaId.set(epicaId, new Set((d.tareas || []).map((t) => normalizeText(t.title))));
        })
      );

      const epicas = (data.epicas || []).map((e, idx) => {
        const match = matches[idx];
        const existingTitles = match ? existingTareasByEpicaId.get(match.id) : null;
        return {
          name: e.name,
          notas: e.notas || '',
          // Si la épica ya existe y ya tenía una fase propia, esa gana (no la pisamos con la
          // estimación de Kai); si no tenía, o es una épica nueva, se precarga con lo que Kai
          // infirió del contenido de sus historias — editable antes de confirmar.
          fase: match?.fase || (FASE_OPTIONS.includes(e.fase) ? e.fase : ''),
          included: true,
          expanded: false,
          matchedEpicaId: match?.id || null,
          historias: (e.historias || []).map((h) => {
            const dup = existingTitles?.has(normalizeText(h));
            return { text: h, included: !dup, existing: !!dup };
          }),
        };
      });
      setPreview({ objetivo: data.objetivo || '', epicas });
    } catch (e) {
      setError(e.message || 'No se pudo interpretar el documento.');
    } finally {
      setLoading(false);
    }
  };

  const updateEpicaField = (idx, field, value) => {
    setPreview((p) => ({ ...p, epicas: p.epicas.map((e, i) => (i === idx ? { ...e, [field]: value } : e)) }));
  };
  const updateHistoria = (epIdx, hIdx, field, value) => {
    setPreview((p) => ({ ...p, epicas: p.epicas.map((e, i) => (i === epIdx ? { ...e, historias: e.historias.map((h, j) => (j === hIdx ? { ...h, [field]: value } : h)) } : e)) }));
  };
  const addHistoria = (epIdx) => {
    setPreview((p) => ({ ...p, epicas: p.epicas.map((e, i) => (i === epIdx ? { ...e, historias: [...e.historias, { text: '', included: true, existing: false }] } : e)) }));
  };
  const toggleAll = (value) => {
    setPreview((p) => ({ ...p, epicas: p.epicas.map((e) => ({ ...e, included: value, historias: e.historias.map((h) => (h.existing ? h : { ...h, included: value })) })) }));
  };

  const confirm = async () => {
    setSaving(true);
    setError(null);
    try {
      const body = {
        iniciativaId,
        objetivo: preview.objetivo,
        epicas: preview.epicas
          .filter((e) => e.included && e.name.trim())
          .map((e) => ({
            name: e.name,
            notas: e.notas,
            fase: e.fase || undefined,
            matchedEpicaId: e.matchedEpicaId,
            historias: e.historias.filter((h) => h.included && h.text.trim()).map((h) => h.text),
          }))
          // Una épica que ya existe se manda igual aunque no tenga historias nuevas, si trae una
          // fase para actualizar — si no, no tiene nada que hacer en el confirm y se descarta.
          .filter((e) => e.historias.length || e.fase || !e.matchedEpicaId),
      };
      const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/dev/import/confirm`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo importar.');
      onImported();
    } catch (e) {
      setError(e.message || 'No se pudo importar.');
    } finally {
      setSaving(false);
    }
  };

  const totalEpicas = preview?.epicas.length ?? 0;
  const totalHistorias = preview?.epicas.reduce((n, e) => n + e.historias.length, 0) ?? 0;
  const matchedCount = preview?.epicas.filter((e) => e.matchedEpicaId).length ?? 0;
  const dupHistoriasCount = preview?.epicas.reduce((n, e) => n + e.historias.filter((h) => h.existing).length, 0) ?? 0;
  const includedEpicas = preview?.epicas.filter((e) => e.included).length ?? 0;
  const newEpicasCount = preview?.epicas.filter((e) => e.included && !e.matchedEpicaId).length ?? 0;
  const updatedEpicasCount = includedEpicas - newEpicasCount;
  const includedHistorias = preview?.epicas.reduce((n, e) => (e.included ? n + e.historias.filter((h) => h.included).length : n), 0) ?? 0;
  const step = preview ? 'revisar' : 'documento';

  return (
    <div className="knx-ficha-share-backdrop" onClick={onClose}>
      <div className="knx-ficha-review-modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(680px, 94vw)', maxHeight: '86vh', overflowY: 'auto' }}>
        <div className="knx-ficha-review-head">
          <div>
            <h3 className="knx-ficha-review-title">Importar épicas con Kai</h3>
            <div className="knx-import-steps">
              {IMPORT_STEPS.map((s, i) => {
                const done = IMPORT_STEPS.findIndex((x) => x.id === step) > i;
                const current = s.id === step;
                return (
                  <span key={s.id} className={`knx-import-step${current ? ' knx-import-step--current' : ''}${done ? ' knx-import-step--done' : ''}`}>
                    <span className="knx-import-step-dot">{done ? '✓' : i + 1}</span>{s.label}
                  </span>
                );
              })}
            </div>
          </div>
          <button type="button" className="knx-side-panel-close" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>
        {error && <p className="knx-canvas-error">{error}</p>}

        {!preview ? (
          <>
            <div className="knx-ficha-review-field" style={{ marginBottom: 14 }}>
              <label>Iniciativa destino</label>
              <select className="knx-canvas-meta-select" value={iniciativaId} onChange={(e) => setIniciativaId(e.target.value)}>
                {iniciativas.map((ini) => <option key={ini.id} value={ini.id}>{ini.name}</option>)}
              </select>
            </div>
            {fileName ? (
              <div className="knx-import-file-card" style={{ marginBottom: 14 }}>
                <span>📄</span>
                <span className="knx-import-file-name">{fileName}</span>
                <button type="button" className="knx-epica-inline-add-link" onClick={() => { setFileName(null); setText(''); }} disabled={loading}>Quitar</button>
              </div>
            ) : (
              <>
                <div className="knx-ficha-review-field" style={{ marginBottom: 14 }}>
                  <label>Documento (.txt, .md o .html)</label>
                  <input type="file" accept=".txt,.md,.markdown,.html,.htm" onChange={onFile} />
                </div>
                <div className="knx-ficha-review-field" style={{ marginBottom: 14 }}>
                  <label>O pegá el texto acá</label>
                  <textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder="Pegá el contenido del documento…" />
                </div>
              </>
            )}
            <div className="knx-canvas-ficha-draft-actions" style={{ marginTop: 16 }}>
              <button type="button" className="knx-canvas-mini" onClick={onClose} disabled={loading}>Cancelar</button>
              <button type="button" className="knx-analisis-sources-save" onClick={extract} disabled={loading}>
                {loading && <span className="knx-spinner" />}
                {loading ? 'Extrayendo…' : 'Extraer con IA'}
              </button>
            </div>
          </>
        ) : (
          <>
            {fileName && (
              <div className="knx-import-file-card">
                <span>📄</span>
                <span className="knx-import-file-name">{fileName}</span>
                <button type="button" className="knx-epica-inline-add-link" onClick={() => setPreview(null)}>Cambiar</button>
              </div>
            )}
            <div className="knx-import-summary">
              <span className="knx-canvas-avatar">K</span>
              <p>
                Encontré <strong>{totalEpicas} épica{totalEpicas !== 1 ? 's' : ''} y {totalHistorias} historia{totalHistorias !== 1 ? 's' : ''}</strong>.
                {matchedCount > 0 ? ` ${matchedCount} ya exist${matchedCount !== 1 ? 'en' : 'e'} en esta iniciativa: le${matchedCount !== 1 ? 's' : ''} sumo las historias nuevas.` : ''}
                {dupHistoriasCount > 0 ? ` ${dupHistoriasCount} historia${dupHistoriasCount !== 1 ? 's' : ''} ya estaba${dupHistoriasCount !== 1 ? 'n' : ''} cargada${dupHistoriasCount !== 1 ? 's' : ''}, no la${dupHistoriasCount !== 1 ? 's' : ''} vuelvo a crear.` : ''}
              </p>
            </div>
            <div className="knx-ficha-review-field" style={{ marginBottom: 14 }}>
              <label>Objetivo de la iniciativa (se completa solo si está vacío)</label>
              <textarea rows={3} value={preview.objetivo} onChange={(e) => setPreview((p) => ({ ...p, objetivo: e.target.value }))} />
            </div>
            <div className="knx-import-toolbar">
              <span className="knx-canvas-ficha-progress">Marcá lo que querés crear. Podés editar nombres antes de confirmar.</span>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="knx-epica-inline-add-link" onClick={() => toggleAll(true)}>Seleccionar todo</button>
                <button type="button" className="knx-epica-inline-add-link" onClick={() => toggleAll(false)}>Ninguno</button>
              </div>
            </div>
            {preview.epicas.map((e, epIdx) => (
              <div className="knx-import-epica" key={epIdx}>
                <div className="knx-import-epica-head">
                  <input type="checkbox" checked={e.included} onChange={(ev) => updateEpicaField(epIdx, 'included', ev.target.checked)} />
                  <button type="button" className="knx-import-epica-chevron" onClick={() => updateEpicaField(epIdx, 'expanded', !e.expanded)} aria-label="Expandir">
                    {e.expanded ? '▾' : '▸'}
                  </button>
                  <div className="knx-import-epica-name-col">
                    <input className="knx-import-epica-name-input" value={e.name} onChange={(ev) => updateEpicaField(epIdx, 'name', ev.target.value)} placeholder="Nombre de la épica" disabled={!!e.matchedEpicaId} />
                    <span className="knx-canvas-ficha-progress">{e.historias.length} historia{e.historias.length !== 1 ? 's' : ''}{e.matchedEpicaId ? ' · se suma a la épica existente' : ''}</span>
                  </div>
                  <select className="knx-canvas-meta-select knx-import-fase-select" value={e.fase} onChange={(ev) => updateEpicaField(epIdx, 'fase', ev.target.value)}>
                    <option value="">Sin fase</option>
                    {FASE_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <span className={`knx-badge ${e.matchedEpicaId ? 'knx-badge--off' : 'knx-badge--active'}`}>{e.matchedEpicaId ? 'Ya existe' : 'Nueva'}</span>
                </div>
                {e.expanded && (
                  <div className="knx-import-epica-body">
                    {!e.matchedEpicaId && (
                      <textarea rows={2} value={e.notas} onChange={(ev) => updateEpicaField(epIdx, 'notas', ev.target.value)} placeholder="Notas/contexto de la épica" />
                    )}
                    {e.historias.map((h, hIdx) => (
                      <div className={`knx-import-historia-row${h.existing ? ' knx-import-historia-row--existing' : ''}`} key={hIdx}>
                        <input type="checkbox" checked={h.included} onChange={(ev) => updateHistoria(epIdx, hIdx, 'included', ev.target.checked)} />
                        <input className="knx-canvas-meta-select" value={h.text} onChange={(ev) => updateHistoria(epIdx, hIdx, 'text', ev.target.value)} />
                        {h.existing && <span className="knx-canvas-ficha-progress">ya existe</span>}
                      </div>
                    ))}
                    <button type="button" className="knx-canvas-mini" onClick={() => addHistoria(epIdx)}>+ Historia</button>
                  </div>
                )}
              </div>
            ))}
            <div className="knx-canvas-ficha-draft-actions" style={{ marginTop: 16 }}>
              <button type="button" className="knx-canvas-mini" onClick={() => setPreview(null)} disabled={saving}>Volver</button>
              <button type="button" className="knx-analisis-sources-save" onClick={confirm} disabled={saving || !includedEpicas}>
                {saving ? 'Importando…' : (() => {
                  const parts = [];
                  if (newEpicasCount) parts.push(`crear ${newEpicasCount} épica${newEpicasCount !== 1 ? 's' : ''}`);
                  if (updatedEpicasCount) parts.push(`actualizar ${updatedEpicasCount} existente${updatedEpicasCount !== 1 ? 's' : ''}`);
                  return `${parts.join(' y ')} · ${includedHistorias} historia${includedHistorias !== 1 ? 's' : ''}`;
                })()}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EpicaTareas({ tenant, projectId, epicaId, activeSprint, onReload }) {
  const [tareas, setTareas] = useState(null);
  const [scheduleFor, setScheduleFor] = useState(null); // taskId pendiente de completar antes de salir de Backlog
  const [err, setErr] = useState(null);

  const load = () => {
    fetch(`/api/kai-next/${tenant}/projects/${projectId}/dev/epicas/${epicaId}/tareas`)
      .then((r) => r.json())
      .then((d) => setTareas(d.tareas ?? []));
  };
  useEffect(() => { load(); }, [tenant, projectId, epicaId]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = async (payload) => {
    const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/dev/board`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo actualizar.');
  };

  const createTarea = async (payload) => {
    const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/dev/epicas/${epicaId}/tareas`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo crear.');
    load();
    onReload?.();
  };

  // Mismo PATCH que ya usa Tablero (assign_sprint → addExistingTask) — expuesto acá para no
  // tener que salir del panel de la épica solo para jalar una historia existente al sprint.
  // Dentro de un sprint no debería quedar nada en Backlog: si la tarea ya tiene fecha de fin y
  // estimación, pasa directo a "Por hacer"; si le faltan, se pide completarlas acá mismo (mismo
  // ScheduleModal/validación que ya exige moveTask para salir de Backlog en Tablero).
  const assignSprint = async (pageId, sprintId) => {
    setErr(null);
    try {
      await patch({ action: 'assign_sprint', pageId, sprintId });
      const task = tareas.find((t) => t.id === pageId);
      if (task?.status === 'Backlog') {
        const incompleta = !task.startDate || !task.dueDate || task.estimatedHours == null;
        if (incompleta) {
          setScheduleFor(pageId);
          return;
        }
        await patch({ action: 'move_task', pageId, status: 'Not started' });
      }
      load();
      onReload?.();
    } catch (e) {
      setErr(e.message);
    }
  };

  const confirmSchedule = async ({ startDate, endDate, estimatedHours }) => {
    const pageId = scheduleFor;
    setScheduleFor(null);
    setErr(null);
    try {
      await patch({ action: 'update_schedule', pageId, startDate, endDate, estimatedHours });
      await patch({ action: 'move_task', pageId, status: 'Not started' });
      load();
      onReload?.();
    } catch (e) {
      setErr(e.message);
    }
  };

  if (tareas === null) return <p className="knx-knowledge-empty">Cargando…</p>;

  return (
    <div className="knx-historia-list">
      {err && <p className="knx-canvas-error">{err}</p>}
      {!tareas.length ? <p className="knx-knowledge-empty">Sin tareas todavía.</p> : tareas.map((t) => (
        <div className="knx-historia-row" key={t.id}>
          <span className="knx-historia-title">{t.title}</span>
          <div className="knx-historia-meta">
            <span className={`knx-badge ${STATUS_BADGE_CLASS[t.status] ?? 'knx-badge--off'}`}>{STATUS_LABELS[t.status] ?? t.status}</span>
            {t.sprintIds?.length ? (
              <span className="knx-badge knx-badge--progress">{activeSprint && t.sprintIds.includes(activeSprint.id) ? activeSprint.title : 'En un sprint'}</span>
            ) : (
              <span className="knx-badge knx-badge--off">Sin sprint</span>
            )}
            {t.status === 'Backlog' && (!t.startDate || !t.dueDate || t.estimatedHours == null) && (
              <span className="knx-canvas-ficha-progress">faltan fechas/estimación</span>
            )}
          </div>
          {!t.sprintIds?.length && <AssignSprintControl pageId={t.id} activeSprint={activeSprint} onAssigned={assignSprint} />}
        </div>
      ))}
      <NewTareaForm activeSprint={activeSprint} onCreate={createTarea} />
      {scheduleFor && <ScheduleModal onCancel={() => setScheduleFor(null)} onConfirm={confirmSchedule} />}
    </div>
  );
}

function EditEpicaForm({ tenant, projectId, epica, onSaved, onCancel }) {
  const [fase, setFase] = useState(epica.fase ?? '');
  const [startDate, setStartDate] = useState(epica.startDate ?? '');
  const [endDate, setEndDate] = useState(epica.endDate ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const save = async () => {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/dev/epicas/${epica.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fase: fase || null, startDate: startDate || null, endDate: endDate || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar.');
      onSaved();
    } catch (e) {
      setErr(e.message || 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="knx-epica-edit">
      {err && <p className="knx-canvas-error" style={{ flexBasis: '100%' }}>{err}</p>}
      <div className="knx-canvas-meta-field">
        <label className="knx-canvas-meta-field-label">Fase</label>
        <select className="knx-canvas-meta-select" value={fase} onChange={(e) => setFase(e.target.value)}>
          <option value="">Sin fase</option>
          {FASE_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      <div className="knx-canvas-meta-field">
        <label className="knx-canvas-meta-field-label">Inicio</label>
        <input type="date" className="knx-canvas-meta-select" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </div>
      <div className="knx-canvas-meta-field">
        <label className="knx-canvas-meta-field-label">Fin</label>
        <input type="date" className="knx-canvas-meta-select" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>
      <div className="knx-canvas-newcol-actions">
        <button type="button" className="knx-canvas-mini" disabled={saving} onClick={save}>Guardar</button>
        <button type="button" className="knx-canvas-mini" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

// Panel de detalle de una Épica — reemplaza la antigua tarjeta expandible: se abre al hacer click
// en el nombre de una épica en el Roadmap. Reusa .knx-side-panel (ya existente, overlay fijo a la
// derecha — ver TaskDetailPanel en KaiNextSprints.jsx) y el patrón de chat lateral ya probado en
// KaiNextAnalisis.jsx (panelMessages/sendToPanel), pero el chat pega a una ruta propia y liviana
// (.../dev/epicas/{epicaId}/ask) en vez del chat agéntico completo, para que las respuestas queden
// ancladas a esta épica y no se mezclen con el historial general de conversaciones.
function EpicaDetailPanel({ tenant, projectId, epica, index, total, activeSprint, onPrev, onNext, onClose, onReload }) {
  const [editing, setEditing] = useState(false);
  const [historias, setHistorias] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);

  const loadHistorias = () => {
    fetch(`/api/kai-next/${tenant}/projects/${projectId}/dev/epicas/${epica.id}/tareas`)
      .then((r) => r.json())
      .then((d) => setHistorias(d.tareas ?? []));
  };
  useEffect(() => {
    setHistorias(null);
    setMessages([]);
    setEditing(false);
    loadHistorias();
  }, [tenant, projectId, epica.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const doneCount = historias?.filter((t) => t.status === 'Done').length ?? 0;
  const totalCount = historias?.length ?? 0;
  const color = FASE_COLORS[epica.fase] ?? '#9CA3AF';

  const sendChat = async (question) => {
    const q = question.trim();
    if (!q || sending) return;
    setMessages((prev) => [...prev, { role: 'user', content: q }]);
    setChatInput('');
    setSending(true);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/dev/epicas/${epica.id}/ask`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, history: messages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo responder.');
      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: 'assistant', content: e.message || 'No se pudo responder.' }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="knx-side-panel">
      <div className="knx-side-panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button type="button" className="knx-side-panel-close" aria-label="Épica anterior" onClick={onPrev} disabled={index <= 0}>‹</button>
          <button type="button" className="knx-side-panel-close" aria-label="Épica siguiente" onClick={onNext} disabled={index >= total - 1}>›</button>
          <span className="knx-canvas-ficha-progress" style={{ marginLeft: 6 }}>{index + 1} de {total}</span>
        </div>
        <button type="button" className="knx-side-panel-close" aria-label="Cerrar panel" onClick={onClose}>×</button>
      </div>
      <div className="knx-side-panel-thread">
        <h3 className="knx-epica-panel-title">{epica.name}</h3>
        <div className="knx-epica-panel-badges">
          <span className="knx-epica-fase-badge" style={{ color, background: `${color}1A` }}>{epica.fase ?? 'Sin fase'}</span>
          <button type="button" className="knx-canvas-icon-btn" title="Editar fase/fechas" onClick={() => setEditing((v) => !v)}>✎</button>
        </div>

        {editing && (
          <EditEpicaForm
            tenant={tenant}
            projectId={projectId}
            epica={epica}
            onCancel={() => setEditing(false)}
            onSaved={() => { setEditing(false); onReload(); }}
          />
        )}

        <div className="knx-epica-panel-stats">
          <div className="knx-epica-panel-stat-item">
            <span className="knx-canvas-meta-field-label">Fechas</span>
            <span>{epica.startDate && epica.endDate ? `${formatShortDate(epica.startDate)} → ${formatShortDate(epica.endDate)}` : 'Sin fecha'}</span>
          </div>
          <div className="knx-epica-panel-stat-item">
            <span className="knx-canvas-meta-field-label">Avance</span>
            <div className="knx-epica-progress-row">
              <div className="knx-epica-progress-bar"><div className="knx-epica-progress-fill" style={{ width: totalCount ? `${(doneCount / totalCount) * 100}%` : '0%' }} /></div>
              <span className="knx-canvas-ficha-progress">{doneCount}/{totalCount}</span>
            </div>
          </div>
        </div>

        {epica.notas && <p className="knx-epica-notas" style={{ marginLeft: 0 }}>{epica.notas}</p>}

        <div style={{ marginTop: 10 }}>
          <h4 className="knx-canvas-meta-field-label">Historias · {totalCount}</h4>
          <EpicaTareas tenant={tenant} projectId={projectId} epicaId={epica.id} activeSprint={activeSprint} onReload={onReload} />
        </div>

        {messages.map((m, i) => (
          <div key={i} className={`knx-side-msg knx-side-msg--${m.role}`}>{m.content}</div>
        ))}
        {sending && <div className="knx-side-thinking"><span className="knx-thinking-dot" /> Kai está pensando…</div>}
      </div>
      <form className="knx-side-panel-input" onSubmit={(e) => { e.preventDefault(); sendChat(chatInput); }}>
        <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Preguntale a Kai sobre esta épica…" disabled={sending} />
        <button type="submit" disabled={sending || !chatInput.trim()}>Enviar</button>
      </form>
    </div>
  );
}

// Rollup a nivel Proyecto: agrupa TODAS las épicas (todas las iniciativas) por Fase, con el
// rango de fechas (mín. inicio / máx. fin) de las que ya tienen fecha en esa fase. No inventa
// fechas "propuestas" — fases sin ninguna épica muestran "Sin épicas".
function FaseStepper({ iniciativas }) {
  const allEpicas = iniciativas.flatMap((i) => i.epicas);
  const porFase = FASE_OPTIONS.map((fase) => {
    const epicas = allEpicas.filter((e) => e.fase === fase);
    const dated = epicas.filter((e) => e.startDate && e.endDate);
    const starts = dated.map((e) => e.startDate).sort();
    const ends = dated.map((e) => e.endDate).sort();
    return { fase, count: epicas.length, start: starts[0] ?? null, end: ends[ends.length - 1] ?? null };
  });

  return (
    <div className="knx-fase-stepper">
      {porFase.map((f, idx) => (
        <div className={`knx-fase-step${!f.count ? ' knx-fase-step--empty' : ''}`} key={f.fase}>
          <div className="knx-fase-step-top">
            <span className="knx-fase-step-dot" style={{ background: FASE_COLORS[f.fase], borderColor: FASE_COLORS[f.fase] }} />
            {idx < porFase.length - 1 && <span className="knx-fase-step-line" style={{ background: FASE_COLORS[f.fase] }} />}
          </div>
          <span className="knx-fase-step-name">{f.fase}</span>
          <span className="knx-fase-step-dates">
            {!f.count ? 'Sin épicas' : f.start ? `${formatShortDate(f.start)} → ${formatShortDate(f.end)}` : `${f.count} épica${f.count !== 1 ? 's' : ''} sin fecha`}
          </span>
        </div>
      ))}
    </div>
  );
}

// Mismo alta de tarea que ya existe por Épica (EpicaTareas/NewTareaForm), pero disponible desde
// el Tablero — acá no hay una épica implícita, así que se elige (agrupada por Iniciativa); el
// resto (proyecto/iniciativa) ya está dado por estar parado en este proyecto, no hace falta
// repetir ese picker como en el "Nueva tarea" de Sprints (que sí es multi-proyecto).
function NewTareaModal({ tenant, projectId, iniciativas, talento, activeSprint, onClose, onCreated }) {
  const epicasOptions = iniciativas.map((ini) => ({ iniciativaName: ini.name, epicas: ini.epicas }));
  const firstEpicaId = epicasOptions.flatMap((g) => g.epicas)[0]?.id || '';

  const [epicaId, setEpicaId] = useState(firstEpicaId);
  const [title, setTitle] = useState('');
  const [addToSprint, setAddToSprint] = useState(!!activeSprint);
  const [taskType, setTaskType] = useState('');
  const [priority, setPriority] = useState('');
  const [severity, setSeverity] = useState('');
  const [responsableId, setResponsableId] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async () => {
    if (!epicaId) { setErr('Elegí una épica.'); return; }
    if (!title.trim() || !startDate || !endDate || !estimatedHours) {
      setErr('Completá título, fechas y estimación.');
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/dev/epicas/${epicaId}/tareas`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, sprintId: addToSprint && activeSprint ? activeSprint.id : null, startDate, endDate, estimatedHours,
          taskType: taskType || undefined, priority: priority || undefined, severity: severity || undefined,
          responsableId: responsableId || undefined, description: description || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo crear.');
      onCreated();
    } catch (e) {
      setErr(e.message || 'No se pudo crear.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="knx-ficha-share-backdrop" onClick={onClose}>
      <div className="knx-ficha-review-modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(460px, 92vw)' }}>
        <div className="knx-ficha-review-head">
          <div><h3 className="knx-ficha-review-title">Nueva tarea</h3></div>
          <button type="button" className="knx-side-panel-close" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>
        {err && <p className="knx-canvas-error">{err}</p>}
        <div className="knx-ficha-review-field" style={{ marginBottom: 10 }}>
          <label>Épica</label>
          <select className="knx-canvas-meta-select" value={epicaId} onChange={(e) => setEpicaId(e.target.value)}>
            {epicasOptions.map((g) => (
              <optgroup key={g.iniciativaName} label={g.iniciativaName}>
                {g.epicas.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <input className="knx-canvas-meta-select" placeholder="Título de la tarea…" value={title} onChange={(e) => setTitle(e.target.value)} style={{ marginBottom: 10 }} />
        <div className="knx-canvas-meta-form-row">
          <select className="knx-canvas-meta-select" value={taskType} onChange={(e) => { setTaskType(e.target.value); if (!SEVERITY_APPLIES_TO.has(e.target.value)) setSeverity(''); }}>
            <option value="">Tipo: sin definir</option>
            {TASK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="knx-canvas-meta-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="">Prioridad: sin definir</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        {SEVERITY_APPLIES_TO.has(taskType) && (
          <select className="knx-canvas-meta-select" value={severity} onChange={(e) => setSeverity(e.target.value)} style={{ marginTop: 8 }}>
            <option value="">Severidad: sin definir</option>
            {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        <select className="knx-canvas-meta-select" value={responsableId} onChange={(e) => setResponsableId(e.target.value)} style={{ marginTop: 8 }}>
          <option value="">Responsable: sin asignar</option>
          {(talento ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {activeSprint ? (
          <label className="knx-canvas-meta-checkbox" style={{ marginTop: 8, marginBottom: 10 }}>
            <input type="checkbox" checked={addToSprint} onChange={(e) => setAddToSprint(e.target.checked)} />
            <span className="knx-canvas-meta-checkbox-box" />
            Agregar directamente al sprint activo ({activeSprint.title})
          </label>
        ) : (
          <p className="knx-canvas-meta-empty" style={{ marginTop: 8, marginBottom: 10 }}>Sin sprint activo todavía — la tarea queda en backlog.</p>
        )}
        <div className="knx-canvas-meta-form-row">
          <div className="knx-canvas-meta-field">
            <label className="knx-canvas-meta-field-label">Inicio</label>
            <input type="date" className="knx-canvas-meta-select" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="knx-canvas-meta-field">
            <label className="knx-canvas-meta-field-label">Fin</label>
            <input type="date" className="knx-canvas-meta-select" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <input className="knx-canvas-meta-select" type="number" placeholder="Estimación (horas)" value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} style={{ marginTop: 8 }} />
        <textarea className="knx-canvas-meta-select" rows={2} placeholder="Descripción (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} style={{ marginTop: 8 }} />
        <div className="knx-canvas-ficha-draft-actions" style={{ marginTop: 16 }}>
          <button type="button" className="knx-canvas-mini" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="button" className="knx-analisis-sources-save" onClick={submit} disabled={saving}>{saving ? 'Creando…' : 'Crear tarea'}</button>
        </div>
      </div>
    </div>
  );
}

function ScheduleModal({ onCancel, onConfirm }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [err, setErr] = useState(null);

  const submit = () => {
    if (!startDate || !endDate || !estimatedHours) { setErr('Completá fecha de inicio, fin y estimación.'); return; }
    onConfirm({ startDate, endDate, estimatedHours });
  };

  return (
    <div className="knx-ficha-share-backdrop" onClick={onCancel}>
      <div className="knx-ficha-review-modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(420px, 92vw)' }}>
        <div className="knx-ficha-review-head">
          <div><h3 className="knx-ficha-review-title">Completá la tarea antes de moverla</h3></div>
          <button type="button" className="knx-side-panel-close" aria-label="Cerrar" onClick={onCancel}>×</button>
        </div>
        {err && <p className="knx-canvas-error">{err}</p>}
        <div className="knx-canvas-meta-form-row">
          <div className="knx-canvas-meta-field">
            <label className="knx-canvas-meta-field-label">Inicio</label>
            <input type="date" className="knx-canvas-meta-select" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="knx-canvas-meta-field">
            <label className="knx-canvas-meta-field-label">Fin</label>
            <input type="date" className="knx-canvas-meta-select" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <input className="knx-canvas-meta-select" type="number" placeholder="Estimación (horas)" value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} style={{ marginTop: 8 }} />
        <div className="knx-canvas-ficha-draft-actions" style={{ marginTop: 16 }}>
          <button type="button" className="knx-canvas-mini" onClick={onCancel}>Cancelar</button>
          <button type="button" className="knx-analisis-sources-save" onClick={submit}>Guardar y mover</button>
        </div>
      </div>
    </div>
  );
}

// Asignar una tarea sin sprint a un sprint real — mismo addExistingTask que ya usa el tablero
// real de Sprints para "jalar" una tarea existente, expuesto acá para no tener que ir al otro
// tablero solo para esto.
function AssignSprintControl({ pageId, activeSprint, onAssigned }) {
  const [saving, setSaving] = useState(false);

  if (!activeSprint) return null;

  const confirm = async (e) => {
    e.stopPropagation();
    setSaving(true);
    try {
      await onAssigned(pageId, activeSprint.id);
    } finally {
      setSaving(false);
    }
  };

  return (
    <button type="button" className="knx-sprint-assign-pill" disabled={saving} onClick={confirm}>
      {saving ? 'Agregando…' : `${activeSprint.title} →`}
    </button>
  );
}

// Kanban propio del proyecto (todas las iniciativas) — mismo criterio visual que el tablero real
// de Sprints pero implementación independiente, sin importar/tocar KaiNextSprints.jsx.
// Carriles por Épica (no por Iniciativa) — con solo 1-2 iniciativas por proyecto, agrupar por
// iniciativa colapsa casi siempre a un único carril gigante; la épica es el nivel donde de
// verdad varía qué se está trabajando sprint a sprint / en el tablero. Compartido entre Tablero
// y Sprints para no duplicar el criterio de agrupación.
function buildEpicaLanes(tasks, iniciativas) {
  // uniformType: si TODAS las tareas del carril comparten el mismo Tipo (ej. heredado de la
  // Fase de la épica, ver backfill de Tipo = Desarrollo), el tag se oculta tarjeta por tarjeta —
  // repetir el mismo tag en cada una del carril es puro ruido.
  const toLane = (id, name, laneTasks, iniciativaName) => {
    const uniformType = laneTasks.length > 0 && laneTasks.every((t) => t.taskType && t.taskType === laneTasks[0].taskType)
      ? laneTasks[0].taskType : null;
    const doneCount = laneTasks.filter((t) => t.status === 'Done').length;
    const backlogCount = laneTasks.filter((t) => t.status === 'Backlog').length;
    return { id, name, tasks: laneTasks, uniformType, doneCount, backlogCount, iniciativaName };
  };
  const allEpicas = iniciativas.flatMap((ini) => ini.epicas.map((e) => ({ id: e.id, name: e.name, iniciativaName: ini.name })));
  const epicaIds = new Set(allEpicas.map((e) => e.id));
  const lanes = allEpicas
    .map((e) => toLane(e.id, e.name, tasks.filter((t) => t.epicaId === e.id), e.iniciativaName))
    .filter((lane) => lane.tasks.length > 0);
  const sinEpica = tasks.filter((t) => !t.epicaId || !epicaIds.has(t.epicaId));
  if (sinEpica.length) lanes.push(toLane('__sin_epica', 'Sin épica', sinEpica));
  return lanes;
}

// Nombre del carril + chevron colapsable — mismo look en Tablero y Sprints. `full` es la
// variante de cabecera ancha (carril expandido, arriba de sus tarjetas): nombre completo,
// "N tareas" y barra de avance — la compacta (carril colapsado, columna angosta) solo
// chevron + nombre truncado + conteo.
function LaneToggle({ name, iniciativaName, count, doneCount = 0, collapsed, onToggle, full }) {
  const pct = count > 0 ? Math.round((doneCount / count) * 100) : 0;
  const nameBlock = (
    <span className="knx-sprintboard-lane-name">
      {name}
      {iniciativaName && <span className="knx-sprintboard-lane-sub">{iniciativaName}</span>}
    </span>
  );
  return (
    <button type="button" className={`knx-sprintboard-lane-toggle${full ? ' knx-sprintboard-lane-toggle--full' : ''}`} onClick={onToggle} title={name}>
      <svg className={`knx-sprintboard-lane-chevron${collapsed ? ' knx-sprintboard-lane-chevron--collapsed' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
      {full ? (
        <>
          {nameBlock}
          <span className="knx-sprintboard-lane-stat">
            <span className="knx-sprintboard-lane-count">{count} tarea{count !== 1 ? 's' : ''}</span>
            <span className="knx-sprintboard-lane-progress"><span className="knx-sprintboard-lane-progress-fill" style={{ width: `${pct}%` }} /></span>
          </span>
        </>
      ) : (
        // El nombre crece para llenar el espacio (flex:1) y empuja el badge al borde derecho
        // de su columna — fijo ahí sin importar cuán largo sea el nombre, así queda alineado en
        // columna con el resto de las filas.
        <>
          {nameBlock}
          <span className="knx-sprintboard-cell-count">{count}</span>
        </>
      )}
    </button>
  );
}

function ProjectBoard({ tenant, projectId, board, onReload, iniciativas, activeSprint, onOptimisticMove }) {
  const [scheduleFor, setScheduleFor] = useState(null); // { taskId, status }
  const [newTareaOpen, setNewTareaOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [justMovedTaskId, setJustMovedTaskId] = useState(null);
  const [collapsedLanes, setCollapsedLanes] = useState(new Set());
  const [err, setErr] = useState(null);

  // Se limpia recién después de que `board` ya trajo a la tarea en su nueva columna — así la
  // animación de "acabo de llegar" (.knx-board-card--entering) juega sobre la tarjeta ya
  // posicionada, no sobre la vieja. Mismo patrón que KaiNextSprints.jsx. Tiene que ir ANTES del
  // return condicional de abajo (board === null en el primer render) — si no, el useEffect no se
  // llama siempre en el mismo orden entre renders y React tira "change in order of Hooks".
  useEffect(() => {
    if (!justMovedTaskId) return;
    const t = setTimeout(() => setJustMovedTaskId(null), 450);
    return () => clearTimeout(t);
  }, [board]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!board) return <p className="knx-knowledge-empty">Cargando…</p>;
  const { tasks, columns, talento } = board;
  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) : null;
  const lanes = buildEpicaLanes(tasks, iniciativas);
  const toggleLane = (id) => setCollapsedLanes((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const expandAll = () => setCollapsedLanes(new Set());
  const collapseAll = () => setCollapsedLanes(new Set(lanes.map((l) => l.id)));
  const allLanesCollapsed = lanes.length > 0 && lanes.every((l) => collapsedLanes.has(l.id));
  const gridCols = { gridTemplateColumns: `repeat(${columns.length}, minmax(140px, 1fr))` };

  const patch = async (payload) => {
    const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/dev/board`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo actualizar.');
  };

  // Pinta la tarjeta en su columna nueva AL INSTANTE (sin esperar la ida y vuelta a Notion) — si
  // el PATCH falla, vuelve a su columna anterior. Mismo criterio que moveTaskOptimistic en
  // KaiNextSprints.jsx, para que el drop "pegue" al toque.
  const move = async (pageId, status) => {
    setErr(null);
    const prevStatus = tasks.find((t) => t.id === pageId)?.status;
    setJustMovedTaskId(pageId);
    onOptimisticMove(pageId, status);
    try {
      await patch({ action: 'move_task', pageId, status });
      onReload();
    } catch (e) {
      setErr(e.message);
      if (prevStatus) onOptimisticMove(pageId, prevStatus);
    }
  };

  const requestStatusChange = (taskId, status) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === status) return;
    const incompleta = !task.startDate || !task.dueDate || task.estimatedHours == null;
    if (status !== 'Backlog' && incompleta) {
      setScheduleFor({ taskId, status });
      return;
    }
    move(taskId, status);
  };

  // Dentro de un sprint no debería quedar nada en Backlog — si la tarea ya tiene fecha de fin y
  // estimación, pasa directo a "Por hacer" al asignarla; si le faltan, se abre el mismo
  // ScheduleModal que ya exige completarlos antes de salir de Backlog (misma validación que el
  // drag-and-drop, ver requestStatusChange).
  const assignSprint = async (pageId, sprintId) => {
    setErr(null);
    try {
      await patch({ action: 'assign_sprint', pageId, sprintId });
      const task = tasks.find((t) => t.id === pageId);
      if (task?.status === 'Backlog') {
        requestStatusChange(pageId, 'Not started');
      } else {
        onReload();
      }
    } catch (e) {
      setErr(e.message);
    }
  };

  const confirmSchedule = async ({ startDate, endDate, estimatedHours }) => {
    const { taskId, status } = scheduleFor;
    setScheduleFor(null);
    setErr(null);
    try {
      await patch({ action: 'update_schedule', pageId: taskId, startDate, endDate, estimatedHours });
      await move(taskId, status);
    } catch (e) {
      setErr(e.message);
    }
  };

  const detailAction = async (action, extra) => {
    if (!selectedTask) return;
    setErr(null);
    try {
      await patch({ action, pageId: selectedTask.id, ...extra });
      onReload();
    } catch (e) {
      setErr(e.message);
    }
  };

  const confirmRemove = async () => {
    const taskId = removeTarget;
    setRemoveTarget(null);
    setSelectedTaskId(null);
    setErr(null);
    try {
      await patch({ action: 'remove_task', pageId: taskId });
      onReload();
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className="knx-board">
      {err && <p className="knx-canvas-error">{err}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 10 }}>
        {lanes.length > 1 && (
          <button type="button" className="knx-analisis-compare" onClick={allLanesCollapsed ? expandAll : collapseAll}>
            {allLanesCollapsed ? 'Expandir todo' : 'Colapsar todo'}
          </button>
        )}
        <button type="button" className="knx-new-chat" onClick={() => setNewTareaOpen(true)}>+ Nueva tarea</button>
      </div>
      {!lanes.length ? (
        <p className="knx-knowledge-empty">Sin tareas en este proyecto todavía.</p>
      ) : (
        <>
          <div className="knx-sprintboard-row knx-sprintboard-header" style={gridCols}>
            {columns.map((col) => (
              <span key={col.id} className="knx-sprintboard-col-label">{col.name} <span className="knx-sprintboard-col-total">{tasks.filter((t) => t.status === col.id).length}</span></span>
            ))}
          </div>
          {lanes.map((lane) => {
            const collapsed = collapsedLanes.has(lane.id);
            return (
              <div key={lane.id}>
                {collapsed ? (
                  // Colapsado: todo en UNA sola fila — nombre+chevron ocupa la columna de
                  // Backlog (con SU conteo ahí mismo, en círculo, en vez de una celda aparte) y
                  // las otras 4 columnas siguen normales al lado — así no se corre nada.
                  <div className="knx-sprintboard-row" style={gridCols}>
                    <LaneToggle name={lane.name} iniciativaName={lane.iniciativaName} count={lane.backlogCount} collapsed onToggle={() => toggleLane(lane.id)} />
                    {columns.filter((col) => col.id !== 'Backlog').map((col) => {
                      const cellTasks = lane.tasks.filter((t) => t.status === col.id);
                      return (
                        <div key={col.id} className="knx-sprintboard-cell knx-sprintboard-cell--collapsed">
                          {cellTasks.length > 0 ? <span className="knx-sprintboard-cell-count">{cellTasks.length}</span> : <span className="knx-sprintboard-cell-dash">—</span>}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <>
                  <div style={{ display: 'grid', ...gridCols }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <LaneToggle name={lane.name} iniciativaName={lane.iniciativaName} count={lane.tasks.length} doneCount={lane.doneCount} collapsed={false} onToggle={() => toggleLane(lane.id)} full />
                    </div>
                  </div>
                  <div className="knx-sprintboard-row knx-sprintboard-row--expanded" style={gridCols}>
                    {columns.map((col) => {
                      const cellTasks = lane.tasks.filter((t) => t.status === col.id);
                      return (
                        <div key={col.id} className="knx-sprintboard-cell">
                          {cellTasks.map((t) => (
                            <div key={t.id}>
                              <DevTaskCard
                                task={t}
                                columns={columns}
                                onOpen={setSelectedTaskId}
                                onStatusChange={(task, status) => requestStatusChange(task.id, status)}
                                showStatusSelect={false}
                                entering={justMovedTaskId === t.id}
                              />
                              {!t.sprintIds?.length && <AssignSprintControl pageId={t.id} activeSprint={activeSprint} onAssigned={assignSprint} />}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                  </>
                )}
              </div>
            );
          })}
        </>
      )}
      {scheduleFor && <ScheduleModal onCancel={() => setScheduleFor(null)} onConfirm={confirmSchedule} />}
      {newTareaOpen && (
        <NewTareaModal
          tenant={tenant}
          projectId={projectId}
          iniciativas={iniciativas}
          talento={talento}
          activeSprint={activeSprint}
          onClose={() => setNewTareaOpen(false)}
          onCreated={() => { setNewTareaOpen(false); onReload(); }}
        />
      )}
      {selectedTask && (
        <DevTaskDetailPanel
          tenant={tenant}
          projectId={projectId}
          task={selectedTask}
          talento={talento}
          columns={columns}
          onClose={() => setSelectedTaskId(null)}
          onAction={detailAction}
          onRemove={() => setRemoveTarget(selectedTask.id)}
        />
      )}
      <KaiNextConfirmDialog
        open={!!removeTarget}
        title="Eliminar tarea"
        message="¿Eliminar esta tarea? No se puede deshacer."
        onConfirm={confirmRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
}

// Mismo shape que NewSprintForm de KaiNextSprints.jsx — implementación independiente (no se
// importa/toca ese archivo), reusando las clases .knx-board-popover/-field-row/-field ya
// compartidas entre ambos tableros.
function NewProjectSprintForm({ busy, onCreate, onClose }) {
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

// Ciclo de vida del sprint de ESTE proyecto (Planificado → En curso → Cerrado) + carriles por
// Iniciativa con las tareas de ese sprint — a diferencia del tablero universal, numeración y
// sprint activo están acotados a este proyecto (ver dev/sprints/route.js y el plan en
// /Users/itriagor/.claude/plans/serene-spinning-mochi.md). A propósito NO deja soltar una
// tarjeta en el carril de OTRA iniciativa (la Iniciativa de una tarea no cambia acá, solo su
// Status) — si se permitiera, la tarjeta "volvería" a su carril real al recargar, que confunde
// más de lo que ayuda.
function SprintsBoardTab({ tenant, projectId, tasks, columns, talento, iniciativas, activeSprint, sprints, onReload, onSprintReload, onOptimisticMove }) {
  const [dragInfo, setDragInfo] = useState(null); // { taskId, laneId }
  const [dragOverCell, setDragOverCell] = useState(null);
  const [scheduleFor, setScheduleFor] = useState(null); // { taskId, status }
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [creating, setCreating] = useState(false);
  const [closeTarget, setCloseTarget] = useState(null); // 'planning' | 'sprint' | null
  const [busy, setBusy] = useState(false);
  const [justMovedTaskId, setJustMovedTaskId] = useState(null);
  const [responsableFilter, setResponsableFilter] = useState('');
  const [newTareaOpen, setNewTareaOpen] = useState(false);
  const [viewedSprintId, setViewedSprintId] = useState(null); // null = sigue al sprint activo
  const [collapsedLanes, setCollapsedLanes] = useState(new Set());
  const [err, setErr] = useState(null);

  // El selector deja ver cualquier sprint de este proyecto (incluidos los cerrados), igual que
  // el tablero real — por defecto sigue al sprint activo hasta que el usuario elige otro.
  const viewedSprint = sprints.find((s) => s.id === viewedSprintId) ?? activeSprint;

  // Dentro de un sprint no debería quedar nada en Backlog (ver assignSprint en Tablero/
  // EpicaTareas, que promueve a "Por hacer" apenas entra) — esa columna no tiene sentido acá.
  const sprintColumns = columns.filter((c) => c.id !== 'Backlog');
  const sprintTasksAll = viewedSprint ? tasks.filter((t) => t.sprintIds?.includes(viewedSprint.id)) : [];
  // Solo responsables con al menos una tarea en ESTE sprint — mismo criterio que el tablero real.
  const activeResponsableIds = new Set(sprintTasksAll.map((t) => t.responsableId).filter(Boolean));
  const activeResponsables = (talento ?? []).filter((t) => activeResponsableIds.has(t.id));
  const sprintTasks = sprintTasksAll.filter((t) => !responsableFilter || t.responsableId === responsableFilter);
  const lanes = buildEpicaLanes(sprintTasks, iniciativas);
  const toggleLane = (id) => setCollapsedLanes((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const selectedTask = selectedTaskId ? sprintTasks.find((t) => t.id === selectedTaskId) : null;

  // Mismo patrón que ProjectBoard/KaiNextSprints.jsx — se limpia recién después de que `tasks`
  // ya trajo a la tarea en su nueva columna, así la animación de entrada juega en su posición
  // final en vez de sobre la vieja.
  useEffect(() => {
    if (!justMovedTaskId) return;
    const t = setTimeout(() => setJustMovedTaskId(null), 450);
    return () => clearTimeout(t);
  }, [tasks]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = async (payload) => {
    const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/dev/board`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo actualizar.');
  };

  const sprintPatch = async (payload) => {
    const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/dev/sprints`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo actualizar el sprint.');
  };

  // Pinta la tarjeta en su columna nueva AL INSTANTE — mismo criterio que ProjectBoard.move.
  const move = async (pageId, status) => {
    setErr(null);
    const prevStatus = sprintTasks.find((t) => t.id === pageId)?.status;
    setJustMovedTaskId(pageId);
    onOptimisticMove(pageId, status);
    try {
      await patch({ action: 'move_task', pageId, status });
      onReload();
    } catch (e) {
      setErr(e.message);
      if (prevStatus) onOptimisticMove(pageId, prevStatus);
    }
  };

  const requestStatusChange = (taskId, status) => {
    const task = sprintTasks.find((t) => t.id === taskId);
    if (!task || task.status === status) return;
    const incompleta = !task.startDate || !task.dueDate || task.estimatedHours == null;
    if (status !== 'Backlog' && incompleta) {
      setScheduleFor({ taskId, status });
      return;
    }
    move(taskId, status);
  };

  const handleDrop = (laneId, status) => {
    const info = dragInfo;
    setDragOverCell(null);
    setDragInfo(null);
    if (!info || info.laneId !== laneId) return;
    requestStatusChange(info.taskId, status);
  };

  const confirmSchedule = async ({ startDate, endDate, estimatedHours }) => {
    const { taskId, status } = scheduleFor;
    setScheduleFor(null);
    setErr(null);
    try {
      await patch({ action: 'update_schedule', pageId: taskId, startDate, endDate, estimatedHours });
      await move(taskId, status);
    } catch (e) {
      setErr(e.message);
    }
  };

  const detailAction = async (action, extra) => {
    if (!selectedTask) return;
    setErr(null);
    try {
      await patch({ action, pageId: selectedTask.id, ...extra });
      onReload();
    } catch (e) {
      setErr(e.message);
    }
  };

  const confirmRemove = async () => {
    const taskId = removeTarget;
    setRemoveTarget(null);
    setSelectedTaskId(null);
    setErr(null);
    try {
      await patch({ action: 'remove_task', pageId: taskId });
      onReload();
    } catch (e) {
      setErr(e.message);
    }
  };

  const createSprint = async ({ startDate, endDate, objetivo }) => {
    setBusy(true);
    setErr(null);
    try {
      await sprintPatch({ action: 'create_sprint', startDate, endDate, objetivo });
      setCreating(false);
      onSprintReload();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const closePlanning = async () => {
    setBusy(true);
    setErr(null);
    try {
      await sprintPatch({ action: 'close_planning', sprintId: viewedSprint.id });
      onSprintReload();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmCloseSprint = async () => {
    setCloseTarget(null);
    setBusy(true);
    setErr(null);
    try {
      await sprintPatch({ action: 'close_sprint', sprintId: viewedSprint.id });
      setViewedSprintId(null); // vuelve a seguir al sprint activo (el que recién arrancó, si Kai ya lo creó)
      onSprintReload();
      onReload();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!viewedSprint) {
    return (
      <div className="knx-board">
        {err && <p className="knx-canvas-error">{err}</p>}
        <p className="knx-knowledge-empty">Este proyecto todavía no tiene un sprint activo.</p>
        {creating ? (
          <NewProjectSprintForm busy={busy} onCreate={createSprint} onClose={() => setCreating(false)} />
        ) : (
          <button type="button" className="knx-new-chat" onClick={() => setCreating(true)}>+ Nuevo sprint</button>
        )}
      </div>
    );
  }

  return (
    <div className="knx-board">
      {err && <p className="knx-canvas-error">{err}</p>}
      <div className="knx-board-sprint-head">
        <div />
        <div className="knx-board-sprint-actions">
          {sprints.length > 0 && (
            <select className="knx-analisis-period" value={viewedSprint.id} onChange={(e) => setViewedSprintId(e.target.value)}>
              {sprints.map((s) => <option key={s.id} value={s.id}>{s.title} · {sprintStatusLabel(s.status)}</option>)}
            </select>
          )}
          {viewedSprint.status === 'Planificado' && (
            <button type="button" className="knx-analisis-compare" disabled={busy} onClick={closePlanning}>Cerrar planificación</button>
          )}
          {viewedSprint.status === 'En curso' && (
            <button type="button" className="knx-analisis-compare" disabled={busy} onClick={() => setCloseTarget('sprint')}>Cerrar sprint</button>
          )}
          {creating ? (
            <NewProjectSprintForm busy={busy} onCreate={createSprint} onClose={() => setCreating(false)} />
          ) : (
            <button type="button" className="knx-new-chat" onClick={() => setCreating(true)}>+ Nuevo sprint</button>
          )}
        </div>
      </div>
      <div className="knx-board-sprint-head">
        <div>
          <strong>{viewedSprint.title}</strong>{' '}
          <span className="knx-activity-status knx-activity-status--active">{sprintStatusLabel(viewedSprint.status)}</span>
          {viewedSprint.startDate && <span className="knx-board-sprint-dates"> {formatShortDate(viewedSprint.startDate)} → {formatShortDate(viewedSprint.endDate)}</span>}
          <span className="knx-board-sprint-dates">
            {' '}· {viewedSprint.loggedHours ?? 0}h / {viewedSprint.committedHours ?? 0}h comprometidas · {sprintTasksAll.length} tarea{sprintTasksAll.length !== 1 ? 's' : ''}
          </span>
          {viewedSprint.objetivo && <span className="knx-board-sprint-objetivo"> · {viewedSprint.objetivo}</span>}
        </div>
        <div className="knx-board-sprint-actions">
          {activeResponsables.length > 0 && (
            <select className="knx-analisis-period" value={responsableFilter} onChange={(e) => setResponsableFilter(e.target.value)}>
              <option value="">Todos los responsables</option>
              {activeResponsables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          <button type="button" className="knx-new-chat" onClick={() => setNewTareaOpen(true)}>+ Nueva tarea</button>
        </div>
      </div>
      {!lanes.length ? (
        <p className="knx-knowledge-empty">Ninguna tarea de este proyecto está en este sprint todavía — asignalas desde el tab Tablero ("+ Sprint activo").</p>
      ) : (
        <>
          <div className="knx-sprintboard-row knx-sprintboard-header">
            {sprintColumns.map((col) => (
              <span key={col.id} className="knx-sprintboard-col-label">{col.name} <span className="knx-sprintboard-col-total">{sprintTasksAll.filter((t) => t.status === col.id).length}</span></span>
            ))}
          </div>
          {lanes.map((lane) => {
            const collapsed = collapsedLanes.has(lane.id);
            return (
              <div key={lane.id}>
                {collapsed ? (
                  // Igual criterio que Tablero: nombre+chevron ocupa la primera columna con SU
                  // propio conteo ahí (en círculo), el resto de columnas sigue al lado.
                  <div className="knx-sprintboard-row">
                    <LaneToggle name={lane.name} iniciativaName={lane.iniciativaName} count={lane.tasks.filter((t) => t.status === sprintColumns[0]?.id).length} collapsed onToggle={() => toggleLane(lane.id)} />
                    {sprintColumns.slice(1).map((col) => {
                      const cellTasks = lane.tasks.filter((t) => t.status === col.id);
                      return (
                        <div key={col.id} className="knx-sprintboard-cell knx-sprintboard-cell--collapsed">
                          {cellTasks.length > 0 ? <span className="knx-sprintboard-cell-count">{cellTasks.length}</span> : <span className="knx-sprintboard-cell-dash">—</span>}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <>
                  <div className="knx-sprintboard-row">
                    <div style={{ gridColumn: '1 / -1' }}>
                      <LaneToggle name={lane.name} iniciativaName={lane.iniciativaName} count={lane.tasks.length} doneCount={lane.doneCount} collapsed={false} onToggle={() => toggleLane(lane.id)} full />
                    </div>
                  </div>
                  <div className="knx-sprintboard-row knx-sprintboard-row--expanded">
                    {sprintColumns.map((col) => {
                      const cellKey = `${lane.id}:${col.id}`;
                      const cellTasks = lane.tasks.filter((t) => t.status === col.id);
                      return (
                        <div
                          key={col.id}
                          className={`knx-sprintboard-cell${dragOverCell === cellKey ? ' knx-sprintboard-cell--over' : ''}`}
                          onDragOver={(e) => { e.preventDefault(); setDragOverCell(cellKey); }}
                          onDragLeave={() => setDragOverCell((c) => (c === cellKey ? null : c))}
                          onDrop={(e) => { e.preventDefault(); handleDrop(lane.id, col.id); }}
                        >
                          {cellTasks.length === 0 && <span className="knx-sprintboard-cell-placeholder">Arrastra aquí</span>}
                          {cellTasks.map((t) => (
                            <DevTaskCard
                              key={t.id}
                              task={t}
                              columns={sprintColumns}
                              onOpen={setSelectedTaskId}
                              onStatusChange={(task, status) => requestStatusChange(task.id, status)}
                              draggable
                              onDragStart={() => setDragInfo({ taskId: t.id, laneId: lane.id })}
                              onDragEnd={() => setDragInfo(null)}
                              dragging={dragInfo?.taskId === t.id}
                              entering={justMovedTaskId === t.id}
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                  </>
                )}
              </div>
            );
          })}
        </>
      )}
      {scheduleFor && <ScheduleModal onCancel={() => setScheduleFor(null)} onConfirm={confirmSchedule} />}
      {newTareaOpen && (
        <NewTareaModal
          tenant={tenant}
          projectId={projectId}
          iniciativas={iniciativas}
          talento={talento}
          activeSprint={activeSprint}
          onClose={() => setNewTareaOpen(false)}
          onCreated={() => { setNewTareaOpen(false); onReload(); }}
        />
      )}
      {selectedTask && (
        <DevTaskDetailPanel
          tenant={tenant}
          projectId={projectId}
          task={selectedTask}
          talento={talento}
          columns={columns}
          onClose={() => setSelectedTaskId(null)}
          onAction={detailAction}
          onRemove={() => setRemoveTarget(selectedTask.id)}
        />
      )}
      <KaiNextConfirmDialog
        open={!!removeTarget}
        title="Eliminar tarea"
        message="¿Eliminar esta tarea? No se puede deshacer."
        onConfirm={confirmRemove}
        onCancel={() => setRemoveTarget(null)}
      />
      <KaiNextConfirmDialog
        open={closeTarget === 'sprint'}
        title="Cerrar sprint"
        message={`¿Cerrar ${activeSprint.title}? No se puede deshacer — vas a poder iniciar el siguiente después.`}
        onConfirm={confirmCloseSprint}
        onCancel={() => setCloseTarget(null)}
      />
    </div>
  );
}

// Kai propone fechas para épicas sin agendar — a diferencia de "propuesta vs confirmada" del
// mockup original, acá se revisa/edita en este modal y al confirmar se escribe DIRECTO en Fecha
// inicio/fin (mismo PATCH que ya usa el editor ✎ de cada épica) — sin estado dual nuevo.
function SuggestFechasModal({ tenant, projectId, epicasSinFecha, epicasConFecha, onClose, onApplied }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState(null); // [{id, name, fase, included, startDate, endDate}]
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/kai-next/${tenant}/projects/${projectId}/dev/suggest-fechas`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ epicasSinFecha, epicasConFecha }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        const byId = new Map((d.suggestions || []).map((s) => [s.id, s]));
        setItems(
          epicasSinFecha
            .filter((e) => byId.has(e.id))
            .map((e) => ({ id: e.id, name: e.name, fase: e.fase, included: true, ...byId.get(e.id) }))
        );
      })
      .catch(() => setError('No se pudo conectar con Kai.'))
      .finally(() => setLoading(false));
  }, [tenant, projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (id, field, value) => {
    setItems((list) => list.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  };

  const apply = async () => {
    setSaving(true);
    setError(null);
    try {
      const toApply = items.filter((it) => it.included);
      const results = await Promise.all(toApply.map((it) =>
        fetch(`/api/kai-next/${tenant}/projects/${projectId}/dev/epicas/${it.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startDate: it.startDate, endDate: it.endDate }),
        })
      ));
      if (results.some((r) => !r.ok)) throw new Error('No se pudieron guardar algunas fechas.');
      onApplied();
    } catch (e) {
      setError(e.message || 'No se pudieron guardar algunas fechas.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="knx-ficha-share-backdrop" onClick={onClose}>
      <div className="knx-ficha-review-modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(620px, 94vw)', maxHeight: '86vh', overflowY: 'auto' }}>
        <div className="knx-ficha-review-head">
          <div><h3 className="knx-ficha-review-title">Kai sugiere fechas</h3></div>
          <button type="button" className="knx-side-panel-close" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>
        {error && <p className="knx-canvas-error">{error}</p>}

        {loading ? (
          <p className="knx-knowledge-empty"><span className="knx-spinner" /> Pensando fechas razonables…</p>
        ) : !items?.length ? (
          <p className="knx-knowledge-empty">Kai no pudo proponer fechas esta vez.</p>
        ) : (
          <>
            <div className="knx-import-summary">
              <span className="knx-canvas-avatar">K</span>
              <p>Propuse fechas para <strong>{items.length} épica{items.length !== 1 ? 's' : ''}</strong> sin fecha, respetando el orden de fases. Revisalas y ajustá lo que haga falta antes de confirmar.</p>
            </div>
            {items.map((it) => (
              <div className="knx-import-epica" key={it.id}>
                <div className="knx-import-epica-head">
                  <input type="checkbox" checked={it.included} onChange={(e) => update(it.id, 'included', e.target.checked)} />
                  <div className="knx-import-epica-name-col">
                    <span className="knx-epica-name">{it.name}</span>
                    <span className="knx-canvas-ficha-progress">{it.fase || 'Sin fase'}</span>
                  </div>
                  <div className="knx-canvas-meta-form-row" style={{ flexShrink: 0, width: 'auto' }}>
                    <input type="date" className="knx-canvas-meta-select" value={it.startDate} onChange={(e) => update(it.id, 'startDate', e.target.value)} />
                    <input type="date" className="knx-canvas-meta-select" value={it.endDate} onChange={(e) => update(it.id, 'endDate', e.target.value)} />
                  </div>
                </div>
                {it.reason && <p className="knx-epica-notas" style={{ marginLeft: 26 }}>{it.reason}</p>}
              </div>
            ))}
          </>
        )}

        <div className="knx-canvas-ficha-draft-actions" style={{ marginTop: 16 }}>
          <button type="button" className="knx-canvas-mini" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="button" className="knx-analisis-sources-save" onClick={apply} disabled={saving || loading || !items?.some((it) => it.included)}>
            {saving && <span className="knx-spinner" />}
            {saving ? 'Guardando…' : 'Aplicar fechas'}
          </button>
        </div>
      </div>
    </div>
  );
}

const DEV_TABS = [
  { id: 'plan', label: 'Plan' },
  { id: 'tablero', label: 'Tablero' },
  { id: 'sprints', label: 'Sprints' },
];

export default function KaiNextProjectDesarrollo({ tenant, projectId, notionProyecto, iniciativas, canManage, onReload }) {
  const [tab, setTab] = useState('plan');
  const [board, setBoard] = useState(null);
  const [activeSprint, setActiveSprint] = useState(null);
  const [projectSprints, setProjectSprints] = useState([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [newEpicaOpen, setNewEpicaOpen] = useState(false);
  const [selectedEpicaId, setSelectedEpicaId] = useState(null);

  const loadBoard = () => {
    fetch(`/api/kai-next/${tenant}/projects/${projectId}/dev/board`)
      .then((r) => r.json())
      .then((d) => setBoard(d));
  };
  // Sprint activo de ESTE proyecto (o null si todavía no inició ninguno) — se carga una vez
  // acá y se pasa a Tablero/Sprints/Historias, así ninguno de esos tiene que elegir entre
  // sprints de otros proyectos (ver plan en /Users/itriagor/.claude/plans/serene-spinning-mochi.md).
  const loadActiveSprint = () => {
    fetch(`/api/kai-next/${tenant}/projects/${projectId}/dev/sprints`)
      .then((r) => r.json())
      .then((d) => { setActiveSprint(d.sprint ?? null); setProjectSprints(d.sprints ?? []); });
  };
  useEffect(() => { loadBoard(); loadActiveSprint(); }, [tenant, projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const reload = () => { onReload(); loadBoard(); };

  // Pinta el nuevo status AL INSTANTE (sin esperar la ida y vuelta a Notion) — mismo criterio
  // que moveTaskOptimistic en KaiNextSprints.jsx, para que el drop "pegue" al toque en vez de
  // que la tarjeta vuelva a su columna un segundo y recién salte cuando llega la respuesta.
  const setTaskStatusLocally = (taskId, status) => {
    setBoard((prev) => (prev ? { ...prev, tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)) } : prev));
  };

  const createIniciativa = async (name) => {
    const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/dev/iniciativas`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
    });
    if (res.ok) reload();
  };

  const totalEpicas = iniciativas.reduce((n, i) => n + i.epicas.length, 0);
  const totalHistorias = board?.tasks?.length ?? null;
  const allEpicas = iniciativas.flatMap((i) => i.epicas);
  const epicasSinFecha = allEpicas.filter((e) => !e.startDate || !e.endDate).map((e) => ({ id: e.id, name: e.name, fase: e.fase }));
  const epicasConFecha = allEpicas.filter((e) => e.startDate && e.endDate).map((e) => ({ name: e.name, fase: e.fase, startDate: e.startDate, endDate: e.endDate }));
  // Mismo orden que pinta el Roadmap (cronológico ascendente) — así "X de N" y prev/next
  // coinciden con lo que se ve ahí.
  const epicasNavegables = allEpicas.filter((e) => e.startDate && e.endDate).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const selectedIndex = selectedEpicaId ? epicasNavegables.findIndex((e) => e.id === selectedEpicaId) : -1;
  const selectedEpica = selectedIndex >= 0 ? epicasNavegables[selectedIndex] : null;

  return (
    <>
      <p className="knx-canvas-ficha-progress" style={{ marginBottom: 10 }}>
        {totalEpicas} épica{totalEpicas !== 1 ? 's' : ''}{totalHistorias != null ? ` · ${totalHistorias} historia${totalHistorias !== 1 ? 's' : ''}` : ''}
      </p>
      <div className="knx-dev-tabs" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {DEV_TABS.map((t) => (
            <button key={t.id} type="button" className={`knx-filter-pill${tab === t.id ? ' knx-filter-pill--active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>
        {tab === 'plan' && (
          <div style={{ display: 'flex', gap: 8 }}>
            {canManage && <NewIniciativaForm tenant={tenant} projectId={projectId} iniciativas={iniciativas} onCreate={createIniciativa} onReload={reload} />}
            {canManage && <button type="button" className="knx-new-chat" onClick={() => setNewEpicaOpen(true)}>+ Nueva épica</button>}
            <button type="button" className="knx-canvas-mini" onClick={() => setImportOpen(true)}>Importar con Kai</button>
            {epicasSinFecha.length > 0 && (
              <button type="button" className="knx-canvas-mini" onClick={() => setSuggestOpen(true)}>✨ Sugerir fechas con Kai</button>
            )}
          </div>
        )}
      </div>

      {suggestOpen && (
        <SuggestFechasModal
          tenant={tenant}
          projectId={projectId}
          epicasSinFecha={epicasSinFecha}
          epicasConFecha={epicasConFecha}
          onClose={() => setSuggestOpen(false)}
          onApplied={() => { setSuggestOpen(false); reload(); }}
        />
      )}

      {importOpen && (
        <ImportDocModal
          tenant={tenant}
          projectId={projectId}
          iniciativas={iniciativas}
          onClose={() => setImportOpen(false)}
          onImported={() => { setImportOpen(false); reload(); }}
        />
      )}

      {newEpicaOpen && (
        <NewEpicaModal
          tenant={tenant}
          projectId={projectId}
          iniciativas={iniciativas}
          onClose={() => setNewEpicaOpen(false)}
          onCreated={() => { setNewEpicaOpen(false); reload(); }}
        />
      )}

      {tab === 'plan' && (
        <>
          <FaseStepper iniciativas={iniciativas} />
          <RoadmapView
            iniciativas={iniciativas}
            selectedEpicaId={selectedEpicaId}
            onSelectEpica={setSelectedEpicaId}
          />
        </>
      )}

      {tab === 'tablero' && <ProjectBoard tenant={tenant} projectId={projectId} board={board} onReload={loadBoard} iniciativas={iniciativas} activeSprint={activeSprint} onOptimisticMove={setTaskStatusLocally} />}

      {tab === 'sprints' && (
        board ? (
          <SprintsBoardTab
            tenant={tenant}
            projectId={projectId}
            tasks={board.tasks}
            columns={board.columns}
            talento={board.talento}
            iniciativas={iniciativas}
            activeSprint={activeSprint}
            sprints={projectSprints}
            onReload={loadBoard}
            onSprintReload={loadActiveSprint}
            onOptimisticMove={setTaskStatusLocally}
          />
        ) : <p className="knx-knowledge-empty">Cargando…</p>
      )}

      {selectedEpica && (
        <EpicaDetailPanel
          tenant={tenant}
          projectId={projectId}
          epica={selectedEpica}
          index={selectedIndex}
          total={epicasNavegables.length}
          activeSprint={activeSprint}
          onPrev={() => setSelectedEpicaId(epicasNavegables[selectedIndex - 1]?.id)}
          onNext={() => setSelectedEpicaId(epicasNavegables[selectedIndex + 1]?.id)}
          onClose={() => setSelectedEpicaId(null)}
          onReload={reload}
        />
      )}
    </>
  );
}
