'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import KaiNextSidebar from './KaiNextSidebar';
import KaiNextProjectTeamModal from './KaiNextProjectTeamModal';
import KaiNextConfirmDialog from './KaiNextConfirmDialog';
import { useSidePanelClose } from '@/lib/kaiNext/useSidePanelClose';
import { sortByOrder, dropsBefore, computeDropOrder } from '@/lib/kaiNext/dragOrder';
import { PruebasSection } from './KaiNextProjectExperimental';
import KaiNextTaskCanvas from './KaiNextTaskCanvas';
import KaiNextProjectDesarrollo from './KaiNextProjectDesarrollo';
import { ProjectTabsNav, ResumenTab, HistoriaTab, FeedbackTab, ReportesTab, FeedbackButton, FeedbackThreads } from './KaiNextProjectTabs';

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
// Solo para projectKind='seguimiento' (ver taskStatuses en el componente de detalle) — civil
// comparte el mismo tablero pero con las 3 columnas de siempre.
const BACKLOG_STATUS = { id: 'backlog', label: 'Backlog' };
// Solo en Seguimiento con revisión (meta.requiresReview): la tarea terminada espera validación.
const REVIEW_STATUS = { id: 'review', label: 'En revisión' };
const PRIORITIES = ['Alta', 'Media', 'Baja'];

// Tabs de la lista de tareas, una por estado para que los números cuadren con "Todas" (antes había
// "Activas", que sumaba el Backlog sin que tuviera pestaña propia). "Por hacer" es la de entrada:
// lo terminado no satura la vista del día a día; "Todas" sigue para auditar el historial.
const DEFAULT_STATUS_TAB = 'todo';
const STATUS_TABS = [
  { id: 'backlog', label: 'Backlog', test: (t) => t.status === 'backlog' },
  { id: 'todo', label: 'Por hacer', test: (t) => t.status === 'todo' },
  { id: 'doing', label: 'Haciendo', test: (t) => t.status === 'doing' },
  { id: 'review', label: 'En revisión', test: (t) => t.status === 'review' },
  { id: 'done', label: 'Terminadas', test: (t) => t.status === 'done' },
  { id: 'all', label: 'Todas', test: () => true },
];
function matchesStatusTab(task, tabId) {
  return (STATUS_TABS.find((s) => s.id === tabId) ?? STATUS_TABS.find((s) => s.id === DEFAULT_STATUS_TAB)).test(task);
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

// Empresas que la persona tiene asignadas (lib/kaiNext/empresas.js). [] = el tenant no usa
// empresas, y nada de esto se muestra.
function useMyEmpresas(tenant) {
  const [empresas, setEmpresas] = useState([]);
  useEffect(() => {
    fetch(`/api/kai-next/${tenant}/empresas`).then((r) => (r.ok ? r.json() : null)).then((d) => setEmpresas(d?.empresas ?? [])).catch(() => {});
  }, [tenant]);
  return empresas;
}

function CreateProjectModal({ tenant, people, onClose, onCreated }) {
  const empresas = useMyEmpresas(tenant);
  const [empresaId, setEmpresaId] = useState('');
  useEffect(() => { if (empresas.length === 1) setEmpresaId(empresas[0].id); }, [empresas]);
  // Revisión de tareas (solo Seguimiento): por defecto activa en tenants con empresas (grupos como
  // Sesuveca, donde Dirección valida el avance) y apagada en el resto, como siempre fue.
  const [requiresReview, setRequiresReview] = useState(null);
  const reviewOn = requiresReview ?? empresas.length > 0;
  // Con empresas, el equipo solo puede salir de quienes tienen acceso a la empresa elegida.
  const teamPeople = empresas.length ? people.filter((p) => empresaId && p.empresaIds?.includes(empresaId)) : people;
  const [projectKind, setProjectKind] = useState('seguimiento');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState('');
  const [supervisorIds, setSupervisorIds] = useState([]);
  const [purpose, setPurpose] = useState('');
  const [hypothesis, setHypothesis] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Cliente como texto, con sugerencias de los que ya usan otros proyectos.
  const [clienteName, setClienteName] = useState('');
  const [clientes, setClientes] = useState([]);

  // Solo para civil — import del Excel de cronograma+presupuesto (port simplificado del flujo
  // de Labs: acá no hay grilla editable por fase, se revisa el total y los avisos nomás, y el
  // detalle fino se ajusta después desde Tareas/Presupuesto una vez creado el proyecto).
  const [excelBusy, setExcelBusy] = useState(false);
  const [excelTasks, setExcelTasks] = useState(null);
  const [excelPartidas, setExcelPartidas] = useState(null);
  const [excelWarnings, setExcelWarnings] = useState([]);

  const toggleSupervisor = (id) => setSupervisorIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  useEffect(() => {
    fetch(`/api/kai-next/${tenant}/dev-clientes`).then((r) => r.json()).then((d) => setClientes(d.clientes ?? [])).catch(() => null);
  }, [tenant]);

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

  const submit = async () => {
    if (!name.trim()) { setError('El nombre es requerido.'); return; }
    if (empresas.length && !empresaId) { setError('Elige la empresa del proyecto.'); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, code, type, projectKind,
          supervisorIds: supervisorIds.filter((id) => teamPeople.some((p) => p.id === id)),
          empresaId: empresaId || undefined,
          requiresReview: projectKind === 'seguimiento' ? reviewOn : undefined,
          tasks: projectKind === 'civil' ? excelTasks : undefined,
          partidas: projectKind === 'civil' ? excelPartidas : undefined,
          purpose: projectKind === 'experimental' ? purpose : undefined,
          hypothesis: projectKind === 'experimental' ? hypothesis : undefined,
          clienteName: clienteName.trim() || null,
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

        {empresas.length > 0 && (
          <div className="knx-ficha-review-field" style={{ marginBottom: 14 }}>
            <label>Empresa</label>
            {empresas.length === 1 ? (
              <p className="knx-project-empresa"><i style={{ background: empresas[0].color }} />{empresas[0].name}</p>
            ) : (
              <select className="knx-canvas-meta-select" value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
                <option value="">Elige una empresa</option>
                {empresas.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            )}
          </div>
        )}

        <div className="knx-ficha-review-field" style={{ marginBottom: 14 }}>
          <label>Nombre</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="knx-canvas-meta-select" placeholder="Nombre del proyecto" />
        </div>
        <div className="knx-ficha-review-field" style={{ marginBottom: 14 }}>
          <label>Cliente</label>
          <input
            className="knx-canvas-meta-select"
            list="knx-project-clientes"
            value={clienteName}
            onChange={(e) => setClienteName(e.target.value)}
            placeholder="Nombre del cliente (opcional)"
          />
          <datalist id="knx-project-clientes">
            {clientes.map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>
        {projectKind === 'desarrollo' ? null : (
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
              <label>Equipo (tú quedas dentro)</label>
              <div className="knx-canvas-meta-checklist">
                {!teamPeople.length ? (
                  <p className="knx-canvas-meta-empty">{empresas.length && !empresaId ? 'Elige la empresa para ver quiénes pueden estar en el equipo.' : 'No hay personas en el equipo todavía.'}</p>
                ) : teamPeople.map((p) => (
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

        {projectKind === 'seguimiento' && (
          <label className="knx-role-check" style={{ marginTop: 14 }}>
            <input type="checkbox" checked={reviewOn} onChange={(e) => setRequiresReview(e.target.checked)} />
            <span><b>Las tareas pasan por revisión</b><small>Una tarea terminada queda «En revisión» hasta que un Director o Supervisor del proyecto la valida.</small></span>
          </label>
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
function NewTaskQuickModal({ people, grupos, tipologias, statuses = TASK_STATUSES, onCreate, onClose }) {
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
            {statuses.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
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
// canManage: Supervisor del proyecto (todo). canEdit: la tarea es suya (campos de ejecución:
// estado, descripción, fechas, horas y documentos). canDelete: ver canDeleteOwnTask.
// Personas de una tarea de Seguimiento: Responsable (una), Colaboradores y En copia. Cada persona
// va en un solo grupo; elegir a alguien en otro grupo lo mueve. Se guarda como
// responsables = [responsable, ...colaboradores] y enCopia (ver lib/kaiNext/projects.js).
const PEOPLE_GROUPS = [
  { key: 'resp', label: 'Responsable', help: 'Responde por la tarea. Solo una persona.', empty: 'Sin responsable', add: '+ Asignar', change: 'Cambiar' },
  { key: 'col', label: 'Colaboradores', help: 'Trabajan en la tarea junto al responsable.', empty: 'Sin colaboradores', add: '+ Agregar' },
  { key: 'cc', label: 'En copia', help: 'Ven el avance, comentan y reciben avisos.', empty: 'Nadie en copia', add: '+ Poner en copia' },
];
const GROUP_WHERE = { resp: 'Responsable', col: 'Colaborador', cc: 'En copia' };

function TaskPeopleGroups({ people, value, onChange, disabled }) {
  const [open, setOpen] = useState(null);
  const [q, setQ] = useState('');
  const nameOf = (id) => people.find((p) => p.id === id)?.name ?? 'Persona sin acceso';
  const whereOf = (id) => (value.resp === id ? 'resp' : value.col.includes(id) ? 'col' : value.cc.includes(id) ? 'cc' : null);
  const idsOf = (k) => (k === 'resp' ? (value.resp ? [value.resp] : []) : value[k]);
  const move = (id, to) => {
    const next = { resp: value.resp === id ? null : value.resp, col: value.col.filter((x) => x !== id), cc: value.cc.filter((x) => x !== id) };
    if (to === 'resp') {
      if (next.resp && next.resp !== id) next.col = [...next.col, next.resp]; // el anterior pasa a colaborar
      next.resp = id;
    } else next[to] = [...next[to], id];
    onChange(next);
    setOpen(null);
    setQ('');
  };
  const remove = (k, id) => onChange({ ...value, ...(k === 'resp' ? { resp: null } : { [k]: value[k].filter((x) => x !== id) }) });
  const needle = q.trim().toLowerCase();

  return (
    <section className="knx-tpg" aria-labelledby="knx-tpg-t">
      <div className="knx-tpg-head"><h3 id="knx-tpg-t">Personas</h3><span>Cada persona va en un solo grupo</span></div>
      {PEOPLE_GROUPS.map((g) => {
        const ids = idsOf(g.key);
        const isOpen = open === g.key;
        const avail = people.filter((p) => !ids.includes(p.id) && (!needle || (p.name || '').toLowerCase().includes(needle)));
        return (
          <div key={g.key} className="knx-tpg-row">
            <div><div className="knx-tpg-label">{g.label}</div><div className="knx-tpg-help">{g.help}</div></div>
            <div className="knx-tpg-main">
              <div className="knx-tpg-chips">
                {ids.map((id) => (
                  <span key={id} className={`knx-tpg-chip${g.key === 'resp' ? ' knx-tpg-chip--main' : ''}`}>
                    <span className="knx-tpg-av" aria-hidden="true">{initials(nameOf(id))}</span>{nameOf(id)}
                    {!disabled && <button type="button" aria-label={`Quitar a ${nameOf(id)}`} onClick={() => remove(g.key, id)}>×</button>}
                  </span>
                ))}
                {!ids.length && <span className="knx-tpg-empty">{g.empty}</span>}
                {!disabled && (
                  <button type="button" className="knx-tpg-add" aria-expanded={isOpen} onClick={() => { setOpen(isOpen ? null : g.key); setQ(''); }}>
                    {g.key === 'resp' && ids.length ? g.change : g.add}
                  </button>
                )}
              </div>
              {isOpen && (
                <div className="knx-tpg-pick">
                  <label htmlFor={`tpg-${g.key}`} className="knx-sr-only">Buscar persona</label>
                  <input id={`tpg-${g.key}`} className="knx-dlg-input" placeholder="Buscar persona…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus
                    onKeyDown={(e) => { if (e.key === 'Escape') setOpen(null); }} />
                  <ul>
                    {avail.slice(0, 10).map((p) => {
                      const w = whereOf(p.id);
                      return (
                        <li key={p.id}>
                          <button type="button" onClick={() => move(p.id, g.key)}>
                            <span className="knx-tpg-av knx-tpg-av--muted" aria-hidden="true">{initials(p.name)}</span>
                            <span className="knx-tpg-name">{p.name || p.email}</span>
                            {w && <span className="knx-tpg-from">Mover desde {GROUP_WHERE[w]}</span>}
                          </button>
                        </li>
                      );
                    })}
                    {!avail.length && <li className="knx-tp-empty">{needle ? 'Nadie coincide.' : 'No hay más personas.'}</li>}
                  </ul>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function TaskDetailPanel({ task, people, grupos, tipologias, statuses = TASK_STATUSES, canManage, canEdit = canManage, canDelete = canManage, canEditPeople = canManage, peopleGroups = false, documents = [], onUploadDocument, onDeleteDocument, onClose, onSave, onStatusChange, onDelete, feedbackSlot = null }) {
  const [closing, handleClose] = useSidePanelClose(onClose);
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
  const [groups, setGroups] = useState(() => ({ resp: task.responsables?.[0] ?? null, col: (task.responsables ?? []).slice(1), cc: task.enCopia ?? [] }));
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
    || (peopleGroups
      ? JSON.stringify([groups.resp, ...groups.col].filter(Boolean)) !== JSON.stringify(task.responsables ?? []) || JSON.stringify(groups.cc) !== JSON.stringify(task.enCopia ?? [])
      : JSON.stringify(responsables) !== JSON.stringify(task.responsables ?? []));

  const saveAll = async () => {
    setSaving(true);
    try {
      await onSave({
        nombre: nombre.trim() || task.nombre, descripcion, fase, tipologiaId: tipologiaId || null, prioridad,
        ...(peopleGroups ? { responsables: [groups.resp, ...groups.col].filter(Boolean), enCopia: groups.cc } : { responsables }),
        fechaInicio: fechaInicio || null, fechaFin: fechaFin || null,
        estimatedHours: estimatedHours === '' ? null : Number(estimatedHours),
        actualHours: actualHours === '' ? null : Number(actualHours),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`knx-side-panel${closing ? ' knx-side-panel--closing' : ''}`}>
      <div className="knx-side-panel-header">
        <span className="knx-side-panel-title">Tarea</span>
        <button type="button" className="knx-side-panel-close" onClick={handleClose} aria-label="Cerrar">×</button>
      </div>
      <div className="knx-side-panel-thread knx-board-detail-body">
        <div className="knx-board-field">
          <label>Nombre</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={!canManage} />
        </div>
        <div className="knx-board-field">
          <label>Descripción</label>
          <textarea rows={8} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} disabled={!canEdit} />
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
            <select value={task.status} onChange={(e) => onStatusChange(e.target.value)} disabled={!canEdit}>
              {statuses.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <div className="knx-board-field-row">
          <div className="knx-board-field">
            <label>Inicio</label>
            <input type="date" value={fechaInicio ?? ''} onChange={(e) => setFechaInicio(e.target.value)} disabled={!canEdit} />
          </div>
          <div className="knx-board-field">
            <label>Fin</label>
            <input type="date" value={fechaFin ?? ''} onChange={(e) => setFechaFin(e.target.value)} disabled={!canEdit} />
          </div>
        </div>
        <div className="knx-board-field-row">
          <div className="knx-board-field">
            <label>Estimación (hs)</label>
            <input type="number" min="0" step="0.5" value={estimatedHours ?? ''} onChange={(e) => setEstimatedHours(e.target.value)} disabled={!canEdit} />
          </div>
          <div className="knx-board-field">
            <label>Horas reales</label>
            <input type="number" min="0" step="0.5" value={actualHours ?? ''} onChange={(e) => setActualHours(e.target.value)} disabled={!canEdit} />
          </div>
        </div>
        {peopleGroups ? (
          <TaskPeopleGroups people={people} value={groups} onChange={setGroups} disabled={!canEditPeople} />
        ) : (
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
        )}
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
                {canEdit && (
                  <button type="button" className="knx-side-panel-close" aria-label="Quitar" onClick={() => onDeleteDocument(d.id)}>×</button>
                )}
              </div>
            ))}
            {!documents.length && <p className="knx-knowledge-empty">Sin documentos en esta tarea todavía.</p>}
            {canEdit && (
              <label className="knx-board-subtask-add-btn" style={{ cursor: uploadingDoc ? 'default' : 'pointer', opacity: uploadingDoc ? 0.5 : 1, display: 'inline-block' }}>
                {uploadingDoc ? 'Subiendo…' : '+ Subir documento'}
                <input type="file" style={{ display: 'none' }} disabled={uploadingDoc} onChange={(e) => uploadDoc(e.target.files?.[0])} />
              </label>
            )}
          </div>
        </div>
        {feedbackSlot}
        {(canEdit || canEditPeople) && (
          <button type="button" className="knx-new-chat" disabled={!dirty || saving} onClick={saveAll} style={{ width: '100%', justifyContent: 'center' }}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        )}
        {canDelete && (
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

const REL_CHIP = { creada: 'La creaste', responsable: 'Responsable', colabora: 'Colaboras', copia: 'En copia' };

// Relación de la persona con una tarea de Seguimiento (vistas "Mis tareas" y etiquetas de la fila).
function taskRelations(task, personId) {
  if (!personId || !task) return [];
  const resp = task.responsables ?? [];
  const out = [];
  if (task.createdBy === personId) out.push('creada');
  if (resp[0] === personId) out.push('responsable');
  else if (resp.includes(personId)) out.push('colabora');
  if ((task.enCopia ?? []).includes(personId)) out.push('copia');
  return out;
}

function TaskTableRow({ task, people, tipologias, statuses = TASK_STATUSES, canManage, canToggle, onStatusChange, onDelete, onOpen, rels = null }) {
  const done = task.status === 'done';
  const vencida = isVencida(task);
  const venceHoy = isVenceHoy(task);
  const tipologiaName = task.tipologiaId ? tipologias?.find((t) => t.id === task.tipologiaId)?.name : null;
  return (
    <div className="knx-task-table-row" onClick={onOpen}>
      <div className="knx-task-table-cell-main">
        <div className={`knx-task-table-title${done ? ' knx-task-table-title--done' : ''}`} title={task.nombre}>{task.nombre}</div>
        {(task.fase || rels?.length > 0) && (
          <div className="knx-task-table-sub">
            {rels?.map((r) => <span key={r} className={`knx-rel knx-rel--${r}`}>{REL_CHIP[r]}</span>)}
            {task.fase}
          </div>
        )}
      </div>
      <div className="knx-task-table-sub">
        {tipologiaName && <span className="knx-tipologia-dot" style={{ background: tipologiaColor(tipologias, task.tipologiaId) }} />}
        {tipologiaName ?? '—'}
      </div>
      <div className="knx-task-table-sub" title={(task.responsables ?? []).map((id) => personName(people, id)).join(', ')}>
        {rels ? ((task.responsables ?? []).length ? `${personName(people, task.responsables[0])}${task.responsables.length > 1 ? ` +${task.responsables.length - 1}` : ''}` : 'Sin responsable')
          : (task.responsables ?? []).map((id) => personName(people, id)).join(', ') || 'Sin responsable'}
      </div>
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
        {statuses.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
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
  const hasAnyDates = withDates.length > 0;

  const starts = hasAnyDates ? withDates.map((t) => t.fechaInicio).sort() : [];
  const ends = hasAnyDates ? withDates.map((t) => t.fechaFin).sort() : [];
  const domainStart = hasAnyDates ? starts[0] : null;
  const domainEnd = hasAnyDates ? ends[ends.length - 1] : null;
  const totalDays = hasAnyDates ? Math.max(1, daysBetween(domainStart, domainEnd)) + 1 : 0;
  const trackWidth = hasAnyDates ? Math.max(GANTT_MIN_TRACK, totalDays * GANTT_PX_PER_DAY) : 0;
  const todayIso = new Date().toISOString().slice(0, 10);
  const showToday = hasAnyDates && todayIso >= domainStart && todayIso <= domainEnd;
  const todayLeft = hasAnyDates ? GANTT_INFO_WIDTH + daysBetween(domainStart, todayIso) * GANTT_PX_PER_DAY : 0;

  // Al entrar, el cronograma arranca centrado en "hoy" (o lo más cerca posible) — antes siempre
  // abría desde el inicio del rango, así que un proyecto largo escondía la fecha actual varios
  // scrolls a la derecha. Si el proyecto ya terminó, muestra el final; si todavía no arrancó,
  // el inicio (que ya es el default natural, sin nada que hacer).
  // El hook se llama siempre, aunque no haya fechas todavía (abajo retornamos temprano en ese
  // caso) — un return antes de un hook hace que la cantidad de hooks cambie entre renders del
  // mismo componente (ej. al filtrar por un mini proyecto sin fechas) y React explota la página.
  useEffect(() => {
    if (!hasAnyDates) return;
    const el = scrollRef.current;
    if (!el) return;
    const target = todayIso > domainEnd ? GANTT_INFO_WIDTH + trackWidth : todayLeft;
    el.scrollLeft = Math.max(0, target - el.clientWidth / 2);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hasAnyDates) {
    return <p className="knx-knowledge-empty">Ninguna tarea tiene fecha de inicio y fin cargadas todavía — usa la vista Lista o editalas para ver el cronograma.</p>;
  }

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

// ── Partidas y Documentación (rediseño 2026-11-24): tablas con acciones por fila ────────────
const fmtNum = (n) => Number(n ?? 0).toLocaleString('es-PE', { maximumFractionDigits: 2 });
const MES_C = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fmtDayShort = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : `${d.getDate()} ${MES_C[d.getMonth()]}`; };

function RowMenu({ label, items }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="knx-pr-menu-wrap">
      <button type="button" className="knx-eq-btn knx-eq-dots" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}>⋯</button>
      {open && (
        <>
          <div className="knx-pr-menu-scrim" onClick={() => setOpen(false)} />
          <div role="menu" className="knx-pr-menu">
            {items.filter(Boolean).map((it) => (
              it === 'sep' ? <div key="sep" className="knx-pr-menu-sep" /> : (
                <button key={it.label} type="button" role="menuitem" className={it.danger ? 'knx-pr-menu-danger' : ''} onClick={() => { setOpen(false); it.onClick(); }}>{it.label}</button>
              )
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SimpleDialog({ title, eyebrow, children, onClose, onSubmit, submitLabel, busy, canSubmit = true, error }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="knx-dlg-backdrop" onClick={onClose}>
      <form className="knx-dlg knx-dlg--sm" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); if (canSubmit && !busy) onSubmit(); }}>
        <div className="knx-dlg-head">
          <div>
            {eyebrow && <div className="knx-dlg-eyebrow">{eyebrow}</div>}
            <h2 className="knx-dlg-title">{title}</h2>
          </div>
          <button type="button" className="knx-dlg-close" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>
        <div className="knx-dlg-body">
          {children}
          {error && <p className="knx-dlg-error" role="alert">{error}</p>}
        </div>
        <div className="knx-dlg-foot">
          <button type="button" className="knx-dlg-btn" onClick={onClose} disabled={busy}>Cancelar</button>
          <button type="submit" className="knx-dlg-btn knx-dlg-btn--primary" disabled={busy || !canSubmit}>{busy ? 'Guardando…' : submitLabel}</button>
        </div>
      </form>
    </div>
  );
}

function Field({ id, label, children }) {
  return <div className="knx-dlg-field"><label className="knx-dlg-label" htmlFor={id}>{label}</label>{children}</div>;
}

function NewPartidaDialog({ onCreate, onClose }) {
  const [v, setV] = useState({ descripcion: '', etapa: '', cantidad: '', unidad: '', precioUnitario: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setV((p) => ({ ...p, [k]: e.target.value }));
  const importe = Number(v.cantidad) * Number(v.precioUnitario);
  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await onCreate({ ...v, cantidad: v.cantidad || null, precioUnitario: v.precioUnitario || null });
      onClose();
    } catch (e) {
      setErr(e?.message || 'No se pudo crear la partida.');
      setBusy(false);
    }
  };
  return (
    <SimpleDialog title="Nueva partida" onClose={onClose} onSubmit={submit} submitLabel="Crear partida" busy={busy} canSubmit={!!v.descripcion.trim()} error={err}>
      <Field id="np-desc" label="Descripción"><input id="np-desc" className="knx-dlg-input" value={v.descripcion} onChange={set('descripcion')} autoFocus /></Field>
      <Field id="np-etapa" label="Etapa (opcional)"><input id="np-etapa" className="knx-dlg-input" value={v.etapa} onChange={set('etapa')} /></Field>
      <div className="knx-np-row">
        <Field id="np-cant" label="Cantidad"><input id="np-cant" className="knx-dlg-input" inputMode="decimal" value={v.cantidad} onChange={set('cantidad')} /></Field>
        <Field id="np-und" label="Unidad"><input id="np-und" className="knx-dlg-input" placeholder="UND" value={v.unidad} onChange={set('unidad')} /></Field>
        <Field id="np-pu" label="Precio unitario"><input id="np-pu" className="knx-dlg-input" inputMode="decimal" value={v.precioUnitario} onChange={set('precioUnitario')} /></Field>
      </div>
      {Number.isFinite(importe) && importe > 0 && <p className="knx-dlg-hint">Importe: <strong>{fmtNum(importe)}</strong></p>}
    </SimpleDialog>
  );
}

function GastoDialog({ partida, onAdd, onClose }) {
  const [v, setV] = useState({ monto: '', proveedor: '', nota: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setV((p) => ({ ...p, [k]: e.target.value }));
  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await onAdd(partida.id, v);
      onClose();
    } catch (e) {
      setErr(e?.message || 'No se pudo registrar el gasto.');
      setBusy(false);
    }
  };
  return (
    <SimpleDialog eyebrow="Nuevo gasto" title={partida.descripcion} onClose={onClose} onSubmit={submit} submitLabel="Registrar gasto" busy={busy} canSubmit={Number(v.monto) > 0} error={err}>
      <Field id="g-monto" label="Monto"><input id="g-monto" className="knx-dlg-input" inputMode="decimal" value={v.monto} onChange={set('monto')} autoFocus /></Field>
      <Field id="g-prov" label="Proveedor (opcional)"><input id="g-prov" className="knx-dlg-input" value={v.proveedor} onChange={set('proveedor')} /></Field>
      <Field id="g-nota" label="Nota (opcional)"><input id="g-nota" className="knx-dlg-input" value={v.nota} onChange={set('nota')} /></Field>
      {partida.importe > 0 && <p className="knx-dlg-hint">Ejecutado hasta hoy: {fmtNum(partida.ejecutado)} de {fmtNum(partida.importe)}.</p>}
    </SimpleDialog>
  );
}

const PARTIDAS_PAGE = 11;

function PresupuestoSection({ metrics, alerts, partidas, gastos, canManage, onAddPartida, onDeletePartida, onAddGasto, onDeleteGasto, renderFeedback }) {
  const [q, setQ] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [gastoFor, setGastoFor] = useState(null);
  const [openId, setOpenId] = useState(null);
  const needle = q.trim().toLowerCase();
  const filtered = partidas.filter((p) => !needle || p.descripcion.toLowerCase().includes(needle) || (p.etapa ?? '').toLowerCase().includes(needle));
  const shown = showAll || needle ? filtered : filtered.slice(0, PARTIDAS_PAGE);
  const total = partidas.reduce((n, p) => n + (p.importe || 0), 0);
  const gastosOf = (id) => gastos.filter((g) => g.partidaId === id).sort((a, b) => String(b.fecha ?? b.createdAt ?? '').localeCompare(String(a.fecha ?? a.createdAt ?? '')));

  return (
    <div className="knx-pt-section" style={{ marginBottom: 16 }}>
      {metrics && (
        <div className="knx-kpi-grid" style={{ marginBottom: 14 }}>
          <div className="knx-kpi-card"><span className="knx-kpi-label">Avance financiero</span><span className="knx-kpi-value">{metrics.pctFinanciero}%</span></div>
          <div className="knx-kpi-card"><span className="knx-kpi-label">Avance de tareas</span><span className="knx-kpi-value">{metrics.pctTareas}%</span></div>
          <div className="knx-kpi-card"><span className="knx-kpi-label">Tiempo transcurrido</span><span className="knx-kpi-value">{metrics.pctTiempo}%</span></div>
          <div className="knx-kpi-card"><span className="knx-kpi-label">Presupuesto total</span><span className="knx-kpi-value">{metrics.totalImporte.toLocaleString('es-PE')}</span></div>
        </div>
      )}
      {alerts.length > 0 && (
        <div className="knx-pa-alerts">
          {alerts.map((a, i) => <p key={i}>{a.message}</p>)}
        </div>
      )}

      <div className="knx-pa-top">
        <label htmlFor="knx-pa-q" className="knx-sr-only">Buscar partida</label>
        <input id="knx-pa-q" className="knx-dlg-input knx-pa-search" placeholder="Buscar partida…" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="knx-pa-sum">{partidas.length} {partidas.length === 1 ? 'partida' : 'partidas'} · Presupuesto total <strong>{fmtNum(total)}</strong></span>
        {canManage && <button type="button" className="knx-dlg-btn knx-dlg-btn--primary knx-pa-new" onClick={() => setNewOpen(true)}>+ Nueva partida</button>}
      </div>

      {!partidas.length ? (
        <div className="knx-pa-empty">Sin partidas todavía. Crea una para poder cargarle gastos.</div>
      ) : (
        <div className="knx-pa-wrap">
          <div className="knx-pa-table">
            <div className="knx-pa-row knx-pa-thead">
              <div>Partida</div><div className="knx-pa-r">Cant. × P.U.</div><div className="knx-pa-r">Importe</div><div>Ejecutado</div><div>Último gasto</div><div />
            </div>
            {!shown.length && <p className="knx-eq-empty">Ninguna partida coincide.</p>}
            {shown.map((p) => {
              const pct = p.importe ? Math.round((p.ejecutado / p.importe) * 100) : 0;
              const over = p.importe > 0 && p.ejecutado > p.importe;
              const gs = gastosOf(p.id);
              const open = openId === p.id;
              return (
                <div key={p.id} id={`partida-${p.id}`} className={`knx-pa-item${open ? ' knx-pa-item--open' : ''}`}>
                  <div className="knx-pa-row">
                    <div className="knx-pa-name">
                      <button type="button" className="knx-pa-namebtn" aria-expanded={open} onClick={() => setOpenId(open ? null : p.id)} title={gs.length ? 'Ver gastos' : undefined}>
                        {p.descripcion}
                      </button>
                      {p.etapa && <small>{p.etapa}</small>}
                    </div>
                    <div className="knx-pa-r knx-pa-muted">{p.cantidad != null ? `${fmtNum(p.cantidad)} ${p.unidad || ''} × ${fmtNum(p.precioUnitario)}` : '—'}</div>
                    <div className="knx-pa-r">{fmtNum(p.importe)}</div>
                    <div className="knx-pa-exec">
                      <span className="knx-pa-bar"><span className={over ? 'knx-pa-bar--over' : ''} style={{ width: `${Math.min(100, pct)}%` }} /></span>
                      <span className={over ? 'knx-pa-pct knx-pa-pct--over' : 'knx-pa-pct'}>{pct}%</span>
                    </div>
                    <div className="knx-pa-muted">{gs[0]?.createdBy ?? '—'}</div>
                    <div className="knx-pa-actions">
                      {canManage && <button type="button" className="knx-eq-btn" onClick={() => setGastoFor(p)}>+ Gasto</button>}
                      {renderFeedback?.({ type: 'partida', id: p.id }, p.descripcion)}
                      <RowMenu label={`Más acciones para ${p.descripcion}`} items={[
                        { label: open ? 'Ocultar gastos' : `Ver gastos (${gs.length})`, onClick: () => setOpenId(open ? null : p.id) },
                        canManage && 'sep',
                        canManage && { label: 'Eliminar partida', danger: true, onClick: () => { if (confirm(`¿Eliminar la partida «${p.descripcion}»?`)) onDeletePartida(p.id); } },
                      ]} />
                    </div>
                  </div>
                  {open && (
                    <div className="knx-pa-gastos">
                      {!gs.length ? <p className="knx-pa-muted">Sin gastos todavía.</p> : gs.map((g) => (
                        <div key={g.id} className="knx-pa-gasto">
                          <span>{fmtDayShort(g.fecha ?? g.createdAt)}</span>
                          <span>{g.proveedor || g.createdBy}{g.imported ? ' (importado)' : ''}{g.nota ? <small> · {g.nota}</small> : null}</span>
                          <strong>{fmtNum(g.monto)}</strong>
                          {canManage && !g.imported ? <button type="button" className="knx-plink-x" aria-label="Eliminar gasto" onClick={() => { if (confirm('¿Eliminar este gasto?')) onDeleteGasto(g.id); }}>×</button> : <span />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {!needle && filtered.length > PARTIDAS_PAGE && (
              <div className="knx-pa-foot">
                <span>Mostrando {shown.length} de {filtered.length}</span>
                <button type="button" onClick={() => setShowAll((v) => !v)}>{showAll ? 'Mostrar menos ▴' : 'Ver todas las partidas ▾'}</button>
              </div>
            )}
          </div>
        </div>
      )}

      {newOpen && <NewPartidaDialog onCreate={onAddPartida} onClose={() => setNewOpen(false)} />}
      {gastoFor && <GastoDialog partida={gastoFor} onAdd={onAddGasto} onClose={() => setGastoFor(null)} />}
    </div>
  );
}

function getDocCategories(projectKind) {
  if (projectKind === 'civil') return ['Planos', 'Contratos', 'Permisos', 'Otro'];
  if (projectKind === 'seguimiento') return ['Contratos', 'Clientes e Inversionistas', 'Financiero', 'Legal', 'Otro'];
  return ['Cronograma', 'Presupuesto', 'Otro'];
}

function fileBadge(name = '') {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') return { label: 'PDF', cls: 'pdf' };
  if (['doc', 'docx'].includes(ext)) return { label: 'DOC', cls: 'doc' };
  if (['xls', 'xlsx', 'csv'].includes(ext)) return { label: 'XLS', cls: 'xls' };
  if (['ppt', 'pptx'].includes(ext)) return { label: 'PPT', cls: 'ppt' };
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic'].includes(ext)) return { label: 'IMG', cls: 'img' };
  if (['dwg', 'dxf'].includes(ext)) return { label: ext.toUpperCase(), cls: 'cad' };
  return { label: (ext || 'DOC').slice(0, 4).toUpperCase(), cls: 'other' };
}

function DocumentacionSection({ projectKind, documents, canManage, onUpload, onDelete }) {
  const categories = getDocCategories(projectKind);
  const [category, setCategory] = useState(categories[categories.length - 1]);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(null); // "Subiendo 2 de 3…"
  const [err, setErr] = useState(null);
  const inputRef = useRef(null);

  const uploadFiles = async (files) => {
    const list = Array.from(files ?? []);
    if (!list.length) return;
    setErr(null);
    try {
      for (let i = 0; i < list.length; i++) {
        setBusy(list.length > 1 ? `Subiendo ${i + 1} de ${list.length}…` : 'Subiendo…');
        const data = await readFileAsBase64(list[i]);
        await onUpload({ name: list[i].name, mimeType: list[i].type, data, category });
      }
    } catch (e) {
      setErr(e?.message || 'No se pudo subir el archivo.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div style={{ marginBottom: 16 }}>
      {canManage && (
        <div
          className={`knx-doc-drop${drag ? ' knx-doc-drop--over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); uploadFiles(e.dataTransfer.files); }}
        >
          {busy ? <span>{busy}</span> : (
            <>
              <span>Arrastra archivos aquí o</span>
              <button type="button" className="knx-dlg-btn knx-dlg-btn--primary" onClick={() => inputRef.current?.click()}>Subir documento</button>
              <label className="knx-doc-cat">
                <span>como</span>
                <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Categoría del documento">
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            </>
          )}
          <input ref={inputRef} type="file" multiple hidden onChange={(e) => { uploadFiles(e.target.files); e.target.value = ''; }} />
        </div>
      )}
      {err && <p className="knx-dlg-error" role="alert" style={{ margin: '8px 0' }}>{err}</p>}

      {!documents.length ? (
        <div className="knx-pa-empty">Sin documentos todavía.</div>
      ) : (
        <div className="knx-pa-wrap">
          <div className="knx-doc-table">
            <div className="knx-doc-row knx-pa-thead">
              <div>Documento</div><div>Categoría</div><div>Subido por</div><div>Fecha</div><div />
            </div>
            {documents.map((d) => {
              const b = fileBadge(d.name);
              return (
                <div key={d.id} id={`doc-${d.id}`} className="knx-doc-row">
                  <div className="knx-doc-name">
                    <span className={`knx-doc-badge knx-doc-badge--${b.cls}`} aria-hidden="true">{b.label}</span>
                    {d.driveUrl ? <a href={d.driveUrl} target="_blank" rel="noreferrer">{d.name}</a> : <span>{d.name}</span>}
                  </div>
                  <div><span className="knx-doc-chip">{d.category}</span></div>
                  <div className="knx-pa-muted">{d.uploadedBy}</div>
                  <div className="knx-pa-muted">{fmtDayShort(d.createdAt)}</div>
                  <div className="knx-pa-actions">
                    {d.driveUrl ? <a className="knx-eq-btn knx-doc-drive" href={d.driveUrl} target="_blank" rel="noreferrer">Ver en Drive ↗</a> : <span className="knx-pa-muted" style={{ fontSize: 12.5 }}>Guardado</span>}
                    {canManage && (
                      <RowMenu label={`Más acciones para ${d.name}`} items={[
                        { label: 'Eliminar documento', danger: true, onClick: () => { if (confirm(`¿Eliminar «${d.name}»?`)) onDelete(d.id); } },
                      ]} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
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

function ProjectDetail({ tenant, projectId, people, personId, onBack, onUpdated, initialTab = null, backLabel = 'Volver a Proyectos' }) {
  const empresas = useMyEmpresas(tenant);
  const [detailsError, setDetailsError] = useState(null);
  const [ptab, setPtab] = useState(initialTab);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingDetails, setSavingDetails] = useState(false);
  const [savingTaskId, setSavingTaskId] = useState(null);
  const [view, setView] = useState('list');
  const [taskResponsableFilter, setTaskResponsableFilter] = useState('all');
  const [taskGrupoFilter, setTaskGrupoFilter] = useState('all');
  const [taskStatusFilter, setTaskStatusFilter] = useState(DEFAULT_STATUS_TAB);
  const [taskViewChoice, setTaskViewChoice] = useState(null); // null = automático (Mis tareas si tienes)
  const [taskTipologiaFilter, setTaskTipologiaFilter] = useState([]); // array de ids, o '__none__' para "Sin tipología"; [] = todas
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [taskGroupBy, setTaskGroupBy] = useState('none');
  const [dateSort, setDateSort] = useState(null); // { field: 'fechaInicio'|'fechaFin', dir: 'asc'|'desc' } | null
  const [collapsedGroups, setCollapsedGroups] = useState(() => new Set());
  const [tipologiasModalOpen, setTipologiasModalOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [removeTaskTarget, setRemoveTaskTarget] = useState(null);

  // Los fallos acá son casi siempre transitorios (Notion/Redis con un hiccup momentáneo, ver
  // bug reportado en prod) — reintentar un par de veces antes de rendirse resuelve la mayoría
  // sin que la persona tenga que hacer nada. `attempt` solo se usa para el backoff, no se guarda
  // en estado porque no hace falta re-renderizar por eso.
  const MAX_AUTO_RETRIES = 2;
  const load = (attempt = 0) => {
    setLoading(true);
    fetch(`/api/kai-next/${tenant}/projects/${projectId}`)
      .then((r) => r.json())
      .then((d) => {
        // Un 200 sin `meta` no debería pasar nunca, pero si pasa se trata igual que un error en
        // vez de reventar más abajo al leer meta.status.
        if (d.error || !d.meta) {
          if (attempt < MAX_AUTO_RETRIES) { setTimeout(() => load(attempt + 1), 900); return; }
          setError(d.error || 'No se pudo cargar el proyecto. Intenta de nuevo.');
          setLoading(false);
          return;
        }
        setError(null);
        setData(d);
        setLoading(false);
      })
      // Un 500 que no venga en JSON (error de plataforma, timeout) hace que r.json() tire — sin
      // esto quedaba como una promise rejection sin atrapar y la pantalla se quedaba en blanco
      // sin ningún mensaje (ver bug reportado en prod).
      .catch(() => {
        if (attempt < MAX_AUTO_RETRIES) { setTimeout(() => load(attempt + 1), 900); return; }
        setError('No se pudo cargar el proyecto. Revisa tu conexión e intenta de nuevo.');
        setLoading(false);
      });
  };

  useEffect(() => { load(); }, [tenant, projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Solo pantalla de "Cargando…" en la carga inicial (sin datos todavía) — load() se vuelve a
  // llamar después de cualquier acción (tildar una tarea, guardar, etc.) y antes blanqueaba toda
  // la página cada vez porque reusaba el mismo `loading` para ambos casos.
  if (loading && !data) return <p className="knx-knowledge-empty">Cargando…</p>;
  if (error) {
    return (
      <div className="knx-analisis-empty">
        <p>{error}</p>
        <button type="button" className="knx-canvas-mini" onClick={() => load()}>Reintentar</button>
      </div>
    );
  }
  if (!data) return null;

  const { meta, tasks, events, level, partidas = [], gastos = [], civilMetrics, civilAlerts = [], documents = [], tests = [], executions = [], grupos = [], tipologias = [] } = data;
  // Responsable/mini proyecto — compartidos entre Lista/Canvas/Cronograma (no uno por vista),
  // así cambiar de vista no pierde el filtro que ya elegiste. `tasks` no existe en absoluto
  // para proyectos 'desarrollo' (esa rama del GET devuelve iniciativas en vez de
  // tasks) — de ahí el fallback, para que esto no reviente en ese caso.
  // Vistas de Seguimiento: Mis tareas (creadas o asignadas) / Creadas por mí / Asignadas a mí /
  // En copia / Todas. Por defecto, Mis tareas si la persona tiene alguna.
  const viewsEnabled = meta?.projectKind === 'seguimiento' && !!personId;
  const relsOf = (t) => taskRelations(t, personId);
  const VIEW_TEST = {
    mias: (r) => r.some((x) => x !== 'copia'),
    creadas: (r) => r.includes('creada'),
    asignadas: (r) => r.includes('responsable') || r.includes('colabora'),
    copia: (r) => r.includes('copia'),
    todas: () => true,
  };
  const taskView = !viewsEnabled ? 'todas' : taskViewChoice ?? ((tasks ?? []).some((t) => VIEW_TEST.mias(relsOf(t))) ? 'mias' : 'todas');
  const matchesTaskView = (t) => taskView === 'todas' || VIEW_TEST[taskView](relsOf(t));
  const visibleTasks = (tasks ?? []).filter((t) =>
    matchesTaskView(t)
    && (taskResponsableFilter === 'all' || (t.responsables ?? []).includes(taskResponsableFilter))
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
  const empresaOfProject = empresas.find((x) => x.id === meta.empresaId) ?? null;
  // Crear tareas: Supervisores y cualquier miembro del equipo del proyecto (no basta con ser
  // responsable de alguna tarea). Editar y eliminar siguen siendo de Supervisor.
  const canCreateTask = !inactive && (level.isSupervisorLevel || (!!personId && (meta.supervisorIds ?? []).includes(personId)));
  // level.isSupervisorLevel ya viene calculado para ESTE proyecto (ver GET del proyecto). El resto
  // solo incide en sus tareas: las que tiene a cargo, o las que creó sin responsable todavía.
  // Mismo criterio que isOwnTask/canDeleteOwnTask en lib/kaiNext/projects.js.
  const isOwnTask = (t) => !!personId && ((t.responsables ?? []).includes(personId) || (!(t.responsables ?? []).length && t.createdBy === personId));
  const canEditTask = (t) => !inactive && (level.isSupervisorLevel || isOwnTask(t));
  const canDeleteTask = (t) => !inactive && (level.isSupervisorLevel
    || (!!personId && t.createdBy === personId && ['backlog', 'todo'].includes(t.status) && !(Number(t.actualHours) > 0)));
  const isCivil = meta.projectKind === 'civil';
  const isExperimental = meta.projectKind === 'experimental';
  const isDesarrollo = meta.projectKind === 'desarrollo';
  // Backlog solo en Seguimiento (no civil, aunque comparten el mismo tablero/componente) — una
  // tarea sin planificar todavía tiene más sentido ahí que en una obra con cronograma físico.
  const taskStatuses = meta.projectKind === 'seguimiento'
    ? [BACKLOG_STATUS, ...TASK_STATUSES.filter((x) => x.id !== 'done'), ...(meta.requiresReview ? [REVIEW_STATUS] : []), ...TASK_STATUSES.filter((x) => x.id === 'done')]
    : TASK_STATUSES;
  const statusTabs = STATUS_TABS.filter((x) => taskStatuses.some((st) => st.id === x.id) || x.id === 'all');

  // Pestañas según el tipo, mismo criterio que Labs. Las de trabajo (Tareas/Cronograma/Pruebas)
  // abren por defecto para no cambiarle el día a día a quien ya usaba Proyectos.
  const feedback = data.feedback ?? [];
  const reports = data.reports ?? [];
  const viewerKey = data.viewerKey ?? null;
  const unseenCount = viewerKey ? (events ?? []).filter((e) => !e.seenBy?.includes(viewerKey)).length : 0;
  const projectTabs = isDesarrollo ? [] : [
    { id: 'resumen', label: 'Resumen' },
    ...(isExperimental ? [{ id: 'pruebas', label: 'Pruebas', count: tests.length }] : []),
    ...(isCivil ? [{ id: 'trabajo', label: 'Cronograma', count: tasks.filter((t) => t.status !== 'done').length }] : []),
    ...(isCivil && level.isSupervisorLevel ? [{ id: 'partidas', label: 'Partidas', count: partidas.length }] : []),
    ...(meta.projectKind === 'seguimiento' ? [{ id: 'trabajo', label: 'Tareas', count: tasks.filter((t) => t.status !== 'done').length }] : []),
    { id: 'historia', label: 'Historia', count: unseenCount, alert: unseenCount > 0 },
    ...(level.isSupervisorLevel ? [{ id: 'doc', label: 'Documentación', count: documents.filter((d) => !d.taskId).length }] : []),
    { id: 'feedback', label: 'Feedback', count: feedback.filter((f) => !f.replyTo).length },
    ...(level.isSupervisorLevel ? [{ id: 'reportes', label: 'Reportes', count: reports.filter((r) => r.status === 'enviado').length, alert: level.isDirectorLevel && reports.some((r) => r.status === 'enviado') }] : []),
  ];
  const defaultTab = isExperimental ? 'pruebas' : 'trabajo';
  const activeTab = projectTabs.some((t) => t.id === ptab) ? ptab : defaultTab;
  const show = (id) => !isDesarrollo && activeTab === id;

  // Clic en un evento de la Historia: lleva a lo que se hizo (mismo criterio que Labs). Lo que es de
  // una tarea (su cambio de estado, un feedback sobre ella o un documento adjunto) abre la tarea;
  // el resto va a su pestaña y, si hay dónde, se desplaza hasta el ítem y lo resalta.
  const focusOn = (tab, elementId) => {
    setPtab(tab);
    if (!elementId) return;
    setTimeout(() => {
      const el = document.getElementById(elementId);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('knx-flash');
      setTimeout(() => el.classList.remove('knx-flash'), 2000);
    }, 80);
  };
  const goToEvent = (ev) => {
    const taskId = ev.taskId
      ?? (ev.type === 'feedback' && ev.targetType === 'tarea' ? ev.targetId : null)
      ?? (ev.type === 'documento' ? documents.find((d) => d.id === ev.documentId)?.taskId : null);
    if (taskId && (tasks ?? []).some((t) => t.id === taskId)) {
      setPtab('trabajo');
      setSelectedTaskId(taskId);
      return;
    }
    if (ev.type === 'tarea') return focusOn('trabajo', null);
    if (ev.type === 'documento') return focusOn('doc', `doc-${ev.documentId}`);
    if (ev.type === 'reporte') return focusOn('reportes', `report-${ev.reportId}`);
    if (ev.type === 'gasto') return focusOn('partidas', null);
    if (ev.type === 'aporte' || ev.type === 'validacion') return focusOn('pruebas', null);
    if (ev.type === 'feedback') return focusOn('feedback', null);
    if (ev.type === 'reunion' && ev.meetingId) window.location.href = `meetings?m=${encodeURIComponent(ev.meetingId)}`;
  };
  // Botón "Feedback (N)" para cualquier ítem (partida, prueba, aporte). Lo dejan Director y
  // Supervisor del proyecto; el resto solo ve el que le corresponde.
  const renderFeedback = (target, label) => (
    <FeedbackButton tenant={tenant} projectId={projectId} feedback={feedback} target={target} label={label} canWrite={level.isSupervisorLevel} onChanged={load} />
  );

  const addPartidaRow = async (payload) => {
    const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/partidas`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'No se pudo crear la partida.');
    load();
  };

  const deletePartidaRow = async (partidaId) => {
    const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/partidas/${partidaId}`, { method: 'DELETE' });
    if (res.ok) load();
  };

  const addGastoRow = async (partidaId, payload) => {
    const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/gastos`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, partidaId }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'No se pudo registrar el gasto.');
    load();
  };

  const deleteGastoRow = async (gastoId) => {
    const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/gastos/${gastoId}`, { method: 'DELETE' });
    if (res.ok) load();
  };

  const uploadDocument = async (payload) => {
    const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/documents`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `No se pudo subir «${payload.name}».`);
    load();
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

  const setStatus = async (taskId, status, order) => {
    setSavingTaskId(taskId);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/tasks/${taskId}/status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(typeof order === 'number' ? { status, order } : { status }),
      });
      if (res.ok) load();
    } finally {
      setSavingTaskId(null);
    }
  };

  // Drag vertical dentro de la misma columna (sin cambio de status) — pinta la posición nueva
  // AL INSTANTE en el cliente (mismo criterio que moveTaskOptimistic en KaiNextSprints.jsx) en
  // vez de esperar la ida y vuelta al servidor: `load()` también recarga el mirror de Notion del
  // proyecto (ver syncTaskToNotion), que tarda unos segundos — pedirle los datos de nuevo después
  // de guardar hacía que la tarjeta "saltara" sola unos segundos después de haberse soltado bien.
  const reorderTaskLocal = async (taskId, order) => {
    const prevData = data;
    setData((prev) => (prev ? { ...prev, tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, order } : t)) } : prev));
    const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/tasks/${taskId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order }),
    });
    if (!res.ok) setData(prevData);
  };

  // Migra a un order real las vecinas que todavía estaban en null (ver `backfill` en
  // computeDropOrder) — optimista en lo local, igual que reorderTaskLocal, sin esperar a que
  // vuelva el PATCH (es una migración silenciosa, no la acción que el usuario está mirando).
  const backfillOrder = (taskId, order) => {
    setData((prev) => (prev ? { ...prev, tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, order } : t)) } : prev));
    fetch(`/api/kai-next/${tenant}/projects/${projectId}/tasks/${taskId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order }),
    }).catch(() => null);
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
    setDetailsError(null);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
      });
      if (res.ok) { load(); onUpdated?.(); }
      else setDetailsError((await res.json().catch(() => ({}))).error || 'No se pudo guardar.');
    } catch {
      setDetailsError('Error de conexión.');
    } finally {
      setSavingDetails(false);
    }
  };

  return (
    <>
      <div className="knx-analisis-top">
        <div className="knx-analisis-head">
          {onBack && <button type="button" className="knx-analisis-compare" onClick={onBack} style={{ marginBottom: 10 }}>← {backLabel}</button>}
          <h1>{meta.name}</h1>
          <p>
            {empresaOfProject && <span className="knx-project-empresa knx-project-empresa--inline"><i style={{ background: empresaOfProject.color }} />{empresaOfProject.name} · </span>}
            {meta.code ? `${meta.code} · ` : ''}{meta.type || PROJECT_KIND_LABEL[meta.projectKind] || meta.projectKind}
          </p>
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
          {/* Mover de empresa: solo el Director, y solo entre empresas que tiene asignadas. */}
          {level.isDirectorLevel && empresas.length > 1 && (
            <select
              className="knx-canvas-meta-select"
              style={{ width: 'auto' }}
              aria-label="Empresa del proyecto"
              value={meta.empresaId ?? ''}
              disabled={savingDetails}
              onChange={(e) => {
                const target = empresas.find((x) => x.id === e.target.value);
                if (target && confirm(`¿Mover «${meta.name}» a ${target.name}? Lo verán solo quienes tengan esa empresa asignada.`)) {
                  updateDetails({ empresaId: target.id });
                }
              }}
            >
              {!meta.empresaId && <option value="">Sin empresa</option>}
              {empresas.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          )}
        </div>
      </div>
      {detailsError && <p className="knx-canvas-error" style={{ marginBottom: 12 }}>{detailsError}</p>}

      {inactive && <p className="knx-canvas-error" style={{ marginBottom: 12 }}>Este proyecto está {meta.status} — reactivalo para poder gestionar tareas.</p>}

      {!isDesarrollo && <ProjectTabsNav tabs={projectTabs} active={activeTab} onChange={setPtab} />}

      {show('resumen') && (
        <ResumenTab
          tenant={tenant}
          projectId={projectId}
          meta={meta}
          level={level}
          people={people}
          tasks={tasks ?? []}
          tests={tests}
          executions={executions}
          civilMetrics={civilMetrics}
          events={events ?? []}
          viewerKey={viewerKey}
          onSaveDetails={updateDetails}
          onGoTo={setPtab}
        />
      )}
      {show('historia') && <HistoriaTab tenant={tenant} projectId={projectId} events={events ?? []} viewerKey={viewerKey} onSeen={load} onGoTo={goToEvent} lookups={{ tasks, documents, gastos, partidas, tests }} />}
      {show('feedback') && <FeedbackTab tenant={tenant} projectId={projectId} feedback={feedback} canWrite={level.isSupervisorLevel} onChanged={load} />}
      {show('reportes') && <ReportesTab tenant={tenant} projectId={projectId} reports={reports} feedback={feedback} canApprove={level.isDirectorLevel} onChanged={load} />}

      {isDesarrollo && (
        <KaiNextProjectDesarrollo
          tenant={tenant}
          projectId={projectId}
          iniciativas={data.iniciativas ?? []}
          canManage={level.isSupervisorLevel && !inactive}
          canWork={!inactive}
          onReload={load}
        />
      )}

      {!isExperimental && show('trabajo') && (
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

      {!isExperimental && show('trabajo') && miniProyectoCandidate && level.isSupervisorLevel && !inactive && (
        <MiniProyectoSuggestionBanner
          task={miniProyectoCandidate}
          onConvert={convertTaskToMiniProyecto}
          onDismiss={dismissMiniProyectoSuggestion}
        />
      )}

      {!isExperimental && show('trabajo') && viewsEnabled && tasks.length > 0 && (
        <div className="knx-tv">
          <div className="knx-tv-tabs" role="tablist" aria-label="Vista de tareas">
            {[['mias', 'Mis tareas'], ['creadas', 'Creadas por mí'], ['asignadas', 'Asignadas a mí'], ['copia', 'En copia'], ['todas', 'Todas']].map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={taskView === k} className={`knx-tv-tab${taskView === k ? ' knx-tv-tab--on' : ''}`} onClick={() => setTaskViewChoice(k)}>
                {l} <span>{tasks.filter((t) => VIEW_TEST[k](relsOf(t))).length}</span>
              </button>
            ))}
          </div>
          <p className="knx-tv-hint">{{
            mias: 'Las que creaste y las que te asignaron (como responsable o colaborador).',
            creadas: 'Tareas que tú creaste: sigue su avance sin buscarlas.',
            asignadas: 'Tareas donde eres responsable o colaboras.',
            copia: 'Tareas que sigues porque te pusieron en copia.',
            todas: 'Todas las tareas del proyecto.',
          }[taskView]}</p>
        </div>
      )}

      {!isExperimental && show('trabajo') && (
        <div className="knx-canvas-group" style={{ marginBottom: 16 }}>
          <div className="knx-canvas-group-head">
            {tasks.length > 0 ? (
              <div className="knx-task-status-tabs">
                {statusTabs.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={taskStatusFilter === s.id ? 'knx-task-status-tab--active' : ''}
                    onClick={() => setTaskStatusFilter(s.id)}
                  >
                    {s.label} {tasks.filter((t) => matchesTaskView(t) && matchesStatusTab(t, s.id)).length}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <span className="knx-canvas-group-name">Tareas</span>
                {canCreateTask && (
                  <button type="button" className="knx-new-chat" onClick={() => setNewTaskOpen(true)}>+ Nueva tarea</button>
                )}
              </>
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
              matchesTaskView(t)
              && (taskResponsableFilter === 'all' || (t.responsables ?? []).includes(taskResponsableFilter))
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
                {canCreateTask && (
                  <button type="button" className="knx-new-chat" onClick={() => setNewTaskOpen(true)}>+ Nueva tarea</button>
                )}
              </div>
            );
          })()}
          {newTaskOpen && <NewTaskQuickModal people={people} grupos={grupos} tipologias={tipologias} statuses={taskStatuses} onCreate={createTask} onClose={() => setNewTaskOpen(false)} />}
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
                          statuses={taskStatuses}
                          canManage={canDeleteTask(t)}
                          canToggle={canEditTask(t)}
                          onStatusChange={(status) => setStatus(t.id, status)}
                          onDelete={() => setRemoveTaskTarget(t.id)}
                          onOpen={() => setSelectedTaskId(t.id)}
                          rels={viewsEnabled ? relsOf(t) : null}
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
                    statuses={taskStatuses}
                    canManage={canDeleteTask(t)}
                    canToggle={canEditTask(t)}
                    onStatusChange={(status) => setStatus(t.id, status)}
                    onDelete={() => setRemoveTaskTarget(t.id)}
                    onOpen={() => setSelectedTaskId(t.id)}
                    rels={viewsEnabled ? relsOf(t) : null}
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
              tipologiaColorOf={(id) => tipologiaColor(tipologias, id)}
              statuses={taskStatuses}
              canManage={level.isSupervisorLevel && !inactive}
              canMoveTask={canEditTask}
              onStatusChange={setStatus}
              onReorder={reorderTaskLocal}
              onBackfill={level.isSupervisorLevel ? backfillOrder : () => {}}
              selectedTaskId={selectedTaskId}
              onSelectTask={setSelectedTaskId}
            />
          ) : (
            <KaiNextGantt
              grouped={groupTasksByFase(visibleTasks)}
              people={people}
              grupos={grupos}
              savingTaskId={savingTaskId}
              canToggleTask={canEditTask}
              onToggle={toggleTaskDone}
              selectedTaskId={selectedTaskId}
              onSelectTask={setSelectedTaskId}
            />
          )}
        </div>
      )}

      {selectedTaskId && tasks.find((t) => t.id === selectedTaskId) && (
        <TaskDetailPanel
          key={selectedTaskId}
          task={tasks.find((t) => t.id === selectedTaskId)}
          people={people}
          grupos={grupos}
          tipologias={tipologias}
          statuses={taskStatuses}
          canManage={level.isSupervisorLevel && !inactive}
          canEdit={canEditTask(tasks.find((t) => t.id === selectedTaskId))}
          canDelete={canDeleteTask(tasks.find((t) => t.id === selectedTaskId))}
          peopleGroups={meta.projectKind === 'seguimiento'}
          canEditPeople={!inactive && (level.isSupervisorLevel || (meta.projectKind === 'seguimiento' && !!personId && tasks.find((t) => t.id === selectedTaskId)?.createdBy === personId))}
          documents={documents.filter((d) => d.taskId === selectedTaskId)}
          onUploadDocument={(payload) => uploadDocument({ ...payload, taskId: selectedTaskId })}
          onDeleteDocument={deleteDocument}
          onClose={() => setSelectedTaskId(null)}
          onSave={(patch) => saveTaskDetail(selectedTaskId, patch)}
          onStatusChange={(status) => setStatus(selectedTaskId, status)}
          onDelete={() => setRemoveTaskTarget(selectedTaskId)}
          feedbackSlot={(
            <div className="knx-task-feedback">
              <span className="knx-pt-label">Feedback</span>
              <FeedbackThreads
                tenant={tenant}
                projectId={projectId}
                feedback={feedback}
                target={{ type: 'tarea', id: selectedTaskId }}
                canWrite={level.isSupervisorLevel}
                onChanged={load}
              />
            </div>
          )}
        />
      )}
      <KaiNextConfirmDialog
        open={!!removeTaskTarget}
        title="Eliminar tarea"
        message="¿Eliminar esta tarea? No se puede deshacer."
        onConfirm={confirmRemoveTask}
        onCancel={() => setRemoveTaskTarget(null)}
      />

      {isExperimental && show('pruebas') && (
        <PruebasSection
          tenant={tenant}
          projectId={projectId}
          tests={tests}
          executions={executions}
          people={people}
          canManage={level.isSupervisorLevel && !inactive}
          isDirector={!!level.isDirectorLevel && !inactive}
          personId={personId}
          onReload={load}
          renderFeedback={renderFeedback}
          feedbackCtx={{ feedback, canWrite: level.isSupervisorLevel }}
        />
      )}

      {isCivil && level.isSupervisorLevel && show('partidas') && (
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
          renderFeedback={renderFeedback}
        />
      )}

      {level.isSupervisorLevel && show('doc') && (
        <DocumentacionSection
          projectKind={meta.projectKind}
          documents={documents.filter((d) => !d.taskId)}
          canManage={!inactive}
          onUpload={uploadDocument}
          onDelete={deleteDocument}
        />
      )}

    </>
  );
}

// Fila enriquecida del listado — cada tipo de proyecto muestra lo que realmente importa para
// ese tipo (avance físico/plan en civil, ensayos en experimental, actividades en seguimiento).
// 'desarrollo' no tiene `summary` todavía (ver summarizeProjectForList, vive en Notion) — se
// muestra con el tratamiento simple de antes.
function ProjectRow({ p, people, onSelect, onEditTeam }) {
  const s = p.summary;
  const teamIds = [...new Set([...(p.supervisorIds ?? []), ...(s?.teamIds ?? [])])];
  const avatars = (
    <>
      {teamIds.slice(0, 4).map((id) => (
        <span key={id} className="knx-project-row-avatar" title={personName(people, id)}>{initials(personName(people, id))}</span>
      ))}
      {teamIds.length > 4 && <span className="knx-project-row-avatar">+{teamIds.length - 4}</span>}
    </>
  );
  // Es un div y no un button porque adentro va el botón real de editar equipo.
  return (
    <div
      role="button"
      tabIndex={0}
      className="knx-project-row"
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return;
        e.preventDefault();
        onSelect();
      }}
    >
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

      {onEditTeam ? (
        <button
          type="button"
          className="knx-project-row-team knx-project-row-team--edit"
          aria-label={`Editar equipo de ${p.name}`}
          title="Editar equipo"
          onClick={(e) => { e.stopPropagation(); onEditTeam(); }}
        >
          {teamIds.length ? avatars : '+ Equipo'}
        </button>
      ) : (
        <span className="knx-project-row-team">{avatars}</span>
      )}

      {s?.statusTag ? (
        <span className={`knx-project-risk ${RISK_CLASS[s.statusTag]}`}>{RISK_LABEL[s.statusTag]}</span>
      ) : (
        <span className={`knx-activity-status knx-activity-status--${p.status === 'activo' ? 'active' : p.status === 'pausado' ? 'ready' : 'finished'}`}>
          {STATUS_LABEL[p.status] ?? p.status}
        </span>
      )}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
    </div>
  );
}

export default function KaiNextProjects({
  tenant, tenantName, basePath, userName, userHandle, isTeamUser, personId, level, initialProjects, people,
}) {
  const searchParams = useSearchParams();
  const [loggingOut, setLoggingOut] = useState(false);
  const [chats, setChats] = useState([]);
  const [projects, setProjects] = useState(initialProjects ?? []);
  // El resumen general es solo para Director y Supervisor: un Team member entra directo a su
  // proyecto y cambia de uno a otro desde el sidebar.
  const isTeamMember = !!level && !level.isSupervisorLevel;
  const [activeProjectId, setActiveProjectId] = useState(() => searchParams.get('p')
    || (isTeamMember ? ((initialProjects ?? []).find((p) => p.status === 'activo') ?? initialProjects?.[0])?.id ?? null : null));
  const [creating, setCreating] = useState(() => searchParams.get('new') === '1' && !!level?.isSupervisorLevel);
  // Desde dónde llegó al proyecto, para el "← Volver". Solo rutas de Empresas: nunca un destino
  // arbitrario armado en la URL.
  const backFrom = /^empresas(\/[A-Za-z0-9_-]+)?$/.test(searchParams.get('from') ?? '') ? searchParams.get('from') : null;
  const [deleteChatTarget, setDeleteChatTarget] = useState(null);
  const [kindFilter, setKindFilter] = useState('all');
  const [editingTeamFor, setEditingTeamFor] = useState(null);

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

  // El equipo lo arma el Director, o un Supervisor en los proyectos donde ya está.
  const canEditTeam = (p) => !!level?.isDirectorLevel || (!!level?.isSupervisorLevel && !!personId && (p.supervisorIds ?? []).includes(personId));

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
              key={activeProjectId}
              tenant={tenant}
              projectId={activeProjectId}
              people={people}
              personId={personId}
              initialTab={searchParams.get('tab')}
              // "← Volver" regresa a donde estaba la persona: si llegó desde Empresas (o el
              // resumen de una empresa), vuelve ahí; si no, a la lista de Proyectos.
              backLabel={backFrom ? (backFrom === 'empresas' ? 'Volver a Empresas' : 'Volver al resumen de la empresa') : 'Volver a Proyectos'}
              onBack={backFrom
                ? () => { window.location.href = `${basePath}/${tenant}/${backFrom}`; }
                : isTeamMember ? undefined : () => setActiveProjectId(null)}
              onUpdated={() => { /* el detalle se recarga solo */ }}
            />
          ) : isTeamMember ? (
            <p className="knx-knowledge-empty">Todavía no tienes proyectos asignados.</p>
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
                        <ProjectRow key={p.id} p={p} people={people} onSelect={() => setActiveProjectId(p.id)} onEditTeam={canEditTeam(p) ? () => setEditingTeamFor(p) : undefined} />
                      ))}
                    </div>

                    {completados.length > 0 && (
                      <details className="knx-project-completados">
                        <summary>Completados · {completados.length}</summary>
                        <div className="knx-project-list" style={{ marginTop: 10 }}>
                          {completados.map((p) => (
                            <ProjectRow key={p.id} p={p} people={people} onSelect={() => setActiveProjectId(p.id)} onEditTeam={canEditTeam(p) ? () => setEditingTeamFor(p) : undefined} />
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

      {editingTeamFor && (
        <KaiNextProjectTeamModal
          tenant={tenant}
          project={editingTeamFor}
          people={people}
          lockedId={level?.isDirectorLevel ? null : personId}
          onClose={() => setEditingTeamFor(null)}
          onSaved={(meta) => {
            setProjects((prev) => prev.map((p) => (p.id === meta.id ? { ...p, ...meta } : p)));
            setEditingTeamFor(null);
          }}
        />
      )}

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
