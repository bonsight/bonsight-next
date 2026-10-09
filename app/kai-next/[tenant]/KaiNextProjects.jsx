'use client';

import { useState, useEffect } from 'react';
import KaiNextSidebar from './KaiNextSidebar';
import KaiNextConfirmDialog from './KaiNextConfirmDialog';
import { PruebasSection } from './KaiNextProjectExperimental';
import KaiNextProjectDesarrollo from './KaiNextProjectDesarrollo';

const STATUS_LABEL = { activo: 'Activo', pausado: 'Pausado', completado: 'Completado' };
const PROJECT_KIND_LABEL = { seguimiento: 'Seguimiento', civil: 'Civil', experimental: 'Experimental', desarrollo: 'Desarrollo' };
const TASK_STATUSES = [
  { id: 'todo', label: 'Por hacer' },
  { id: 'doing', label: 'Haciendo' },
  { id: 'done', label: 'Terminado' },
];

function formatShortDate(iso) {
  if (!iso) return '—';
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function daysBetween(a, b) {
  const MS_DAY = 86400000;
  return Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / MS_DAY);
}

function isVencida(t) {
  return t.progreso < 100 && t.fechaFin && new Date(t.fechaFin).getTime() < Date.now();
}

function groupTasksByFase(tasks) {
  const grouped = [];
  for (const t of tasks) {
    const key = t.fase || 'Sin fase';
    let g = grouped.find((x) => x.fase === key);
    if (!g) { g = { fase: key, tasks: [] }; grouped.push(g); }
    g.tasks.push(t);
  }
  return grouped;
}

function personName(people, id) {
  return people.find((p) => p.id === id)?.name || '—';
}

// 'desarrollo' reusa el Notion interno de Bonsight (el mismo que ya usa Sprints) — no tiene
// sentido ofrecerlo para ningún otro tenant.
function getProjectKindOptions(tenant) {
  const base = [
    { id: 'seguimiento', label: 'Seguimiento' },
    { id: 'civil', label: 'Civil' },
    { id: 'experimental', label: 'Experimental' },
  ];
  if (tenant === 'bonsight') base.push({ id: 'desarrollo', label: 'Desarrollo' });
  return base;
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function CreateProjectModal({ tenant, people, onClose, onCreated }) {
  const [projectKind, setProjectKind] = useState('seguimiento');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState('');
  const [supervisorIds, setSupervisorIds] = useState([]);
  const [purpose, setPurpose] = useState('');
  const [hypothesis, setHypothesis] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Solo para 'desarrollo' — Cliente real traído de Notion (lib/kaiNext/projectsNotion.js), o
  // bien importar un Proyecto que ya existe en Notion (de antes de Kai Next) en vez de crear uno.
  const [clientes, setClientes] = useState(null);
  const [clienteId, setClienteId] = useState('');
  const [devMode, setDevMode] = useState('crear'); // 'crear' | 'importar'
  const [proyectosExistentes, setProyectosExistentes] = useState(null);
  const [notionProyectoId, setNotionProyectoId] = useState('');

  // Solo para civil — import del Excel de cronograma+presupuesto (port simplificado del flujo
  // de Labs: acá no hay grilla editable por fase, se revisa el total y los avisos nomás, y el
  // detalle fino se ajusta después desde Tareas/Presupuesto una vez creado el proyecto).
  const [excelBusy, setExcelBusy] = useState(false);
  const [excelTasks, setExcelTasks] = useState(null);
  const [excelPartidas, setExcelPartidas] = useState(null);
  const [excelWarnings, setExcelWarnings] = useState([]);

  const toggleSupervisor = (id) => setSupervisorIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  useEffect(() => {
    if (projectKind !== 'desarrollo' || devMode !== 'crear' || clientes) return;
    fetch(`/api/kai-next/${tenant}/dev-clientes`).then((r) => r.json()).then((d) => setClientes(d.clientes ?? []));
  }, [projectKind, devMode, clientes, tenant]);

  useEffect(() => {
    if (projectKind !== 'desarrollo' || devMode !== 'importar' || proyectosExistentes) return;
    fetch(`/api/kai-next/${tenant}/dev-proyectos-existentes`).then((r) => r.json()).then((d) => setProyectosExistentes(d.proyectos ?? []));
  }, [projectKind, devMode, proyectosExistentes, tenant]);

  const handleExcelChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelBusy(true);
    setError(null);
    try {
      const base64 = await readFileAsBase64(file);
      const res = await fetch(`/api/kai-next/${tenant}/projects/civil-import-preview`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: base64 }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'No se pudo leer el archivo.'); return; }
      setExcelTasks(data.tasks ?? []);
      setExcelPartidas(data.partidas ?? []);
      setExcelWarnings(data.warnings ?? []);
    } finally {
      setExcelBusy(false);
      e.target.value = '';
    }
  };

  const unassignedCount = (excelTasks ?? []).filter((t) => !(t.responsables?.length)).length;
  const budgetTotal = (excelPartidas ?? []).reduce((s, p) => s + (p.importe || 0), 0);

  const importando = projectKind === 'desarrollo' && devMode === 'importar';
  const proyectoElegido = importando ? (proyectosExistentes ?? []).find((p) => p.id === notionProyectoId) : null;

  const submit = async () => {
    if (!name.trim()) { setError('El nombre es requerido.'); return; }
    if (importando && !notionProyectoId) { setError('Elegí qué proyecto de Notion importar.'); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, code, type, supervisorIds, projectKind,
          tasks: projectKind === 'civil' ? excelTasks : undefined,
          partidas: projectKind === 'civil' ? excelPartidas : undefined,
          purpose: projectKind === 'experimental' ? purpose : undefined,
          hypothesis: projectKind === 'experimental' ? hypothesis : undefined,
          clienteId: projectKind === 'desarrollo' && !importando ? clienteId || null : undefined,
          notionProyectoId: importando ? notionProyectoId : undefined,
          notionClienteId: importando ? proyectoElegido?.clienteId || null : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'No se pudo crear.'); return; }
      onCreated(data.project);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="knx-ficha-share-backdrop" onClick={onClose}>
      <div className="knx-ficha-review-modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(560px, 92vw)' }}>
        <div className="knx-ficha-review-head">
          <div>
            <span className="knx-ficha-review-badge">Nuevo proyecto</span>
            <h3 className="knx-ficha-review-title">Datos básicos</h3>
          </div>
          <button type="button" className="knx-side-panel-close" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>
        {error && <p className="knx-canvas-error">{error}</p>}

        <div className="knx-ficha-review-field" style={{ marginBottom: 14 }}>
          <label>Tipo de proyecto</label>
          <div className="knx-knowledge-filters" style={{ marginTop: 2 }}>
            {getProjectKindOptions(tenant).map((k) => (
              <button
                key={k.id}
                type="button"
                className={`knx-filter-pill${projectKind === k.id ? ' knx-filter-pill--active' : ''}`}
                onClick={() => setProjectKind(k.id)}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>

        <div className="knx-ficha-review-field" style={{ marginBottom: 14 }}>
          <label>Nombre</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="knx-canvas-meta-select" placeholder="Nombre del proyecto" />
        </div>
        {projectKind === 'desarrollo' ? (
          <>
            <div className="knx-ficha-review-field" style={{ marginTop: 14 }}>
              <div className="knx-knowledge-filters">
                <button type="button" className={`knx-filter-pill${devMode === 'crear' ? ' knx-filter-pill--active' : ''}`} onClick={() => setDevMode('crear')}>Crear nuevo</button>
                <button type="button" className={`knx-filter-pill${devMode === 'importar' ? ' knx-filter-pill--active' : ''}`} onClick={() => setDevMode('importar')}>Importar existente</button>
              </div>
            </div>
            {devMode === 'crear' ? (
              <div className="knx-ficha-review-field" style={{ marginTop: 14 }}>
                <label>Cliente</label>
                {clientes === null ? (
                  <p className="knx-canvas-meta-empty">Cargando clientes…</p>
                ) : (
                  <select className="knx-canvas-meta-select" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                    <option value="">Sin cliente</option>
                    {clientes.map((c) => <option key={c.id} value={c.id}>{c.name}{c.estado ? ` (${c.estado})` : ''}</option>)}
                  </select>
                )}
              </div>
            ) : (
              <div className="knx-ficha-review-field" style={{ marginTop: 14 }}>
                <label>Proyecto en Notion</label>
                {proyectosExistentes === null ? (
                  <p className="knx-canvas-meta-empty">Cargando proyectos…</p>
                ) : proyectosExistentes.length === 0 ? (
                  <p className="knx-canvas-meta-empty">No hay proyectos de Notion sin importar todavía.</p>
                ) : (
                  <select
                    className="knx-canvas-meta-select"
                    value={notionProyectoId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setNotionProyectoId(id);
                      const p = proyectosExistentes.find((x) => x.id === id);
                      if (p) setName(p.name);
                    }}
                  >
                    <option value="">Elegí un proyecto…</option>
                    {proyectosExistentes.map((p) => <option key={p.id} value={p.id}>{p.name}{p.clienteName ? ` · ${p.clienteName}` : ''}</option>)}
                  </select>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="knx-ficha-review-grid">
              <div className="knx-ficha-review-field">
                <label>Código</label>
                <input value={code} onChange={(e) => setCode(e.target.value)} className="knx-canvas-meta-select" placeholder="ej. PRY-2026-001" />
              </div>
              <div className="knx-ficha-review-field">
                <label>Tipo</label>
                <input value={type} onChange={(e) => setType(e.target.value)} className="knx-canvas-meta-select" placeholder="ej. Seguimiento operativo" />
              </div>
            </div>
            <div className="knx-ficha-review-field" style={{ marginTop: 14 }}>
              <label>Supervisores</label>
              <div className="knx-canvas-meta-checklist">
                {!people.length ? (
                  <p className="knx-canvas-meta-empty">No hay personas en el equipo todavía.</p>
                ) : people.map((p) => (
                  <label key={p.id} className="knx-canvas-meta-checkbox">
                    <input type="checkbox" checked={supervisorIds.includes(p.id)} onChange={() => toggleSupervisor(p.id)} />
                    <span className="knx-canvas-meta-checkbox-box" />
                    {p.name || p.email}
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        {projectKind === 'civil' && (
          <div className="knx-ficha-review-field" style={{ marginTop: 14 }}>
            <label>Cronograma + presupuesto (Excel, opcional)</label>
            <label className="knx-canvas-add-item-btn" style={{ cursor: 'pointer' }}>
              {excelBusy ? 'Interpretando…' : excelTasks ? 'Volver a subir Excel' : '+ Subir Excel'}
              <input type="file" accept=".xlsx,.xls" onChange={handleExcelChange} style={{ display: 'none' }} disabled={excelBusy} />
            </label>
            {excelWarnings.length > 0 && (
              <div className="knx-canvas-ficha-draft" style={{ marginTop: 8 }}>
                <label>{excelWarnings.length} aviso{excelWarnings.length !== 1 ? 's' : ''} — revisalos antes de crear</label>
                {excelWarnings.map((w, i) => <p key={i} className="knx-knowledge-empty" style={{ margin: 0 }}>{w}</p>)}
              </div>
            )}
            {excelTasks && (
              <p className="knx-canvas-ficha-progress" style={{ marginTop: 8 }}>
                {excelTasks.length} tareas · presupuesto {budgetTotal.toLocaleString('es-PE')} · {unassignedCount} responsable{unassignedCount !== 1 ? 's' : ''} sin asignar (se puede corregir después)
              </p>
            )}
          </div>
        )}

        {projectKind === 'experimental' && (
          <div className="knx-ficha-review-grid" style={{ marginTop: 14 }}>
            <div className="knx-ficha-review-field">
              <label>Propósito (opcional)</label>
              <textarea rows={2} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="¿Qué queremos conseguir o descubrir?" />
            </div>
            <div className="knx-ficha-review-field">
              <label>Hipótesis (opcional)</label>
              <textarea rows={2} value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} placeholder="¿Qué creemos que va a pasar?" />
            </div>
          </div>
        )}

        <div className="knx-canvas-ficha-draft-actions" style={{ marginTop: 16 }}>
          <button type="button" className="knx-canvas-mini" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="button" className="knx-analisis-sources-save" onClick={submit} disabled={saving}>{saving ? 'Creando…' : 'Crear proyecto'}</button>
        </div>
      </div>
    </div>
  );
}

function NewTaskForm({ people, onCreate }) {
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState('');
  const [fase, setFase] = useState('');
  const [responsables, setResponsables] = useState([]);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [saving, setSaving] = useState(false);

  if (!open) {
    return <button type="button" className="knx-canvas-add-item-btn" onClick={() => setOpen(true)}>+ Agregar tarea</button>;
  }

  const toggleResponsable = (id) => setResponsables((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = async () => {
    if (!nombre.trim()) return;
    setSaving(true);
    try {
      await onCreate({ nombre, fase, responsables, fechaInicio: fechaInicio || null, fechaFin: fechaFin || null });
      setNombre(''); setFase(''); setResponsables([]); setFechaInicio(''); setFechaFin('');
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="knx-canvas-newcol-form">
      <input className="knx-canvas-meta-select" placeholder="Nombre de la tarea…" value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
      <input className="knx-canvas-meta-select" placeholder="Fase (opcional)" value={fase} onChange={(e) => setFase(e.target.value)} />
      <div className="knx-canvas-meta-form-row">
        <div className="knx-canvas-meta-field">
          <label className="knx-canvas-meta-field-label">Inicio</label>
          <input type="date" className="knx-canvas-meta-select" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
        </div>
        <div className="knx-canvas-meta-field">
          <label className="knx-canvas-meta-field-label">Fin</label>
          <input type="date" className="knx-canvas-meta-select" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
        </div>
      </div>
      <div className="knx-canvas-meta-checklist">
        {people.map((p) => (
          <label key={p.id} className="knx-canvas-meta-checkbox">
            <input type="checkbox" checked={responsables.includes(p.id)} onChange={() => toggleResponsable(p.id)} />
            <span className="knx-canvas-meta-checkbox-box" />
            {p.name || p.email}
          </label>
        ))}
      </div>
      <div className="knx-canvas-newcol-actions">
        <button type="button" className="knx-canvas-mini" disabled={saving} onClick={submit}>Agregar</button>
        <button type="button" className="knx-canvas-mini" onClick={() => setOpen(false)}>Cancelar</button>
      </div>
    </div>
  );
}

function TaskRow({ task, people, canManage, canToggle, onStatusChange, onDelete }) {
  return (
    <div className="knx-canvas-item">
      <div className="knx-canvas-item-head">
        <div className="knx-canvas-item-who">
          <span className="knx-canvas-item-name">{task.fase ? `${task.fase} · ` : ''}{task.nombre}</span>
        </div>
        {canManage && (
          <button type="button" className="knx-canvas-icon-btn knx-canvas-icon-btn--danger" aria-label="Eliminar tarea" onClick={onDelete}>×</button>
        )}
      </div>
      <p className="knx-canvas-ficha-progress">
        {(task.responsables ?? []).map((id) => personName(people, id)).join(', ') || 'Sin responsable'}
        {task.fechaInicio ? ` · ${task.fechaInicio} → ${task.fechaFin ?? '?'}` : ''}
      </p>
      <select
        className="knx-canvas-meta-select"
        style={{ marginTop: 6, width: 'auto' }}
        value={task.status}
        disabled={!canToggle}
        onChange={(e) => onStatusChange(e.target.value)}
      >
        {TASK_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
    </div>
  );
}

const GANTT_PX_PER_DAY = 34;
const GANTT_MIN_TRACK = 420;
const GANTT_INFO_WIDTH = 200;

// Port directo de CronogramaGantt (app/labs/[tenant]/LabsClientTenant.jsx:2555) — barras
// posicionadas por fecha de inicio/fin, agrupadas por fase, con un pill a la derecha para
// marcar terminada/pendiente (togglea status 'todo'⇄'done', mismo setTaskStatus que la Lista).
function KaiNextGantt({ grouped, people, savingTaskId, canToggleTask, onToggle }) {
  const withDates = grouped.flatMap((g) => g.tasks).filter((t) => t.fechaInicio && t.fechaFin);
  if (!withDates.length) {
    return <p className="knx-knowledge-empty">Ninguna tarea tiene fecha de inicio y fin cargadas todavía — usá la vista Lista o editalas para ver el cronograma.</p>;
  }

  const starts = withDates.map((t) => t.fechaInicio).sort();
  const ends = withDates.map((t) => t.fechaFin).sort();
  const domainStart = starts[0];
  const domainEnd = ends[ends.length - 1];
  const totalDays = Math.max(1, daysBetween(domainStart, domainEnd)) + 1;
  const trackWidth = Math.max(GANTT_MIN_TRACK, totalDays * GANTT_PX_PER_DAY);

  const tickEvery = totalDays <= 14 ? 1 : totalDays <= 45 ? 3 : totalDays <= 120 ? 7 : 14;
  const ticks = [];
  for (let d = 0; d <= totalDays; d += tickEvery) {
    const date = new Date(`${domainStart}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + d);
    ticks.push({ left: d * GANTT_PX_PER_DAY, label: formatShortDate(date.toISOString().slice(0, 10)) });
  }

  return (
    <div className="knx-gantt-scroll">
      <div className="knx-gantt-wrap" style={{ width: GANTT_INFO_WIDTH + trackWidth + 160 }}>
        <div className="knx-gantt-grid" style={{ left: GANTT_INFO_WIDTH, width: trackWidth }}>
          {ticks.map((tk) => <div key={tk.left} style={{ left: tk.left }} />)}
        </div>
        <div className="knx-gantt-axisrow">
          <div className="knx-gantt-corner" style={{ width: GANTT_INFO_WIDTH, flexShrink: 0 }} />
          <div className="knx-gantt-axis" style={{ width: trackWidth }}>
            {ticks.map((tk) => <span key={tk.left} style={{ left: Math.max(0, tk.left - 13) }}>{tk.label}</span>)}
          </div>
        </div>

        {grouped.map((g) => (
          <div key={g.fase}>
            <div className="knx-gantt-fase"><span>{g.fase}</span></div>
            {g.tasks.map((t) => {
              const hasDates = t.fechaInicio && t.fechaFin;
              const vencida = isVencida(t);
              const saving = savingTaskId === t.id;
              const status = saving ? 'saving' : t.progreso >= 100 ? 'done' : vencida ? 'overdue' : 'pending';
              const statusLabel = saving ? 'Guardando…' : status === 'done' ? 'Terminada' : vencida ? 'Vencida' : 'Pendiente';
              const barLeft = hasDates ? Math.max(0, daysBetween(domainStart, t.fechaInicio)) * GANTT_PX_PER_DAY : 0;
              const barWidth = hasDates ? Math.max(GANTT_PX_PER_DAY * 0.7, (daysBetween(t.fechaInicio, t.fechaFin) + 1) * GANTT_PX_PER_DAY) : 0;
              const showLabel = barWidth >= 78;
              return (
                <div className="knx-gantt-row" key={t.id}>
                  <div className="knx-gantt-info" style={{ width: GANTT_INFO_WIDTH }}>
                    <div className="knx-gantt-task-name">{t.nombre}</div>
                    <div className="knx-gantt-assignee">{(t.responsables ?? []).length ? t.responsables.map((id) => personName(people, id)).join(', ') : 'Sin asignar'}</div>
                  </div>
                  <div className="knx-gantt-track" style={{ width: trackWidth }}>
                    {hasDates ? (
                      <div className={`knx-gantt-bar knx-gantt-bar--${status}`} style={{ left: barLeft, width: barWidth }} title={`${formatShortDate(t.fechaInicio)} → ${formatShortDate(t.fechaFin)}`}>
                        {status === 'done' && <span className="knx-gantt-bar-check">✓</span>}
                        {showLabel && <span>{statusLabel}</span>}
                      </div>
                    ) : (
                      <span className="knx-gantt-nodate">Sin fechas</span>
                    )}
                  </div>
                  <div className="knx-gantt-actions">
                    <button
                      type="button"
                      className={`knx-gantt-toggle${status === 'done' ? ' knx-gantt-toggle--done' : ''}`}
                      disabled={!canToggleTask(t) || saving}
                      onClick={() => onToggle(t)}
                    >
                      {status === 'done' ? '✓ Terminada' : 'Marcar terminada'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function NewPartidaForm({ onCreate }) {
  const [open, setOpen] = useState(false);
  const [etapa, setEtapa] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [unidad, setUnidad] = useState('');
  const [precioUnitario, setPrecioUnitario] = useState('');
  const [saving, setSaving] = useState(false);

  if (!open) return <button type="button" className="knx-canvas-add-item-btn" onClick={() => setOpen(true)}>+ Nueva partida</button>;

  const submit = async () => {
    if (!descripcion.trim()) return;
    setSaving(true);
    try {
      await onCreate({ etapa, descripcion, cantidad: cantidad || null, unidad, precioUnitario: precioUnitario || null });
      setEtapa(''); setDescripcion(''); setCantidad(''); setUnidad(''); setPrecioUnitario('');
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="knx-canvas-newcol-form">
      <input className="knx-canvas-meta-select" placeholder="Descripción…" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} autoFocus />
      <input className="knx-canvas-meta-select" placeholder="Etapa (opcional)" value={etapa} onChange={(e) => setEtapa(e.target.value)} />
      <div className="knx-canvas-meta-form-row">
        <input className="knx-canvas-meta-select" type="number" placeholder="Cantidad" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
        <input className="knx-canvas-meta-select" placeholder="Unidad" value={unidad} onChange={(e) => setUnidad(e.target.value)} />
      </div>
      <input className="knx-canvas-meta-select" type="number" placeholder="Precio unitario" value={precioUnitario} onChange={(e) => setPrecioUnitario(e.target.value)} />
      <div className="knx-canvas-newcol-actions">
        <button type="button" className="knx-canvas-mini" disabled={saving} onClick={submit}>Agregar</button>
        <button type="button" className="knx-canvas-mini" onClick={() => setOpen(false)}>Cancelar</button>
      </div>
    </div>
  );
}

function PartidaRow({ partida, gastos, canManage, onDelete, onAddGasto, onDeleteGasto }) {
  const [gastoOpen, setGastoOpen] = useState(false);
  const [monto, setMonto] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [nota, setNota] = useState('');
  const [saving, setSaving] = useState(false);

  const pct = partida.importe ? Math.round((partida.ejecutado / partida.importe) * 100) : 0;
  const sobrecosto = partida.importe > 0 && partida.ejecutado > partida.importe;
  const partidaGastos = gastos.filter((g) => g.partidaId === partida.id);

  const submitGasto = async () => {
    if (!monto || Number(monto) <= 0) return;
    setSaving(true);
    try {
      await onAddGasto(partida.id, { monto, proveedor, nota });
      setMonto(''); setProveedor(''); setNota('');
      setGastoOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="knx-canvas-item">
      <div className="knx-canvas-item-head">
        <div className="knx-canvas-item-who">
          <span className="knx-canvas-item-name">{partida.etapa ? `${partida.etapa} · ` : ''}{partida.descripcion}</span>
        </div>
        {canManage && (
          <button type="button" className="knx-canvas-icon-btn knx-canvas-icon-btn--danger" aria-label="Eliminar partida" onClick={onDelete}>×</button>
        )}
      </div>
      <p className="knx-canvas-ficha-progress">
        {partida.cantidad != null ? `${partida.cantidad} ${partida.unidad || ''} × ${(partida.precioUnitario ?? 0).toLocaleString('es-PE')}` : ''}
        {' · importe '}{partida.importe.toLocaleString('es-PE')}
        {' · ejecutado '}{partida.ejecutado.toLocaleString('es-PE')} ({pct}%)
        {sobrecosto ? ' · ⚠ sobrecosto' : ''}
      </p>
      {partidaGastos.length > 0 && (
        <div className="knx-canvas-ficha-participants" style={{ marginTop: 6 }}>
          {partidaGastos.map((g) => (
            <div key={g.id} className="knx-canvas-ficha-participant-row">
              <span className="knx-canvas-ficha-participant-name">{g.proveedor || g.createdBy}{g.imported ? ' (importado)' : ''}</span>
              <span className="knx-canvas-ficha-participant-progress">{g.monto.toLocaleString('es-PE')}</span>
              {canManage && !g.imported && (
                <button type="button" className="knx-canvas-icon-btn knx-canvas-icon-btn--danger" aria-label="Eliminar gasto" onClick={() => onDeleteGasto(g.id)}>×</button>
              )}
            </div>
          ))}
        </div>
      )}
      {canManage && (
        gastoOpen ? (
          <div className="knx-canvas-newcol-form" style={{ marginTop: 6 }}>
            <input className="knx-canvas-meta-select" type="number" placeholder="Monto del gasto" value={monto} onChange={(e) => setMonto(e.target.value)} autoFocus />
            <input className="knx-canvas-meta-select" placeholder="Proveedor (opcional)" value={proveedor} onChange={(e) => setProveedor(e.target.value)} />
            <input className="knx-canvas-meta-select" placeholder="Nota (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} />
            <div className="knx-canvas-newcol-actions">
              <button type="button" className="knx-canvas-mini" disabled={saving} onClick={submitGasto}>Agregar gasto</button>
              <button type="button" className="knx-canvas-mini" onClick={() => setGastoOpen(false)}>Cancelar</button>
            </div>
          </div>
        ) : (
          <button type="button" className="knx-canvas-mini" style={{ marginTop: 6 }} onClick={() => setGastoOpen(true)}>+ Gasto</button>
        )
      )}
    </div>
  );
}

function PresupuestoSection({ metrics, alerts, partidas, gastos, canManage, onAddPartida, onDeletePartida, onAddGasto, onDeleteGasto }) {
  return (
    <div className="knx-canvas-group" style={{ marginBottom: 16 }}>
      <div className="knx-canvas-group-head"><span className="knx-canvas-group-name">Presupuesto</span></div>

      {metrics && (
        <div className="knx-kpi-grid" style={{ marginBottom: 12 }}>
          <div className="knx-kpi-card"><span className="knx-kpi-label">Avance financiero</span><span className="knx-kpi-value">{metrics.pctFinanciero}%</span></div>
          <div className="knx-kpi-card"><span className="knx-kpi-label">Avance de tareas</span><span className="knx-kpi-value">{metrics.pctTareas}%</span></div>
          <div className="knx-kpi-card"><span className="knx-kpi-label">Tiempo transcurrido</span><span className="knx-kpi-value">{metrics.pctTiempo}%</span></div>
          <div className="knx-kpi-card"><span className="knx-kpi-label">Presupuesto total</span><span className="knx-kpi-value">{metrics.totalImporte.toLocaleString('es-PE')}</span></div>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="knx-canvas-ficha-draft" style={{ marginBottom: 12 }}>
          <label>{alerts.length} alerta{alerts.length !== 1 ? 's' : ''}</label>
          {alerts.map((a, i) => <p key={i} className="knx-canvas-error" style={{ margin: '2px 0' }}>{a.message}</p>)}
        </div>
      )}

      <div className="knx-canvas-cards">
        {!partidas.length ? <p className="knx-knowledge-empty">Sin partidas todavía — creá una para poder cargarle gastos.</p> : partidas.map((p) => (
          <PartidaRow
            key={p.id}
            partida={p}
            gastos={gastos}
            canManage={canManage}
            onDelete={() => onDeletePartida(p.id)}
            onAddGasto={onAddGasto}
            onDeleteGasto={onDeleteGasto}
          />
        ))}
      </div>
      {canManage && <NewPartidaForm onCreate={onAddPartida} />}
    </div>
  );
}

function getDocCategories(projectKind) {
  if (projectKind === 'civil') return ['Planos', 'Contratos', 'Permisos', 'Otro'];
  if (projectKind === 'seguimiento') return ['Contratos', 'Clientes e Inversionistas', 'Financiero', 'Legal', 'Otro'];
  return ['Cronograma', 'Presupuesto', 'Otro'];
}

function NewDocumentForm({ projectKind, onUpload }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(getDocCategories(projectKind)[0]);
  const [busy, setBusy] = useState(false);
  const categories = getDocCategories(projectKind);

  if (!open) return <button type="button" className="knx-canvas-add-item-btn" onClick={() => setOpen(true)}>+ Subir documento</button>;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const data = await readFileAsBase64(file);
      await onUpload({ name: file.name, mimeType: file.type, data, category });
      setOpen(false);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  return (
    <div className="knx-canvas-newcol-form">
      <select className="knx-canvas-meta-select" value={category} onChange={(e) => setCategory(e.target.value)}>
        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <label className="knx-canvas-add-item-btn" style={{ cursor: 'pointer' }}>
        {busy ? 'Subiendo…' : 'Elegir archivo'}
        <input type="file" onChange={handleFile} style={{ display: 'none' }} disabled={busy} />
      </label>
      <div className="knx-canvas-newcol-actions">
        <button type="button" className="knx-canvas-mini" onClick={() => setOpen(false)}>Cancelar</button>
      </div>
    </div>
  );
}

function DocumentacionSection({ projectKind, documents, canManage, onUpload, onDelete }) {
  return (
    <div className="knx-canvas-group" style={{ marginBottom: 16 }}>
      <div className="knx-canvas-group-head"><span className="knx-canvas-group-name">Documentación</span></div>
      <div className="knx-canvas-cards">
        {!documents.length ? <p className="knx-knowledge-empty">Sin documentos todavía.</p> : documents.map((d) => (
          <div className="knx-canvas-item" key={d.id}>
            <div className="knx-canvas-item-head">
              <div className="knx-canvas-item-who">
                <span className="knx-canvas-item-name">{d.name}</span>
              </div>
              {canManage && (
                <button type="button" className="knx-canvas-icon-btn knx-canvas-icon-btn--danger" aria-label="Eliminar documento" onClick={() => onDelete(d.id)}>×</button>
              )}
            </div>
            <p className="knx-canvas-ficha-progress">
              {d.category} · {d.uploadedBy} · {new Date(d.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
              {d.driveUrl ? <> · <a href={d.driveUrl} target="_blank" rel="noreferrer">Ver en Drive</a></> : ' · guardado'}
            </p>
          </div>
        ))}
      </div>
      {canManage && <NewDocumentForm projectKind={projectKind} onUpload={onUpload} />}
    </div>
  );
}

function ProjectDetail({ tenant, projectId, people, personId, onBack, onUpdated }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingDetails, setSavingDetails] = useState(false);
  const [savingTaskId, setSavingTaskId] = useState(null);
  const [view, setView] = useState('list');

  const load = () => {
    setLoading(true);
    fetch(`/api/kai-next/${tenant}/projects/${projectId}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setData(d); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [tenant, projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <p className="knx-knowledge-empty">Cargando…</p>;
  if (error) return <div className="knx-analisis-empty"><p>{error}</p></div>;
  if (!data) return null;

  const { meta, tasks, events, level, partidas = [], gastos = [], civilMetrics, civilAlerts = [], documents = [], tests = [], executions = [] } = data;
  const inactive = meta.status !== 'activo';
  const isCivil = meta.projectKind === 'civil';
  const isExperimental = meta.projectKind === 'experimental';
  const isDesarrollo = meta.projectKind === 'desarrollo';

  const addPartidaRow = async (payload) => {
    const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/partidas`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    if (res.ok) load();
  };

  const deletePartidaRow = async (partidaId) => {
    const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/partidas/${partidaId}`, { method: 'DELETE' });
    if (res.ok) load();
  };

  const addGastoRow = async (partidaId, payload) => {
    const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/gastos`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, partidaId }),
    });
    if (res.ok) load();
  };

  const deleteGastoRow = async (gastoId) => {
    const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/gastos/${gastoId}`, { method: 'DELETE' });
    if (res.ok) load();
  };

  const uploadDocument = async (payload) => {
    const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/documents`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    if (res.ok) load();
  };

  const deleteDocument = async (documentId) => {
    const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/documents/${documentId}`, { method: 'DELETE' });
    if (res.ok) load();
  };

  const createTask = async (payload) => {
    const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/tasks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    if (res.ok) load();
  };

  const deleteTask = async (taskId) => {
    const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/tasks/${taskId}`, { method: 'DELETE' });
    if (res.ok) load();
  };

  const setStatus = async (taskId, status) => {
    setSavingTaskId(taskId);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/tasks/${taskId}/status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      });
      if (res.ok) load();
    } finally {
      setSavingTaskId(null);
    }
  };

  const toggleTaskDone = (task) => setStatus(task.id, task.progreso >= 100 ? 'todo' : 'done');

  const updateDetails = async (patch) => {
    setSavingDetails(true);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
      });
      if (res.ok) { load(); onUpdated?.(); }
    } finally {
      setSavingDetails(false);
    }
  };

  return (
    <>
      <div className="knx-analisis-top">
        <div className="knx-analisis-head">
          <button type="button" className="knx-analisis-compare" onClick={onBack} style={{ marginBottom: 10 }}>← Volver a Proyectos</button>
          <h1>{meta.name}</h1>
          <p>{meta.code ? `${meta.code} · ` : ''}{meta.type || PROJECT_KIND_LABEL[meta.projectKind] || meta.projectKind}</p>
        </div>
        <div className="knx-analisis-controls">
          <span className={`knx-activity-status knx-activity-status--${meta.status === 'activo' ? 'active' : meta.status === 'pausado' ? 'ready' : 'finished'}`}>
            {STATUS_LABEL[meta.status] ?? meta.status}
          </span>
          {level.isDirectorLevel && (
            <select
              className="knx-canvas-meta-select"
              style={{ width: 'auto' }}
              value={meta.status}
              disabled={savingDetails}
              onChange={(e) => updateDetails({ status: e.target.value })}
            >
              {Object.entries(STATUS_LABEL).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          )}
        </div>
      </div>

      {inactive && <p className="knx-canvas-error" style={{ marginBottom: 12 }}>Este proyecto está {meta.status} — reactivalo para poder gestionar tareas.</p>}

      {isDesarrollo && (
        <KaiNextProjectDesarrollo
          tenant={tenant}
          projectId={projectId}
          notionProyecto={data.notionProyecto}
          iniciativas={data.iniciativas ?? []}
          canManage={level.isSupervisorLevel && !inactive}
          onReload={load}
        />
      )}

      {!isExperimental && !isDesarrollo && (
        <div className="knx-canvas-group" style={{ marginBottom: 16 }}>
          <div className="knx-canvas-group-head">
            <span className="knx-canvas-group-name">Tareas</span>
            {tasks.length > 0 && (
              <div className="knx-gantt-view-toggle">
                <button type="button" className={view === 'list' ? 'knx-gantt-view-toggle--active' : ''} onClick={() => setView('list')}>Lista</button>
                <button type="button" className={view === 'gantt' ? 'knx-gantt-view-toggle--active' : ''} onClick={() => setView('gantt')}>Cronograma</button>
              </div>
            )}
          </div>

          {!tasks.length ? (
            <p className="knx-knowledge-empty">Sin tareas todavía.</p>
          ) : view === 'list' ? (
            <div className="knx-canvas-cards">
              {tasks.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  people={people}
                  canManage={level.isSupervisorLevel && !inactive}
                  canToggle={!inactive}
                  onStatusChange={(status) => setStatus(t.id, status)}
                  onDelete={() => deleteTask(t.id)}
                />
              ))}
            </div>
          ) : (
            <KaiNextGantt
              grouped={groupTasksByFase(tasks)}
              people={people}
              savingTaskId={savingTaskId}
              canToggleTask={(t) => !inactive && (level.isSupervisorLevel || (t.responsables ?? []).includes(personId))}
              onToggle={toggleTaskDone}
            />
          )}

          {level.isSupervisorLevel && !inactive && <NewTaskForm people={people} onCreate={createTask} />}
        </div>
      )}

      {isExperimental && (
        <PruebasSection
          tenant={tenant}
          projectId={projectId}
          tests={tests}
          executions={executions}
          people={people}
          canManage={level.isSupervisorLevel && !inactive}
          personId={personId}
          onReload={load}
        />
      )}

      {isCivil && level.isSupervisorLevel && (
        <PresupuestoSection
          metrics={civilMetrics}
          alerts={civilAlerts}
          partidas={partidas}
          gastos={gastos}
          canManage={!inactive}
          onAddPartida={addPartidaRow}
          onDeletePartida={deletePartidaRow}
          onAddGasto={addGastoRow}
          onDeleteGasto={deleteGastoRow}
        />
      )}

      {!isDesarrollo && level.isSupervisorLevel && (
        <DocumentacionSection
          projectKind={meta.projectKind}
          documents={documents}
          canManage={!inactive}
          onUpload={uploadDocument}
          onDelete={deleteDocument}
        />
      )}

      {!isDesarrollo && (
      <div className="knx-canvas-group">
        <div className="knx-canvas-group-head"><span className="knx-canvas-group-name">Historia</span></div>
        <div className="knx-canvas-cards">
          {!events.length ? <p className="knx-knowledge-empty">Sin actividad todavía.</p> : events.map((e) => (
            <div className="knx-canvas-item" key={e.id}>
              <p className="knx-canvas-item-text">{e.title}</p>
              <span className="knx-canvas-ficha-progress">{new Date(e.date).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ))}
        </div>
      </div>
      )}
    </>
  );
}

export default function KaiNextProjects({
  tenant, tenantName, basePath, userName, userHandle, isTeamUser, personId, level, initialProjects, people,
}) {
  const [loggingOut, setLoggingOut] = useState(false);
  const [chats, setChats] = useState([]);
  const [projects, setProjects] = useState(initialProjects ?? []);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deleteChatTarget, setDeleteChatTarget] = useState(null);

  useEffect(() => {
    fetch(`/api/kai-next/${tenant}`).then((r) => r.json()).then((d) => setChats(d.conversations ?? [])).catch(() => null);
  }, [tenant]);

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

  const upsertProject = (project) => {
    setProjects((prev) => [project, ...prev.filter((p) => p.id !== project.id)]);
  };

  return (
    <div className="knx-shell">
      <KaiNextSidebar
        tenant={tenant} tenantName={tenantName} userName={userName} userHandle={userHandle}
        isTeamUser={isTeamUser} basePath={basePath} chats={chats}
        onDeleteChat={handleDeleteChat} onLogout={handleLogout} loggingOut={loggingOut} active="proyectos"
      />

      <main className="knx-main">
        <div className="knx-analisis-page">
          {activeProjectId ? (
            <ProjectDetail
              tenant={tenant}
              projectId={activeProjectId}
              people={people}
              personId={personId}
              onBack={() => setActiveProjectId(null)}
              onUpdated={() => { /* el detalle se recarga solo */ }}
            />
          ) : (
            <>
              <div className="knx-analisis-top">
                <div className="knx-analisis-head">
                  <h1>Proyectos</h1>
                  <p>Seguimiento de proyectos de {tenantName} — tareas y equipo.</p>
                </div>
                {level?.isSupervisorLevel && (
                  <div className="knx-analisis-controls">
                    <button type="button" className="knx-analisis-sources-save" onClick={() => setCreating(true)}>+ Nuevo proyecto</button>
                  </div>
                )}
              </div>

              {!projects.length ? (
                <div className="knx-analisis-empty">
                  <p>Todavía no hay ningún proyecto con este cliente.</p>
                </div>
              ) : (
                <div className="knx-activity-list">
                  {projects.map((p) => (
                    <div className="knx-activity-row" key={p.id}>
                      <button type="button" className="knx-activity-row-main" onClick={() => setActiveProjectId(p.id)}>
                        <div className="knx-activity-row-text">
                          <span className="knx-activity-row-title">{p.name}</span>
                          <span className="knx-activity-row-sub">{p.code ? `${p.code} · ` : ''}{p.type || PROJECT_KIND_LABEL[p.projectKind] || p.projectKind}</span>
                        </div>
                        <span className={`knx-activity-status knx-activity-status--${p.status === 'activo' ? 'active' : p.status === 'pausado' ? 'ready' : 'finished'}`}>
                          {STATUS_LABEL[p.status] ?? p.status}
                        </span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {creating && (
        <CreateProjectModal
          tenant={tenant}
          people={people}
          onClose={() => setCreating(false)}
          onCreated={(project) => { upsertProject(project); setCreating(false); setActiveProjectId(project.id); }}
        />
      )}

      <KaiNextConfirmDialog
        open={!!deleteChatTarget}
        title="Eliminar conversación"
        message={`¿Eliminar "${deleteChatTarget?.title}"? Esta acción no se puede deshacer.`}
        onConfirm={confirmDeleteChat}
        onCancel={() => setDeleteChatTarget(null)}
      />
    </div>
  );
}
