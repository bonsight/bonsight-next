'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import KaiNextSidebar from './KaiNextSidebar';
import KaiNextConfirmDialog from './KaiNextConfirmDialog';
import { PruebasSection } from './KaiNextProjectExperimental';
import KaiNextProjectDesarrollo from './KaiNextProjectDesarrollo';

const STATUS_LABEL = { activo: 'Activo', pausado: 'Pausado', completado: 'Completado' };
const RISK_LABEL = { en_plan: 'En plan', en_riesgo: 'En riesgo', atrasado: 'Atrasado' };
const RISK_CLASS = { en_plan: 'knx-project-risk--ok', en_riesgo: 'knx-project-risk--warn', atrasado: 'knx-project-risk--bad' };
// Mismo listado/colores que KaiNextProjectDesarrollo.jsx (FaseStepper) — duplicado a propósito,
// no se importa entre sí (mismo criterio que ya existe ahí: son valores de Notion, no un enum
// compartido en código).
const FASE_OPTIONS = ['Preparación', 'Análisis', 'Diseño', 'Desarrollo', 'Pruebas', 'Producción', 'Monitoreo y Cierre'];
const FASE_COLORS = {
  'Preparación': '#9CA3AF', 'Análisis': '#A47148', 'Diseño': '#A78BFA', 'Desarrollo': '#60A5FA',
  'Pruebas': '#FBBF24', 'Producción': '#34D399', 'Monitoreo y Cierre': '#6B7280',
};

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '·';
}
const PROJECT_KIND_LABEL = { seguimiento: 'Seguimiento', civil: 'Civil', experimental: 'Experimental', desarrollo: 'Desarrollo' };
const TASK_STATUSES = [
  { id: 'todo', label: 'Por hacer' },
  { id: 'doing', label: 'Haciendo' },
  { id: 'done', label: 'Terminado' },
];
const PRIORITIES = ['Alta', 'Media', 'Baja'];

// Tabs de la lista de tareas — "Activas" (todo+doing) va primero y es el default: una tarea
// terminada deja de ser información accionable del día a día, así que no satura la vista por
// defecto; "Todas" sigue disponible para auditar el historial completo.
const STATUS_TABS = [
  { id: 'activas', label: 'Activas', test: (t) => t.status !== 'done' },
  { id: 'todo', label: 'Por hacer', test: (t) => t.status === 'todo' },
  { id: 'doing', label: 'Haciendo', test: (t) => t.status === 'doing' },
  { id: 'done', label: 'Terminadas', test: (t) => t.status === 'done' },
  { id: 'all', label: 'Todas', test: () => true },
];
function matchesStatusTab(task, tabId) {
  return (STATUS_TABS.find((s) => s.id === tabId) ?? STATUS_TABS[0]).test(task);
}

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

function isVenceHoy(t) {
  return t.progreso < 100 && t.fechaFin === new Date().toISOString().slice(0, 10);
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

// Para la Lista agrupada por mini proyecto — a diferencia de groupTasksByFase (que agrupa por
// el string tal cual aparece, usado solo por Cronograma), acá el orden sigue el de `grupos`
// (gestionados), seguido de cualquier `fase` suelta que no matchee ninguno (legado), y por
// último "Sin mini proyecto" — así el orden en pantalla es estable aunque cambie el de `tasks`.
function groupTasksByGrupo(tasks, grupos) {
  const byName = new Map(grupos.map((g) => [g.name, { key: g.name, tasks: [] }]));
  const extra = new Map();
  const sinGrupo = { key: null, tasks: [] };
  for (const t of tasks) {
    if (!t.fase) { sinGrupo.tasks.push(t); continue; }
    if (byName.has(t.fase)) { byName.get(t.fase).tasks.push(t); continue; }
    if (!extra.has(t.fase)) extra.set(t.fase, { key: t.fase, tasks: [] });
    extra.get(t.fase).tasks.push(t);
  }
  const groups = [...byName.values(), ...extra.values()].filter((g) => g.tasks.length > 0);
  if (sinGrupo.tasks.length > 0) groups.push(sinGrupo);
  return groups;
}

// Paleta fija, asignada por posición en el array de tipologías (orden de creación) — nunca se
// persiste un color: así una tipología creada antes de que existiera este campo (o reordenada
// algún día) sigue teniendo un color determinístico sin necesitar una migración de datos.
const TIPOLOGIA_COLORS = ['#34D399', '#60A5FA', '#F59E0B', '#A78BFA', '#F472B6', '#38BDF8', '#FB923C', '#A3E635'];
function tipologiaColor(tipologias, tipologiaId) {
  const idx = tipologias.findIndex((t) => t.id === tipologiaId);
  return idx === -1 ? null : TIPOLOGIA_COLORS[idx % TIPOLOGIA_COLORS.length];
}

// Heurística simple (sin IA real) para sugerir "esto parece un mini proyecto, no una tarea" —
// tareas sueltas (sin mini proyecto todavía) cuyo nombre arranca con "Proyecto", típico de
// trabajos con alcance propio importados como una sola tarea. Una sugerencia a la vez; se
// descarta por tarea (persistido en `miniProyectoSuggestionDismissed`, no por sesión).
function findMiniProyectoCandidate(tasks) {
  return (tasks ?? []).find((t) => !t.fase && !t.miniProyectoSuggestionDismissed && /^proyecto\b/i.test(t.nombre.trim())) ?? null;
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

// Alta rápida (solo título) arriba de Canvas/Cronograma — mismo criterio que TaskQuickAdd de
// Lista y el "+ Agregar subtarea" de Proyecto de Desarrollo: el resto de los campos (fase,
// responsables, fechas) se completan después desde el panel de detalle, no al crear.
// Botón + modal (mismo patrón que GrupoModal) — antes era una barra con input siempre visible
// arriba de Canvas/Cronograma, pero quedaba fuera de lugar ahí; un botón que abre el modal es
// coherente con el resto de los "+ Nuevo X" de la app.
// Mismos campos que el panel de detalle (Nombre/Descripción/Mini proyecto/Prioridad/Estado/
// Inicio/Fin/Estimación/Horas reales/Responsables) — así no hace falta crear la tarea "a
// medias" y después abrir el detalle para completarla.
function NewTaskQuickModal({ people, grupos, tipologias, onCreate, onClose }) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fase, setFase] = useState('');
  const [tipologiaId, setTipologiaId] = useState('');
  const [prioridad, setPrioridad] = useState('');
  const [status, setStatus] = useState('todo');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [actualHours, setActualHours] = useState('');
  const [responsables, setResponsables] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const toggleResponsable = (id) => setResponsables((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = async () => {
    if (!nombre.trim() || saving) return;
    setSaving(true);
    setErr(null);
    try {
      await onCreate({
        nombre: nombre.trim(), descripcion, fase, tipologiaId: tipologiaId || null, prioridad, status, responsables,
        fechaInicio: fechaInicio || null, fechaFin: fechaFin || null,
        estimatedHours: estimatedHours === '' ? null : Number(estimatedHours),
        actualHours: actualHours === '' ? null : Number(actualHours),
      });
      onClose();
    } catch (e) {
      setErr(e.message || 'No se pudo crear.');
      setSaving(false);
    }
  };

  return (
    <div className="knx-ficha-share-backdrop" onClick={onClose}>
      <div className="knx-ficha-review-modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(460px, 92vw)', maxHeight: '88vh', overflowY: 'auto' }}>
        <div className="knx-ficha-review-head">
          <div><h3 className="knx-ficha-review-title">Nueva tarea</h3></div>
          <button type="button" className="knx-side-panel-close" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>
        {err && <p className="knx-canvas-error">{err}</p>}
        <div className="knx-board-field">
          <label>Nombre</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
        </div>
        <div className="knx-board-field">
          <label>Descripción</label>
          <textarea rows={4} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </div>
        <div className="knx-board-field-row">
          <div className="knx-board-field">
            <label>Mini proyecto</label>
            <select value={fase} onChange={(e) => setFase(e.target.value)}>
              <option value="">Sin mini proyecto</option>
              {grupos?.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
            </select>
          </div>
          {tipologias?.length > 0 && (
            <div className="knx-board-field">
              <label>Tipología</label>
              <select value={tipologiaId} onChange={(e) => setTipologiaId(e.target.value)}>
                <option value="">Sin tipología</option>
                {tipologias.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
          <div className="knx-board-field">
            <label>Prioridad</label>
            <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)}>
              <option value="">Sin definir</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div className="knx-board-field">
          <label>Estado</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {TASK_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div className="knx-board-field-row">
          <div className="knx-board-field">
            <label>Inicio</label>
            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
          </div>
          <div className="knx-board-field">
            <label>Fin</label>
            <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
          </div>
        </div>
        <div className="knx-board-field-row">
          <div className="knx-board-field">
            <label>Estimación (hs)</label>
            <input type="number" min="0" step="0.5" value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} />
          </div>
          <div className="knx-board-field">
            <label>Horas reales</label>
            <input type="number" min="0" step="0.5" value={actualHours} onChange={(e) => setActualHours(e.target.value)} />
          </div>
        </div>
        <div className="knx-board-field">
          <label>Responsables</label>
          <div className="knx-canvas-meta-checklist">
            {people.map((p) => (
              <label key={p.id} className="knx-canvas-meta-checkbox">
                <input type="checkbox" checked={responsables.includes(p.id)} onChange={() => toggleResponsable(p.id)} />
                <span className="knx-canvas-meta-checkbox-box" />
                {p.name || p.email}
              </label>
            ))}
          </div>
        </div>
        <div className="knx-canvas-ficha-draft-actions" style={{ marginTop: 16 }}>
          <button type="button" className="knx-canvas-mini" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="button" className="knx-analisis-sources-save" onClick={submit} disabled={!nombre.trim() || saving}>{saving ? 'Creando…' : 'Crear tarea'}</button>
        </div>
      </div>
    </div>
  );
}


function TaskRow({ task, people, canManage, canToggle, onStatusChange, onDelete, onOpen }) {
  return (
    <div className="knx-canvas-item" onClick={onOpen} style={{ cursor: 'pointer' }}>
      <div className="knx-canvas-item-head">
        <div className="knx-canvas-item-who">
          <span className="knx-canvas-item-name">{task.fase ? `${task.fase} · ` : ''}{task.nombre}</span>
        </div>
        {canManage && (
          <button type="button" className="knx-canvas-icon-btn knx-canvas-icon-btn--danger" aria-label="Eliminar tarea" onClick={(e) => { e.stopPropagation(); onDelete(); }}>×</button>
        )}
      </div>
      {task.descripcion && <p className="knx-canvas-ficha-progress">{task.descripcion.length > 90 ? `${task.descripcion.slice(0, 90).trim()}…` : task.descripcion}</p>}
      <p className="knx-canvas-ficha-progress">
        {task.prioridad ? `${task.prioridad} · ` : ''}
        {(task.responsables ?? []).map((id) => personName(people, id)).join(', ') || 'Sin responsable'}
        {task.fechaInicio ? ` · ${task.fechaInicio} → ${task.fechaFin ?? '?'}` : ''}
      </p>
      <select
        className="knx-canvas-meta-select"
        style={{ marginTop: 6, width: 'auto' }}
        value={task.status}
        disabled={!canToggle}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onStatusChange(e.target.value)}
      >
        {TASK_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
    </div>
  );
}

// Panel de detalle de una tarea de Proyecto de Seguimiento — mismo shell visual
// (.knx-side-panel) que ya usa DevTaskDetailPanel en Proyecto de Desarrollo.
function TaskDetailPanel({ task, people, grupos, tipologias, canManage, documents = [], onUploadDocument, onDeleteDocument, onClose, onSave, onStatusChange, onDelete }) {
  const [nombre, setNombre] = useState(task.nombre);
  const [descripcion, setDescripcion] = useState(task.descripcion ?? '');
  const [fase, setFase] = useState(task.fase ?? '');
  const [tipologiaId, setTipologiaId] = useState(task.tipologiaId ?? '');
  const [fechaInicio, setFechaInicio] = useState(task.fechaInicio ?? '');
  const [fechaFin, setFechaFin] = useState(task.fechaFin ?? '');
  const [prioridad, setPrioridad] = useState(task.prioridad ?? '');
  const [estimatedHours, setEstimatedHours] = useState(task.estimatedHours ?? '');
  const [actualHours, setActualHours] = useState(task.actualHours ?? '');
  const [responsables, setResponsables] = useState(task.responsables ?? []);
  const [saving, setSaving] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docErr, setDocErr] = useState(null);

  const uploadDoc = async (file) => {
    if (!file) return;
    setUploadingDoc(true);
    setDocErr(null);
    try {
      const data = await readFileAsBase64(file);
      await onUploadDocument({ name: file.name, mimeType: file.type, data });
    } catch (e) {
      setDocErr(e.message || 'No se pudo subir el archivo.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const toggleResponsable = (id) => {
    setResponsables((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const dirty = nombre !== task.nombre || descripcion !== (task.descripcion ?? '') || fase !== (task.fase ?? '')
    || tipologiaId !== (task.tipologiaId ?? '')
    || fechaInicio !== (task.fechaInicio ?? '') || fechaFin !== (task.fechaFin ?? '') || prioridad !== (task.prioridad ?? '')
    || String(estimatedHours) !== String(task.estimatedHours ?? '') || String(actualHours) !== String(task.actualHours ?? '')
    || JSON.stringify(responsables) !== JSON.stringify(task.responsables ?? []);

  const saveAll = async () => {
    setSaving(true);
    try {
      await onSave({
        nombre: nombre.trim() || task.nombre, descripcion, fase, tipologiaId: tipologiaId || null, prioridad, responsables,
        fechaInicio: fechaInicio || null, fechaFin: fechaFin || null,
        estimatedHours: estimatedHours === '' ? null : Number(estimatedHours),
        actualHours: actualHours === '' ? null : Number(actualHours),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="knx-side-panel">
      <div className="knx-side-panel-header">
        <span className="knx-side-panel-title">Tarea</span>
        <button type="button" className="knx-side-panel-close" onClick={onClose} aria-label="Cerrar">×</button>
      </div>
      <div className="knx-side-panel-thread knx-board-detail-body">
        <div className="knx-board-field">
          <label>Nombre</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={!canManage} />
        </div>
        <div className="knx-board-field">
          <label>Descripción</label>
          <textarea rows={8} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} disabled={!canManage} />
        </div>
        <div className="knx-board-field-row">
          <div className="knx-board-field">
            <label>Mini proyecto</label>
            <select value={fase} onChange={(e) => setFase(e.target.value)} disabled={!canManage}>
              <option value="">Sin mini proyecto</option>
              {grupos?.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
              {fase && !grupos?.some((g) => g.name === fase) && <option value={fase}>{fase} (sin gestionar)</option>}
            </select>
          </div>
          <div className="knx-board-field">
            <label>Prioridad</label>
            <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} disabled={!canManage}>
              <option value="">Sin definir</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        {tipologias?.length > 0 && (
          <div className="knx-board-field-row">
            <div className="knx-board-field">
              <label>Tipología</label>
              <select value={tipologiaId} onChange={(e) => setTipologiaId(e.target.value)} disabled={!canManage}>
                <option value="">Sin tipología</option>
                {tipologias.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
        )}
        <div className="knx-board-field-row">
          <div className="knx-board-field">
            <label>Estado</label>
            <select value={task.status} onChange={(e) => onStatusChange(e.target.value)} disabled={!canManage}>
              {TASK_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <div className="knx-board-field-row">
          <div className="knx-board-field">
            <label>Inicio</label>
            <input type="date" value={fechaInicio ?? ''} onChange={(e) => setFechaInicio(e.target.value)} disabled={!canManage} />
          </div>
          <div className="knx-board-field">
            <label>Fin</label>
            <input type="date" value={fechaFin ?? ''} onChange={(e) => setFechaFin(e.target.value)} disabled={!canManage} />
          </div>
        </div>
        <div className="knx-board-field-row">
          <div className="knx-board-field">
            <label>Estimación (hs)</label>
            <input type="number" min="0" step="0.5" value={estimatedHours ?? ''} onChange={(e) => setEstimatedHours(e.target.value)} disabled={!canManage} />
          </div>
          <div className="knx-board-field">
            <label>Horas reales</label>
            <input type="number" min="0" step="0.5" value={actualHours ?? ''} onChange={(e) => setActualHours(e.target.value)} disabled={!canManage} />
          </div>
        </div>
        <div className="knx-board-field">
          <label>Responsables</label>
          <div className="knx-canvas-meta-checklist">
            {people.map((p) => (
              <label key={p.id} className="knx-canvas-meta-checkbox">
                <input type="checkbox" checked={responsables.includes(p.id)} onChange={() => toggleResponsable(p.id)} disabled={!canManage} />
                <span className="knx-canvas-meta-checkbox-box" />
                {p.name || p.email}
              </label>
            ))}
          </div>
        </div>
        <div className="knx-board-field">
          <label>Documentos</label>
          {docErr && <p className="knx-canvas-error">{docErr}</p>}
          <div className="knx-entregables-list">
            {documents.map((d) => (
              <div key={d.id} className="knx-entregable-row">
                {d.driveUrl ? (
                  <a href={d.driveUrl} target="_blank" rel="noreferrer" className="knx-entregable-link">{d.name}</a>
                ) : (
                  <span>{d.name}</span>
                )}
                {canManage && (
                  <button type="button" className="knx-side-panel-close" aria-label="Quitar" onClick={() => onDeleteDocument(d.id)}>×</button>
                )}
              </div>
            ))}
            {!documents.length && <p className="knx-knowledge-empty">Sin documentos en esta tarea todavía.</p>}
            {canManage && (
              <label className="knx-board-subtask-add-btn" style={{ cursor: uploadingDoc ? 'default' : 'pointer', opacity: uploadingDoc ? 0.5 : 1, display: 'inline-block' }}>
                {uploadingDoc ? 'Subiendo…' : '+ Subir documento'}
                <input type="file" style={{ display: 'none' }} disabled={uploadingDoc} onChange={(e) => uploadDoc(e.target.files?.[0])} />
              </label>
            )}
          </div>
        </div>
        {canManage && (
          <button type="button" className="knx-new-chat" disabled={!dirty || saving} onClick={saveAll} style={{ width: '100%', justifyContent: 'center' }}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        )}
        {canManage && (
          <button type="button" className="knx-delete-task-btn" onClick={onDelete}>
            Eliminar tarea
          </button>
        )}
      </div>
    </div>
  );
}

// Fila de alta rápida — mismo patrón "escribir y Enter" del mockup, sin abrir ningún popup.
// Campos que no sean el nombre (fecha, responsable, prioridad) se completan después desde el
// panel de detalle, igual que cualquier tarea creada así.
// Antes era un input siempre visible dentro de la fila de la tabla — mismo criterio que ya se
// cambió en Canvas/Cronograma: botón que abre el modal completo (NewTaskQuickModal), no un
// campo de texto suelto.

function TaskTableRow({ task, people, tipologias, canManage, canToggle, onStatusChange, onDelete, onOpen }) {
  const done = task.status === 'done';
  const vencida = isVencida(task);
  const venceHoy = isVenceHoy(task);
  const tipologiaName = task.tipologiaId ? tipologias?.find((t) => t.id === task.tipologiaId)?.name : null;
  return (
    <div className="knx-task-table-row" onClick={onOpen}>
      <button
        type="button"
        className={`knx-task-table-checkbox${done ? ' knx-task-table-checkbox--done' : ''}`}
        disabled={!canToggle}
        onClick={(e) => { e.stopPropagation(); onStatusChange(done ? 'todo' : 'done'); }}
        aria-label={done ? 'Marcar como pendiente' : 'Marcar terminada'}
      />
      <div className="knx-task-table-cell-main">
        <div className={`knx-task-table-title${done ? ' knx-task-table-title--done' : ''}`} title={task.nombre}>{task.nombre}</div>
        {task.fase && <div className="knx-task-table-sub">{task.fase}</div>}
      </div>
      <div className="knx-task-table-sub">
        {tipologiaName && <span className="knx-tipologia-dot" style={{ background: tipologiaColor(tipologias, task.tipologiaId) }} />}
        {tipologiaName ?? '—'}
      </div>
      <div className="knx-task-table-sub">{(task.responsables ?? []).map((id) => personName(people, id)).join(', ') || 'Sin responsable'}</div>
      <div className="knx-task-table-dates">
        {task.fechaInicio ? `${formatShortDate(task.fechaInicio)} → ${task.fechaFin ? formatShortDate(task.fechaFin) : '?'}` : '—'}
        {vencida && <span className="knx-task-table-overdue">Vencida</span>}
        {!vencida && venceHoy && <span className="knx-task-table-duetoday">Vence hoy</span>}
      </div>
      <select
        className="knx-canvas-meta-select"
        value={task.status}
        disabled={!canToggle}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onStatusChange(e.target.value)}
      >
        {TASK_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
      <span className="knx-task-table-sub">{task.prioridad ?? '—'}</span>
      <span className="knx-task-table-sub">{task.estimatedHours ?? '—'}/{task.actualHours ?? '—'}</span>
      {canManage ? (
        <button type="button" className="knx-canvas-icon-btn knx-canvas-icon-btn--danger" aria-label="Eliminar tarea" onClick={(e) => { e.stopPropagation(); onDelete(); }}>×</button>
      ) : <span />}
    </div>
  );
}

const GANTT_PX_PER_DAY = 34;
const GANTT_MIN_TRACK = 420;
const GANTT_INFO_WIDTH = 200;

// Port directo de CronogramaGantt (app/labs/[tenant]/LabsClientTenant.jsx:2555) — barras
// posicionadas por fecha de inicio/fin, agrupadas por fase, con un pill a la derecha para
// marcar terminada/pendiente (togglea status 'todo'⇄'done', mismo setTaskStatus que la Lista).
function KaiNextGantt({ grouped, people, grupos, savingTaskId, canToggleTask, onToggle, selectedTaskId, onSelectTask }) {
  const scrollRef = useRef(null);
  const allTasks = grouped.flatMap((g) => g.tasks);
  const withDates = allTasks.filter((t) => t.fechaInicio && t.fechaFin);
  if (!withDates.length) {
    return <p className="knx-knowledge-empty">Ninguna tarea tiene fecha de inicio y fin cargadas todavía — usá la vista Lista o editalas para ver el cronograma.</p>;
  }

  const starts = withDates.map((t) => t.fechaInicio).sort();
  const ends = withDates.map((t) => t.fechaFin).sort();
  const domainStart = starts[0];
  const domainEnd = ends[ends.length - 1];
  const totalDays = Math.max(1, daysBetween(domainStart, domainEnd)) + 1;
  const trackWidth = Math.max(GANTT_MIN_TRACK, totalDays * GANTT_PX_PER_DAY);
  const todayIso = new Date().toISOString().slice(0, 10);
  const showToday = todayIso >= domainStart && todayIso <= domainEnd;
  const todayLeft = GANTT_INFO_WIDTH + daysBetween(domainStart, todayIso) * GANTT_PX_PER_DAY;

  // Al entrar, el cronograma arranca centrado en "hoy" (o lo más cerca posible) — antes siempre
  // abría desde el inicio del rango, así que un proyecto largo escondía la fecha actual varios
  // scrolls a la derecha. Si el proyecto ya terminó, muestra el final; si todavía no arrancó,
  // el inicio (que ya es el default natural, sin nada que hacer).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const target = todayIso > domainEnd ? GANTT_INFO_WIDTH + trackWidth : todayLeft;
    el.scrollLeft = Math.max(0, target - el.clientWidth / 2);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tickEvery = totalDays <= 14 ? 1 : totalDays <= 45 ? 3 : totalDays <= 120 ? 7 : 14;
  const ticks = [];
  for (let d = 0; d <= totalDays; d += tickEvery) {
    const date = new Date(`${domainStart}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + d);
    ticks.push({ left: d * GANTT_PX_PER_DAY, label: formatShortDate(date.toISOString().slice(0, 10)) });
  }

  return (
    <>
      <div className="knx-gantt-scroll" ref={scrollRef}>
        <div className="knx-gantt-wrap" style={{ width: GANTT_INFO_WIDTH + trackWidth + 160, position: 'relative' }}>
          <div className="knx-gantt-grid" style={{ left: GANTT_INFO_WIDTH, width: trackWidth }}>
            {ticks.map((tk) => <div key={tk.left} style={{ left: tk.left }} />)}
          </div>
          <div className="knx-gantt-axisrow">
            <div className="knx-gantt-corner" style={{ width: GANTT_INFO_WIDTH, flexShrink: 0 }} />
            <div className="knx-gantt-axis" style={{ width: trackWidth }}>
              {ticks.map((tk) => <span key={tk.left} style={{ left: Math.max(0, tk.left - 13) }}>{tk.label}</span>)}
            </div>
          </div>
          {showToday && (
            <>
              <div className="knx-gantt-today" style={{ left: todayLeft }} title="Hoy" />
              <span className="knx-gantt-today-label" style={{ left: todayLeft }}>Hoy · {formatShortDate(todayIso)}</span>
            </>
          )}

          {grouped.map((g) => {
            const tasks = g.tasks;
            if (!tasks.length) return null;
            return (
              <div key={g.fase}>
                <div className="knx-gantt-fase"><span>{g.fase}</span></div>
                {tasks.map((t) => {
                  const hasDates = t.fechaInicio && t.fechaFin;
                  const vencida = isVencida(t);
                  const saving = savingTaskId === t.id;
                  const status = saving ? 'saving' : t.progreso >= 100 ? 'done' : vencida ? 'overdue' : 'pending';
                  const statusLabel = saving ? 'Guardando…' : status === 'done' ? 'Terminada' : vencida ? 'Vencida' : 'Pendiente';
                  const barLeft = hasDates ? Math.max(0, daysBetween(domainStart, t.fechaInicio)) * GANTT_PX_PER_DAY : 0;
                  const barWidth = hasDates ? Math.max(GANTT_PX_PER_DAY * 0.7, (daysBetween(t.fechaInicio, t.fechaFin) + 1) * GANTT_PX_PER_DAY) : 0;
                  const showLabel = barWidth >= 78;
                  return (
                    <div
                      className={`knx-gantt-row knx-gantt-row--clickable${selectedTaskId === t.id ? ' knx-gantt-row--selected' : ''}`}
                      key={t.id}
                      onClick={() => onSelectTask(t.id)}
                    >
                      <div className="knx-gantt-info" style={{ width: GANTT_INFO_WIDTH }}>
                        <div className="knx-gantt-task-name" title={t.nombre}>{t.nombre}</div>
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
                          onClick={(e) => { e.stopPropagation(); onToggle(t); }}
                        >
                          {status === 'done' ? '✓ Terminada' : 'Marcar terminada'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// Tarjeta simple del Kanban de tareas — mismo look que .knx-board-card, sin los campos
// específicos de Notion (tipo/severidad/"fuera de plan") que no existen en este modelo.
function TaskCanvasCard({ task, people, tipologias, draggable, onDragStart, onDragEnd, dragging, onOpen }) {
  const tipologiaName = task.tipologiaId ? tipologias?.find((t) => t.id === task.tipologiaId)?.name : null;
  return (
    <div
      className={`knx-board-card${dragging ? ' knx-board-card--dragging' : ''}`}
      onClick={onOpen}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <p className="knx-board-card-title">{task.nombre}</p>
      {task.descripcion && <p className="knx-board-card-desc">{task.descripcion.length > 90 ? `${task.descripcion.slice(0, 90).trim()}…` : task.descripcion}</p>}
      {(task.prioridad || tipologiaName) && (
        <div className="knx-board-card-tags">
          {task.prioridad && <span className={`knx-board-tag knx-board-tag--priority-${task.prioridad.toLowerCase()}`}>{task.prioridad}</span>}
          {tipologiaName && (
            <span className="knx-board-tag">
              <span className="knx-tipologia-dot" style={{ background: tipologiaColor(tipologias, task.tipologiaId) }} />
              {tipologiaName}
            </span>
          )}
        </div>
      )}
      {task.fechaInicio && (
        <div className="knx-board-card-dates">{formatShortDate(task.fechaInicio)} → {task.fechaFin ? formatShortDate(task.fechaFin) : '—'}</div>
      )}
      <div className="knx-board-card-foot">
        <span className="knx-board-card-resp">
          {(task.responsables ?? []).length ? task.responsables.map((id) => personName(people, id)).join(', ') : 'Sin asignar'}
        </span>
      </div>
    </div>
  );
}

// Kanban por estado (Por hacer/Haciendo/Terminado) — alternativa más rápida de escanear que la
// Lista, y no depende de fechas cargadas como el Cronograma. Drag-and-drop entre columnas
// cambia el status real de la tarea (mismo setStatus que ya usan Lista/Cronograma).
function KaiNextTaskCanvas({ tasks, people, tipologias, canManage, onStatusChange, selectedTaskId, onSelectTask }) {
  const [dragId, setDragId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const handleDrop = (status) => {
    const taskId = dragId;
    setDragOverCol(null);
    setDragId(null);
    if (!taskId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== status) onStatusChange(taskId, status);
  };

  return (
    <div className="knx-board-cols" style={{ gridTemplateColumns: `repeat(${TASK_STATUSES.length}, minmax(200px, 1fr))` }}>
      {TASK_STATUSES.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.id);
        return (
          <div
            key={col.id}
            className={`knx-board-col${dragOverCol === col.id ? ' knx-board-col--over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.id); }}
            onDragLeave={() => setDragOverCol((c) => (c === col.id ? null : c))}
            onDrop={(e) => { e.preventDefault(); handleDrop(col.id); }}
          >
            <div className="knx-board-col-head">{col.label} <span className="knx-canvas-group-count">{colTasks.length}</span></div>
            <div className="knx-board-col-cards">
              {colTasks.map((t) => (
                <TaskCanvasCard
                  key={t.id}
                  task={t}
                  people={people}
                  tipologias={tipologias}
                  draggable={canManage}
                  onDragStart={() => setDragId(t.id)}
                  onDragEnd={() => setDragId(null)}
                  dragging={dragId === t.id}
                  onOpen={() => onSelectTask(t.id)}
                />
              ))}
              {!colTasks.length && <p className="knx-knowledge-empty">—</p>}
            </div>
          </div>
        );
      })}
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

// "Mini proyectos" dentro de un Proyecto de Seguimiento/Civil — le dan nombre e identidad
// propia a lo que antes era solo el texto libre `fase` de cada tarea (ver groupTasksByFase).
// Las tareas se siguen agrupando por ese mismo string, esto solo lo vuelve gestionable.
function GrupoModal({ title, initial, onSave, onDelete, onClose }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [fechaInicio, setFechaInicio] = useState(initial?.fechaInicio ?? '');
  const [fechaFin, setFechaFin] = useState(initial?.fechaFin ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async () => {
    if (!name.trim()) { setErr('El nombre es requerido.'); return; }
    setBusy(true);
    setErr(null);
    try {
      await onSave({ name: name.trim(), fechaInicio: fechaInicio || null, fechaFin: fechaFin || null });
      onClose();
    } catch (e) {
      setErr(e.message || 'No se pudo guardar.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setErr(null);
    try {
      await onDelete();
      onClose();
    } catch (e) {
      setErr(e.message || 'No se pudo eliminar.');
      setBusy(false);
    }
  };

  return (
    <div className="knx-ficha-share-backdrop" onClick={onClose}>
      <div className="knx-ficha-review-modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(380px, 92vw)' }}>
        <div className="knx-ficha-review-head">
          <div><h3 className="knx-ficha-review-title">{title}</h3></div>
          <button type="button" className="knx-side-panel-close" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>
        {err && <p className="knx-canvas-error">{err}</p>}
        <input className="knx-canvas-meta-select" placeholder="Nombre del mini proyecto" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <div className="knx-canvas-meta-form-row" style={{ marginTop: 8 }}>
          <div className="knx-canvas-meta-field">
            <label className="knx-canvas-meta-field-label">Inicio</label>
            <input type="date" className="knx-canvas-meta-select" value={fechaInicio ?? ''} onChange={(e) => setFechaInicio(e.target.value)} />
          </div>
          <div className="knx-canvas-meta-field">
            <label className="knx-canvas-meta-field-label">Fin</label>
            <input type="date" className="knx-canvas-meta-select" value={fechaFin ?? ''} onChange={(e) => setFechaFin(e.target.value)} />
          </div>
        </div>
        <div className="knx-canvas-ficha-draft-actions" style={{ marginTop: 16, justifyContent: initial ? 'space-between' : 'flex-end' }}>
          {initial && <button type="button" className="knx-delete-task-btn" style={{ marginTop: 0 }} disabled={busy} onClick={remove}>Eliminar mini proyecto</button>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="knx-canvas-mini" onClick={onClose} disabled={busy}>Cancelar</button>
            <button type="button" className="knx-analisis-sources-save" onClick={submit} disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Tarjetas compactas en vez de la sección de chips de antes — al hacer clic en una, filtra la
// lista de tareas a ese mini proyecto (toggle: un segundo clic la vuelve a mostrar todas). Editar
// (nombre/fechas) pasa a un ícono aparte (⋯) en la tarjeta, para no pisar el click de filtrar.
function GruposSection({ grupos, tasks, tipologias, selected, onSelect, canManage, onAdd, onUpdate, onDelete }) {
  const [modal, setModal] = useState(null); // null | 'new' | grupo

  if (!canManage && !grupos.length) return null;

  if (!grupos.length) {
    return (
      <div className="knx-mini-proyectos-empty">
        <p><strong>Mini proyectos</strong>Agrupa tareas que avanzan juntas, con sus fechas y su avance.</p>
        {canManage && <button type="button" className="knx-canvas-mini" onClick={() => setModal('new')}>+ Nuevo mini proyecto</button>}
        {modal && (
          <GrupoModal
            title="Nuevo mini proyecto"
            initial={null}
            onSave={onAdd}
            onClose={() => setModal(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 4 }}>
      <div className="knx-canvas-group-head">
        <span className="knx-canvas-group-name">Mini proyectos · {grupos.length}</span>
        {canManage && <button type="button" className="knx-canvas-mini" onClick={() => setModal('new')}>+ Nuevo mini proyecto</button>}
      </div>
      <div className="knx-grupo-cards">
        {grupos.map((g) => {
          const groupTasks = tasks.filter((t) => t.fase === g.name);
          const done = groupTasks.filter((t) => t.status === 'done').length;
          const pct = groupTasks.length ? Math.round((done / groupTasks.length) * 100) : 0;
          const distinctTipologias = [...new Set(groupTasks.map((t) => t.tipologiaId).filter(Boolean))];
          const dominant = distinctTipologias.length === 1 ? tipologias.find((t) => t.id === distinctTipologias[0]) : null;
          return (
            <div
              key={g.id}
              role="button"
              tabIndex={0}
              className={`knx-grupo-card${selected === g.name ? ' knx-grupo-card--active' : ''}`}
              onClick={() => onSelect(selected === g.name ? 'all' : g.name)}
              onKeyDown={(e) => { if (e.key === 'Enter') onSelect(selected === g.name ? 'all' : g.name); }}
            >
              <div className="knx-grupo-card-head">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
                <span className="knx-grupo-card-name" title={g.name}>{g.name}</span>
                {canManage && (
                  <button type="button" className="knx-grupo-card-edit" aria-label="Editar mini proyecto" onClick={(e) => { e.stopPropagation(); setModal(g); }}>⋯</button>
                )}
              </div>
              {dominant && (
                <div className="knx-grupo-card-tipologia">
                  <span className="knx-tipologia-dot" style={{ background: tipologiaColor(tipologias, dominant.id) }} />
                  {dominant.name}
                </div>
              )}
              <div className="knx-grupo-card-progressbar"><div style={{ width: `${pct}%` }} /></div>
              <div className="knx-grupo-card-foot">
                {done}/{groupTasks.length} · {g.fechaInicio ? formatShortDate(g.fechaInicio) : '—'} → {g.fechaFin ? formatShortDate(g.fechaFin) : '—'}
              </div>
            </div>
          );
        })}
      </div>
      {modal && (
        <GrupoModal
          title={modal === 'new' ? 'Nuevo mini proyecto' : 'Editar mini proyecto'}
          initial={modal === 'new' ? null : modal}
          onSave={(payload) => (modal === 'new' ? onAdd(payload) : onUpdate(modal.id, payload))}
          onDelete={modal === 'new' ? undefined : () => onDelete(modal.id)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

function MiniProyectoSuggestionBanner({ task, onConvert, onDismiss }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const convert = async () => {
    setBusy(true);
    setErr(null);
    try {
      await onConvert(task);
    } catch (e) {
      setErr(e.message || 'No se pudo convertir.');
      setBusy(false);
    }
  };

  const dismiss = async () => {
    setBusy(true);
    try {
      await onDismiss(task.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="knx-mini-suggestion-banner">
      <span className="knx-mini-suggestion-avatar">K</span>
      <span className="knx-mini-suggestion-text">
        «{task.nombre}» tiene alcance propio. ¿Lo convierto en mini proyecto?
        {err && <span className="knx-canvas-error" style={{ display: 'block', marginTop: 4 }}>{err}</span>}
      </span>
      <div className="knx-mini-suggestion-actions">
        <button type="button" className="knx-canvas-mini" onClick={dismiss} disabled={busy}>Ahora no</button>
        <button type="button" className="knx-new-chat" onClick={convert} disabled={busy}>{busy ? 'Convirtiendo…' : 'Convertir'}</button>
      </div>
    </div>
  );
}

function TipologiaModal({ title, initial, onSave, onDelete, onClose }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async () => {
    if (!name.trim()) { setErr('El nombre es requerido.'); return; }
    setBusy(true);
    setErr(null);
    try {
      await onSave({ name: name.trim() });
      onClose();
    } catch (e) {
      setErr(e.message || 'No se pudo guardar.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setErr(null);
    try {
      await onDelete();
      onClose();
    } catch (e) {
      setErr(e.message || 'No se pudo eliminar.');
      setBusy(false);
    }
  };

  return (
    <div className="knx-ficha-share-backdrop" onClick={onClose}>
      <div className="knx-ficha-review-modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(380px, 92vw)' }}>
        <div className="knx-ficha-review-head">
          <div><h3 className="knx-ficha-review-title">{title}</h3></div>
          <button type="button" className="knx-side-panel-close" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>
        {err && <p className="knx-canvas-error">{err}</p>}
        <input className="knx-canvas-meta-select" placeholder="Nombre de la tipología" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <div className="knx-canvas-ficha-draft-actions" style={{ marginTop: 16, justifyContent: initial ? 'space-between' : 'flex-end' }}>
          {initial && <button type="button" className="knx-delete-task-btn" style={{ marginTop: 0 }} disabled={busy} onClick={remove}>Eliminar tipología</button>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="knx-canvas-mini" onClick={onClose} disabled={busy}>Cancelar</button>
            <button type="button" className="knx-analisis-sources-save" onClick={submit} disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Clasificación de tarea configurable por proyecto (a diferencia de Mini proyectos, no agrupa
// progreso ni tiene fechas — es solo una etiqueta). Cada proyecto de Seguimiento define las
// suyas porque el rubro de tareas varía de uno a otro (Infraestructura TI ≠ Legal, por ejemplo).
// Reemplaza la sección siempre-visible de antes — crear/editar tipologías es algo que se hace
// una vez al configurar el proyecto, no todos los días; ahora vive detrás del ícono de engranaje
// junto a los filtros, no ocupando el lugar principal de la pantalla.
// Botón que abre un popover — mismo rol visual que un <select>, pero permite contenido rico
// adentro (checkboxes con punto de color, conteos, un link de "editar" al pie). Se cierra solo
// al clickear afuera.
function FilterDropdown({ label, summary, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <div className="knx-filter-dropdown" ref={ref}>
      <button type="button" className="knx-filter-dropdown-btn" onClick={() => setOpen((o) => !o)}>
        {label}: <strong>{summary}</strong>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
      </button>
      {open && <div className="knx-filter-dropdown-pop">{children}</div>}
    </div>
  );
}

function TipologiasManageModal({ tipologias, tasks, canManage, onAdd, onUpdate, onDelete, onClose }) {
  const [sub, setSub] = useState(null); // null | 'new' | tipologia

  return (
    <div className="knx-ficha-share-backdrop" onClick={onClose}>
      <div className="knx-ficha-review-modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(420px, 92vw)' }}>
        <div className="knx-ficha-review-head">
          <div><h3 className="knx-ficha-review-title">Tipologías</h3></div>
          <button type="button" className="knx-side-panel-close" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>
        {!tipologias.length ? (
          <p className="knx-knowledge-empty">Sin tipologías todavía.</p>
        ) : (
          <div className="knx-grupos-chips" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            {tipologias.map((t, i) => {
              const count = tasks.filter((task) => task.tipologiaId === t.id).length;
              return (
                <button
                  type="button"
                  key={t.id}
                  className="knx-grupo-chip"
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
                  onClick={() => canManage && setSub(t)}
                  disabled={!canManage}
                >
                  <span><span className="knx-tipologia-dot" style={{ background: TIPOLOGIA_COLORS[i % TIPOLOGIA_COLORS.length] }} />{t.name}</span>
                  <span>{count} tarea{count !== 1 ? 's' : ''}</span>
                </button>
              );
            })}
          </div>
        )}
        {canManage && <button type="button" className="knx-new-chat" style={{ marginTop: 10 }} onClick={() => setSub('new')}>+ Nueva tipología</button>}
        {sub && (
          <TipologiaModal
            title={sub === 'new' ? 'Nueva tipología' : 'Editar tipología'}
            initial={sub === 'new' ? null : sub}
            onSave={(payload) => (sub === 'new' ? onAdd(payload) : onUpdate(sub.id, payload))}
            onDelete={sub === 'new' ? undefined : () => onDelete(sub.id)}
            onClose={() => setSub(null)}
          />
        )}
      </div>
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
  const [taskResponsableFilter, setTaskResponsableFilter] = useState('all');
  const [taskGrupoFilter, setTaskGrupoFilter] = useState('all');
  const [taskStatusFilter, setTaskStatusFilter] = useState('activas');
  const [taskTipologiaFilter, setTaskTipologiaFilter] = useState([]); // array de ids, o '__none__' para "Sin tipología"; [] = todas
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [taskGroupBy, setTaskGroupBy] = useState('none');
  const [dateSort, setDateSort] = useState(null); // { field: 'fechaInicio'|'fechaFin', dir: 'asc'|'desc' } | null
  const [collapsedGroups, setCollapsedGroups] = useState(() => new Set());
  const [tipologiasModalOpen, setTipologiasModalOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [removeTaskTarget, setRemoveTaskTarget] = useState(null);

  const load = () => {
    setLoading(true);
    fetch(`/api/kai-next/${tenant}/projects/${projectId}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setData(d); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [tenant, projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Solo pantalla de "Cargando…" en la carga inicial (sin datos todavía) — load() se vuelve a
  // llamar después de cualquier acción (tildar una tarea, guardar, etc.) y antes blanqueaba toda
  // la página cada vez porque reusaba el mismo `loading` para ambos casos.
  if (loading && !data) return <p className="knx-knowledge-empty">Cargando…</p>;
  if (error) return <div className="knx-analisis-empty"><p>{error}</p></div>;
  if (!data) return null;

  const { meta, tasks, events, level, partidas = [], gastos = [], civilMetrics, civilAlerts = [], documents = [], tests = [], executions = [], grupos = [], tipologias = [] } = data;
  // Responsable/mini proyecto — compartidos entre Lista/Canvas/Cronograma (no uno por vista),
  // así cambiar de vista no pierde el filtro que ya elegiste. `tasks` no existe en absoluto
  // para proyectos 'desarrollo' (esa rama del GET devuelve notionProyecto/iniciativas en vez de
  // tasks) — de ahí el fallback, para que esto no reviente en ese caso.
  const visibleTasks = (tasks ?? []).filter((t) =>
    (taskResponsableFilter === 'all' || (t.responsables ?? []).includes(taskResponsableFilter))
    && (taskGrupoFilter === 'all' || t.fase === taskGrupoFilter)
    && matchesStatusTab(t, taskStatusFilter)
    && (taskTipologiaFilter.length === 0 || taskTipologiaFilter.includes(t.tipologiaId ?? '__none__'))
    && (!taskSearchQuery.trim() || t.nombre.toLowerCase().includes(taskSearchQuery.trim().toLowerCase()))
  );
  // Sin fecha siempre al final, sea cual sea la dirección — no tiene sentido que "sin fecha"
  // compita por el primer o último lugar según se invierta el orden.
  if (dateSort) {
    const { field, dir } = dateSort;
    visibleTasks.sort((a, b) => {
      if (!a[field] && !b[field]) return 0;
      if (!a[field]) return 1;
      if (!b[field]) return -1;
      const cmp = a[field].localeCompare(b[field]);
      return dir === 'asc' ? cmp : -cmp;
    });
  }
  const cycleDateSort = (field) => setDateSort((prev) => {
    if (!prev || prev.field !== field) return { field, dir: 'asc' };
    if (prev.dir === 'asc') return { field, dir: 'desc' };
    return null;
  });
  const miniProyectoCandidate = findMiniProyectoCandidate(tasks);
  const toggleGroupCollapsed = (key) => setCollapsedGroups((prev) => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });
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

  const addGrupoRow = async (payload) => {
    const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/grupos`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'No se pudo crear.');
    load();
    return d.grupo;
  };

  const updateGrupoRow = async (grupoId, payload) => {
    const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/grupos/${grupoId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'No se pudo guardar.');
    load();
  };

  const deleteGrupoRow = async (grupoId) => {
    const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/grupos/${grupoId}`, { method: 'DELETE' });
    if (res.ok) load();
  };

  const addTipologiaRow = async (payload) => {
    const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/tipologias`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'No se pudo crear.');
    load();
  };

  const updateTipologiaRow = async (tipologiaId, payload) => {
    const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/tipologias/${tipologiaId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'No se pudo guardar.');
    load();
  };

  const deleteTipologiaRow = async (tipologiaId) => {
    const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/tipologias/${tipologiaId}`, { method: 'DELETE' });
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

  const saveTaskDetail = async (taskId, patch) => {
    const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/tasks/${taskId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    });
    if (res.ok) load();
  };

  // Sugerencia "esto parece un mini proyecto" (ver findMiniProyectoCandidate) — convertir crea
  // el mini proyecto con el nombre/fechas de la tarea y la engancha ahí (fase = nombre del
  // mini proyecto). No inventa tareas nuevas: eso requeriría pedirle a un modelo que las
  // redacte, y preferimos que las cargue quien gestiona el proyecto, no generarlas sin revisión.
  const convertTaskToMiniProyecto = async (task) => {
    const grupo = await addGrupoRow({ name: task.nombre, fechaInicio: task.fechaInicio, fechaFin: task.fechaFin });
    await saveTaskDetail(task.id, { fase: grupo.name });
  };

  const dismissMiniProyectoSuggestion = (taskId) => saveTaskDetail(taskId, { miniProyectoSuggestionDismissed: true });

  const confirmRemoveTask = async () => {
    const taskId = removeTaskTarget;
    setRemoveTaskTarget(null);
    setSelectedTaskId(null);
    await deleteTask(taskId);
  };

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
        <GruposSection
          grupos={grupos}
          tasks={tasks}
          tipologias={tipologias}
          selected={taskGrupoFilter}
          onSelect={setTaskGrupoFilter}
          canManage={level.isSupervisorLevel && !inactive}
          onAdd={addGrupoRow}
          onUpdate={updateGrupoRow}
          onDelete={deleteGrupoRow}
        />
      )}

      {!isExperimental && !isDesarrollo && miniProyectoCandidate && level.isSupervisorLevel && !inactive && (
        <MiniProyectoSuggestionBanner
          task={miniProyectoCandidate}
          onConvert={convertTaskToMiniProyecto}
          onDismiss={dismissMiniProyectoSuggestion}
        />
      )}

      {!isExperimental && !isDesarrollo && (
        <div className="knx-canvas-group" style={{ marginBottom: 16 }}>
          <div className="knx-canvas-group-head">
            {tasks.length > 0 ? (
              <div className="knx-task-status-tabs">
                {STATUS_TABS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={taskStatusFilter === s.id ? 'knx-task-status-tab--active' : ''}
                    onClick={() => setTaskStatusFilter(s.id)}
                  >
                    {s.label} {tasks.filter((t) => matchesStatusTab(t, s.id)).length}
                  </button>
                ))}
              </div>
            ) : (
              <span className="knx-canvas-group-name">Tareas</span>
            )}
            {tasks.length > 0 && (
              <div className="knx-gantt-view-toggle">
                <button type="button" className={view === 'list' ? 'knx-gantt-view-toggle--active' : ''} onClick={() => setView('list')}>Lista</button>
                <button type="button" className={view === 'canvas' ? 'knx-gantt-view-toggle--active' : ''} onClick={() => setView('canvas')}>Canvas</button>
                <button type="button" className={view === 'gantt' ? 'knx-gantt-view-toggle--active' : ''} onClick={() => setView('gantt')}>Cronograma</button>
              </div>
            )}
          </div>

          {tasks.length > 0 && (() => {
            const preTipologiaTasks = tasks.filter((t) =>
              (taskResponsableFilter === 'all' || (t.responsables ?? []).includes(taskResponsableFilter))
              && (taskGrupoFilter === 'all' || t.fase === taskGrupoFilter)
              && matchesStatusTab(t, taskStatusFilter)
            );
            const tipologiaCounts = tipologias.map((t, i) => ({
              ...t,
              color: TIPOLOGIA_COLORS[i % TIPOLOGIA_COLORS.length],
              count: preTipologiaTasks.filter((task) => task.tipologiaId === t.id).length,
            }));
            const sinTipologiaCount = preTipologiaTasks.filter((task) => !task.tipologiaId).length;
            const toggleTipologiaFilter = (key) => setTaskTipologiaFilter((prev) => (
              prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
            ));
            const tipologiaSummary = taskTipologiaFilter.length === 0
              ? 'Todas'
              : taskTipologiaFilter.length === 1
                ? (taskTipologiaFilter[0] === '__none__' ? 'Sin tipología' : tipologias.find((t) => t.id === taskTipologiaFilter[0])?.name ?? 'Todas')
                : `${taskTipologiaFilter.length} seleccionadas`;
            const responsablesConTareas = people.filter((p) => tasks.some((t) => (t.responsables ?? []).includes(p.id)));
            const responsableSummary = taskResponsableFilter === 'all' ? 'Todos' : (responsablesConTareas.find((p) => p.id === taskResponsableFilter)?.name ?? 'Todos');

            return (
              <div className="knx-task-filters-row">
                <div className="knx-task-filters-left">
                  {(tipologias.length > 0 || (level.isSupervisorLevel && !inactive)) && (
                    <FilterDropdown label="Tipología" summary={tipologiaSummary}>
                      {tipologias.length === 0 ? (
                        <p className="knx-knowledge-empty" style={{ margin: '4px 6px' }}>Sin tipologías todavía.</p>
                      ) : (
                        <>
                          {tipologiaCounts.map((t) => (
                            <label key={t.id} className="knx-filter-checkbox-row">
                              <span className="knx-filter-checkbox-row-label">
                                <input type="checkbox" checked={taskTipologiaFilter.includes(t.id)} onChange={() => toggleTipologiaFilter(t.id)} />
                                <span className="knx-tipologia-dot" style={{ background: t.color }} />
                                {t.name}
                              </span>
                              <span className="knx-filter-checkbox-row-count">{t.count}</span>
                            </label>
                          ))}
                          <label className="knx-filter-checkbox-row">
                            <span className="knx-filter-checkbox-row-label">
                              <input type="checkbox" checked={taskTipologiaFilter.includes('__none__')} onChange={() => toggleTipologiaFilter('__none__')} />
                              Sin tipología
                            </span>
                            <span className="knx-filter-checkbox-row-count">{sinTipologiaCount}</span>
                          </label>
                        </>
                      )}
                      {level.isSupervisorLevel && !inactive && (
                        <div className="knx-filter-dropdown-footer">
                          <button type="button" onClick={() => setTipologiasModalOpen(true)}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></svg>
                            Editar tipologías
                          </button>
                        </div>
                      )}
                    </FilterDropdown>
                  )}
                  <FilterDropdown label="Responsable" summary={responsableSummary}>
                    <label className="knx-filter-checkbox-row">
                      <span className="knx-filter-checkbox-row-label">
                        <input type="radio" checked={taskResponsableFilter === 'all'} onChange={() => setTaskResponsableFilter('all')} />
                        Todos
                      </span>
                    </label>
                    {responsablesConTareas.map((p) => (
                      <label key={p.id} className="knx-filter-checkbox-row">
                        <span className="knx-filter-checkbox-row-label">
                          <input type="radio" checked={taskResponsableFilter === p.id} onChange={() => setTaskResponsableFilter(p.id)} />
                          {p.name || p.email}
                        </span>
                      </label>
                    ))}
                  </FilterDropdown>
                  {view === 'list' && grupos.length > 0 && (
                    <select className="knx-canvas-meta-select" style={{ width: 'auto' }} value={taskGroupBy} onChange={(e) => setTaskGroupBy(e.target.value)}>
                      <option value="none">Agrupar: Ninguno</option>
                      <option value="grupo">Agrupar: Mini proyecto</option>
                    </select>
                  )}
                  <label className="knx-task-search">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" /></svg>
                    <input type="text" placeholder="Buscar" value={taskSearchQuery} onChange={(e) => setTaskSearchQuery(e.target.value)} />
                  </label>
                </div>
                {level.isSupervisorLevel && !inactive && (
                  <button type="button" className="knx-new-chat" onClick={() => setNewTaskOpen(true)}>+ Nueva tarea</button>
                )}
              </div>
            );
          })()}
          {newTaskOpen && <NewTaskQuickModal people={people} grupos={grupos} tipologias={tipologias} onCreate={createTask} onClose={() => setNewTaskOpen(false)} />}
          {tipologiasModalOpen && (
            <TipologiasManageModal
              tipologias={tipologias}
              tasks={tasks}
              canManage={level.isSupervisorLevel && !inactive}
              onAdd={addTipologiaRow}
              onUpdate={updateTipologiaRow}
              onDelete={deleteTipologiaRow}
              onClose={() => setTipologiasModalOpen(false)}
            />
          )}

          {!tasks.length ? (
            <p className="knx-knowledge-empty">Sin tareas todavía.</p>
          ) : !visibleTasks.length ? (
            <p className="knx-knowledge-empty">Ninguna tarea coincide con el filtro.</p>
          ) : view === 'list' ? (
            <div className="knx-task-table">
              <div className="knx-task-table-head">
                <span />
                <span>Tarea</span>
                <span>Tipología</span>
                <span>Responsable</span>
                <span className="knx-task-table-sort-head">
                  <button type="button" onClick={() => cycleDateSort('fechaInicio')}>
                    Inicio{dateSort?.field === 'fechaInicio' ? (dateSort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                  </button>
                  <button type="button" onClick={() => cycleDateSort('fechaFin')}>
                    Fin{dateSort?.field === 'fechaFin' ? (dateSort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                  </button>
                </span>
                <span>Estado</span>
                <span>Prioridad</span>
                <span>Horas</span>
                <span />
              </div>
              {taskGroupBy === 'grupo' && grupos.length > 0 ? (
                groupTasksByGrupo(visibleTasks, grupos).map((g) => {
                  const key = g.key ?? '__sin_grupo__';
                  const collapsed = collapsedGroups.has(key);
                  const done = g.tasks.filter((t) => t.status === 'done').length;
                  return (
                    <div key={key}>
                      <button type="button" className="knx-task-group-header" onClick={() => toggleGroupCollapsed(key)}>
                        <span className={`knx-task-group-chevron${collapsed ? ' knx-task-group-chevron--collapsed' : ''}`}>▾</span>
                        <span className="knx-task-group-name">{g.key ?? 'Sin mini proyecto'}</span>
                        <span className="knx-task-group-count">{done}/{g.tasks.length}</span>
                      </button>
                      {!collapsed && g.tasks.map((t) => (
                        <TaskTableRow
                          key={t.id}
                          task={t}
                          people={people}
                          tipologias={tipologias}
                          canManage={level.isSupervisorLevel && !inactive}
                          canToggle={!inactive}
                          onStatusChange={(status) => setStatus(t.id, status)}
                          onDelete={() => setRemoveTaskTarget(t.id)}
                          onOpen={() => setSelectedTaskId(t.id)}
                        />
                      ))}
                    </div>
                  );
                })
              ) : (
                visibleTasks.map((t) => (
                  <TaskTableRow
                    key={t.id}
                    task={t}
                    people={people}
                    tipologias={tipologias}
                    canManage={level.isSupervisorLevel && !inactive}
                    canToggle={!inactive}
                    onStatusChange={(status) => setStatus(t.id, status)}
                    onDelete={() => setRemoveTaskTarget(t.id)}
                    onOpen={() => setSelectedTaskId(t.id)}
                  />
                ))
              )}
            </div>
          ) : view === 'canvas' ? (
            <KaiNextTaskCanvas
              tasks={visibleTasks}
              people={people}
              grupos={grupos}
              tipologias={tipologias}
              canManage={level.isSupervisorLevel && !inactive}
              onStatusChange={setStatus}
              selectedTaskId={selectedTaskId}
              onSelectTask={setSelectedTaskId}
            />
          ) : (
            <KaiNextGantt
              grouped={groupTasksByFase(visibleTasks)}
              people={people}
              grupos={grupos}
              savingTaskId={savingTaskId}
              canToggleTask={(t) => !inactive && (level.isSupervisorLevel || (t.responsables ?? []).includes(personId))}
              onToggle={toggleTaskDone}
              selectedTaskId={selectedTaskId}
              onSelectTask={setSelectedTaskId}
            />
          )}
        </div>
      )}

      {selectedTaskId && tasks.find((t) => t.id === selectedTaskId) && (
        <TaskDetailPanel
          task={tasks.find((t) => t.id === selectedTaskId)}
          people={people}
          grupos={grupos}
          tipologias={tipologias}
          canManage={level.isSupervisorLevel && !inactive}
          documents={documents.filter((d) => d.taskId === selectedTaskId)}
          onUploadDocument={(payload) => uploadDocument({ ...payload, taskId: selectedTaskId })}
          onDeleteDocument={deleteDocument}
          onClose={() => setSelectedTaskId(null)}
          onSave={(patch) => saveTaskDetail(selectedTaskId, patch)}
          onStatusChange={(status) => setStatus(selectedTaskId, status)}
          onDelete={() => setRemoveTaskTarget(selectedTaskId)}
        />
      )}
      <KaiNextConfirmDialog
        open={!!removeTaskTarget}
        title="Eliminar tarea"
        message="¿Eliminar esta tarea? No se puede deshacer."
        onConfirm={confirmRemoveTask}
        onCancel={() => setRemoveTaskTarget(null)}
      />

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
          documents={documents.filter((d) => !d.taskId)}
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

// Fila enriquecida del listado — cada tipo de proyecto muestra lo que realmente importa para
// ese tipo (avance físico/plan en civil, ensayos en experimental, actividades en seguimiento).
// 'desarrollo' no tiene `summary` todavía (ver summarizeProjectForList, vive en Notion) — se
// muestra con el tratamiento simple de antes.
function ProjectRow({ p, people, onSelect }) {
  const s = p.summary;
  const teamIds = s?.teamIds ?? [];
  return (
    <button type="button" className="knx-project-row" onClick={onSelect}>
      <span className="knx-project-row-name">
        <span className="knx-project-row-title">{p.name}</span>
        <span className="knx-project-row-sub">{p.code ? `${p.code} · ` : ''}{p.type || PROJECT_KIND_LABEL[p.projectKind] || p.projectKind}</span>
      </span>

      <span className="knx-project-row-metric">
        {!s && <span className="knx-project-row-sub">{STATUS_LABEL[p.status] ?? p.status}</span>}
        {s?.kind === 'desarrollo' && (
          <>
            <span className="knx-project-row-metric-label">{s.faseActual ? `Fase: ${s.faseActual}` : 'Sin épicas todavía'}</span>
            <span className="knx-fase-stepper-mini">
              {FASE_OPTIONS.map((fase, i) => (
                <span
                  key={fase}
                  title={fase}
                  className="knx-fase-stepper-mini-seg"
                  style={{ background: i <= s.faseIndex ? FASE_COLORS[fase] : 'var(--knx-border)' }}
                />
              ))}
            </span>
            <span className="knx-project-row-sub">Épicas {s.epicasDone}/{s.epicasTotal} · {s.historias} historia{s.historias !== 1 ? 's' : ''}</span>
          </>
        )}
        {s?.kind === 'civil' && (
          <>
            <span className="knx-project-row-metric-label">Avance físico {s.pctFisico}%{s.hasPlan ? <span style={{ fontWeight: 400, color: 'var(--knx-text-muted)' }}> · plan {s.pctPlan}%</span> : null}</span>
            <span className="knx-project-row-bar">
              <span className="knx-project-row-bar-fill" style={{ width: `${s.pctFisico}%` }} />
              {s.hasPlan && <span className="knx-project-row-bar-tick" style={{ left: `${Math.min(100, s.pctPlan)}%` }} />}
            </span>
          </>
        )}
        {s?.kind === 'seguimiento' && (
          <>
            <span className="knx-project-row-metric-label">{s.activas} de {s.total} tareas activas</span>
            <span className="knx-project-row-bar"><span className="knx-project-row-bar-fill" style={{ width: `${s.total ? ((s.total - s.activas) / s.total) * 100 : 0}%` }} /></span>
            {s.vencidas > 0 && <span className="knx-project-row-sub" style={{ color: '#B3261E' }}>{s.vencidas} vencida{s.vencidas !== 1 ? 's' : ''}</span>}
          </>
        )}
        {s?.kind === 'experimental' && (
          <>
            <span className="knx-project-row-metric-label">Ensayos {s.conEjecucion}/{s.total}</span>
            <span className="knx-project-row-squares">
              {s.porPrueba.map((tag, i) => (
                <span key={i} className={`knx-project-row-square${tag ? ` knx-project-row-square--${tag}` : ''}`} />
              ))}
            </span>
          </>
        )}
      </span>

      <span className="knx-project-row-team">
        {teamIds.slice(0, 4).map((id) => (
          <span key={id} className="knx-project-row-avatar" title={personName(people, id)}>{initials(personName(people, id))}</span>
        ))}
        {teamIds.length > 4 && <span className="knx-project-row-avatar">+{teamIds.length - 4}</span>}
      </span>

      {s?.statusTag ? (
        <span className={`knx-project-risk ${RISK_CLASS[s.statusTag]}`}>{RISK_LABEL[s.statusTag]}</span>
      ) : (
        <span className={`knx-activity-status knx-activity-status--${p.status === 'activo' ? 'active' : p.status === 'pausado' ? 'ready' : 'finished'}`}>
          {STATUS_LABEL[p.status] ?? p.status}
        </span>
      )}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
    </button>
  );
}

export default function KaiNextProjects({
  tenant, tenantName, basePath, userName, userHandle, isTeamUser, personId, level, initialProjects, people,
}) {
  const searchParams = useSearchParams();
  const [loggingOut, setLoggingOut] = useState(false);
  const [chats, setChats] = useState([]);
  const [projects, setProjects] = useState(initialProjects ?? []);
  const [activeProjectId, setActiveProjectId] = useState(() => searchParams.get('p') || null);
  const [creating, setCreating] = useState(() => searchParams.get('new') === '1' && !!level?.isSupervisorLevel);
  const [deleteChatTarget, setDeleteChatTarget] = useState(null);
  const [kindFilter, setKindFilter] = useState('all');

  useEffect(() => {
    fetch(`/api/kai-next/${tenant}`).then((r) => r.json()).then((d) => setChats(d.conversations ?? [])).catch(() => null);
  }, [tenant]);

  // Deep-link desde el sidebar (lista de proyectos / "+ Nuevo proyecto") — ?p=<id> abre ese
  // proyecto directo, ?new=1 abre el modal de creación, sin tener que esperar a que cargue la
  // lista primero y clickear ahí.
  useEffect(() => {
    const p = searchParams.get('p');
    if (p) setActiveProjectId(p);
    if (searchParams.get('new') === '1' && level?.isSupervisorLevel) setCreating(true);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

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
              ) : (() => {
                const activos = projects.filter((p) => p.status === 'activo');
                const completados = projects.filter((p) => p.status !== 'activo');
                const riesgoCount = activos.filter((p) => p.summary?.statusTag && p.summary.statusTag !== 'en_plan').length;
                const vencidasTotal = activos.reduce((sum, p) => sum + (p.summary?.vencidas ?? 0), 0);
                const kinds = ['desarrollo', 'civil', 'seguimiento', 'experimental'].filter((k) => projects.some((p) => p.projectKind === k));
                const visibleActivos = kindFilter === 'all' ? activos : activos.filter((p) => p.projectKind === kindFilter);
                return (
                  <>
                    <div className="knx-project-kpis">
                      <div className="knx-project-kpi">
                        <span className="knx-project-kpi-label">Activos</span>
                        <span className="knx-project-kpi-value">{activos.length}</span>
                        <span className="knx-project-kpi-sub">{kinds.map((k) => `${activos.filter((p) => p.projectKind === k).length} ${PROJECT_KIND_LABEL[k].toLowerCase()}`).join(' · ')}</span>
                      </div>
                      <div className="knx-project-kpi">
                        <span className="knx-project-kpi-label">Requieren atención</span>
                        <span className="knx-project-kpi-value knx-project-kpi-value--bad">{riesgoCount}</span>
                        <span className="knx-project-kpi-sub">en riesgo o atrasados</span>
                      </div>
                      <div className="knx-project-kpi">
                        <span className="knx-project-kpi-label">Actividades vencidas</span>
                        <span className="knx-project-kpi-value">{vencidasTotal}</span>
                        <span className="knx-project-kpi-sub">en proyectos de seguimiento</span>
                      </div>
                    </div>

                    {kinds.length > 1 && (
                      <div className="knx-project-filters">
                        <button type="button" className={`knx-filter-pill${kindFilter === 'all' ? ' knx-filter-pill--active' : ''}`} onClick={() => setKindFilter('all')}>
                          Todos · {activos.length}
                        </button>
                        {kinds.map((k) => (
                          <button key={k} type="button" className={`knx-filter-pill${kindFilter === k ? ' knx-filter-pill--active' : ''}`} onClick={() => setKindFilter(k)}>
                            {PROJECT_KIND_LABEL[k]} · {activos.filter((p) => p.projectKind === k).length}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="knx-project-list">
                      {visibleActivos.map((p) => (
                        <ProjectRow key={p.id} p={p} people={people} onSelect={() => setActiveProjectId(p.id)} />
                      ))}
                    </div>

                    {completados.length > 0 && (
                      <details className="knx-project-completados">
                        <summary>Completados · {completados.length}</summary>
                        <div className="knx-project-list" style={{ marginTop: 10 }}>
                          {completados.map((p) => (
                            <ProjectRow key={p.id} p={p} people={people} onSelect={() => setActiveProjectId(p.id)} />
                          ))}
                        </div>
                      </details>
                    )}
                  </>
                );
              })()}
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
