'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// Civil reemplaza Pruebas/Aportar por Cronograma+Presupuesto — Registrador no ve Presupuesto
// ni Documentación (info financiera/administrativa, cosa de Director/Supervisor).
const NAV = {
  experimental: {
    Registrador: [
      { id: 'resumen', label: 'Resumen', ic: '◈' },
      { id: 'aportar', label: 'Aportar', ic: '✎' },
      { id: 'pruebas', label: 'Pruebas', ic: '⬢' },
      { id: 'historia', label: 'Historia', ic: '~' },
      { id: 'feedback', label: 'Feedback recibido', ic: '◔' },
    ],
    Supervisor: [
      { id: 'resumen', label: 'Resumen', ic: '◈' },
      { id: 'aportar', label: 'Aportar', ic: '✎' },
      { id: 'pruebas', label: 'Pruebas', ic: '⬢' },
      { id: 'documentacion', label: 'Documentación', ic: '▧' },
      { id: 'historia', label: 'Historia', ic: '~' },
      { id: 'feedback', label: 'Feedback', ic: '◔' },
      { id: 'reportes', label: 'Reportes', ic: '▤' },
    ],
    Director: [
      { id: 'resumen', label: 'Resumen', ic: '◈' },
      { id: 'pruebas', label: 'Pruebas', ic: '⬢' },
      { id: 'documentacion', label: 'Documentación', ic: '▧' },
      { id: 'historia', label: 'Historia', ic: '~' },
      { id: 'feedback', label: 'Feedback', ic: '◔' },
      { id: 'reportes', label: 'Reportes', ic: '▤' },
    ],
  },
  // Civil no tiene sección Feedback aparte: los comentarios puntuales ya viven en cada
  // tarea (Cronograma) y partida (Presupuesto) — una sección separada era redundante.
  civil: {
    Registrador: [
      { id: 'resumen', label: 'Resumen', ic: '◈' },
      { id: 'cronograma', label: 'Cronograma', ic: '⬢' },
      { id: 'historia', label: 'Historia', ic: '~' },
    ],
    Supervisor: [
      { id: 'resumen', label: 'Resumen', ic: '◈' },
      { id: 'cronograma', label: 'Cronograma', ic: '⬢' },
      { id: 'presupuesto', label: 'Presupuesto', ic: '▤' },
      { id: 'documentacion', label: 'Documentación', ic: '▧' },
      { id: 'historia', label: 'Historia', ic: '~' },
      { id: 'reportes', label: 'Reportes', ic: '▤' },
    ],
    Director: [
      { id: 'resumen', label: 'Resumen', ic: '◈' },
      { id: 'cronograma', label: 'Cronograma', ic: '⬢' },
      { id: 'presupuesto', label: 'Presupuesto', ic: '▤' },
      { id: 'documentacion', label: 'Documentación', ic: '▧' },
      { id: 'historia', label: 'Historia', ic: '~' },
      { id: 'reportes', label: 'Reportes', ic: '▤' },
    ],
  },
  // Seguimiento = mismo Cronograma que civil (Lista/Gantt/Canvas), sin Presupuesto — clientes
  // que necesitan seguimiento de tareas tipo Basecamp, no obra civil con partidas.
  seguimiento: {
    Registrador: [
      { id: 'resumen', label: 'Resumen', ic: '◈' },
      { id: 'cronograma', label: 'Cronograma', ic: '⬢' },
      { id: 'historia', label: 'Historia', ic: '~' },
    ],
    Supervisor: [
      { id: 'resumen', label: 'Resumen', ic: '◈' },
      { id: 'cronograma', label: 'Cronograma', ic: '⬢' },
      { id: 'documentacion', label: 'Documentación', ic: '▧' },
      { id: 'historia', label: 'Historia', ic: '~' },
      { id: 'reportes', label: 'Reportes', ic: '▤' },
    ],
    Director: [
      { id: 'resumen', label: 'Resumen', ic: '◈' },
      { id: 'cronograma', label: 'Cronograma', ic: '⬢' },
      { id: 'documentacion', label: 'Documentación', ic: '▧' },
      { id: 'historia', label: 'Historia', ic: '~' },
      { id: 'reportes', label: 'Reportes', ic: '▤' },
    ],
  },
};

function getNav(role, projectKind) {
  const key = projectKind === 'civil' ? 'civil' : projectKind === 'seguimiento' ? 'seguimiento' : 'experimental';
  return NAV[key][role];
}

// 'civil' y 'seguimiento' comparten Cronograma/Documentación/Historia/Reportes — solo civil
// suma Presupuesto encima. Se usa en los puntos donde la diferencia real es "¿tiene tareas
// con fase/fechas?" y no "¿es específicamente obra civil?".
function isTaskTrackingKind(projectKind) {
  return projectKind === 'civil' || projectKind === 'seguimiento';
}

const FIELD_TYPES = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
];

const CRITERIA_OPERATORS = [
  { value: '>', label: '>' },
  { value: '<', label: '<' },
  { value: '=', label: '=' },
  { value: '>=', label: '≥' },
  { value: '<=', label: '≤' },
];

// Mismo criterio que lib/labs/experiments.js#formatSuccessCriterion (server-only ahí por el
// import de Redis, así que se replica acá para mostrarlo en cliente).
function formatSuccessCriterion(c) {
  if (typeof c === 'string') return c;
  const op = CRITERIA_OPERATORS.find((o) => o.value === c.operator)?.label ?? c.operator ?? '';
  return `${c.label || ''} ${op} ${c.value ?? ''}${c.unit ? ` ${c.unit}` : ''}`.trim();
}

function tagClass(tag) {
  if (tag === 'éxito') return 'tag-living';
  if (tag === 'parcial') return 'tag-ember';
  if (tag === 'fallo') return 'tag-alert';
  return 'tag-neutral';
}

function initials(name) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatShortDate(iso) {
  if (!iso) return '—';
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function daysBetween(a, b) {
  const MS_DAY = 86400000;
  return Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / MS_DAY);
}

function formatDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const EVIDENCE_ACCEPT = 'image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.dxf';
const INVOICE_ACCEPT = 'image/*,.pdf,.doc,.docx,.xls,.xlsx';
const VIDEO_MAX_MB = 500;
const DOC_MAX_MB = 10;

// Mismo esquema que AriaClientTenant.jsx: imágenes se comprimen client-side (máx 1280px,
// jpeg 0.85) antes de mandarlas — evita blobs enormes en Redis y en el request a Claude.
async function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1280;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
    };
    img.src = url;
  });
}

async function readAsBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result.split(',')[1]);
    reader.readAsDataURL(file);
  });
}

// Selector de personas del roster filtrado por rol — lo usa el Director para asignar
// Supervisores a un proyecto, y el Supervisor/Director para asignar Registradores a una prueba.
function UserMultiSelect({ tenant, role, selected, onChange }) {
  const [users, setUsers] = useState(undefined);

  useEffect(() => {
    fetch(`/api/labs/${tenant}/users`)
      .then((r) => r.json())
      .then((d) => setUsers((d.users ?? []).filter((u) => u.role === role && u.active !== false)))
      .catch(() => setUsers([]));
  }, [tenant, role]);

  const toggle = (id) => {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };

  if (users === undefined) return <p className="empty-note">Cargando {role.toLowerCase()}es…</p>;
  if (users.length === 0) return <p className="empty-note">Todavía no hay ningún {role} creado — pedile al admin que lo agregue.</p>;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {users.map((u) => (
        <button
          type="button"
          key={u.id}
          className={`labs-entry-role-btn${selected.includes(u.id) ? ' active' : ''}`}
          onClick={() => toggle(u.id)}
        >
          {u.name}
        </button>
      ))}
    </div>
  );
}

export default function LabsClientTenant({ tenant, tenantMeta, identity: initialIdentity }) {
  const [identity, setIdentity] = useState(initialIdentity);
  const [experiments, setExperiments] = useState(null);
  const [experimentId, setExperimentId] = useState(null);
  const [experiment, setExperiment] = useState(null);
  const [view, setView] = useState('resumen');

  const loadExperiments = useCallback(() => {
    fetch(`/api/labs/${tenant}/experiments`)
      .then((r) => r.json())
      .then((d) => setExperiments(d.experiments ?? []))
      .catch(() => setExperiments([]));
  }, [tenant]);

  useEffect(() => { loadExperiments(); }, [loadExperiments]);

  const loadExperiment = useCallback((id) => {
    fetch(`/api/labs/${tenant}/experiments/${id}`)
      .then((r) => r.json())
      .then((d) => { if (!d.error) setExperiment(d); })
      .catch(() => {});
  }, [tenant]);

  useEffect(() => {
    if (experimentId) loadExperiment(experimentId);
  }, [experimentId, loadExperiment]);

  if (experiments === null) {
    return <div className="labs-entry-wrap"><p style={{ color: 'var(--labs-cream-dim)' }}>Cargando…</p></div>;
  }

  const handleLogout = async () => {
    await fetch(`/api/labs/${tenant}/logout`, { method: 'POST' });
    window.location.href = `/labs/${tenant}`;
  };

  if (!experimentId || !experiment) {
    return (
      <ExperimentPicker
        tenant={tenant}
        tenantMeta={tenantMeta}
        identity={identity}
        onIdentityUpdate={setIdentity}
        experiments={experiments}
        onSelect={setExperimentId}
        onCreated={(id) => { loadExperiments(); setExperimentId(id); }}
        onLogout={handleLogout}
      />
    );
  }

  const nav = getNav(identity.role, experiment.meta.projectKind);
  const refresh = () => loadExperiment(experimentId);

  return (
    <div id="app">
      <header className="topbar">
        <div className="brand">
          <div className="pulse-wrap"><div className="pulse-dot"></div></div>
          <div className="brand-text">
            <span className="brand-eyebrow">{tenantMeta.name}</span>
            <span className="brand-name">{experiment.meta.name}</span>
          </div>
        </div>
        <div className="role-switch" role="tablist" aria-label="Tu identidad">
          <span className="role-btn active"><span className="dot"></span><EditableName tenant={tenant} identity={identity} onUpdated={setIdentity} /> · {identity.role}</span>
        </div>
        <div className="topbar-actions">
          <button className="btn-ghost-top" onClick={() => { setExperimentId(null); setExperiment(null); }}>Otros proyectos</button>
          <button className="btn-ghost-top" onClick={handleLogout}>Salir</button>
        </div>
      </header>

      <nav className="mobile-tabs">
        {nav.map((item) => (
          <button key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`} onClick={() => setView(item.id)}>
            <span className="ic">{item.ic}</span>{item.label}
          </button>
        ))}
      </nav>

      <div className="shell">
        <nav className="sidenav" aria-label="Secciones del proyecto">
          <div className="nav-label">{experiment.meta.name}</div>
          {nav.map((item) => (
            <button key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`} onClick={() => setView(item.id)}>
              <span className="ic">{item.ic}</span>{item.label}
            </button>
          ))}
        </nav>
        <main>
          {view === 'resumen' && (
            <ViewResumen tenant={tenant} experiment={experiment} identity={identity} onGo={setView} onUpdate={refresh} />
          )}
          {view === 'aportar' && (
            <ViewAportar tenant={tenant} experiment={experiment} identity={identity} onDone={refresh} />
          )}
          {view === 'pruebas' && (
            <ViewPruebas tenant={tenant} experiment={experiment} identity={identity} onUpdate={refresh} />
          )}
          {view === 'cronograma' && (
            <ViewCronograma tenant={tenant} experiment={experiment} identity={identity} onUpdate={refresh} />
          )}
          {view === 'presupuesto' && (
            <ViewPresupuesto tenant={tenant} experiment={experiment} identity={identity} onUpdate={refresh} />
          )}
          {view === 'documentacion' && (
            <ViewDocumentacion tenant={tenant} experiment={experiment} identity={identity} onUpdate={refresh} />
          )}
          {view === 'historia' && <ViewHistoria experiment={experiment} />}
          {view === 'feedback' && (
            <ViewFeedback tenant={tenant} experiment={experiment} identity={identity} onUpdate={refresh} />
          )}
          {view === 'reportes' && (
            <ViewReportes tenant={tenant} experiment={experiment} identity={identity} onUpdate={refresh} />
          )}
        </main>
      </div>

      <div className="labs-powered-by">
        <img src="/assets/bonsight-isotipo.png" alt="Bonsight" />
        <span>Powered by Bonsight</span>
      </div>
    </div>
  );
}

/* ======================= Experiment picker + create ======================= */

const PROJECT_STATUS_TAG_CLASS = { activo: 'tag-living', pausado: 'tag-ember', completado: 'tag-neutral' };

function ProjectCard({ exp, nameOf, onSelect }) {
  const status = exp.status || 'activo';
  const team = (exp.teamIds || []).slice(0, 4);
  const moreCount = (exp.teamIds || []).length - team.length;
  return (
    <div className="labs-project-card" onClick={onSelect} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onSelect()}>
      <div className="labs-project-card-top">
        <div className="labs-project-card-name">{exp.name}</div>
        <span className={`tag ${PROJECT_STATUS_TAG_CLASS[status]}`}>{PROJECT_STATUS_LABEL[status]}</span>
      </div>
      <div className="labs-project-card-meta">Actualizado {formatDate(exp.updatedAt)}</div>

      {exp.progressPct != null && (
        <div className="labs-project-card-progress">
          <div className="dim-bar"><div className="dim-fill" style={{ width: `${exp.progressPct}%` }} /></div>
          <span>{exp.progressPct}%</span>
        </div>
      )}

      {exp.presupuesto != null && (
        <div className="labs-project-card-budget">
          Ejecutado <b>{exp.ejecutado.toLocaleString('es-PE')}</b> de <b>{exp.presupuesto.toLocaleString('es-PE')}</b>
        </div>
      )}

      <div className="labs-project-card-foot">
        <div className="labs-avatar-stack">
          {team.map((id) => <span key={id} className="labs-avatar-sm" title={nameOf(id)}>{initials(nameOf(id))}</span>)}
          {moreCount > 0 && <span className="labs-avatar-sm labs-avatar-more">+{moreCount}</span>}
        </div>
        <span className="chip-btn">Entrar →</span>
      </div>
    </div>
  );
}

function ExperimentPicker({ tenant, tenantMeta, identity, onIdentityUpdate, experiments, onSelect, onCreated, onLogout }) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [sortBy, setSortBy] = useState('recientes');
  const canCreate = identity.role === 'Director';

  useEffect(() => {
    fetch(`/api/labs/${tenant}/users`)
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []))
      .catch(() => setUsers([]));
  }, [tenant]);

  const nameOf = (id) => users.find((u) => u.id === id)?.name ?? '?';

  let list = experiments.filter((e) => {
    const matchQ = e.name.toLowerCase().includes(query.trim().toLowerCase());
    const matchS = statusFilter === 'todos' || (e.status || 'activo') === statusFilter;
    return matchQ && matchS;
  });
  if (sortBy === 'avance') list = [...list].sort((a, b) => (b.progressPct ?? -1) - (a.progressPct ?? -1));
  else if (sortBy === 'nombre') list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  else list = [...list].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  return (
    <div className="labs-page-shell">
    <div className="labs-admin-wrap labs-admin-wrap--wide">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <h1 className="labs-admin-title">{tenantMeta.name}</h1>
        <button className="chip-btn" onClick={onLogout}>Salir</button>
      </div>
      <p style={{ fontSize: 13.5, color: 'var(--labs-cream-dim)', marginBottom: 24 }}>
        Hola <EditableName tenant={tenant} identity={identity} onUpdated={onIdentityUpdate} /> · {identity.role} — elegí un proyecto{canCreate ? ' o creá uno nuevo' : ''}.
      </p>

      {canCreate && (
        <button className="btn btn-primary" style={{ marginBottom: 20 }} onClick={() => setOpen(true)}>+ Crear proyecto</button>
      )}

      {experiments.length === 0 && (
        <p className="empty-note">
          {identity.role === 'Director'
            ? 'Todavía no hay ningún proyecto en este espacio.'
            : identity.role === 'Supervisor'
              ? 'Todavía no te asignaron como Supervisor a ningún proyecto.'
              : 'Todavía no te asignaron a ninguna prueba en ningún proyecto.'}
        </p>
      )}

      {experiments.length > 1 && (
        <div className="labs-picker-filters">
          <input type="text" placeholder="Buscar por nombre de proyecto…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="todos">Todos los estados</option>
            {Object.entries(PROJECT_STATUS_LABEL).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="recientes">Ordenar: más recientes</option>
            <option value="avance">Ordenar: mayor avance</option>
            <option value="nombre">Ordenar: nombre (A-Z)</option>
          </select>
        </div>
      )}

      {experiments.length > 0 && list.length === 0 && <p className="empty-note">No hay proyectos que coincidan con el filtro.</p>}

      <div className="labs-project-grid">
        {list.map((e) => <ProjectCard key={e.id} exp={e} nameOf={nameOf} onSelect={() => onSelect(e.id)} />)}
      </div>

      {open && <CreateExperimentModal tenant={tenant} allowedProjectKinds={tenantMeta.allowedProjectKinds} onClose={() => setOpen(false)} onCreated={(id) => { setOpen(false); onCreated(id); }} />}
    </div>

      <div className="labs-powered-by">
        <img src="/assets/bonsight-isotipo.png" alt="Bonsight" />
        <span>Powered by Bonsight</span>
      </div>
    </div>
  );
}

// Autoservicio: cualquier usuario logueado puede renombrarse a sí mismo (PATCH .../users/me),
// a diferencia del roster del admin que sí puede tocar rol/estado de cualquiera.
function EditableName({ tenant, identity, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(identity.name);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === identity.name) { setEditing(false); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/labs/${tenant}/users/me`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (res.ok) onUpdated?.((prev) => ({ ...prev, name: data.user.name }));
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <input
        className="labs-name-edit-input"
        value={value}
        autoFocus
        disabled={saving}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
        onBlur={save}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }
  return (
    <button
      type="button"
      className="labs-name-edit-trigger"
      title="Editar tu nombre"
      onClick={(e) => { e.stopPropagation(); setValue(identity.name); setEditing(true); }}
    >
      {identity.name}<span className="labs-name-edit-pencil">✎</span>
    </button>
  );
}

const ALL_PROJECT_KIND_OPTIONS = [
  { id: 'experimental', label: 'Experimental' },
  { id: 'civil', label: 'Civil' },
  { id: 'seguimiento', label: 'Seguimiento' },
];

function CreateExperimentModal({ tenant, allowedProjectKinds, onClose, onCreated }) {
  // Vacío/ausente = sin restricción (mismo criterio que el backend, ver lib/labs/tenants.js).
  const kindOptions = allowedProjectKinds?.length
    ? ALL_PROJECT_KIND_OPTIONS.filter((k) => allowedProjectKinds.includes(k.id))
    : ALL_PROJECT_KIND_OPTIONS;
  const [projectKind, setProjectKind] = useState(kindOptions[0]?.id ?? 'experimental');
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [hypothesis, setHypothesis] = useState('');
  const [criteria, setCriteria] = useState([{ label: '', operator: '>=', value: '', unit: '' }]);
  const updateCriterion = (i, patch) => setCriteria((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const addCriterion = () => setCriteria((prev) => [...prev, { label: '', operator: '>=', value: '', unit: '' }]);
  const removeCriterion = (i) => setCriteria((prev) => prev.filter((_, idx) => idx !== i));
  const [supervisorIds, setSupervisorIds] = useState([]);
  const [code, setCode] = useState('');
  const [type, setType] = useState('');
  const [hasBudget, setHasBudget] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetCurrency, setBudgetCurrency] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  // Solo para proyectos civiles — import del Excel de cronograma+presupuesto.
  const [roster, setRoster] = useState([]);
  const [excelBusy, setExcelBusy] = useState(false);
  const [civilTasks, setCivilTasks] = useState(null); // null = todavía no se importó nada
  const [civilPartidas, setCivilPartidas] = useState(null);
  const [civilWarnings, setCivilWarnings] = useState([]);
  const [civilTab, setCivilTab] = useState('tareas'); // 'tareas' | 'presupuesto'
  const [warningsOpen, setWarningsOpen] = useState(false);
  const [collapsedTaskGroups, setCollapsedTaskGroups] = useState(new Set());
  const [collapsedPartidaGroups, setCollapsedPartidaGroups] = useState(new Set());
  const excelInputRef = useRef(null);

  useEffect(() => {
    if (projectKind !== 'civil') return;
    fetch(`/api/labs/${tenant}/users`)
      .then((r) => r.json())
      .then((d) => setRoster((d.users ?? []).filter((u) => u.active !== false)))
      .catch(() => setRoster([]));
  }, [projectKind, tenant]);

  const handleExcelFile = async (file) => {
    if (!file) return;
    setExcelBusy(true);
    setErr(null);
    try {
      const data = await readAsBase64(file);
      const res = await fetch(`/api/labs/${tenant}/civil/import-preview`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });
      const resData = await res.json();
      if (!res.ok) { setErr(resData.error || 'No se pudo interpretar el archivo.'); return; }
      // __groupFase/__groupEtapa quedan fijos al momento del import — el acordeón agrupa por
      // ahí, no por el valor en vivo de fase/etapa, así que corregir el texto de una fila no la
      // hace saltar de grupo en cada tecla (perdería foco todo el tiempo).
      setCivilTasks((resData.tasks ?? []).map((t) => ({ ...t, __groupFase: t.fase || 'Sin fase' })));
      setCivilPartidas((resData.partidas ?? []).map((p) => ({ ...p, __groupEtapa: p.etapa || 'Sin etapa' })));
      setCivilWarnings(resData.warnings ?? []);
      setCivilTab('tareas');
      setWarningsOpen(false);
      setCollapsedTaskGroups(new Set());
      setCollapsedPartidaGroups(new Set());
    } catch {
      setErr('Error de conexión.');
    } finally {
      setExcelBusy(false);
    }
  };

  const updateCivilTask = (i, patch) => setCivilTasks((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  const removeCivilTask = (i) => setCivilTasks((prev) => prev.filter((_, idx) => idx !== i));
  const updateCivilPartida = (i, patch) => setCivilPartidas((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const removeCivilPartida = (i) => setCivilPartidas((prev) => prev.filter((_, idx) => idx !== i));

  const toggleTaskGroup = (key) => setCollapsedTaskGroups((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const togglePartidaGroup = (key) => setCollapsedPartidaGroups((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  // Agrupa preservando el índice original del array plano (__idx) — updateCivilTask/
  // removeCivilTask siguen operando por índice, la agrupación es solo de presentación.
  const taskGroups = [];
  (civilTasks ?? []).forEach((t, i) => {
    const key = t.__groupFase;
    let g = taskGroups.find((x) => x.key === key);
    if (!g) { g = { key, items: [] }; taskGroups.push(g); }
    g.items.push({ ...t, __idx: i });
  });
  const partidaGroups = [];
  (civilPartidas ?? []).forEach((p, i) => {
    const key = p.__groupEtapa;
    let g = partidaGroups.find((x) => x.key === key);
    if (!g) { g = { key, items: [], subtotal: 0 }; partidaGroups.push(g); }
    g.items.push({ ...p, __idx: i });
    g.subtotal += (Number(p.cantidad) || 0) * (Number(p.precioUnitario) || 0);
  });
  const civilBudgetTotal = partidaGroups.reduce((s, g) => s + g.subtotal, 0);
  const civilUnassignedCount = (civilTasks ?? []).filter((t) => !(t.responsables?.length)).length;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      let body;
      if (projectKind === 'civil') {
        body = {
          name, code, type, supervisorIds, projectKind: 'civil',
          tasks: (civilTasks ?? []).map((t) => ({ fase: t.fase, nombre: t.nombre, responsables: t.responsables ?? [], fechaInicio: t.fechaInicio, fechaFin: t.fechaFin, duracionDias: t.duracionDias, progreso: t.progreso })),
          partidas: (civilPartidas ?? []).map((p) => ({ etapa: p.etapa, descripcion: p.descripcion, cantidad: p.cantidad, unidad: p.unidad, precioUnitario: p.precioUnitario, proveedor: p.proveedor, comentarios: p.comentarios })),
        };
      } else if (projectKind === 'seguimiento') {
        // Arranca sin tareas — se cargan a mano desde el Cronograma una vez creado, no hay
        // import de Excel para este tipo (eso es específico del flujo civil de Sesuveca).
        body = { name, code, type, supervisorIds, projectKind: 'seguimiento' };
      } else {
        body = {
          name, purpose, hypothesis, supervisorIds, code, type, hasBudget,
          successCriteria: criteria.filter((c) => c.label.trim() && c.value !== '').map((c) => ({ label: c.label.trim(), operator: c.operator, value: Number(c.value), unit: c.unit.trim() })),
          budgetAmount: hasBudget && budgetAmount !== '' ? Number(budgetAmount) : null,
          budgetCurrency: hasBudget ? budgetCurrency : '',
        };
      }
      const res = await fetch(`/api/labs/${tenant}/experiments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'No se pudo crear.'); return; }
      onCreated(data.meta.id);
    } catch {
      setErr('Error de conexión.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ position: 'relative', maxWidth: projectKind === 'civil' ? 820 : undefined }}>
        <button className="modal-x" style={{ position: 'absolute', top: 18, right: 18 }} onClick={onClose}>✕</button>
        <span className="eyebrow-mini on-dark">Crear proyecto</span>
        <h2 style={{ fontFamily: 'var(--labs-serif)', fontSize: 22, fontWeight: 600, margin: '6px 0 16px' }}>Nuevo proyecto</h2>

        {kindOptions.length > 1 && (
          <>
            <label className="field-label">Tipo de proyecto</label>
            <div className="labs-entry-role-grid" style={{ marginBottom: 14 }}>
              {kindOptions.map((k) => (
                <button key={k.id} type="button" className={`labs-entry-role-btn${projectKind === k.id ? ' active' : ''}`} onClick={() => setProjectKind(k.id)}>{k.label}</button>
              ))}
            </div>
          </>
        )}

        <form onSubmit={handleCreate}>
          <label className="field-label">Nombre</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ marginBottom: 14 }} required />

          {projectKind === 'experimental' && (
            <>
              <label className="field-label">¿Qué queremos conseguir o descubrir?</label>
              <textarea rows={3} value={purpose} onChange={(e) => setPurpose(e.target.value)} style={{ marginBottom: 14 }} />
              <label className="field-label">Hipótesis a validar o refutar</label>
              <textarea rows={2} value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} style={{ marginBottom: 14 }} />
              <label className="field-label">Criterios de éxito</label>
              {criteria.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input type="text" placeholder="Nombre (ej. Resistencia)" value={c.label} onChange={(e) => updateCriterion(i, { label: e.target.value })} style={{ flex: 2 }} />
                  <select value={c.operator} onChange={(e) => updateCriterion(i, { operator: e.target.value })} style={{ background: 'var(--labs-dark-3)', border: '1px solid var(--labs-line-dark)', color: 'var(--labs-cream)', borderRadius: 8, padding: '0 10px' }}>
                    {CRITERIA_OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <input type="number" placeholder="Valor" value={c.value} onChange={(e) => updateCriterion(i, { value: e.target.value })} style={{ flex: 1, minWidth: 70 }} />
                  <input type="text" placeholder="Unidad" value={c.unit} onChange={(e) => updateCriterion(i, { unit: e.target.value })} style={{ flex: 1, minWidth: 70 }} />
                  {criteria.length > 1 && <button type="button" className="chip-btn" onClick={() => removeCriterion(i)}>✕</button>}
                </div>
              ))}
              <button type="button" className="chip-btn" onClick={addCriterion} style={{ marginBottom: 14 }}>+ Agregar criterio</button>
            </>
          )}

          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label className="field-label">Código</label>
              <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="ej. PRY-2026-014" />
            </div>
            <div style={{ flex: 1 }}>
              <label className="field-label">Tipo</label>
              <input type="text" value={type} onChange={(e) => setType(e.target.value)} placeholder="ej. Estructural" />
            </div>
          </div>

          {projectKind === 'experimental' && (
            <>
              <label className="field-label">¿Tiene presupuesto asignado?</label>
              <div className="labs-entry-role-grid" style={{ marginBottom: hasBudget ? 10 : 14 }}>
                <button type="button" className={`labs-entry-role-btn${hasBudget ? ' active' : ''}`} onClick={() => setHasBudget(true)}>Sí</button>
                <button type="button" className={`labs-entry-role-btn${!hasBudget ? ' active' : ''}`} onClick={() => setHasBudget(false)}>No</button>
              </div>
              {hasBudget && (
                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  <input type="number" placeholder="Monto" value={budgetAmount} onChange={(e) => setBudgetAmount(e.target.value)} style={{ flex: 2 }} />
                  <input type="text" placeholder="Moneda (ej. USD)" value={budgetCurrency} onChange={(e) => setBudgetCurrency(e.target.value)} style={{ flex: 1 }} />
                </div>
              )}
            </>
          )}

          {projectKind === 'civil' && (
            <>
              <label className="field-label">Cronograma + Presupuesto (Excel)</label>
              <p style={{ fontSize: 12, color: 'var(--labs-cream-faint)', marginTop: -8, marginBottom: 10 }}>
                Subí el mismo Excel que ya usan — se interpreta automáticamente. Revisá y corregí antes de crear el proyecto.
              </p>
              <input
                ref={excelInputRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={(e) => { handleExcelFile(e.target.files[0]); e.target.value = ''; }}
              />
              <button type="button" className="btn btn-secondary" disabled={excelBusy} onClick={() => excelInputRef.current?.click()} style={{ marginBottom: 14 }}>
                {excelBusy ? 'Interpretando…' : civilTasks ? 'Volver a subir Excel' : '+ Subir Excel'}
              </button>

              {civilWarnings.length > 0 && (
                <div className={`excel-warn-summary${warningsOpen ? ' open' : ''}`} style={{ marginBottom: 14 }}>
                  <button type="button" className="excel-warn-head" onClick={() => setWarningsOpen((o) => !o)}>
                    <span className="excel-warn-icon">⚠</span>
                    <span className="excel-warn-label"><b>{civilWarnings.length}</b> {civilWarnings.length === 1 ? 'aviso' : 'avisos'} — revisalos antes de crear el proyecto</span>
                    <span className="excel-warn-chev">▶</span>
                  </button>
                  {warningsOpen && (
                    <div className="excel-warn-list">
                      {civilWarnings.map((w, i) => <div key={i}>{w}</div>)}
                    </div>
                  )}
                </div>
              )}

              {civilTasks && (
                <>
                  <div className="excel-tabs" style={{ marginBottom: 14 }}>
                    <button type="button" className={`excel-tab${civilTab === 'tareas' ? ' active' : ''}`} onClick={() => setCivilTab('tareas')}>Tareas <span className="count">({civilTasks.length})</span></button>
                    <button type="button" className={`excel-tab${civilTab === 'presupuesto' ? ' active' : ''}`} onClick={() => setCivilTab('presupuesto')}>Presupuesto <span className="count">({civilPartidas.length})</span></button>
                  </div>

                  {civilTab === 'tareas' && (
                    <div style={{ marginBottom: 14 }}>
                      {taskGroups.map((g) => {
                        const collapsed = collapsedTaskGroups.has(g.key);
                        return (
                          <div className="excel-group" key={g.key}>
                            <button type="button" className="excel-group-head" onClick={() => toggleTaskGroup(g.key)}>
                              <span className={`excel-group-chev${collapsed ? '' : ' open'}`}>▶</span>
                              <span className="excel-group-name">{g.key}</span>
                              <span className="excel-group-meta">{g.items.length} tarea{g.items.length !== 1 ? 's' : ''}</span>
                            </button>
                            {!collapsed && (
                              <div className="excel-group-rows">
                                {g.items.map((t) => (
                                  <div className="excel-row" key={t.__idx}>
                                    <div className="excel-row-top">
                                      <input className="excel-ghost-input" value={t.nombre} onChange={(e) => updateCivilTask(t.__idx, { nombre: e.target.value })} placeholder="Nombre de la tarea" />
                                      <button type="button" className="labs-attach-remove" onClick={() => removeCivilTask(t.__idx)}>✕</button>
                                    </div>
                                    <div className="excel-row-chips">
                                      <MultiUserPicker
                                        roster={roster}
                                        selected={t.responsables ?? []}
                                        onChange={(ids) => updateCivilTask(t.__idx, { responsables: ids })}
                                        warningLabel={t.responsableNombreOriginal}
                                      />
                                      <DateRangePicker
                                        fechaInicio={t.fechaInicio}
                                        fechaFin={t.fechaFin}
                                        onChange={({ fechaInicio, fechaFin }) => updateCivilTask(t.__idx, { fechaInicio, fechaFin })}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {civilTab === 'presupuesto' && (
                    <div style={{ marginBottom: 14 }}>
                      {partidaGroups.map((g) => {
                        const collapsed = collapsedPartidaGroups.has(g.key);
                        return (
                          <div className="excel-group" key={g.key}>
                            <button type="button" className="excel-group-head" onClick={() => togglePartidaGroup(g.key)}>
                              <span className={`excel-group-chev${collapsed ? '' : ' open'}`}>▶</span>
                              <span className="excel-group-name">{g.key}</span>
                              <span className="excel-group-meta">{g.items.length} partida{g.items.length !== 1 ? 's' : ''} · {money(g.subtotal)}</span>
                            </button>
                            {!collapsed && (
                              <div className="excel-group-rows">
                                {g.items.map((p) => (
                                  <div className="excel-brow" key={p.__idx}>
                                    <input className="excel-ghost-input" value={p.descripcion} onChange={(e) => updateCivilPartida(p.__idx, { descripcion: e.target.value })} placeholder="Descripción" />
                                    <input type="number" value={p.cantidad ?? ''} onChange={(e) => updateCivilPartida(p.__idx, { cantidad: e.target.value })} placeholder="Cant." style={{ textAlign: 'right' }} />
                                    <input value={p.unidad} onChange={(e) => updateCivilPartida(p.__idx, { unidad: e.target.value })} placeholder="Unidad" />
                                    <input type="number" value={p.precioUnitario ?? ''} onChange={(e) => updateCivilPartida(p.__idx, { precioUnitario: e.target.value })} placeholder="P. Unit." style={{ textAlign: 'right' }} />
                                    <div className="excel-brow-subtotal">{money((Number(p.cantidad) || 0) * (Number(p.precioUnitario) || 0))}</div>
                                    <button type="button" className="labs-attach-remove" onClick={() => removeCivilPartida(p.__idx)}>✕</button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          <label className="field-label">Supervisores del proyecto</label>
          <UserMultiSelect tenant={tenant} role="Supervisor" selected={supervisorIds} onChange={setSupervisorIds} />
          {err && <p className="labs-login-error" style={{ marginTop: 10 }}>{err}</p>}
          <div className="modal-footer">
            {projectKind === 'civil' && civilTasks && (
              <div className="excel-totals">
                <div className="excel-totals-item">Tareas<b>{civilTasks.length}</b></div>
                <div className="excel-totals-item">Presupuesto total<b>{money(civilBudgetTotal)}</b></div>
                <div className="excel-totals-item">Sin asignar<b style={{ color: civilUnassignedCount > 0 ? 'var(--labs-ember)' : undefined }}>{civilUnassignedCount}</b></div>
              </div>
            )}
            <button type="button" className="btn btn-quiet" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Creando…' : 'Crear proyecto →'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ======================= Resumen ======================= */

function ViewResumen({ tenant, experiment, identity, onGo, onUpdate }) {
  if (isTaskTrackingKind(experiment.meta.projectKind)) {
    return <ViewResumenCivil tenant={tenant} experiment={experiment} identity={identity} onUpdate={onUpdate} />;
  }
  if (identity.role === 'Director') return <ViewResumenDirector tenant={tenant} experiment={experiment} onGo={onGo} onUpdate={onUpdate} />;
  if (identity.role === 'Supervisor') return <ViewResumenSupervisor tenant={tenant} experiment={experiment} />;
  return <ViewResumenRegistrador experiment={experiment} identity={identity} onGo={onGo} />;
}

// Proyecto civil: nada de resumen generado por IA — las 3 métricas se calculan solas
// (lib/labs/experiments.js: computeCivilMetrics/computeCivilAlerts), no hay nada que "resumir".
function ViewResumenCivil({ tenant, experiment, identity, onUpdate }) {
  if (identity.role === 'Registrador') {
    return (
      <div className="view">
        <div className="view-header">
          <span className="view-eyebrow">Resumen · {experiment.meta.name}</span>
          <h1 className="view-title">Tus tareas</h1>
        </div>
        {experiment.tasks.length === 0 && <p className="empty-note">No tenés tareas asignadas en este proyecto.</p>}
        {experiment.tasks.map((t) => (
          <div className="labs-tenant-row" key={t.id}>
            <div>
              <div className="labs-tenant-name">{t.nombre}</div>
              <div className="labs-tenant-meta">{t.fase} · {t.fechaInicio ?? '—'} → {t.fechaFin ?? '—'}</div>
            </div>
            <span className={`tag ${t.progreso >= 100 ? 'tag-living' : 'tag-neutral'}`}>{t.progreso >= 100 ? 'Terminada' : 'Pendiente'}</span>
          </div>
        ))}
      </div>
    );
  }

  const m = experiment.civilMetrics;
  const alerts = experiment.civilAlerts ?? [];
  if (!m) return null;

  return (
    <div className="view">
      <div className="view-header">
        <span className="view-eyebrow">Resumen · {experiment.meta.name}</span>
        <h1 className="view-title">Avance del proyecto</h1>
      </div>

      {identity.role === 'Director' && <ProjectDetailsCard tenant={tenant} experiment={experiment} onUpdate={onUpdate} />}

      <div className="dim-grid" style={{ marginBottom: 18 }}>
        <div className="dim-item">
          <div className="dim-name">Tareas</div>
          <div className="dim-bar"><div className="dim-fill" style={{ width: `${m.pctTareas}%` }} /></div>
          <div className="dim-label">{m.pctTareas}% — {m.tareasTerminadas}/{m.totalTareas} terminadas</div>
        </div>
        {experiment.meta.projectKind === 'civil' && (
          <>
            <div className="dim-item">
              <div className="dim-name">Financiero</div>
              <div className="dim-bar"><div className="dim-fill" style={{ width: `${Math.min(100, m.pctFinanciero)}%` }} /></div>
              <div className="dim-label">{m.pctFinanciero}% ejecutado</div>
            </div>
            <div className="dim-item">
              <div className="dim-name">Tiempo</div>
              <div className="dim-bar"><div className="dim-fill" style={{ width: `${Math.min(100, m.pctTiempo)}%` }} /></div>
              <div className="dim-label">{m.pctTiempo}% transcurrido</div>
            </div>
          </>
        )}
      </div>

      {alerts.length > 0 && (
        <>
          <div className="divider-label"><span>Alertas</span></div>
          {alerts.map((a, i) => (
            <div className="priority-row" key={i}>
              <span className="pr-ic">⚠</span>
              <div className="pr-body"><div className="pr-title">{a.message}</div></div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function ViewResumenRegistrador({ experiment, identity, onGo }) {
  const recent = [...experiment.events].slice(0, 4);
  return (
    <div className="view">
      <div className="hero-prompt">
        <span className="eyebrow-mini on-dark">Hoy · {experiment.meta.name}</span>
        <h2>¿Qué hiciste hoy en {experiment.meta.name}?</h2>
        <button className="btn btn-primary" onClick={() => onGo('aportar')}>Aportar al proyecto →</button>
        <div className="hero-meta-row">
          <div className="hero-meta-item">⬢ <b>{experiment.tests.length}</b> pruebas activas</div>
          <div className="hero-meta-item">✎ <b>{experiment.executions.length}</b> aportes en total</div>
          <div className="hero-meta-item">◔ <b>{experiment.feedback.length}</b> feedback recibido</div>
        </div>
      </div>
      <div className="divider-label"><span>Últimos eventos</span></div>
      {recent.length === 0 && <p className="empty-note">Todavía no hay actividad — sé el primero en aportar.</p>}
      <div className="recent-list">
        {recent.map((ev) => (
          <div className="recent-item" key={ev.id}>
            <div className="recent-avatar">{initials(ev.actor)}</div>
            <div className="recent-body">
              <div className="recent-top"><span className="recent-name">{ev.title}</span><span className="recent-time">{formatDateTime(ev.date)}</span></div>
              <div className="recent-text">{ev.body}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ViewResumenSupervisor({ tenant, experiment }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    setLoading(true);
    setErr(null);
    fetch(`/api/labs/${tenant}/experiments/${experiment.meta.id}/summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'Supervisor' }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.error) setErr(d.error); else setSummary(d.summary); })
      .catch(() => setErr('Error de conexión.'))
      .finally(() => setLoading(false));
  }, [tenant, experiment.meta.id, experiment.meta.updatedAt]);

  return (
    <div className="view">
      <div className="view-header">
        <span className="view-eyebrow">Resumen · {experiment.meta.name}</span>
        <h1 className="view-title">Desde tu última revisión</h1>
        <p className="view-sub">Primero la síntesis, el detalle está en Pruebas e Historia.</p>
      </div>

      <div className="synth-banner">
        <div className="section-title" style={{ color: 'var(--labs-cream)' }}>Qué cambió</div>
        {loading && <p className="empty-note">Analizando el estado del proyecto…</p>}
        {err && <p className="labs-login-error">{err}</p>}
        {summary && <div style={{ fontSize: 13.5, color: 'var(--labs-cream-dim)', lineHeight: 1.6 }}>{summary.whatChanged}</div>}
        <div className="synth-stats">
          <div className="synth-stat"><b>{experiment.executions.length}</b><span>aportes totales</span></div>
          <div className="synth-stat"><b>{experiment.tests.length}</b><span>pruebas</span></div>
          <div className="synth-stat"><b>{experiment.executions.filter((e) => !e.validatedBy).length}</b><span>sin validar</span></div>
        </div>
      </div>

      {summary?.priorities?.length > 0 && (
        <>
          <div className="divider-label"><span>Necesita tu atención</span></div>
          {summary.priorities.map((p, i) => (
            <div className="priority-row" key={i}>
              <span className="pr-ic">{p.icon || '⚠'}</span>
              <div className="pr-body">
                <div className="pr-title">{p.title}</div>
                <div className="pr-why"><span className="ai-note">La IA nota</span> — {p.why}</div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function ViewResumenDirector({ tenant, experiment, onGo, onUpdate }) {
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    setLoading(true);
    setErr(null);
    fetch(`/api/labs/${tenant}/experiments/${experiment.meta.id}/summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'Director' }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.error) setErr(d.error); else setBrief(d.brief); })
      .catch(() => setErr('Error de conexión.'))
      .finally(() => setLoading(false));
  }, [tenant, experiment.meta.id, experiment.meta.updatedAt]);

  return (
    <div className="view">
      <div className="view-header">
        <span className="view-eyebrow">Resumen · {experiment.meta.name}</span>
        <h1 className="view-title">En 30 segundos</h1>
      </div>

      <ProjectDetailsCard tenant={tenant} experiment={experiment} onUpdate={onUpdate} />

      <div className="brief-card">
        {loading && <p className="empty-note">Sintetizando…</p>}
        {err && <p className="labs-login-error">{err}</p>}
        {brief && (
          <>
            <div className="section-title" style={{ fontSize: 16, color: 'var(--labs-cream)' }}>{brief.headline}</div>
            <p style={{ fontSize: 13, color: 'var(--labs-cream-dim)', lineHeight: 1.6, marginTop: 8 }}>{brief.narrative}</p>
            <div className="dim-grid">
              {brief.dimensions.map((d, i) => (
                <div className="dim-item" key={i}>
                  <div className="dim-name">{d.name}</div>
                  <div className="dim-bar"><div className="dim-fill" style={{ width: `${Math.min(100, Math.max(0, d.pct))}%` }} /></div>
                  <div className="dim-label">{d.label}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {brief && (
        <>
          <div className="divider-label"><span>Qué salió bien / qué salió mal</span></div>
          <div className="wentwell-grid">
            <div className="ww-card ww-good">
              <div className="ww-title">Bien</div>
              <ul className="ww-list">{brief.wentWell.map((w, i) => <li key={i}>{w}</li>)}</ul>
            </div>
            <div className="ww-card ww-bad">
              <div className="ww-title">Requiere atención</div>
              <ul className="ww-list">{brief.needsAttention.map((w, i) => <li key={i}>{w}</li>)}</ul>
            </div>
          </div>
        </>
      )}

      <div className="divider-label"><span>Acceso rápido</span></div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" onClick={() => onGo('historia')}>Ver historia completa</button>
        <button className="btn btn-primary" onClick={() => onGo('feedback')}>Dejar feedback →</button>
      </div>
    </div>
  );
}

// Código, tipo y presupuesto — solo Director ve y edita esto, y solo Director consulta el
// historial de cambios (ver /api/labs/[tenant]/experiments/[id]/details).
function ProjectDetailsCard({ tenant, experiment, onUpdate }) {
  const [editOpen, setEditOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const m = experiment.meta;
  // hasBudget es un flag manual (se edita en "Editar"); si nadie lo tocó pero ya hay
  // partidas cargadas en Presupuesto, el total real de ahí vale más que el flag vacío.
  const partidasTotal = experiment.civilMetrics?.totalImporte ?? 0;
  const derivedFromPartidas = !m.hasBudget && partidasTotal > 0;
  const budgetAmount = m.hasBudget ? m.budgetAmount : (derivedFromPartidas ? partidasTotal : null);
  const budgetLabel = (m.hasBudget || derivedFromPartidas)
    ? `Sí${budgetAmount != null ? ` — ${budgetAmount.toLocaleString('es-PE')}${m.budgetCurrency ? ' ' + m.budgetCurrency : ''}` : ''}${derivedFromPartidas ? ' (según partidas)' : ''}`
    : 'No asignado';

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div className="section-title" style={{ color: 'var(--labs-cream)' }}>Detalles del proyecto</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="chip-btn" onClick={() => setHistoryOpen(true)}>Historial de cambios</button>
          <button className="chip-btn" onClick={() => setEditOpen(true)}>Editar</button>
        </div>
      </div>
      <div style={{ marginTop: 10, fontSize: 13, color: 'var(--labs-cream-dim)', display: 'grid', gap: 4 }}>
        <div>Código: <b style={{ color: 'var(--labs-cream)' }}>{m.code || '—'}</b></div>
        <div>Tipo: <b style={{ color: 'var(--labs-cream)' }}>{m.type || '—'}</b></div>
        <div>Presupuesto asignado: <b style={{ color: 'var(--labs-cream)' }}>{budgetLabel}</b></div>
        {m.projectKind === 'experimental' && (
          <>
            <div>Objetivo: <b style={{ color: 'var(--labs-cream)' }}>{m.purpose || '—'}</b></div>
            <div>Hipótesis: <b style={{ color: 'var(--labs-cream)' }}>{m.hypothesis || '—'}</b></div>
            <div>Criterios de éxito: <b style={{ color: 'var(--labs-cream)' }}>{m.successCriteria?.length ? m.successCriteria.map(formatSuccessCriterion).join(' · ') : '—'}</b></div>
          </>
        )}
      </div>
      {editOpen && (
        <EditProjectDetailsModal
          tenant={tenant}
          experimentId={m.id}
          current={m}
          onClose={() => setEditOpen(false)}
          onSaved={() => { setEditOpen(false); onUpdate(); }}
        />
      )}
      {historyOpen && (
        <ProjectDetailsHistoryModal tenant={tenant} experimentId={m.id} onClose={() => setHistoryOpen(false)} />
      )}
    </div>
  );
}

const PROJECT_STATUS_LABEL = { activo: 'Activo', pausado: 'Pausado', completado: 'Completado' };

// Mismo criterio que lib/labs/experiments.js#projectInactiveMessage (server-only ahí por el
// import de Redis, así que se replica acá para el aviso en cliente).
function projectInactiveMessage(meta) {
  if (!meta.status || meta.status === 'activo') return null;
  const label = meta.status === 'pausado' ? 'pausado' : 'completado';
  return `Este proyecto está ${label} — reactivalo desde "Editar detalles" para poder gestionar tareas o presupuesto.`;
}

function EditProjectDetailsModal({ tenant, experimentId, current, onClose, onSaved }) {
  const isExperimental = current.projectKind === 'experimental';
  const [code, setCode] = useState(current.code || '');
  const [type, setType] = useState(current.type || '');
  const [status, setStatus] = useState(current.status || 'activo');
  const [hasBudget, setHasBudget] = useState(!!current.hasBudget);
  const [budgetAmount, setBudgetAmount] = useState(current.budgetAmount ?? '');
  const [budgetCurrency, setBudgetCurrency] = useState(current.budgetCurrency || '');
  const [purpose, setPurpose] = useState(current.purpose || '');
  const [hypothesis, setHypothesis] = useState(current.hypothesis || '');
  const initialCriteria = (current.successCriteria || []).filter((c) => typeof c === 'object');
  const [criteria, setCriteria] = useState(initialCriteria.length ? initialCriteria.map((c) => ({ label: c.label || '', operator: c.operator || '>=', value: c.value ?? '', unit: c.unit || '' })) : [{ label: '', operator: '>=', value: '', unit: '' }]);
  const updateCriterion = (i, patch) => setCriteria((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const addCriterion = () => setCriteria((prev) => [...prev, { label: '', operator: '>=', value: '', unit: '' }]);
  const removeCriterion = (i) => setCriteria((prev) => prev.filter((_, idx) => idx !== i));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const handleSave = async () => {
    setBusy(true);
    setErr(null);
    try {
      const body = {
        code, type, status, hasBudget,
        budgetAmount: hasBudget && budgetAmount !== '' ? Number(budgetAmount) : null,
        budgetCurrency: hasBudget ? budgetCurrency : '',
      };
      if (isExperimental) {
        body.purpose = purpose;
        body.hypothesis = hypothesis;
        body.successCriteria = criteria.filter((c) => c.label.trim() && c.value !== '').map((c) => ({ label: c.label.trim(), operator: c.operator, value: Number(c.value), unit: c.unit.trim() }));
      }
      const res = await fetch(`/api/labs/${tenant}/experiments/${experimentId}/details`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'No se pudo guardar.'); return; }
      onSaved();
    } catch {
      setErr('Error de conexión.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ position: 'relative' }}>
        <button className="modal-x" style={{ position: 'absolute', top: 18, right: 18 }} onClick={onClose}>✕</button>
        <span className="eyebrow-mini on-dark">Editar</span>
        <h2 style={{ fontFamily: 'var(--labs-serif)', fontSize: 22, fontWeight: 600, margin: '6px 0 16px' }}>Detalles del proyecto</h2>
        <label className="field-label">Código</label>
        <input type="text" value={code} onChange={(e) => setCode(e.target.value)} style={{ marginBottom: 14 }} />
        <label className="field-label">Tipo</label>
        <input type="text" value={type} onChange={(e) => setType(e.target.value)} style={{ marginBottom: 14 }} />
        <label className="field-label">Estado</label>
        <div className="labs-entry-role-grid" style={{ marginBottom: 14 }}>
          {Object.entries(PROJECT_STATUS_LABEL).map(([id, label]) => (
            <button key={id} type="button" className={`labs-entry-role-btn${status === id ? ' active' : ''}`} onClick={() => setStatus(id)}>{label}</button>
          ))}
        </div>
        <label className="field-label">¿Tiene presupuesto asignado?</label>
        <div className="labs-entry-role-grid" style={{ marginBottom: hasBudget ? 10 : 14 }}>
          <button type="button" className={`labs-entry-role-btn${hasBudget ? ' active' : ''}`} onClick={() => setHasBudget(true)}>Sí</button>
          <button type="button" className={`labs-entry-role-btn${!hasBudget ? ' active' : ''}`} onClick={() => setHasBudget(false)}>No</button>
        </div>
        {hasBudget && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <input type="number" placeholder="Monto" value={budgetAmount} onChange={(e) => setBudgetAmount(e.target.value)} style={{ flex: 2 }} />
            <input type="text" placeholder="Moneda (ej. USD)" value={budgetCurrency} onChange={(e) => setBudgetCurrency(e.target.value)} style={{ flex: 1 }} />
          </div>
        )}
        {isExperimental && (
          <>
            <label className="field-label">¿Qué queremos conseguir o descubrir?</label>
            <textarea rows={3} value={purpose} onChange={(e) => setPurpose(e.target.value)} style={{ marginBottom: 14 }} />
            <label className="field-label">Hipótesis a validar o refutar</label>
            <textarea rows={2} value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} style={{ marginBottom: 14 }} />
            <label className="field-label">Criterios de éxito</label>
            {criteria.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input type="text" placeholder="Nombre (ej. Resistencia)" value={c.label} onChange={(e) => updateCriterion(i, { label: e.target.value })} style={{ flex: 2 }} />
                <select value={c.operator} onChange={(e) => updateCriterion(i, { operator: e.target.value })} style={{ background: 'var(--labs-dark-3)', border: '1px solid var(--labs-line-dark)', color: 'var(--labs-cream)', borderRadius: 8, padding: '0 10px' }}>
                  {CRITERIA_OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <input type="number" placeholder="Valor" value={c.value} onChange={(e) => updateCriterion(i, { value: e.target.value })} style={{ flex: 1, minWidth: 70 }} />
                <input type="text" placeholder="Unidad" value={c.unit} onChange={(e) => updateCriterion(i, { unit: e.target.value })} style={{ flex: 1, minWidth: 70 }} />
                {criteria.length > 1 && <button type="button" className="chip-btn" onClick={() => removeCriterion(i)}>✕</button>}
              </div>
            ))}
            <button type="button" className="chip-btn" onClick={addCriterion} style={{ marginBottom: 14 }}>+ Agregar criterio</button>
          </>
        )}
        {err && <p className="labs-login-error">{err}</p>}
        <div className="modal-footer">
          <button type="button" className="btn btn-quiet" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={handleSave}>{busy ? 'Guardando…' : 'Guardar →'}</button>
        </div>
      </div>
    </div>
  );
}

function ProjectDetailsHistoryModal({ tenant, experimentId, onClose }) {
  const [history, setHistory] = useState(undefined);

  useEffect(() => {
    fetch(`/api/labs/${tenant}/experiments/${experimentId}/details`)
      .then((r) => r.json())
      .then((d) => setHistory(d.history ?? []))
      .catch(() => setHistory([]));
  }, [tenant, experimentId]);

  const fieldLabel = { code: 'Código', type: 'Tipo', hasBudget: 'Presupuesto asignado', budgetAmount: 'Monto', budgetCurrency: 'Moneda', status: 'Estado', purpose: 'Objetivo', hypothesis: 'Hipótesis', successCriteria: 'Criterios de éxito' };
  const fmt = (v) => (v === null || v === undefined || v === '' ? '—' : (typeof v === 'boolean' ? (v ? 'Sí' : 'No') : String(v)));

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ position: 'relative' }}>
        <button className="modal-x" style={{ position: 'absolute', top: 18, right: 18 }} onClick={onClose}>✕</button>
        <span className="eyebrow-mini on-dark">Solo Director</span>
        <h2 style={{ fontFamily: 'var(--labs-serif)', fontSize: 22, fontWeight: 600, margin: '6px 0 16px' }}>Historial de cambios</h2>
        {history === undefined && <p className="empty-note">Cargando…</p>}
        {history?.length === 0 && <p className="empty-note">Todavía no hubo cambios en código, tipo o presupuesto.</p>}
        {history?.map((h) => (
          <div key={h.id} className="feedback-item">
            <div className="fb-top">
              <div className="fb-who">{h.changedBy}</div>
              <span className="recent-time">{formatDateTime(h.changedAt)}</span>
            </div>
            <div className="fb-text">
              {h.changes.map((c, i) => (
                <div key={i}>{fieldLabel[c.field] || c.field}: {fmt(c.from)} → {fmt(c.to)}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ======================= Aportar ======================= */

function ViewAportar({ tenant, experiment, identity, onDone }) {
  const [step, setStep] = useState(0); // 0 elegir prueba, 1 escribir, 2 pensando, 3 preview, 4 confirmado
  const [testId, setTestId] = useState(null);
  const [freeText, setFreeText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [interpreted, setInterpreted] = useState(null);
  const [editedValues, setEditedValues] = useState({}); // lo que arma la IA es el punto de partida, no la última palabra — se puede completar/corregir a mano antes de confirmar
  const [err, setErr] = useState(null);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const test = experiment.tests.find((t) => t.id === testId);

  const resetAportar = () => {
    setStep(0); setTestId(null); setFreeText(''); setAttachments([]); setInterpreted(null); setEditedValues({}); setErr(null);
  };

  const processFile = async (file) => {
    if (!file) return;
    setErr(null);
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const maxMb = isImage ? 4 : isVideo ? VIDEO_MAX_MB : DOC_MAX_MB;
    if (file.size > maxMb * 1024 * 1024) { setErr(`Archivo demasiado grande (máx ${maxMb} MB).`); return; }
    const id = Math.random().toString(36).slice(2);

    if (isImage) {
      const data = await compressImage(file);
      setAttachments((prev) => [...prev, { id, name: file.name || 'foto.jpg', mimeType: 'image/jpeg', kind: 'image', data, previewUrl: `data:image/jpeg;base64,${data}` }]);
      return;
    }

    if (isVideo) {
      // El video no viaja por nuestro backend (el body de una Serverless Function de Vercel
      // tiene un límite de ~4.5MB) — se sube directo del navegador a Drive con una sesión
      // de subida resumible. Se guarda solo como evidencia de soporte, nunca se analiza.
      if (!testId) { setErr('Elegí una prueba antes de adjuntar un video.'); return; }
      setAttachments((prev) => [...prev, { id, name: file.name, mimeType: file.type, kind: 'video', uploading: true, previewUrl: null }]);
      try {
        const urlRes = await fetch(`/api/labs/${tenant}/experiments/${experiment.meta.id}/executions/video-upload-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ testId, name: file.name, mimeType: file.type }),
        });
        const urlData = await urlRes.json();
        if (!urlRes.ok) throw new Error(urlData.error || 'No se pudo iniciar la subida.');

        const putRes = await fetch(urlData.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
        if (!putRes.ok) throw new Error('No se pudo subir el video.');
        const uploaded = await putRes.json();

        setAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, uploading: false, driveFileId: uploaded.id, driveUrl: uploaded.webViewLink } : a)));
      } catch (e) {
        setErr(e.message || 'No se pudo subir el video.');
        setAttachments((prev) => prev.filter((a) => a.id !== id));
      }
      return;
    }

    // PDF, Word, Excel, DXF — se leen igual que hoy (base64 en el body); el servidor decide
    // según el tipo si puede extraer texto para completar los campos automáticamente.
    const data = await readAsBase64(file);
    setAttachments((prev) => [...prev, { id, name: file.name, mimeType: file.type || 'application/octet-stream', kind: 'document', data, previewUrl: null }]);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((t) => MediaRecorder.isTypeSupported(t)) || '';
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || 'audio/webm' });
        setTranscribing(true);
        try {
          const form = new FormData();
          form.append('audio', blob);
          const res = await fetch(`/api/labs/${tenant}/transcribe`, { method: 'POST', body: form });
          const data = await res.json();
          if (data.text) setFreeText((prev) => (prev ? `${prev} ${data.text}` : data.text));
        } catch { /* ignore */ }
        setTranscribing(false);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch { /* permiso denegado */ }
  };
  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  };

  const handleInterpret = async () => {
    if (!freeText.trim() && attachments.length === 0) return;
    setStep(2);
    setErr(null);
    try {
      const res = await fetch(`/api/labs/${tenant}/experiments/${experiment.meta.id}/executions/interpret`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId, freeText, evidence: attachments.map(({ name, mimeType, data }) => ({ name, mimeType, data })) }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'No se pudo interpretar.'); setStep(1); return; }
      setInterpreted(data);
      setEditedValues(data.values || {});
      setStep(3);
    } catch {
      setErr('Error de conexión.');
      setStep(1);
    }
  };

  const handleConfirm = async () => {
    setErr(null);
    try {
      const missingFields = test.fields.filter((f) => editedValues[f.key] === undefined || editedValues[f.key] === '').map((f) => f.key);
      const res = await fetch(`/api/labs/${tenant}/experiments/${experiment.meta.id}/executions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId,
          values: editedValues, tag: interpreted.tag,
          missingFields, note: interpreted.note,
          evidence: attachments.map(({ name, mimeType, data, previewUrl, driveFileId, driveUrl, kind }) => ({ name, mimeType, data, previewUrl, driveFileId, driveUrl, kind })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'No se pudo guardar.'); return; }
      setStep(4);
      onDone?.();
    } catch {
      setErr('Error de conexión.');
    }
  };

  return (
    <div className="view">
      <div className="view-header">
        <span className="view-eyebrow">Aportar · {experiment.meta.name}</span>
        <h1 className="view-title">Contanos qué pasó</h1>
        <p className="view-sub">Elegí la prueba, hablá o escribí — la IA organiza el resto contra sus campos.</p>
      </div>

      <div className="stepper-track">
        {[0, 1, 2, 3, 4].map((i) => <div key={i} className={`step-dot ${i < step ? 'done' : ''} ${i === step ? 'now' : ''}`} />)}
      </div>

      {step === 0 && (
        <div>
          {experiment.tests.length === 0 && <p className="empty-note">Todavía no hay ninguna prueba creada — pedile a tu Supervisor que cree una en la pestaña Pruebas.</p>}
          {experiment.tests.length > 0 && identity.role === 'Registrador' && !experiment.tests.some((t) => t.registradorIds?.includes(identity.id)) && (
            <p className="empty-note">Todavía no te asignaron a ninguna prueba — pedile a tu Supervisor que te agregue.</p>
          )}
          <div className="mode-grid">
            {experiment.tests
              .filter((t) => identity.role !== 'Registrador' || t.registradorIds?.includes(identity.id))
              .map((t) => (
                <button key={t.id} className="mode-card" onClick={() => { setTestId(t.id); setStep(1); }}>
                  <span className="mode-ic">{t.icon}</span>
                  <div className="mode-title">{t.name}</div>
                  <div className="mode-sub">{t.fields.length} campos</div>
                </button>
              ))}
          </div>
        </div>
      )}

      {step === 1 && test && (
        <div>
          {test.fields.length > 0 && (
            <>
              <label className="field-label">Esta prueba registra</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                {test.fields.map((f) => (
                  <span key={f.key} className="tag tag-neutral">
                    {f.operator ? formatSuccessCriterion(f) : `${f.label}${f.type === 'number' ? ' · número' : ''}`}
                  </span>
                ))}
              </div>
            </>
          )}
          <div className="voice-sim" style={{ cursor: 'pointer' }} onClick={recording ? stopRecording : startRecording}>
            {recording ? (
              <div className="wave"><span></span><span></span><span></span><span></span><span></span><span></span></div>
            ) : (
              <span style={{ fontSize: 18 }}>🎙️</span>
            )}
            <div style={{ fontSize: 13, color: 'var(--labs-cream-dim)' }}>
              {recording ? 'Grabando… tocá para terminar.' : transcribing ? 'Transcribiendo…' : 'Tocá para grabar por voz, o escribí abajo.'}
            </div>
          </div>
          <label className="field-label">Qué pasó en "{test.name}"</label>
          <textarea rows={6} value={freeText} onChange={(e) => setFreeText(e.target.value)} placeholder="Contá los resultados, condiciones, y cualquier cosa que valga la pena registrar… (podés adjuntar una foto o documento con los resultados y la IA completa los campos sola)" />

          <input
            ref={fileInputRef}
            type="file"
            accept={EVIDENCE_ACCEPT}
            multiple
            style={{ display: 'none' }}
            onChange={(e) => { Array.from(e.target.files).forEach(processFile); e.target.value = ''; }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => { Array.from(e.target.files).forEach(processFile); e.target.value = ''; }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button type="button" className="labs-attach-btn" onClick={() => fileInputRef.current?.click()}>📎 Adjuntar archivo</button>
            <button type="button" className="labs-attach-btn" onClick={() => cameraInputRef.current?.click()}>📷 Tomar foto</button>
          </div>

          {attachments.length > 0 && (
            <div className="labs-attach-strip">
              {attachments.map((att) => (
                <div key={att.id} className="labs-attach-chip">
                  {att.previewUrl ? (
                    <img src={att.previewUrl} className="labs-attach-thumb" alt={att.name} />
                  ) : (
                    <div className="labs-attach-icon">{att.kind === 'video' ? '🎥' : '📄'}</div>
                  )}
                  <span className="labs-attach-name">{att.uploading ? `Subiendo ${att.name}…` : att.name}</span>
                  <button type="button" className="labs-attach-remove" disabled={att.uploading} onClick={() => setAttachments((p) => p.filter((a) => a.id !== att.id))}>✕</button>
                </div>
              ))}
            </div>
          )}

          {err && <p className="labs-login-error" style={{ marginTop: 8 }}>{err}</p>}
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button className="btn btn-secondary" onClick={() => setStep(0)}>Atrás</button>
            <button
              className="btn btn-primary"
              disabled={(!freeText.trim() && attachments.length === 0) || attachments.some((a) => a.uploading)}
              onClick={handleInterpret}
            >
              Continuar →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="thinking-row"><div className="thinking-dots"><span></span><span></span><span></span></div> La IA está interpretando tu aporte contra los campos de "{test?.name}"…</div>
      )}

      {step === 3 && interpreted && test && (
        <div>
          <div className="structured-preview">
            <div className="sp-head">
              <span style={{ fontSize: 13, fontWeight: 600 }}>{test.name}</span>
              <span className="ai-badge"><span className="dot"></span>Interpretado por IA — editable</span>
            </div>
            {test.fields.map((f, i) => {
              const val = editedValues[f.key] ?? '';
              const isMissing = val === '';
              return (
                <div className={`sp-row ${i % 2 ? 'dark-bg' : ''}`} key={f.key}>
                  <div className="k">{f.label}</div>
                  <div className={`v ${isMissing ? 'missing' : ''}`}>
                    <input
                      type={f.type === 'number' ? 'number' : 'text'}
                      value={val}
                      placeholder="Sin especificar — completá a mano"
                      onChange={(e) => setEditedValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    />
                  </div>
                </div>
              );
            })}
            <div className="sp-row dark-bg"><div className="k">Etiqueta</div><div className="v"><span className={`tag ${tagClass(interpreted.tag)}`}>{interpreted.tag}</span></div></div>
            {interpreted.note && <div className="sp-row"><div className="k">Nota</div><div className="v">{interpreted.note}</div></div>}
            {attachments.length > 0 && (
              <div className="sp-row dark-bg">
                <div className="k">Evidencia</div>
                <div className="v">{attachments.length} adjunto{attachments.length !== 1 ? 's' : ''} — {attachments.map((a) => a.name).join(', ')}</div>
              </div>
            )}
            {interpreted.unanalyzed?.length > 0 && (
              <div className="sp-row">
                <div className="k">No analizado</div>
                <div className="v" style={{ color: 'var(--labs-cream-faint)' }}>
                  {interpreted.unanalyzed.map((u) => `${u.name}: ${u.reason}`).join(' · ')}
                </div>
              </div>
            )}
          </div>
          {err && <p className="labs-login-error" style={{ marginBottom: 12 }}>{err}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)}>Editar aporte</button>
            <button className="btn btn-primary" onClick={handleConfirm}>Confirmar aporte →</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <div className="confirm-banner">
            <div className="confirm-ic">✓</div>
            <div className="confirm-text">
              <b>Agregaste un aporte nuevo a {test?.name}</b>
              <span>El proyecto está actualizado.</span>
            </div>
          </div>
          <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={resetAportar}>Aportar algo más</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ======================= Documentación ======================= */

// Civil y experimental ya tienen Cronograma/Presupuesto (o Pruebas) como datos
// estructurados — acá quedan categorías que solo tienen sentido como archivo suelto.
// Seguimiento hoy es Go Invest (inmobiliaria de asesoría/venta/arriendo/administración de
// propiedades, no constructora) — categorías pensadas para eso, no para obra.
function getDocCategories(projectKind) {
  if (projectKind === 'civil') return ['Planos', 'Contratos', 'Permisos', 'Otro'];
  if (projectKind === 'seguimiento') return ['Contratos', 'Clientes e Inversionistas', 'Financiero', 'Legal', 'Otro'];
  return ['Cronograma', 'Presupuesto', 'Otro'];
}

// Cronogramas, presupuestos y otros adjuntos de referencia del proyecto — no se analizan con
// IA, es solo almacenamiento. Solo Director, o Supervisor asignado a este proyecto, suben o
// borran (el server ya lo hace cumplir; acá es nomás la UI).
function ViewDocumentacion({ tenant, experiment, identity, onUpdate }) {
  const DOC_CATEGORIES = getDocCategories(experiment.meta.projectKind);
  const [category, setCategory] = useState(DOC_CATEGORIES[0]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const fileInputRef = useRef(null);
  const canManage = identity.role === 'Director' || experiment.meta.supervisorIds?.includes(identity.id);

  const handleFile = async (file) => {
    if (!file) return;
    const maxMb = 15;
    if (file.size > maxMb * 1024 * 1024) { setErr(`Archivo demasiado grande (máx ${maxMb} MB).`); return; }
    setBusy(true);
    setErr(null);
    try {
      const data = await readAsBase64(file);
      const res = await fetch(`/api/labs/${tenant}/experiments/${experiment.meta.id}/documents`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, mimeType: file.type, data, category }),
      });
      const resData = await res.json();
      if (!res.ok) { setErr(resData.error || 'No se pudo subir.'); return; }
      onUpdate();
    } catch {
      setErr('Error de conexión.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (documentId) => {
    await fetch(`/api/labs/${tenant}/experiments/${experiment.meta.id}/documents`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId }),
    });
    onUpdate();
  };

  const grouped = DOC_CATEGORIES.map((c) => ({ category: c, docs: experiment.documents.filter((d) => d.category === c) }));

  return (
    <div className="view">
      <div className="view-header">
        <span className="view-eyebrow">Documentación · {experiment.meta.name}</span>
        <h1 className="view-title">Documentación del proyecto</h1>
        <p className="view-sub">Cronogramas, presupuestos y otros adjuntos de referencia — visible solo para Director y Supervisor.</p>
      </div>

      {canManage && (
        <div className="card" style={{ marginBottom: 16 }}>
          <label className="field-label">Categoría</label>
          <div className="target-select" style={{ marginBottom: 12 }}>
            {DOC_CATEGORIES.map((c) => (
              <button key={c} type="button" className={`target-chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>{c}</button>
            ))}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            onChange={(e) => { handleFile(e.target.files[0]); e.target.value = ''; }}
          />
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => fileInputRef.current?.click()}>
            {busy ? 'Subiendo…' : '+ Subir documento'}
          </button>
          {err && <p className="labs-login-error" style={{ marginTop: 8 }}>{err}</p>}
        </div>
      )}

      {experiment.documents.length === 0 && <p className="empty-note">Todavía no hay documentación cargada.</p>}

      {grouped.filter((g) => g.docs.length > 0).map((g) => (
        <div key={g.category} style={{ marginBottom: 18 }}>
          <div className="divider-label"><span>{g.category}</span></div>
          {g.docs.map((d) => {
            const href = d.driveUrl || (d.data ? `data:${d.mimeType};base64,${d.data}` : null);
            return (
              <div className="labs-tenant-row" key={d.id}>
                <div>
                  <div className="labs-tenant-name">
                    {href ? (
                      <a href={href} target="_blank" rel="noreferrer" download={d.driveUrl ? undefined : d.name} style={{ color: 'var(--labs-living)' }}>📁 {d.name} ↗</a>
                    ) : d.name}
                  </div>
                  <div className="labs-tenant-meta">{d.uploadedBy} ({d.uploadedByRole}) · {formatDate(d.createdAt)}</div>
                </div>
                {canManage && <button className="chip-btn" onClick={() => handleDelete(d.id)}>Eliminar</button>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ======================= Cronograma (civil) ======================= */

// Selector de varios responsables por tarea (una tarea puede tener más de uno, ej. "Percy C.
// / Anthony M." en el Excel importado) — botón compacto con los nombres elegidos que abre un
// panel de checkboxes. `roster` opcional: si no viene, lo busca por su cuenta (cualquier
// persona activa del tenant, sin importar el rol — Director, Supervisor o Registrador).
function MultiUserPicker({ tenant, roster: rosterProp, selected, onChange, placeholder = '— Elegir —', warningLabel }) {
  const [fetchedRoster, setFetchedRoster] = useState(null);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const roster = rosterProp ?? fetchedRoster ?? [];

  useEffect(() => {
    if (rosterProp) return;
    fetch(`/api/labs/${tenant}/users`)
      .then((r) => r.json())
      .then((d) => setFetchedRoster((d.users ?? []).filter((u) => u.active !== false)))
      .catch(() => setFetchedRoster([]));
  }, [tenant, rosterProp]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const toggle = (id) => onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  const names = roster.filter((u) => selected.includes(u.id)).map((u) => u.name);
  const hasWarning = !names.length && warningLabel;
  const label = names.length ? names.join(', ') : (warningLabel || placeholder);

  return (
    <div ref={wrapRef} className="labs-multiuser" style={{ position: 'relative' }}>
      <button type="button" className="labs-multiuser-trigger" onClick={() => setOpen((o) => !o)} title={label}>
        <span>{hasWarning ? '⚠' : '👤'} {label}</span><span className="chev">⌄</span>
      </button>
      {open && (
        <div className="labs-multiuser-panel">
          {roster.length === 0 && <p className="empty-note" style={{ padding: 8 }}>Sin equipo.</p>}
          {roster.map((u) => (
            <label key={u.id} className="labs-multiuser-option">
              <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggle(u.id)} />
              <span>{u.name} <span className="dim">({u.role})</span></span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// Rango de fechas como un chip de una sola línea ("11 may → 12 may") que nunca desborda su
// columna — los <input type=date> reales (los que sí necesitan ancho) solo aparecen en un
// popover chiquito al hacer click, en vez de en línea dentro de la fila.
function DateRangePicker({ fechaInicio, fechaFin, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const label = fechaInicio || fechaFin ? `${formatShortDate(fechaInicio)} → ${formatShortDate(fechaFin)}` : 'Sin fechas';
  const duracion = fechaInicio && fechaFin ? daysBetween(fechaInicio, fechaFin) + 1 : null;

  return (
    <div ref={wrapRef} className="labs-multiuser" style={{ position: 'relative' }}>
      <button type="button" className="labs-multiuser-trigger" onClick={() => setOpen((o) => !o)} title={label}>
        <span>📅 {label}</span><span className="chev">⌄</span>
      </button>
      {open && (
        <div className="labs-multiuser-panel excel-date-panel">
          <label className="field-label" style={{ marginBottom: 4 }}>Inicio</label>
          <input type="date" value={fechaInicio || ''} onChange={(e) => onChange({ fechaInicio: e.target.value, fechaFin })} style={{ marginBottom: 10 }} />
          <label className="field-label" style={{ marginBottom: 4 }}>Fin</label>
          <input type="date" value={fechaFin || ''} onChange={(e) => onChange({ fechaInicio, fechaFin: e.target.value })} />
          {duracion != null && <p style={{ fontSize: 11.5, color: 'var(--labs-cream-faint)', margin: '8px 0 0' }}>Duración: {duracion} día{duracion !== 1 ? 's' : ''}</p>}
        </div>
      )}
    </div>
  );
}

// Comentarios sobre una Tarea o Partida puntual — reusa el mismo feedback del proyecto
// (targetType 'tarea'/'partida'), solo que acá se ve como hilo de comentarios de esa fila,
// no en la pestaña Feedback general. Director y Supervisor pueden comentar; Registrador (si
// llega a ver el modal desde su propia tarea) solo lee.
// Mismo mecanismo de adjuntos que ViewAportar (compressImage/readAsBase64/subida resumible de
// video), sin el gate de testId — acá la carpeta de Drive es una sola por proyecto.
async function processFeedbackFile(file, { tenant, experimentId, setAttachments, setErr }) {
  if (!file) return;
  setErr(null);
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  const maxMb = isImage ? 4 : isVideo ? VIDEO_MAX_MB : DOC_MAX_MB;
  if (file.size > maxMb * 1024 * 1024) { setErr(`Archivo demasiado grande (máx ${maxMb} MB).`); return; }
  const id = Math.random().toString(36).slice(2);

  if (isImage) {
    const data = await compressImage(file);
    setAttachments((prev) => [...prev, { id, name: file.name || 'foto.jpg', mimeType: 'image/jpeg', kind: 'image', data, previewUrl: `data:image/jpeg;base64,${data}` }]);
    return;
  }

  if (isVideo) {
    setAttachments((prev) => [...prev, { id, name: file.name, mimeType: file.type, kind: 'video', uploading: true, previewUrl: null }]);
    try {
      const urlRes = await fetch(`/api/labs/${tenant}/experiments/${experimentId}/feedback/video-upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, mimeType: file.type }),
      });
      const urlData = await urlRes.json();
      if (!urlRes.ok) throw new Error(urlData.error || 'No se pudo iniciar la subida.');

      const putRes = await fetch(urlData.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      if (!putRes.ok) throw new Error('No se pudo subir el video.');
      const uploaded = await putRes.json();

      setAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, uploading: false, driveFileId: uploaded.id, driveUrl: uploaded.webViewLink } : a)));
    } catch (e) {
      setErr(e.message || 'No se pudo subir el video.');
      setAttachments((prev) => prev.filter((a) => a.id !== id));
    }
    return;
  }

  const data = await readAsBase64(file);
  setAttachments((prev) => [...prev, { id, name: file.name, mimeType: file.type || 'application/octet-stream', kind: 'document', data, previewUrl: null }]);
}

function CommentAttachment({ att }) {
  const href = att.driveUrl || (att.data ? `data:${att.mimeType};base64,${att.data}` : null);
  return (
    <a href={href || undefined} target="_blank" rel="noreferrer" download={att.driveUrl || !href ? undefined : att.name} className="labs-attach-chip" style={{ textDecoration: 'none', cursor: href ? 'pointer' : 'default' }}>
      {att.kind === 'image' && att.previewUrl
        ? <img src={att.previewUrl} className="labs-attach-thumb" alt={att.name} />
        : <div className="labs-attach-icon">{att.kind === 'video' ? '🎥' : '📄'}</div>}
      <span className="labs-attach-name">{att.name}</span>
    </a>
  );
}

function CommentsModal({ tenant, experimentId, canComment, targetType, targetId, targetLabel, comments, onClose, onUpdate }) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const hasContent = text.trim() || attachments.length > 0;
  const uploading = attachments.some((a) => a.uploading);

  const handleSend = async () => {
    if (!hasContent || busy || uploading) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/labs/${tenant}/experiments/${experimentId}/feedback`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType, targetId, text, visibility: 'Todo el equipo',
          attachments: attachments.map(({ name, mimeType, data, previewUrl, driveFileId, driveUrl, kind }) => ({ name, mimeType, data, previewUrl, driveFileId, driveUrl, kind })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'No se pudo enviar.'); return; }
      setText('');
      setAttachments([]);
      onUpdate();
    } catch {
      setErr('Error de conexión.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ position: 'relative' }}>
        <button className="modal-x" style={{ position: 'absolute', top: 18, right: 18 }} onClick={onClose}>✕</button>
        <span className="eyebrow-mini on-dark">Comentarios</span>
        <h2 style={{ fontFamily: 'var(--labs-serif)', fontSize: 20, fontWeight: 600, margin: '6px 0 16px' }}>{targetLabel}</h2>

        {comments.length === 0 && <p className="empty-note">Todavía no hay comentarios.</p>}
        {comments.map((c) => (
          <div className="feedback-item" key={c.id}>
            <div className="fb-top">
              <div className="fb-who"><span className="recent-avatar" style={{ width: 24, height: 24, fontSize: 10.5 }}>{initials(c.who)}</span>{c.who}{c.whoRole ? ` (${c.whoRole})` : ''}</div>
              <span className="recent-time">{formatDateTime(c.createdAt)}</span>
            </div>
            {c.text && <div className="fb-text">{c.text}</div>}
            {c.attachments?.length > 0 && (
              <div className="labs-attach-strip" style={{ marginTop: 10 }}>
                {c.attachments.map((a, i) => <CommentAttachment att={a} key={i} />)}
              </div>
            )}
          </div>
        ))}

        {canComment && (
          <>
            <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribí un comentario… (o adjuntá evidencia sin texto)" style={{ marginTop: 14 }} />

            <input
              ref={fileInputRef} type="file" accept={EVIDENCE_ACCEPT} multiple style={{ display: 'none' }}
              onChange={(e) => { Array.from(e.target.files).forEach((f) => processFeedbackFile(f, { tenant, experimentId, setAttachments, setErr })); e.target.value = ''; }}
            />
            <input
              ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
              onChange={(e) => { Array.from(e.target.files).forEach((f) => processFeedbackFile(f, { tenant, experimentId, setAttachments, setErr })); e.target.value = ''; }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button type="button" className="labs-attach-btn" onClick={() => fileInputRef.current?.click()}>📎 Adjuntar archivo</button>
              <button type="button" className="labs-attach-btn" onClick={() => cameraInputRef.current?.click()}>📷 Tomar foto</button>
            </div>

            {attachments.length > 0 && (
              <div className="labs-attach-strip">
                {attachments.map((att) => (
                  <div key={att.id} className="labs-attach-chip">
                    {att.previewUrl ? <img src={att.previewUrl} className="labs-attach-thumb" alt={att.name} /> : <div className="labs-attach-icon">{att.kind === 'video' ? '🎥' : '📄'}</div>}
                    <span className="labs-attach-name">{att.uploading ? `Subiendo ${att.name}…` : att.name}</span>
                    <button type="button" className="labs-attach-remove" disabled={att.uploading} onClick={() => setAttachments((p) => p.filter((a) => a.id !== att.id))}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {err && <p className="labs-login-error" style={{ marginTop: 8 }}>{err}</p>}
            <div className="modal-footer">
              <button type="button" className="btn btn-quiet" onClick={onClose}>Cerrar</button>
              <button type="button" className="btn btn-primary" disabled={busy || uploading || !hasContent} onClick={handleSend}>{busy ? 'Enviando…' : 'Comentar →'}</button>
            </div>
          </>
        )}
        {!canComment && (
          <div className="modal-footer">
            <button type="button" className="btn btn-quiet" onClick={onClose}>Cerrar</button>
          </div>
        )}
      </div>
    </div>
  );
}

// Una tarea puede tener cualquier combinación de responsables (Director, Supervisor,
// Registrador). El % de avance lo actualiza cualquiera de sus responsables, o el
// Director/Supervisor del proyecto.
function TaskCommentButton({ count, onClick, small }) {
  const size = small ? 13 : 15;
  return (
    <div className="cron-comment-wrap">
      <button type="button" className="cron-comment-btn" title="Comentarios" onClick={onClick}>
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
          <path d="M3 5.5C3 4.12 4.12 3 5.5 3h9C15.88 3 17 4.12 17 5.5v6c0 1.38-1.12 2.5-2.5 2.5H9l-3.6 3.1c-.4.34-1 .06-1-.46V14h-.9C2.12 14 1 12.88 1 11.5v-6C1 4.12 2.12 3 3.5 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {count > 0 && <span className="cron-comment-badge">{count}</span>}
    </div>
  );
}

function TaskStatusIcon({ status }) {
  if (status === 'saving') {
    return (
      <svg className="cron-spin" width="14" height="14" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="6.2" fill="none" stroke="rgba(63,158,115,0.25)" strokeWidth="1.5" />
        <path d="M14.2 8a6.2 6.2 0 0 0-6.2-6.2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (status === 'done') {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="6.2" fill="currentColor" />
        <path d="M5 8.2l1.9 1.9 4-4.3" fill="none" stroke="var(--labs-dark)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

const TASK_STATUS_LABEL = { pending: 'Pendiente', saving: 'Guardando…', done: 'Terminada' };

function TaskStatusPill({ task, saving, interactive, onToggle, small }) {
  const status = saving ? 'saving' : task.progreso >= 100 ? 'done' : 'pending';
  const clickable = interactive && status !== 'saving';
  const Tag = clickable ? 'button' : 'span';
  return (
    <Tag
      type={clickable ? 'button' : undefined}
      className={`cron-status-pill ${status}${small ? ' small' : ''}${clickable ? '' : ' static'}`}
      onClick={clickable ? onToggle : undefined}
    >
      <TaskStatusIcon status={status} /><span>{TASK_STATUS_LABEL[status]}</span>
    </Tag>
  );
}

function taskStatus(t) {
  // Compatibilidad con tareas creadas antes de que existiera Canvas — no tienen `status`
  // guardado, se infiere de `progreso` (siempre 0 o 100 en tareas viejas).
  return t.status || (t.progreso >= 100 ? 'done' : 'todo');
}

// Compatibilidad con tareas viejas que guardaban un solo `responsable` (string|null) en vez
// de `responsables` (array) — mismo helper que taskResponsables() en lib/labs/experiments.js,
// duplicado acá porque este archivo corre en el browser.
function taskResponsablesArr(t) {
  return Array.isArray(t?.responsables) ? t.responsables : (t?.responsable ? [t.responsable] : []);
}

// Fila de Lista con edición inline (nombre/fase/fechas) y eliminación — solo Director/
// Supervisor del proyecto (mismo permiso que exige el backend). Eliminar pide confirmar con
// un segundo click, sin modal — se resetea si el botón pierde el foco.
function CronRow({ tenant, experimentId, task, nameOf, roster, vencida, saving, canManage, canToggle, onToggleProgreso, commentsCount, onOpenComments, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const openEdit = () => {
    setDraft({ nombre: task.nombre, fase: task.fase || '', fechaInicio: task.fechaInicio || '', fechaFin: task.fechaFin || '', responsables: taskResponsablesArr(task) });
    setEditing(true);
  };

  const save = async () => {
    if (!draft.nombre.trim()) return;
    setBusy(true);
    try {
      await fetch(`/api/labs/${tenant}/experiments/${experimentId}/tasks/${task.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: draft.nombre.trim(), fase: draft.fase, fechaInicio: draft.fechaInicio || null, fechaFin: draft.fechaFin || null, responsables: draft.responsables }),
      });
      setEditing(false);
      onUpdate();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setBusy(true);
    try {
      await fetch(`/api/labs/${tenant}/experiments/${experimentId}/tasks/${task.id}`, { method: 'DELETE' });
      onUpdate();
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <div className="cron-row cron-row-editing">
        <div className="cron-row-edit-form">
          <input className="cron-row-edit-input" value={draft.nombre} onChange={(e) => setDraft((d) => ({ ...d, nombre: e.target.value }))} placeholder="Nombre de la tarea" autoFocus />
          <input className="cron-row-edit-input" value={draft.fase} onChange={(e) => setDraft((d) => ({ ...d, fase: e.target.value }))} placeholder="Fase" />
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="cron-row-edit-input" type="date" value={draft.fechaInicio} onChange={(e) => setDraft((d) => ({ ...d, fechaInicio: e.target.value }))} />
            <input className="cron-row-edit-input" type="date" value={draft.fechaFin} onChange={(e) => setDraft((d) => ({ ...d, fechaFin: e.target.value }))} />
          </div>
          <MultiUserPicker roster={roster} selected={draft.responsables} onChange={(ids) => setDraft((d) => ({ ...d, responsables: ids }))} placeholder="— Sin asignar —" />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" className="chip-btn" onClick={() => setEditing(false)}>Cancelar</button>
            <button type="button" className="btn btn-primary" disabled={busy || !draft.nombre.trim()} onClick={save}>{busy ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cron-row">
      <div className="cron-row-info">
        <div className="cron-row-name">{task.nombre}</div>
        <div className="cron-row-meta">
          <span>{taskResponsablesArr(task).length ? taskResponsablesArr(task).map(nameOf).join(', ') : 'Sin asignar'}</span><span className="dim">·</span>
          <span>{formatShortDate(task.fechaInicio)} → {formatShortDate(task.fechaFin)}</span>
          {vencida && <><span className="dim">·</span><span className="cron-overdue">vencida</span></>}
        </div>
      </div>
      <div className="cron-row-actions">
        <TaskCommentButton count={commentsCount} onClick={onOpenComments} />
        <TaskStatusPill task={task} saving={saving} interactive={canToggle} onToggle={onToggleProgreso} />
        {canManage && (
          <>
            <button type="button" className="cron-icon-btn" title="Editar" disabled={busy} onClick={openEdit}>✎</button>
            <button
              type="button"
              className={`cron-icon-btn${confirmDelete ? ' cron-icon-btn--danger' : ''}`}
              title={confirmDelete ? 'Click de nuevo para confirmar' : 'Eliminar'}
              disabled={busy}
              onClick={remove}
              onBlur={() => setConfirmDelete(false)}
            >
              {confirmDelete ? '✓' : '🗑'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ViewCronograma({ tenant, experiment, identity, onUpdate }) {
  const [users, setUsers] = useState([]);
  const [view, setView] = useState('list'); // 'list' | 'gantt' | 'canvas'
  const [createOpen, setCreateOpen] = useState(false);
  const [savingTaskId, setSavingTaskId] = useState(null);
  const [commentsFor, setCommentsFor] = useState(null); // { id, label } | null
  // Pausado/completado bloquea gestión de verdad (el backend también lo rechaza) — no es
  // solo una etiqueta. canManage sigue siendo "por rol" puro, se usa aparte para mensajes.
  const isActive = (experiment.meta.status || 'activo') === 'activo';
  const canManage = identity.role === 'Director' || experiment.meta.supervisorIds?.includes(identity.id);
  const canManageActive = canManage && isActive;
  const canComment = identity.role === 'Director' || identity.role === 'Supervisor';

  useEffect(() => {
    fetch(`/api/labs/${tenant}/users`)
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []))
      .catch(() => setUsers([]));
  }, [tenant]);

  const nameOf = (id) => users.find((u) => u.id === id)?.name ?? 'Sin asignar';
  const roster = users.filter((u) => u.active !== false);

  const toggleProgreso = async (task) => {
    setSavingTaskId(task.id);
    try {
      await fetch(`/api/labs/${tenant}/experiments/${experiment.meta.id}/tasks/${task.id}/progreso`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progreso: task.progreso >= 100 ? 0 : 100 }),
      });
      onUpdate();
    } finally {
      setSavingTaskId(null);
    }
  };

  const moveTaskStatus = async (task, status) => {
    setSavingTaskId(task.id);
    try {
      await fetch(`/api/labs/${tenant}/experiments/${experiment.meta.id}/tasks/${task.id}/status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      onUpdate();
    } finally {
      setSavingTaskId(null);
    }
  };

  const canTogglePorTask = (task) => isActive && (canManage || taskResponsablesArr(task).includes(identity.id));
  const commentsOf = (taskId) => experiment.feedback.filter((f) => f.targetType === 'tarea' && f.targetId === taskId);
  const now = Date.now();
  const isVencida = (t) => t.progreso < 100 && t.fechaFin && new Date(t.fechaFin).getTime() < now;

  const grouped = [];
  for (const t of experiment.tasks) {
    const key = t.fase || 'Sin fase';
    let g = grouped.find((x) => x.fase === key);
    if (!g) { g = { fase: key, tasks: [] }; grouped.push(g); }
    g.tasks.push(t);
  }

  const openComments = (t) => setCommentsFor({ id: t.id, label: t.nombre });

  return (
    <div className={`view${view === 'gantt' || view === 'canvas' ? ' view-wide' : ''}`}>
      <div className="view-header">
        <span className="view-eyebrow">Cronograma · {experiment.meta.name}</span>
        <div className="cron-title-row">
          <h1 className="view-title">Tareas</h1>
          {experiment.tasks.length > 0 && (
            <div className="cron-view-toggle">
              <button type="button" className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>Lista</button>
              <button type="button" className={view === 'gantt' ? 'active' : ''} onClick={() => setView('gantt')}>Cronograma</button>
              <button type="button" className={view === 'canvas' ? 'active' : ''} onClick={() => setView('canvas')}>Canvas</button>
            </div>
          )}
        </div>
        <p className="view-sub">
          {view === 'list' && 'Agrupadas por fase. El % de avance lo actualiza el responsable, o Director/Supervisor.'}
          {view === 'gantt' && 'Barras posicionadas por fecha de inicio y fin. Haz clic en el control de la derecha para marcar una tarea como terminada.'}
          {view === 'canvas' && 'Por hacer, Haciendo, Terminado — movela con las flechas de la tarjeta.'}
        </p>
      </div>

      {!isActive && (
        <p className="cron-inactive-note">
          {projectInactiveMessage(experiment.meta)}
        </p>
      )}

      {canManageActive && (
        <button className="btn btn-primary" style={{ marginBottom: 16 }} onClick={() => setCreateOpen(true)}>+ Nueva tarea</button>
      )}

      {experiment.tasks.length === 0 && <p className="empty-note">Todavía no hay tareas cargadas.</p>}

      {experiment.tasks.length > 0 && view === 'list' && (
        <div className="cron-list">
          {grouped.map((g) => (
            <div key={g.fase} style={{ marginBottom: 20 }}>
              <div className="divider-label"><span>{g.fase}</span></div>
              {g.tasks.map((t) => (
                <CronRow
                  key={t.id}
                  tenant={tenant}
                  experimentId={experiment.meta.id}
                  task={t}
                  nameOf={nameOf}
                  roster={roster}
                  vencida={isVencida(t)}
                  saving={savingTaskId === t.id}
                  canManage={canManageActive}
                  canToggle={canTogglePorTask(t)}
                  onToggleProgreso={() => toggleProgreso(t)}
                  commentsCount={commentsOf(t.id).length}
                  onOpenComments={() => openComments(t)}
                  onUpdate={onUpdate}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {experiment.tasks.length > 0 && view === 'gantt' && (
        <CronogramaGantt
          grouped={grouped}
          nameOf={nameOf}
          isVencida={isVencida}
          savingTaskId={savingTaskId}
          canTogglePorTask={canTogglePorTask}
          onToggle={toggleProgreso}
          commentsOf={commentsOf}
          onOpenComments={openComments}
        />
      )}

      {experiment.tasks.length > 0 && view === 'canvas' && (
        <CronogramaCanvas
          tasks={experiment.tasks}
          nameOf={nameOf}
          savingTaskId={savingTaskId}
          canTogglePorTask={canTogglePorTask}
          onMove={moveTaskStatus}
          commentsOf={commentsOf}
          onOpenComments={openComments}
        />
      )}

      {createOpen && (
        <CreateTaskModal
          tenant={tenant}
          experimentId={experiment.meta.id}
          onClose={() => setCreateOpen(false)}
          onCreated={() => { setCreateOpen(false); onUpdate(); }}
        />
      )}

      {commentsFor && (
        <CommentsModal
          tenant={tenant}
          experimentId={experiment.meta.id}
          identity={identity}
          canComment={canComment}
          targetType="tarea"
          targetId={commentsFor.id}
          targetLabel={commentsFor.label}
          comments={commentsOf(commentsFor.id)}
          onClose={() => setCommentsFor(null)}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
}

const GANTT_PX_PER_DAY = 34;
const GANTT_MIN_TRACK = 420;
const GANTT_INFO_WIDTH = 220;

function CronogramaGantt({ grouped, nameOf, isVencida, savingTaskId, canTogglePorTask, onToggle, commentsOf, onOpenComments }) {
  const withDates = grouped.flatMap((g) => g.tasks).filter((t) => t.fechaInicio && t.fechaFin);
  if (withDates.length === 0) {
    return <p className="empty-note">Ninguna tarea tiene fecha de inicio y fin cargadas todavía — usa la vista Lista o edítalas para ver el cronograma.</p>;
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
    const iso = date.toISOString().slice(0, 10);
    ticks.push({ left: d * GANTT_PX_PER_DAY, label: formatShortDate(iso) });
  }

  return (
    <div className="cron-gantt-scroll">
      <div className="cron-gantt-wrap" style={{ width: GANTT_INFO_WIDTH + trackWidth + 190 }}>
        <div className="cron-gantt-grid" style={{ left: GANTT_INFO_WIDTH, width: trackWidth }}>
          {ticks.map((tk) => <div key={tk.left} style={{ left: tk.left }} />)}
        </div>
        <div className="cron-gantt-axisrow">
          <div className="cron-gantt-corner" style={{ width: GANTT_INFO_WIDTH, flexShrink: 0 }} />
          <div className="cron-gantt-axis" style={{ width: trackWidth }}>
            {ticks.map((tk) => <span key={tk.left} style={{ left: Math.max(0, tk.left - 13) }}>{tk.label}</span>)}
          </div>
        </div>

        {grouped.map((g) => (
          <div key={g.fase}>
            <div className="divider-label"><span>{g.fase}</span></div>
            {g.tasks.map((t) => {
              const hasDates = t.fechaInicio && t.fechaFin;
              const vencida = isVencida(t);
              const saving = savingTaskId === t.id;
              const status = saving ? 'saving' : t.progreso >= 100 ? 'done' : vencida ? 'overdue' : 'pending';
              const barLeft = hasDates ? Math.max(0, daysBetween(domainStart, t.fechaInicio)) * GANTT_PX_PER_DAY : 0;
              const barWidth = hasDates ? Math.max(GANTT_PX_PER_DAY * 0.7, (daysBetween(t.fechaInicio, t.fechaFin) + 1) * GANTT_PX_PER_DAY) : 0;
              const showLabel = barWidth >= 78;
              return (
                <div className="cron-gantt-row" key={t.id}>
                  <div className="cron-gantt-info" style={{ width: GANTT_INFO_WIDTH }}>
                    <div className="cron-row-name">{t.nombre}</div>
                    <div className="cron-gantt-assignee">{taskResponsablesArr(t).length ? taskResponsablesArr(t).map(nameOf).join(', ') : 'Sin asignar'}</div>
                  </div>
                  <div className="cron-gantt-track" style={{ width: trackWidth }}>
                    {hasDates ? (
                      <div className={`cron-gantt-bar ${status}`} style={{ left: barLeft, width: barWidth }} title={`${formatShortDate(t.fechaInicio)} → ${formatShortDate(t.fechaFin)}`}>
                        {status === 'done' && (
                          <svg width="12" height="12" viewBox="0 0 16 16"><path d="M3.5 8.5l2.8 2.8L12.5 5" fill="none" stroke="var(--labs-dark)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        )}
                        {showLabel && <span>{TASK_STATUS_LABEL[status] || (vencida ? 'Vencida' : 'Pendiente')}</span>}
                      </div>
                    ) : (
                      <span className="cron-gantt-nodate">Sin fechas</span>
                    )}
                  </div>
                  <div className="cron-gantt-actions">
                    <TaskCommentButton count={commentsOf(t.id).length} onClick={() => onOpenComments(t)} small />
                    <TaskStatusPill task={t} saving={saving} interactive={canTogglePorTask(t)} onToggle={() => onToggle(t)} small />
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

const CANVAS_COLUMNS = [
  { id: 'todo', label: 'Por hacer' },
  { id: 'doing', label: 'Haciendo' },
  { id: 'done', label: 'Terminado' },
];

// Sin drag&drop (no hay librería de eso en este codebase) — mover una tarjeta es click en
// ← o → a la columna vecina, alcanza para un tablero de 3 columnas.
function CronogramaCanvas({ tasks, nameOf, savingTaskId, canTogglePorTask, onMove, commentsOf, onOpenComments }) {
  const now = Date.now();
  return (
    <div className="cron-canvas">
      {CANVAS_COLUMNS.map((col, colIdx) => {
        const colTasks = tasks.filter((t) => taskStatus(t) === col.id);
        return (
          <div className="cron-canvas-col" key={col.id}>
            <div className="cron-canvas-col-head">
              <span>{col.label}</span>
              <span className="cron-canvas-col-count">{colTasks.length}</span>
            </div>
            {colTasks.length === 0 && <p className="empty-note" style={{ padding: '4px 2px' }}>—</p>}
            {colTasks.map((t) => {
              const saving = savingTaskId === t.id;
              const vencida = col.id !== 'done' && t.fechaFin && new Date(t.fechaFin).getTime() < now;
              const canMove = canTogglePorTask(t);
              return (
                <div className={`cron-canvas-card${saving ? ' saving' : ''}`} key={t.id}>
                  {t.fase && <span className="cron-canvas-card-fase">{t.fase}</span>}
                  <div className="cron-canvas-card-name">{t.nombre}</div>
                  <div className="cron-canvas-card-meta">
                    {taskResponsablesArr(t).length ? taskResponsablesArr(t).map(nameOf).join(', ') : 'Sin asignar'}
                    {t.fechaFin && <><span className="dim"> · </span><span className={vencida ? 'cron-overdue' : ''}>{formatShortDate(t.fechaFin)}</span></>}
                  </div>
                  <div className="cron-canvas-card-actions">
                    <TaskCommentButton count={commentsOf(t.id).length} onClick={() => onOpenComments(t)} small />
                    {canMove && (
                      <div className="cron-canvas-move">
                        {saving ? (
                          <TaskStatusIcon status="saving" />
                        ) : (
                          <>
                            <button type="button" disabled={colIdx === 0} title="Mover atrás" onClick={() => onMove(t, CANVAS_COLUMNS[colIdx - 1].id)}>←</button>
                            <button type="button" disabled={colIdx === CANVAS_COLUMNS.length - 1} title="Mover adelante" onClick={() => onMove(t, CANVAS_COLUMNS[colIdx + 1].id)}>→</button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function CreateTaskModal({ tenant, experimentId, onClose, onCreated }) {
  const [fase, setFase] = useState('');
  const [nombre, setNombre] = useState('');
  const [responsableIds, setResponsableIds] = useState([]);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!nombre.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/labs/${tenant}/experiments/${experimentId}/tasks`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fase, nombre, responsables: responsableIds, fechaInicio: fechaInicio || null, fechaFin: fechaFin || null }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'No se pudo crear.'); return; }
      onCreated();
    } catch {
      setErr('Error de conexión.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ position: 'relative' }}>
        <button className="modal-x" style={{ position: 'absolute', top: 18, right: 18 }} onClick={onClose}>✕</button>
        <span className="eyebrow-mini on-dark">Nueva tarea</span>
        <h2 style={{ fontFamily: 'var(--labs-serif)', fontSize: 22, fontWeight: 600, margin: '6px 0 16px' }}>Cronograma</h2>
        <form onSubmit={handleCreate}>
          <label className="field-label">Fase</label>
          <input type="text" value={fase} onChange={(e) => setFase(e.target.value)} style={{ marginBottom: 14 }} />
          <label className="field-label">Nombre de la tarea</label>
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} style={{ marginBottom: 14 }} required />
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label className="field-label">Fecha inicio</label>
              <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="field-label">Fecha fin</label>
              <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            </div>
          </div>
          <label className="field-label">Responsables</label>
          <div style={{ marginBottom: 14 }}>
            <MultiUserPicker tenant={tenant} selected={responsableIds} onChange={setResponsableIds} placeholder="— Sin asignar —" />
          </div>
          {err && <p className="labs-login-error" style={{ marginTop: 10 }}>{err}</p>}
          <div className="modal-footer">
            <button type="button" className="btn btn-quiet" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Creando…' : 'Crear tarea →'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ======================= Presupuesto (civil) ======================= */

// "Ejecutado" ya no se edita acá — es la suma de los gastos de la partida (cada uno con su
// factura de respaldo), cargados desde el modal de Gastos.
function PartidaRow({ partida, gastosCount, commentsCount, canManage, onOpenComments, onOpenGastos, onEdit }) {
  const pct = partida.importe ? Math.round((partida.ejecutado / partida.importe) * 100) : 0;
  const sobrecosto = partida.importe > 0 && partida.ejecutado > partida.importe;

  return (
    <div className="labs-tenant-row">
      <div>
        <div className="labs-tenant-name">{partida.descripcion}</div>
        <div className="labs-tenant-meta">
          {partida.cantidad ?? '—'} {partida.unidad} · {partida.importe.toLocaleString('es-PE')} presupuestado
          {sobrecosto && <span style={{ color: '#E19680', marginLeft: 6 }}>· sobrecosto</span>}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {canManage && <button className="chip-btn" onClick={onEdit}>✎ Editar</button>}
        <button className="chip-btn" onClick={onOpenComments}>💬 Comentarios{commentsCount ? ` (${commentsCount})` : ''}</button>
        <button className="chip-btn" onClick={onOpenGastos}>🧾 Gastos{gastosCount ? ` (${gastosCount})` : ''} — {partida.ejecutado.toLocaleString('es-PE')}</button>
        <span className={`tag ${sobrecosto ? 'tag-alert' : 'tag-neutral'}`}>{pct}%</span>
      </div>
    </div>
  );
}

function GastosModal({ tenant, experimentId, partidaId, partidaLabel, gastos, canManage, onClose, onUpdate }) {
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [proveedor, setProveedor] = useState('');
  const [nota, setNota] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const fileInputRef = useRef(null);

  const uploading = attachments.some((a) => a.uploading);
  const total = gastos.reduce((s, g) => s + (g.monto || 0), 0);
  const montoNum = Number(monto);

  const handleAdd = async () => {
    if (!montoNum || montoNum <= 0 || busy || uploading) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/labs/${tenant}/experiments/${experimentId}/partidas/${partidaId}/gastos`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto: montoNum, fecha, proveedor, nota,
          attachments: attachments.map(({ name, mimeType, data, previewUrl, driveFileId, driveUrl, kind }) => ({ name, mimeType, data, previewUrl, driveFileId, driveUrl, kind })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'No se pudo agregar el gasto.'); return; }
      setMonto(''); setProveedor(''); setNota(''); setAttachments([]);
      onUpdate();
    } catch {
      setErr('Error de conexión.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (gastoId) => {
    if (confirmDeleteId !== gastoId) { setConfirmDeleteId(gastoId); return; }
    await fetch(`/api/labs/${tenant}/experiments/${experimentId}/partidas/${partidaId}/gastos/${gastoId}`, { method: 'DELETE' });
    setConfirmDeleteId(null);
    onUpdate();
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ position: 'relative' }}>
        <button className="modal-x" style={{ position: 'absolute', top: 18, right: 18 }} onClick={onClose}>✕</button>
        <span className="eyebrow-mini on-dark">Gastos</span>
        <h2 style={{ fontFamily: 'var(--labs-serif)', fontSize: 20, fontWeight: 600, margin: '6px 0 4px' }}>{partidaLabel}</h2>
        <p style={{ fontSize: 13, color: 'var(--labs-cream-dim)', marginBottom: 16 }}>Total ejecutado: <b style={{ color: 'var(--labs-cream)' }}>{total.toLocaleString('es-PE')}</b></p>

        {gastos.length === 0 && <p className="empty-note">Todavía no hay gastos cargados.</p>}
        {gastos.map((g) => (
          <div className="feedback-item" key={g.id}>
            <div className="fb-top">
              <div className="fb-who">
                <span className="recent-avatar" style={{ width: 24, height: 24, fontSize: 10.5 }}>{initials(g.createdBy)}</span>
                {g.createdBy}{g.imported ? ' · importado' : ''}
              </div>
              <span className="recent-time">{formatDate(g.fecha)}</span>
            </div>
            <div className="fb-text"><b>{g.monto.toLocaleString('es-PE')}</b>{g.proveedor ? ` — ${g.proveedor}` : ''}{g.nota ? ` — ${g.nota}` : ''}</div>
            {g.attachments?.length > 0 ? (
              <div className="labs-attach-strip" style={{ marginTop: 10 }}>
                {g.attachments.map((a, i) => <CommentAttachment att={a} key={i} />)}
              </div>
            ) : (
              <p style={{ fontSize: 11.5, color: 'var(--labs-cream-faint)', marginTop: 6 }}>Sin factura adjunta.</p>
            )}
            {canManage && (
              <button
                type="button" className="chip-btn" style={{ marginTop: 8, ...(confirmDeleteId === g.id ? { borderColor: '#E19680', color: '#E19680' } : null) }}
                onClick={() => handleDelete(g.id)}
              >
                {confirmDeleteId === g.id ? '¿Confirmar borrado?' : 'Eliminar'}
              </button>
            )}
          </div>
        ))}

        {canManage && (
          <>
            <div className="divider-label" style={{ marginTop: 18 }}><span>Agregar gasto</span></div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input type="number" placeholder="Monto" value={monto} onChange={(e) => setMonto(e.target.value)} style={{ flex: 1, minWidth: 100 }} />
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              <input type="text" placeholder="Proveedor (opcional)" value={proveedor} onChange={(e) => setProveedor(e.target.value)} style={{ flex: 1, minWidth: 140 }} />
            </div>
            <textarea rows={2} placeholder="Nota (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} style={{ marginTop: 10 }} />

            <input
              ref={fileInputRef} type="file" accept={INVOICE_ACCEPT} style={{ display: 'none' }}
              onChange={(e) => { Array.from(e.target.files).forEach((f) => processFeedbackFile(f, { tenant, experimentId, setAttachments, setErr })); e.target.value = ''; }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button type="button" className="labs-attach-btn" onClick={() => fileInputRef.current?.click()}>📎 Adjuntar factura (opcional)</button>
            </div>

            {attachments.length > 0 && (
              <div className="labs-attach-strip">
                {attachments.map((att) => (
                  <div key={att.id} className="labs-attach-chip">
                    {att.previewUrl ? <img src={att.previewUrl} className="labs-attach-thumb" alt={att.name} /> : <div className="labs-attach-icon">📄</div>}
                    <span className="labs-attach-name">{att.name}</span>
                    <button type="button" className="labs-attach-remove" onClick={() => setAttachments((p) => p.filter((a) => a.id !== att.id))}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {err && <p className="labs-login-error" style={{ marginTop: 8 }}>{err}</p>}
            <div className="modal-footer">
              <button type="button" className="btn btn-quiet" onClick={onClose}>Cerrar</button>
              <button type="button" className="btn btn-primary" disabled={busy || uploading || !montoNum || montoNum <= 0} onClick={handleAdd}>{busy ? 'Guardando…' : 'Agregar gasto →'}</button>
            </div>
          </>
        )}
        {!canManage && (
          <div className="modal-footer">
            <button type="button" className="btn btn-quiet" onClick={onClose}>Cerrar</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ViewPresupuesto({ tenant, experiment, identity, onUpdate }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingPartida, setEditingPartida] = useState(null); // partida | null
  const [commentsFor, setCommentsFor] = useState(null); // { id, label } | null
  const [gastosFor, setGastosFor] = useState(null); // { id, label } | null
  const [allGastosOpen, setAllGastosOpen] = useState(false);
  const canManage = identity.role === 'Director' || experiment.meta.supervisorIds?.includes(identity.id);
  const canComment = identity.role === 'Director' || identity.role === 'Supervisor';
  const isActive = (experiment.meta.status || 'activo') === 'activo';
  const canManageActive = canManage && isActive;

  const grouped = [];
  for (const p of experiment.partidas) {
    const key = p.etapa || 'Sin etapa';
    let g = grouped.find((x) => x.etapa === key);
    if (!g) { g = { etapa: key, partidas: [] }; grouped.push(g); }
    g.partidas.push(p);
  }

  const totalImporte = experiment.civilMetrics?.totalImporte ?? 0;
  const totalEjecutado = experiment.civilMetrics?.totalEjecutado ?? 0;
  const totalImportePlanificado = experiment.civilMetrics?.totalImportePlanificado ?? 0;
  const totalImporteAgregado = experiment.civilMetrics?.totalImporteAgregado ?? 0;
  const totalEjecutadoPlanificado = experiment.civilMetrics?.totalEjecutadoPlanificado ?? 0;
  const totalEjecutadoAgregado = experiment.civilMetrics?.totalEjecutadoAgregado ?? 0;
  const commentsOf = (partidaId) => experiment.feedback.filter((f) => f.targetType === 'partida' && f.targetId === partidaId);
  const gastosOf = (partidaId) => (experiment.gastos ?? []).filter((g) => g.partidaId === partidaId);
  const partidaLabelOf = (partidaId) => experiment.partidas.find((p) => p.id === partidaId)?.descripcion ?? 'Partida eliminada';

  return (
    <div className="view">
      <div className="view-header">
        <span className="view-eyebrow">Presupuesto · {experiment.meta.name}</span>
        <h1 className="view-title">Partidas</h1>
        <p className="view-sub">Agrupadas por etapa. El % de adquisición se calcula solo.</p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13 }}>
          <div><b style={{ color: 'var(--labs-cream)' }}>{totalImporte.toLocaleString('es-PE', { maximumFractionDigits: 2 })}</b> presupuestado</div>
          <div><b style={{ color: 'var(--labs-cream)' }}>{totalEjecutado.toLocaleString('es-PE', { maximumFractionDigits: 2 })}</b> ejecutado</div>
          <div><b style={{ color: 'var(--labs-living)' }}>{experiment.civilMetrics?.pctFinanciero ?? 0}%</b> de avance financiero</div>
        </div>
        {totalImporteAgregado > 0 && (
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 11.5, color: 'var(--labs-cream-faint)', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--labs-line-dark)' }}>
            <div>Planificado: <b style={{ color: 'var(--labs-cream-dim)' }}>{totalImportePlanificado.toLocaleString('es-PE', { maximumFractionDigits: 2 })}</b> presupuestado · <b style={{ color: 'var(--labs-cream-dim)' }}>{totalEjecutadoPlanificado.toLocaleString('es-PE', { maximumFractionDigits: 2 })}</b> ejecutado</div>
            <div>Agregado después: <b style={{ color: 'var(--labs-cream-dim)' }}>{totalImporteAgregado.toLocaleString('es-PE', { maximumFractionDigits: 2 })}</b> presupuestado · <b style={{ color: 'var(--labs-cream-dim)' }}>{totalEjecutadoAgregado.toLocaleString('es-PE', { maximumFractionDigits: 2 })}</b> ejecutado</div>
          </div>
        )}
      </div>

      {!isActive && (
        <p className="cron-inactive-note">
          {projectInactiveMessage(experiment.meta)}
        </p>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {canManageActive && (
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>+ Nueva partida</button>
        )}
        {(experiment.gastos ?? []).length > 0 && (
          <button className="chip-btn" onClick={() => setAllGastosOpen(true)}>🧾 Ver todos los gastos ({experiment.gastos.length})</button>
        )}
      </div>

      {experiment.partidas.length === 0 && <p className="empty-note">Todavía no hay partidas cargadas.</p>}

      {grouped.map((g) => (
        <div key={g.etapa} style={{ marginBottom: 20 }}>
          <div className="divider-label"><span>{g.etapa}</span></div>
          {g.partidas.map((p) => (
            <PartidaRow
              key={p.id}
              partida={p}
              gastosCount={gastosOf(p.id).length}
              commentsCount={commentsOf(p.id).length}
              canManage={canManageActive}
              onOpenComments={() => setCommentsFor({ id: p.id, label: p.descripcion })}
              onOpenGastos={() => setGastosFor({ id: p.id, label: p.descripcion })}
              onEdit={() => setEditingPartida(p)}
            />
          ))}
        </div>
      ))}

      {createOpen && (
        <CreatePartidaModal
          tenant={tenant}
          experimentId={experiment.meta.id}
          onClose={() => setCreateOpen(false)}
          onCreated={() => { setCreateOpen(false); onUpdate(); }}
        />
      )}

      {editingPartida && (
        <CreatePartidaModal
          tenant={tenant}
          experimentId={experiment.meta.id}
          partida={editingPartida}
          onClose={() => setEditingPartida(null)}
          onCreated={() => { setEditingPartida(null); onUpdate(); }}
        />
      )}

      {commentsFor && (
        <CommentsModal
          tenant={tenant}
          experimentId={experiment.meta.id}
          identity={identity}
          canComment={canComment}
          targetType="partida"
          targetId={commentsFor.id}
          targetLabel={commentsFor.label}
          comments={commentsOf(commentsFor.id)}
          onClose={() => setCommentsFor(null)}
          onUpdate={onUpdate}
        />
      )}

      {gastosFor && (
        <GastosModal
          tenant={tenant}
          experimentId={experiment.meta.id}
          partidaId={gastosFor.id}
          partidaLabel={gastosFor.label}
          gastos={gastosOf(gastosFor.id)}
          canManage={canManageActive}
          onClose={() => setGastosFor(null)}
          onUpdate={onUpdate}
        />
      )}

      {allGastosOpen && (
        <AllGastosModal
          gastos={experiment.gastos ?? []}
          partidaLabelOf={partidaLabelOf}
          onClose={() => setAllGastosOpen(false)}
        />
      )}
    </div>
  );
}

// Vista consolidada, de solo lectura — todos los gastos del proyecto en un mismo lugar (con
// sus facturas), sin importar de qué partida son. Editar/borrar sigue siendo por partida
// (GastosModal), acá es para auditar de un vistazo.
function AllGastosModal({ gastos, partidaLabelOf, onClose }) {
  const sorted = [...gastos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  const total = gastos.reduce((s, g) => s + (g.monto || 0), 0);

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ position: 'relative' }}>
        <button className="modal-x" style={{ position: 'absolute', top: 18, right: 18 }} onClick={onClose}>✕</button>
        <span className="eyebrow-mini on-dark">Gastos del proyecto</span>
        <h2 style={{ fontFamily: 'var(--labs-serif)', fontSize: 20, fontWeight: 600, margin: '6px 0 4px' }}>Todos los gastos</h2>
        <p style={{ fontSize: 13, color: 'var(--labs-cream-dim)', marginBottom: 16 }}>{gastos.length} gasto{gastos.length !== 1 ? 's' : ''} · Total: <b style={{ color: 'var(--labs-cream)' }}>{total.toLocaleString('es-PE')}</b></p>

        {sorted.length === 0 && <p className="empty-note">Todavía no hay gastos cargados.</p>}
        {sorted.map((g) => (
          <div className="feedback-item" key={g.id}>
            <div className="fb-top">
              <div className="fb-who">
                <span className="recent-avatar" style={{ width: 24, height: 24, fontSize: 10.5 }}>{initials(g.createdBy)}</span>
                {g.createdBy}{g.imported ? ' · importado' : ''}
              </div>
              <span className="recent-time">{formatDate(g.fecha)}</span>
            </div>
            <div className="fb-text">
              <b>{g.monto.toLocaleString('es-PE')}</b> — {partidaLabelOf(g.partidaId)}
              {g.proveedor ? ` — ${g.proveedor}` : ''}{g.nota ? ` — ${g.nota}` : ''}
            </div>
            {g.attachments?.length > 0 ? (
              <div className="labs-attach-strip" style={{ marginTop: 10 }}>
                {g.attachments.map((a, i) => <CommentAttachment att={a} key={i} />)}
              </div>
            ) : (
              <p style={{ fontSize: 11.5, color: 'var(--labs-cream-faint)', marginTop: 6 }}>Sin factura adjunta.</p>
            )}
          </div>
        ))}

        <div className="modal-footer">
          <button type="button" className="btn btn-quiet" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// Sirve tanto para crear como para editar: si viene `partida`, precarga sus valores y hace
// PATCH a esa partida en vez de POST de una nueva.
function CreatePartidaModal({ tenant, experimentId, partida, onClose, onCreated }) {
  const isEdit = !!partida;
  const [etapa, setEtapa] = useState(partida?.etapa ?? '');
  const [descripcion, setDescripcion] = useState(partida?.descripcion ?? '');
  const [cantidad, setCantidad] = useState(partida?.cantidad ?? '');
  const [unidad, setUnidad] = useState(partida?.unidad ?? '');
  const [precioUnitario, setPrecioUnitario] = useState(partida?.precioUnitario ?? '');
  const [proveedor, setProveedor] = useState(partida?.proveedor ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!descripcion.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const url = isEdit
        ? `/api/labs/${tenant}/experiments/${experimentId}/partidas/${partida.id}`
        : `/api/labs/${tenant}/experiments/${experimentId}/partidas`;
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etapa, descripcion, cantidad, unidad, precioUnitario, proveedor }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || (isEdit ? 'No se pudo guardar.' : 'No se pudo crear.')); return; }
      onCreated();
    } catch {
      setErr('Error de conexión.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ position: 'relative' }}>
        <button className="modal-x" style={{ position: 'absolute', top: 18, right: 18 }} onClick={onClose}>✕</button>
        <span className="eyebrow-mini on-dark">{isEdit ? 'Editar partida' : 'Nueva partida'}</span>
        <h2 style={{ fontFamily: 'var(--labs-serif)', fontSize: 22, fontWeight: 600, margin: '6px 0 16px' }}>Presupuesto</h2>
        <form onSubmit={handleSubmit}>
          <label className="field-label">Etapa</label>
          <input type="text" value={etapa} onChange={(e) => setEtapa(e.target.value)} style={{ marginBottom: 14 }} />
          <label className="field-label">Descripción</label>
          <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} style={{ marginBottom: 14 }} required />
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <input type="number" placeholder="Cantidad" value={cantidad} onChange={(e) => setCantidad(e.target.value)} style={{ flex: 1 }} />
            <input type="text" placeholder="Unidad" value={unidad} onChange={(e) => setUnidad(e.target.value)} style={{ flex: 1 }} />
            <input type="number" placeholder="Precio unit." value={precioUnitario} onChange={(e) => setPrecioUnitario(e.target.value)} style={{ flex: 1 }} />
          </div>
          <label className="field-label">Proveedor (opcional)</label>
          <input type="text" value={proveedor} onChange={(e) => setProveedor(e.target.value)} style={{ marginBottom: 14 }} />
          {err && <p className="labs-login-error" style={{ marginTop: 10 }}>{err}</p>}
          <div className="modal-footer">
            <button type="button" className="btn btn-quiet" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? (isEdit ? 'Guardando…' : 'Creando…') : (isEdit ? 'Guardar cambios →' : 'Crear partida →')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ======================= Pruebas ======================= */

function ViewPruebas({ tenant, experiment, identity, onUpdate }) {
  const [openTest, setOpenTest] = useState(experiment.tests[0]?.id ?? null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editSupervisorsOpen, setEditSupervisorsOpen] = useState(false);
  const [editRegistradoresOf, setEditRegistradoresOf] = useState(null); // testId o null
  const [users, setUsers] = useState([]);
  const canCreateTest = identity.role === 'Director' || experiment.meta.supervisorIds?.includes(identity.id);

  useEffect(() => {
    fetch(`/api/labs/${tenant}/users`)
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []))
      .catch(() => setUsers([]));
  }, [tenant]);

  const nameOf = (id) => users.find((u) => u.id === id)?.name ?? '(persona eliminada)';

  return (
    <div className="view">
      <div className="view-header">
        <span className="view-eyebrow">Pruebas · {experiment.meta.name}</span>
        <h1 className="view-title">Pruebas y ejecuciones</h1>
        <p className="view-sub">Cada prueba es un formato repetible con su propio esquema de campos.</p>
      </div>

      {identity.role === 'Director' && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13, color: 'var(--labs-cream-dim)' }}>
              <b style={{ color: 'var(--labs-cream)' }}>Supervisores del proyecto:</b>{' '}
              {experiment.meta.supervisorIds?.length ? experiment.meta.supervisorIds.map(nameOf).join(', ') : 'ninguno asignado'}
            </div>
            <button className="chip-btn" onClick={() => setEditSupervisorsOpen(true)}>Editar</button>
          </div>
        </div>
      )}

      {canCreateTest && (
        <button className="btn btn-primary" style={{ marginBottom: 16 }} onClick={() => setCreateOpen(true)}>+ Nueva prueba</button>
      )}

      {experiment.tests.length === 0 && <p className="empty-note">Todavía no hay pruebas creadas.</p>}
      {experiment.tests.map((t) => {
        const execs = experiment.executions.filter((e) => e.testId === t.id);
        const isOpen = openTest === t.id;
        return (
          <div className={`test-card ${isOpen ? 'open' : ''}`} key={t.id}>
            <button className="test-head" style={{ width: '100%', background: 'none', border: 'none', color: 'inherit' }} onClick={() => setOpenTest(isOpen ? null : t.id)}>
              <div className="test-head-left">
                <div className="test-ic">{t.icon}</div>
                <div><div className="test-name">{t.name}</div><div className="test-meta">{execs.length} ejecuciones</div></div>
              </div>
              <span className="chev">⌄</span>
            </button>
            {canCreateTest && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '0 18px 12px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: 12, color: 'var(--labs-cream-faint)' }}>
                  Registradores: {t.registradorIds?.length ? t.registradorIds.map(nameOf).join(', ') : 'ninguno asignado'}
                </div>
                <button type="button" className="chip-btn" onClick={() => setEditRegistradoresOf(t.id)}>Editar</button>
              </div>
            )}
            <div className="exec-list">
              {execs.map((e) => (
                <div className="exec-row" key={e.id}>
                  <div className="exec-date">{formatDate(e.createdAt)}</div>
                  <div className="exec-detail">
                    <b>{e.contributor}</b> ({e.role}) — {t.fields.map((f) => `${f.label}: ${e.values[f.key] ?? '—'}`).join(' · ')}
                    {e.note && <div style={{ marginTop: 3, color: 'var(--labs-cream-faint)' }}>{e.note}</div>}
                    {e.validatedBy && <div style={{ marginTop: 3, color: 'var(--labs-living)', fontSize: 11.5 }}>✓ validado por {e.validatedBy}</div>}
                    {e.evidence?.some((a) => a.driveUrl) && (
                      <div style={{ marginTop: 3, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {e.evidence.filter((a) => a.driveUrl).map((a, i) => (
                          <a key={i} href={a.driveUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--labs-living)' }}>📁 {a.name} ↗</a>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                    <span className={`tag ${tagClass(e.tag)}`}>{e.tag}</span>
                    {identity.role !== 'Registrador' && !e.validatedBy && (
                      <ValidateButton tenant={tenant} experimentId={experiment.meta.id} executionId={e.id} by={identity.name} onDone={onUpdate} />
                    )}
                  </div>
                </div>
              ))}
              {execs.length === 0 && <div style={{ padding: '13px 18px', fontSize: 12.5, color: 'var(--labs-cream-faint)' }}>Sin ejecuciones todavía.</div>}
            </div>
          </div>
        );
      })}

      {createOpen && <CreateTestModal tenant={tenant} experimentId={experiment.meta.id} successCriteria={experiment.meta.successCriteria} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); onUpdate(); }} />}
      {editSupervisorsOpen && (
        <EditSupervisorsModal
          tenant={tenant}
          experimentId={experiment.meta.id}
          current={experiment.meta.supervisorIds ?? []}
          onClose={() => setEditSupervisorsOpen(false)}
          onSaved={() => { setEditSupervisorsOpen(false); onUpdate(); }}
        />
      )}
      {editRegistradoresOf && (
        <EditRegistradoresModal
          tenant={tenant}
          experimentId={experiment.meta.id}
          testId={editRegistradoresOf}
          current={experiment.tests.find((t) => t.id === editRegistradoresOf)?.registradorIds ?? []}
          onClose={() => setEditRegistradoresOf(null)}
          onSaved={() => { setEditRegistradoresOf(null); onUpdate(); }}
        />
      )}
    </div>
  );
}

function EditSupervisorsModal({ tenant, experimentId, current, onClose, onSaved }) {
  const [supervisorIds, setSupervisorIds] = useState(current);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const handleSave = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/labs/${tenant}/experiments/${experimentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supervisorIds }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'No se pudo guardar.'); return; }
      onSaved();
    } catch {
      setErr('Error de conexión.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ position: 'relative' }}>
        <button className="modal-x" style={{ position: 'absolute', top: 18, right: 18 }} onClick={onClose}>✕</button>
        <span className="eyebrow-mini on-dark">Editar equipo</span>
        <h2 style={{ fontFamily: 'var(--labs-serif)', fontSize: 22, fontWeight: 600, margin: '6px 0 16px' }}>Supervisores del proyecto</h2>
        <UserMultiSelect tenant={tenant} role="Supervisor" selected={supervisorIds} onChange={setSupervisorIds} />
        {err && <p className="labs-login-error" style={{ marginTop: 10 }}>{err}</p>}
        <div className="modal-footer">
          <button type="button" className="btn btn-quiet" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={handleSave}>{busy ? 'Guardando…' : 'Guardar →'}</button>
        </div>
      </div>
    </div>
  );
}

function EditRegistradoresModal({ tenant, experimentId, testId, current, onClose, onSaved }) {
  const [registradorIds, setRegistradorIds] = useState(current);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const handleSave = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/labs/${tenant}/experiments/${experimentId}/tests/${testId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registradorIds }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'No se pudo guardar.'); return; }
      onSaved();
    } catch {
      setErr('Error de conexión.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ position: 'relative' }}>
        <button className="modal-x" style={{ position: 'absolute', top: 18, right: 18 }} onClick={onClose}>✕</button>
        <span className="eyebrow-mini on-dark">Editar equipo</span>
        <h2 style={{ fontFamily: 'var(--labs-serif)', fontSize: 22, fontWeight: 600, margin: '6px 0 16px' }}>Registradores de la prueba</h2>
        <UserMultiSelect tenant={tenant} role="Registrador" selected={registradorIds} onChange={setRegistradorIds} />
        {err && <p className="labs-login-error" style={{ marginTop: 10 }}>{err}</p>}
        <div className="modal-footer">
          <button type="button" className="btn btn-quiet" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={handleSave}>{busy ? 'Guardando…' : 'Guardar →'}</button>
        </div>
      </div>
    </div>
  );
}

function ValidateButton({ tenant, experimentId, executionId, by, onDone }) {
  const [busy, setBusy] = useState(false);
  const handle = async () => {
    setBusy(true);
    try {
      await fetch(`/api/labs/${tenant}/experiments/${experimentId}/executions/validate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ executionId, by }),
      });
      onDone?.();
    } finally { setBusy(false); }
  };
  return <button className="chip-btn" disabled={busy} onClick={handle}>{busy ? '…' : 'Validar'}</button>;
}

// Arranca con los campos de los Criterios de éxito del proyecto (si hay) en vez de en blanco —
// son numéricos por naturaleza (llevan operador + valor), así que el tipo por defecto es
// 'number'. Igual se pueden borrar/editar/agregar más, esto es solo el punto de partida.
const DEFAULT_TEST_ICON = '🧪';

function CreateTestModal({ tenant, experimentId, successCriteria, onClose, onCreated }) {
  const [name, setName] = useState('');
  const criteriaFields = (successCriteria ?? [])
    .filter((c) => typeof c === 'object' && c.label)
    .map((c) => ({ key: '', label: c.label, type: 'number', operator: c.operator, value: c.value ?? '', unit: c.unit || '' }));
  const [fields, setFields] = useState(criteriaFields.length ? criteriaFields : [{ key: '', label: '', type: 'text' }]);
  const [registradorIds, setRegistradorIds] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const updateField = (i, patch) => setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  const addField = () => setFields((prev) => [...prev, { key: '', label: '', type: 'text' }]);
  const removeField = (i) => setFields((prev) => prev.filter((_, idx) => idx !== i));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const cleanFields = fields
        .filter((f) => f.label.trim())
        .map((f) => ({
          key: f.key.trim() || f.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_'),
          label: f.label.trim(),
          type: f.type,
          ...(f.type === 'number' && f.operator && f.value !== '' && f.value != null ? { operator: f.operator, value: f.value, unit: (f.unit || '').trim() } : {}),
        }));
      const res = await fetch(`/api/labs/${tenant}/experiments/${experimentId}/tests`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, icon: DEFAULT_TEST_ICON, fields: cleanFields, registradorIds }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'No se pudo crear.'); return; }
      onCreated();
    } catch {
      setErr('Error de conexión.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ position: 'relative' }}>
        <button className="modal-x" style={{ position: 'absolute', top: 18, right: 18 }} onClick={onClose}>✕</button>
        <span className="eyebrow-mini on-dark">Nueva prueba</span>
        <h2 style={{ fontFamily: 'var(--labs-serif)', fontSize: 22, fontWeight: 600, margin: '6px 0 16px' }}>Definí el formato</h2>
        <form onSubmit={handleCreate}>
          <label className="field-label">Nombre de la prueba</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ marginBottom: 14 }} required />
          <label className="field-label">Campos que va a registrar cada aporte</label>
          {fields.map((f, i) => (
            <div key={i} style={{ marginBottom: 8, border: '1px solid var(--labs-line-dark)', borderRadius: 8, padding: 8 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: f.type === 'number' ? 6 : 0 }}>
                <input type="text" placeholder="Nombre del campo (ej. Humedad %)" value={f.label} onChange={(e) => updateField(i, { label: e.target.value })} style={{ flex: 1 }} />
                <select value={f.type} onChange={(e) => updateField(i, { type: e.target.value })} style={{ background: 'var(--labs-dark-3)', border: '1px solid var(--labs-line-dark)', color: 'var(--labs-cream)', borderRadius: 8, padding: '0 10px' }}>
                  {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                {fields.length > 1 && <button type="button" className="chip-btn" onClick={() => removeField(i)}>✕</button>}
              </div>
              {f.type === 'number' && (
                <div>
                  <p style={{ fontSize: 11, color: 'var(--labs-cream-faint)', margin: '2px 0 6px' }}>
                    Criterio de aprobación (opcional) — el aporte pasa si el valor cumple esta condición
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select value={f.operator || ''} onChange={(e) => updateField(i, { operator: e.target.value })} style={{ flex: '0 0 130px', background: 'var(--labs-dark-3)', border: '1px solid var(--labs-line-dark)', color: 'var(--labs-cream)', borderRadius: 8, padding: '0 10px' }}>
                      <option value="">Sin criterio</option>
                      {CRITERIA_OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label} que…</option>)}
                    </select>
                    <input type="number" placeholder="Valor" value={f.value ?? ''} onChange={(e) => updateField(i, { value: e.target.value })} style={{ flex: 1, minWidth: 70 }} />
                    <input type="text" placeholder="Unidad (ej. %)" value={f.unit ?? ''} onChange={(e) => updateField(i, { unit: e.target.value })} style={{ flex: 1, minWidth: 70 }} />
                  </div>
                </div>
              )}
            </div>
          ))}
          <button type="button" className="chip-btn" onClick={addField} style={{ marginBottom: 14 }}>+ Agregar campo</button>
          <label className="field-label">Registradores asignados a esta prueba</label>
          <UserMultiSelect tenant={tenant} role="Registrador" selected={registradorIds} onChange={setRegistradorIds} />
          {err && <p className="labs-login-error" style={{ marginTop: 10 }}>{err}</p>}
          <div className="modal-footer">
            <button type="button" className="btn btn-quiet" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Creando…' : 'Crear prueba →'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ======================= Historia ======================= */

function ViewHistoria({ experiment }) {
  return (
    <div className="view">
      <div className="view-header">
        <span className="view-eyebrow">Historia · {experiment.meta.name}</span>
        <h1 className="view-title">Memoria del proyecto</h1>
        <p className="view-sub">No se escribe a mano — emerge de los aportes, validaciones y feedback del equipo.</p>
      </div>
      {experiment.events.length === 0 && <p className="empty-note">Todavía no hay historia — el primer aporte la va a empezar.</p>}
      <div className="timeline">
        {experiment.events.map((ev) => (
          <div className={`tl-item type-${ev.type}`} key={ev.id}>
            <div className="tl-dot"></div>
            <div className="tl-date">{formatDateTime(ev.date)}</div>
            <div className="tl-title">{ev.title}</div>
            <div className="tl-body">{ev.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ======================= Feedback ======================= */

function ViewFeedback({ tenant, experiment, identity, onUpdate }) {
  if (identity.role === 'Director' || identity.role === 'Supervisor') {
    return <FeedbackCompose tenant={tenant} experiment={experiment} identity={identity} onUpdate={onUpdate} />;
  }
  return <FeedbackReceived tenant={tenant} experiment={experiment} identity={identity} onUpdate={onUpdate} />;
}

// Director puede dejar feedback al proyecto en general, a una prueba, o a un aporte puntual.
// Supervisor solo puede dejar feedback sobre aportes (registros) — nunca al proyecto ni a una
// prueba entera. Registrador nunca da feedback, solo lo recibe (ver FeedbackReceived).
function FeedbackCompose({ tenant, experiment, identity, onUpdate }) {
  const canTargetAll = identity.role === 'Director';
  const [targetType, setTargetType] = useState(canTargetAll ? 'proyecto' : 'aporte');
  const [testId, setTestId] = useState(null);
  const [executionId, setExecutionId] = useState(null);
  const [text, setText] = useState('');
  const [visibility, setVisibility] = useState('Todo el equipo');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const executionsOfTest = testId ? experiment.executions.filter((e) => e.testId === testId) : [];

  const handleSend = async () => {
    if (!text.trim() || busy) return;
    if (targetType === 'prueba' && !testId) { setErr('Elegí una prueba.'); return; }
    if (targetType === 'aporte' && !testId) { setErr('Elegí una prueba.'); return; }
    if (targetType === 'aporte' && !executionId) { setErr('Elegí un aporte.'); return; }
    setBusy(true);
    setErr(null);
    try {
      const targetId = targetType === 'prueba' ? testId : targetType === 'aporte' ? executionId : null;
      const res = await fetch(`/api/labs/${tenant}/experiments/${experiment.meta.id}/feedback`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetId, text, visibility }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'No se pudo enviar.'); return; }
      setText('');
      onUpdate();
    } catch {
      setErr('Error de conexión.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="view">
      <div className="view-header">
        <span className="view-eyebrow">Feedback · {experiment.meta.name}</span>
        <h1 className="view-title">Dejar feedback</h1>
        <p className="view-sub">{canTargetAll ? 'Sobre el proyecto en general o algo puntual.' : 'Sobre un aporte puntual del equipo.'} Vos decidís quién lo ve.</p>
      </div>
      <div className="feedback-compose">
        {canTargetAll && (
          <>
            <label className="field-label">¿Sobre qué es este feedback?</label>
            <div className="target-select">
              <button className={`target-chip ${targetType === 'proyecto' ? 'active' : ''}`} onClick={() => { setTargetType('proyecto'); setTestId(null); setExecutionId(null); }}>Proyecto general</button>
              <button className={`target-chip ${targetType === 'prueba' ? 'active' : ''}`} onClick={() => { setTargetType('prueba'); setTestId(null); setExecutionId(null); }}>Una prueba</button>
              <button className={`target-chip ${targetType === 'aporte' ? 'active' : ''}`} onClick={() => { setTargetType('aporte'); setTestId(null); setExecutionId(null); }}>Un aporte</button>
            </div>
          </>
        )}

        {(targetType === 'prueba' || targetType === 'aporte') && (
          <div className="target-select" style={{ marginTop: canTargetAll ? 8 : 0, marginBottom: 4 }}>
            {experiment.tests.map((t) => (
              <button
                key={t.id}
                className={`target-chip ${testId === t.id ? 'active' : ''}`}
                onClick={() => { setTestId(t.id); setExecutionId(null); }}
              >
                {t.icon} {t.name}
              </button>
            ))}
            {experiment.tests.length === 0 && <p className="empty-note">No hay pruebas todavía.</p>}
          </div>
        )}

        {targetType === 'aporte' && testId && (
          <div style={{ marginTop: 8, marginBottom: 14 }}>
            <label className="field-label">Elegí el aporte (dentro de esta prueba)</label>
            <select value={executionId ?? ''} onChange={(e) => setExecutionId(e.target.value || null)} style={{ width: '100%' }}>
              <option value="">— Elegir —</option>
              {executionsOfTest.map((e) => (
                <option key={e.id} value={e.id}>{e.contributor} · {formatDate(e.createdAt)}</option>
              ))}
            </select>
            {executionsOfTest.length === 0 && <p className="empty-note">Todavía no hay aportes en esta prueba.</p>}
          </div>
        )}

        <textarea rows={4} placeholder="Escribí tu feedback…" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="visibility-row">
          <div className="vis-toggle">
            <button className={`vis-btn ${visibility === 'Todo el equipo' ? 'active' : ''}`} onClick={() => setVisibility('Todo el equipo')}>Todo el equipo</button>
            <button className={`vis-btn ${visibility === 'Privado a Supervisor' ? 'active' : ''}`} onClick={() => setVisibility('Privado a Supervisor')}>Privado a Supervisor</button>
          </div>
          <button className="btn btn-primary" disabled={busy || !text.trim()} onClick={handleSend}>{busy ? 'Enviando…' : 'Enviar feedback →'}</button>
        </div>
        {err && <p className="labs-login-error" style={{ marginTop: 10 }}>{err}</p>}
      </div>
      <div className="divider-label"><span>Feedback anterior</span></div>
      {experiment.feedback.map((f) => <FeedbackItem key={f.id} f={f} tenant={tenant} experimentId={experiment.meta.id} onUpdate={onUpdate} />)}
    </div>
  );
}

function FeedbackReceived({ tenant, experiment, identity, onUpdate }) {
  const visible = experiment.feedback.filter((f) => f.visibility === 'Todo el equipo' || (identity.role === 'Supervisor' && f.visibility === 'Privado a Supervisor'));
  return (
    <div className="view">
      <div className="view-header">
        <span className="view-eyebrow">Feedback · {experiment.meta.name}</span>
        <h1 className="view-title">Feedback recibido</h1>
        <p className="view-sub">Lo que Director y Supervisor comparten sobre tu trabajo, en un solo lugar.</p>
      </div>
      {visible.length === 0 && <p className="empty-note">Todavía no hay feedback.</p>}
      {visible.map((f) => <FeedbackItem key={f.id} f={f} tenant={tenant} experimentId={experiment.meta.id} onUpdate={onUpdate} />)}
    </div>
  );
}

function FeedbackItem({ f, tenant, experimentId, onUpdate }) {
  const [busy, setBusy] = useState(false);
  const dismiss = async () => {
    setBusy(true);
    try {
      await fetch(`/api/labs/${tenant}/experiments/${experimentId}/feedback`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedbackId: f.id }),
      });
      onUpdate();
    } finally { setBusy(false); }
  };
  // f.targetLabel es el modelo nuevo; f.target es el campo viejo (feedback de antes de esta
  // versión) — se muestra igual en vez de quedar en blanco.
  const targetDisplay = f.targetLabel || f.target || 'Proyecto general';
  return (
    <div className="feedback-item">
      <div className="fb-top">
        <div className="fb-who"><span className="recent-avatar" style={{ width: 24, height: 24, fontSize: 10.5 }}>{initials(f.who)}</span>{f.who}{f.whoRole ? ` (${f.whoRole})` : ''} <span className="tag tag-neutral">{f.visibility}</span></div>
        <span className="recent-time">{formatDateTime(f.createdAt)} · {targetDisplay}</span>
      </div>
      <div className="fb-text">{f.text}</div>
      {f.suggestion && (
        <div className="fb-suggest">
          <span>{f.suggestion}</span>
          <div className="fb-suggest-actions">
            <button className="chip-btn" disabled={busy} onClick={dismiss}>Descartar</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ======================= Reportes ======================= */

function ReportMeter({ label, pct, sublabel, tone = 'good' }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="report-meter-row">
      <div className="report-meter-top"><span>{label}</span><span>{pct}%</span></div>
      <div className="report-meter-track"><div className={`report-meter-fill ${tone}`} style={{ width: `${clamped}%` }} /></div>
      {sublabel && <div className="report-meter-sub">{sublabel}</div>}
    </div>
  );
}

function money(n) {
  return `S/ ${Number(n || 0).toLocaleString('es-PE')}`;
}

// Fotos disponibles para curar el reporte (civil o experimental): toda evidencia con imagen
// ya adjuntada en comentarios del proyecto (tareas, partidas, pruebas, aportes...) — no hace
// falta subir nada de nuevo acá. Se excluyen los comentarios sobre reportes: son meta-discusión
// del reporte, no evidencia del proyecto.
function collectAvailablePhotos(experiment) {
  const photos = [];
  for (const f of experiment.feedback) {
    if (f.targetType === 'reporte') continue;
    for (const a of f.attachments || []) {
      if (a.kind !== 'image') continue;
      photos.push({ ...a, pickId: `${f.id}-${a.driveFileId || a.name}`, from: f.targetLabel, createdAt: f.createdAt });
    }
  }
  return photos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function ReportPhotoGrid({ photos, caption }) {
  if (!photos.length) return null;
  return (
    <div style={{ marginTop: 10 }}>
      {caption && <div className="eyebrow-mini" style={{ marginBottom: 8 }}>{caption}</div>}
      <div className="report-photo-grid">
        {photos.map((p, i) => {
          const href = p.driveUrl || (p.data ? `data:${p.mimeType};base64,${p.data}` : p.previewUrl);
          return (
            <a key={p.pickId || i} href={href || undefined} target="_blank" rel="noreferrer" className="report-photo-item">
              <img src={p.previewUrl || href} alt={p.name} />
              <span>{p.from || p.name}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function GenerateReportCard({ tenant, experiment, onUpdate }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const isCivil = isTaskTrackingKind(experiment.meta.projectKind);
  const availablePhotos = collectAvailablePhotos(experiment);
  const [selected, setSelected] = useState(() => new Set(availablePhotos.slice(0, 6).map((p) => p.pickId)));

  const togglePhoto = (pickId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pickId)) next.delete(pickId); else next.add(pickId);
      return next;
    });
  };

  const handleGenerate = async () => {
    setBusy(true);
    setErr(null);
    try {
      const photos = availablePhotos.filter((p) => selected.has(p.pickId)).map(({ pickId, from, createdAt, ...rest }) => rest);
      const res = await fetch(`/api/labs/${tenant}/experiments/${experiment.meta.id}/reports`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'No se pudo generar.'); return; }
      setPickerOpen(false);
      onUpdate();
    } catch {
      setErr('Error de conexión.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div className="section-title" style={{ color: 'var(--labs-cream)' }}>Reporte de {experiment.meta.name}</div>
          <div style={{ fontSize: 12.5, color: 'var(--labs-cream-dim)' }}>
            {isCivil && `${experiment.civilMetrics?.pctFinanciero ?? 0}% financiero · ${experiment.civilMetrics?.pctTareas ?? 0}% tareas · `}
            {availablePhotos.length} fotos disponibles
          </div>
        </div>
        {!pickerOpen && <button className="btn btn-primary" onClick={() => setPickerOpen(true)}>Elegir fotos y generar →</button>}
      </div>

      {pickerOpen && (
        <>
          <p className="empty-note" style={{ marginTop: 14 }}>{availablePhotos.length === 0 ? 'Todavía no hay fotos de evidencia en los comentarios de tareas/partidas — el reporte igual se puede generar sin fotos.' : 'Elegí qué fotos de evidencia entran al reporte (preseleccioné las más recientes).'}</p>
          {availablePhotos.length > 0 && (
            <div className="report-photo-grid" style={{ marginTop: 10 }}>
              {availablePhotos.map((p) => (
                <button type="button" key={p.pickId} className={`report-photo-pick${selected.has(p.pickId) ? ' selected' : ''}`} onClick={() => togglePhoto(p.pickId)}>
                  <img src={p.previewUrl || p.driveUrl} alt={p.name} />
                  <span className="report-photo-check">{selected.has(p.pickId) ? '✓' : ''}</span>
                  <span className="report-photo-caption">{p.from}</span>
                </button>
              ))}
            </div>
          )}
          {err && <p className="labs-login-error" style={{ marginTop: 10 }}>{err}</p>}
          <div className="modal-footer" style={{ marginTop: 14 }}>
            <button type="button" className="btn btn-quiet" onClick={() => setPickerOpen(false)}>Cancelar</button>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={handleGenerate}>{busy ? 'Sintetizando…' : `Generar borrador (${selected.size} fotos) →`}</button>
          </div>
        </>
      )}
    </div>
  );
}

const REPORT_STATUS_LABEL = { borrador: 'Borrador', enviado: 'Esperando revisión', aprobado: 'Aprobado' };
const REPORT_STATUS_TAG = { borrador: 'tag-neutral', enviado: 'tag-ember', aprobado: 'tag-living' };

function ReportStatusTag({ status }) {
  return <span className={`tag ${REPORT_STATUS_TAG[status] || 'tag-neutral'} on-paper`}>{REPORT_STATUS_LABEL[status] || status}</span>;
}

function ReportsHistoryList({ reports, activeId, onSelect }) {
  if (reports.length < 2) return null;
  return (
    <div className="report-history">
      <div className="eyebrow-mini on-dark" style={{ margin: '18px 0 8px' }}>Historial de reportes</div>
      {reports.map((r) => (
        <button type="button" key={r.id} className={`report-history-row${r.id === activeId ? ' active' : ''}`} onClick={() => onSelect(r.id)}>
          <span>{formatDate(r.createdAt)}{r.generatedBy ? ` · ${r.generatedBy}` : ''}</span>
          <ReportStatusTag status={r.status} />
        </button>
      ))}
    </div>
  );
}

// Comentarios + envío/aprobación son iguales para el reporte civil y el experimental — solo
// cambia el contenido del cuerpo (children). Evita duplicar todo ese flujo en los dos.
function ReportDocShell({ tenant, experiment, identity, latest, canApprove, canGenerate, onUpdate, children }) {
  const [busy, setBusy] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const canComment = identity.role === 'Director' || identity.role === 'Supervisor';
  const commentsOf = experiment.feedback.filter((f) => f.targetType === 'reporte' && f.targetId === latest.id);

  const patch = async (body) => {
    setBusy(true);
    try {
      await fetch(`/api/labs/${tenant}/experiments/${latest.experimentId}/reports`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: latest.id, ...body }),
      });
      onUpdate();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="report-doc" style={{ marginTop: 16 }}>
      <div className="report-meta-strip">
        <span className="eyebrow-mini">{latest.generatedBy ? `Generado por ${latest.generatedBy}` : 'Generado por IA'} · {formatDate(latest.createdAt)}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {latest.driveUrl && <a href={latest.driveUrl} target="_blank" rel="noreferrer" className="tag tag-living on-paper" style={{ textDecoration: 'none' }}>📁 Ver en Drive ↗</a>}
          <ReportStatusTag status={latest.status} />
        </div>
      </div>

      {children}

      <div className="report-actions" style={{ justifyContent: 'space-between' }}>
        <button type="button" className="chip-btn on-paper" onClick={() => setCommentsOpen(true)}>💬 Comentarios{commentsOf.length ? ` (${commentsOf.length})` : ''}</button>
        <div style={{ display: 'flex', gap: 8 }}>
          {latest.status === 'borrador' && canGenerate && (
            <button className="btn btn-primary" disabled={busy} onClick={() => patch({ action: 'submit' })}>{busy ? 'Enviando…' : 'Enviar a Director →'}</button>
          )}
          {latest.status === 'enviado' && canApprove && (
            <button className="btn btn-primary" disabled={busy} onClick={() => patch({})}>{busy ? 'Aprobando…' : 'Aprobar y compartir'}</button>
          )}
        </div>
      </div>

      {commentsOpen && (
        <CommentsModal
          tenant={tenant}
          experimentId={latest.experimentId}
          identity={identity}
          canComment={canComment}
          targetType="reporte"
          targetId={latest.id}
          targetLabel={`Reporte del ${formatDate(latest.createdAt)}`}
          comments={commentsOf}
          onClose={() => setCommentsOpen(false)}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
}

function CivilReportDoc({ tenant, experiment, identity, latest, canApprove, canGenerate, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(latest.analysis);
  const [saving, setSaving] = useState(false);
  const m = latest.metrics;
  const overBudget = m.totalEjecutado > m.totalImporte;
  const scheduleSlip = m.pctTiempo - m.pctTareas > 25;
  const canEdit = latest.status === 'borrador' && canGenerate;

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/labs/${tenant}/experiments/${latest.experimentId}/reports`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: latest.id, action: 'edit', analysis: draft }),
      });
      setEditing(false);
      onUpdate();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ReportDocShell tenant={tenant} experiment={experiment} identity={identity} latest={latest} canApprove={canApprove} canGenerate={canGenerate} onUpdate={onUpdate}>
      <h3>Avance general</h3>
      {m.totalImporte > 0 && (
        <ReportMeter label="Financiero" pct={m.pctFinanciero} tone={overBudget ? 'critical' : 'good'} sublabel={`${money(m.totalEjecutado)} de ${money(m.totalImporte)} ejecutado${overBudget ? ' — supera lo presupuestado' : ''}`} />
      )}
      <ReportMeter label="Tareas" pct={m.pctTareas} tone={scheduleSlip ? 'warning' : 'good'} sublabel={`${m.tareasTerminadas} de ${m.totalTareas} terminadas${scheduleSlip ? ' — por detrás del tiempo transcurrido' : ''}`} />
      <ReportMeter label="Tiempo transcurrido" pct={m.pctTiempo} tone="good" />

      {latest.breakdown?.financialByEtapa?.length > 0 && (
        <>
          <h3>Avance financiero por etapa</h3>
          {latest.breakdown.financialByEtapa.map((e) => (
            <ReportMeter key={e.etapa} label={e.etapa} pct={e.pct} tone={e.ejecutado > e.importe ? 'critical' : 'good'} sublabel={`${money(e.ejecutado)} de ${money(e.importe)}`} />
          ))}
        </>
      )}

      {latest.breakdown?.tasksByFase?.length > 0 && (
        <>
          <h3>Avance de tareas por fase</h3>
          {latest.breakdown.tasksByFase.map((f) => (
            <ReportMeter key={f.fase} label={f.fase} pct={f.pct} tone="good" sublabel={`${f.done}/${f.total} tareas`} />
          ))}
        </>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <h3 style={{ margin: 0 }}>Análisis</h3>
        {canEdit && !editing && <button type="button" className="chip-btn on-paper" onClick={() => { setDraft(latest.analysis); setEditing(true); }}>Editar</button>}
      </div>
      {editing ? (
        <>
          <textarea rows={10} value={draft} onChange={(e) => setDraft(e.target.value)} style={{ marginTop: 8, background: 'var(--labs-paper)', color: 'var(--labs-ink)', border: '1px solid var(--labs-line)' }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button type="button" className="chip-btn on-paper" onClick={() => setEditing(false)}>Cancelar</button>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={handleSave}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
          </div>
        </>
      ) : latest.analysis.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}

      <ReportPhotoGrid photos={latest.photos} caption={latest.photos?.length ? 'Evidencia fotográfica' : null} />
    </ReportDocShell>
  );
}

function ExperimentalReportDoc({ tenant, experiment, identity, latest, canApprove, canGenerate, onUpdate }) {
  const canEdit = latest.status === 'borrador' && canGenerate;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ summary: latest.doc.summary, results: latest.doc.results, learnings: latest.doc.learnings, highlightedFeedback: latest.doc.highlightedFeedback });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/labs/${tenant}/experiments/${latest.experimentId}/reports`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: latest.id, action: 'edit', doc: draft }),
      });
      setEditing(false);
      onUpdate();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ReportDocShell tenant={tenant} experiment={experiment} identity={identity} latest={latest} canApprove={canApprove} canGenerate={canGenerate} onUpdate={onUpdate}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <h3 style={{ margin: 0 }}>Resumen, resultados y aprendizajes</h3>
        {canEdit && !editing && <button type="button" className="chip-btn on-paper" onClick={() => setEditing(true)}>Editar</button>}
      </div>

      {editing ? (
        <>
          <label className="field-label" style={{ marginTop: 10 }}>Resumen</label>
          <textarea rows={3} value={draft.summary} onChange={(e) => setDraft((d) => ({ ...d, summary: e.target.value }))} style={{ background: 'var(--labs-paper)', color: 'var(--labs-ink)', border: '1px solid var(--labs-line)' }} />
          <label className="field-label" style={{ marginTop: 10 }}>Resultados</label>
          <textarea rows={4} value={draft.results} onChange={(e) => setDraft((d) => ({ ...d, results: e.target.value }))} style={{ background: 'var(--labs-paper)', color: 'var(--labs-ink)', border: '1px solid var(--labs-line)' }} />
          <label className="field-label" style={{ marginTop: 10 }}>Aprendizajes</label>
          <textarea rows={4} value={draft.learnings} onChange={(e) => setDraft((d) => ({ ...d, learnings: e.target.value }))} style={{ background: 'var(--labs-paper)', color: 'var(--labs-ink)', border: '1px solid var(--labs-line)' }} />
          <label className="field-label" style={{ marginTop: 10 }}>Feedback destacado</label>
          <textarea rows={3} value={draft.highlightedFeedback} onChange={(e) => setDraft((d) => ({ ...d, highlightedFeedback: e.target.value }))} style={{ background: 'var(--labs-paper)', color: 'var(--labs-ink)', border: '1px solid var(--labs-line)' }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button type="button" className="chip-btn on-paper" onClick={() => setEditing(false)}>Cancelar</button>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={handleSave}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
          </div>
        </>
      ) : (
        <>
          <p>{latest.doc.summary}</p>
          <h3>Qué se probó</h3>
          <ul>{latest.doc.whatWasTested.map((w, i) => <li key={i}>{w}</li>)}</ul>
          <h3>Resultados</h3>
          <p>{latest.doc.results}</p>
          <h3>Aprendizajes</h3>
          <p>{latest.doc.learnings}</p>
          {latest.doc.highlightedFeedback && (<><h3>Feedback destacado</h3><p>{latest.doc.highlightedFeedback}</p></>)}
          <h3>Próximos pasos sugeridos</h3>
          <ul>{latest.doc.nextSteps.map((n, i) => <li key={i}>{n}</li>)}</ul>
        </>
      )}

      <ReportPhotoGrid photos={latest.photos} caption={latest.photos?.length ? 'Evidencia fotográfica' : null} />
    </ReportDocShell>
  );
}

function ViewReportes({ tenant, experiment, identity, onUpdate }) {
  const [selectedId, setSelectedId] = useState(null);
  const reports = experiment.reports.map((r) => ({ ...r, experimentId: experiment.meta.id }));
  const active = reports.find((r) => r.id === selectedId) || reports[0] || null;
  const canGenerate = identity.role === 'Supervisor' && experiment.meta.supervisorIds?.includes(identity.id);
  const canApprove = identity.role === 'Director';

  return (
    <div className="view">
      <div className="view-header">
        <span className="view-eyebrow">Reportes · {experiment.meta.name}</span>
        <h1 className="view-title">El reporte, como subproducto</h1>
        <p className="view-sub">No nace de cero — se sintetiza a partir de lo que ya quedó registrado. El Supervisor genera y envía el borrador, el Director lo revisa y aprueba.</p>
      </div>

      {!canGenerate && !active && <p className="empty-note">Todavía no hay ningún reporte generado.</p>}

      {canGenerate && <GenerateReportCard tenant={tenant} experiment={experiment} onUpdate={() => { setSelectedId(null); onUpdate(); }} />}

      {active && (active.kind === 'civil'
        ? <CivilReportDoc key={active.id} tenant={tenant} experiment={experiment} identity={identity} latest={active} canApprove={canApprove} canGenerate={canGenerate} onUpdate={onUpdate} />
        : <ExperimentalReportDoc key={active.id} tenant={tenant} experiment={experiment} identity={identity} latest={active} canApprove={canApprove} canGenerate={canGenerate} onUpdate={onUpdate} />)}

      <ReportsHistoryList reports={reports} activeId={active?.id} onSelect={setSelectedId} />
    </div>
  );
}
