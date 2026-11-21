'use client';

import { useEffect, useMemo, useState } from 'react';
import KaiNextSidebar from './KaiNextSidebar';
import KaiNextConfirmDialog from './KaiNextConfirmDialog';
import KaiNextTaskCanvas from './KaiNextTaskCanvas';
import { useEmpresaScope } from '@/lib/kaiNext/useEmpresaScope';

// Pantallas de un tenant con empresas (ver lib/kaiNext/empresas.js):
// - Empresas: lo que espera tu respuesta, un resumen por empresa y los proyectos con novedades.
// - Resumen de una empresa (empresaId): vencidas, proyectos por tipo y tareas sueltas.
// Todo sale de /api/kai-next/[tenant]/overview, filtrado por lo que la persona puede ver.

const KIND_LABEL = { experimental: 'Experimental', civil: 'Civil', seguimiento: 'Seguimiento', desarrollo: 'Desarrollo' };
const KIND_PLURAL = { experimental: 'Experimentales', civil: 'Civiles', seguimiento: 'Seguimiento', desarrollo: 'Desarrollo' };
const KIND_UNIT = { experimental: ['prueba', 'pruebas'], civil: ['actividad', 'actividades'], seguimiento: ['tarea', 'tareas'], desarrollo: ['tarea', 'tareas'] };
const KIND_HINT = { experimental: 'Avance por pruebas', civil: 'Avance por cronograma', seguimiento: 'Avance por tareas', desarrollo: 'Avance por tareas de sprint' };
const STATUS = { todo: 'Por hacer', doing: 'Haciendo', review: 'En revisión', done: 'Hecho' };
const STATUS_ORDER = ['todo', 'doing', 'review', 'done'];
const BOARD_COLUMNS = STATUS_ORDER.map((id) => ({ id, label: STATUS[id] }));
const PRIORITIES = ['Alta', 'Media', 'Baja'];
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const today = () => new Date().toISOString().slice(0, 10);
const fd = (d) => (d ? `${Number(d.slice(8, 10))} ${MES[Number(d.slice(5, 7)) - 1]}` : '');
const isOverdue = (t) => t.status !== 'done' && t.status !== 'review' && t.fechaFin && t.fechaFin < today();
const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '·';
// Primer nombre sin títulos ("Ing. Jean Villanueva" → "Jean").
const firstName = (name = '') => name.replace(/^((ing|dr|dra|lic|arq|sr|sra|srta)\.?\s+)+/i, '').split(/\s+/)[0] || name;
const plural = (n, [one, many]) => `${n} ${n === 1 ? one : many}`;

async function sendJson(url, method, body) {
  try {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    return res.ok ? { data } : { error: data.error || 'No se pudo guardar.' };
  } catch {
    return { error: 'Error de conexión.' };
  }
}

function EmpresaTag({ empresa }) {
  if (!empresa) return null;
  return <span className="knx-emp-tag" style={{ '--c': empresa.color }}><i />{empresa.name}</span>;
}

// ── "Esperan tu respuesta" ─────────────────────────────────────────────────────
function PendingBox({ pending, projectHref, empresaHref }) {
  const [open, setOpen] = useState(false);
  if (!pending.length) return null;
  const shown = open ? pending : pending.slice(0, 3);
  return (
    <section className="knx-pend" aria-label="Esperan tu respuesta">
      <div className="knx-pend-head">
        <i aria-hidden="true" />
        <b>{pending.length === 1 ? '1 cosa espera tu respuesta' : `${pending.length} cosas esperan tu respuesta`}</b>
        {pending.length > 3 && <button type="button" className="knx-pend-toggle" onClick={() => setOpen((v) => !v)}>{open ? 'Ver menos' : `Ver las ${pending.length}`}</button>}
      </div>
      <ul>
        {shown.map((p, i) => (
          <li key={i}>
            <a href={p.projectId ? projectHref(p.projectId, p.tab) : empresaHref(p.empresaId)}>
              <span>{p.title}</span>
              <small>{p.projectName ?? 'Tarea suelta'}</small>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ── Piezas compartidas por Empresas y Resumen de empresa ───────────────────────
// Mismo look en las dos pantallas: aviso de vencidas arriba y proyectos agrupados por tipo en
// tarjetas compactas. En "Todas mis empresas" cada tarjeta lleva además su empresa.
const KIND_ORDER = ['experimental', 'civil', 'seguimiento', 'desarrollo'];

function OverdueAlert({ od, people, projectHref, looseHref, okLabel }) {
  const [open, setOpen] = useState(false);
  const nameOf = (id) => people.find((p) => p.id === id)?.name ?? '—';
  if (!od.length) return <p className="knx-od-ok">✓ {okLabel}</p>;
  const shown = open ? od : od.slice(0, 3);
  return (
    <section className="knx-od" aria-label="Vencidas">
      <div className="knx-od-h">
        <b>{od.length === 1 ? '1 vencida' : `${od.length} vencidas`}</b>
        <span>· {[...new Set(od.flatMap((o) => o.responsables.map((r) => firstName(nameOf(r)))))].filter((n) => n !== '—').join(', ') || 'sin responsable'}</span>
        {od.length > 3 && <button type="button" className="knx-canvas-mini" onClick={() => setOpen((v) => !v)}>{open ? 'Ver menos' : `Ver las ${od.length}`}</button>}
      </div>
      {shown.map((o) => (
        <div key={`${o.kind}-${o.id}`} className="knx-od-row">
          <div><b>{o.name}</b><small>{o.projectName ?? 'Tarea suelta'}</small></div>
          <span className="knx-od-when">Venció {fd(String(o.fechaFin).slice(0, 10))}</span>
          {o.projectId
            ? <a className="knx-canvas-mini" href={projectHref(o.projectId, o.kind === 'dev' ? undefined : 'trabajo')}>Abrir proyecto</a>
            : looseHref ? <a className="knx-canvas-mini" href={looseHref(o.empresaId)}>Ver tarea</a> : <span className="knx-od-loose">Más abajo</span>}
        </div>
      ))}
    </section>
  );
}

function ProjectsByKind({ ps, projectHref, empresaById, showEmpresa }) {
  const kinds = KIND_ORDER.filter((k) => ps.some((p) => p.projectKind === k));
  return kinds.map((k) => {
    const list = ps.filter((p) => p.projectKind === k);
    return (
      <div key={k} className="knx-emps-kind">
        <div className="knx-emps-kind-h"><h3>{KIND_PLURAL[k]} <em>· {list.length}</em></h3><p>{KIND_HINT[k]}</p></div>
        <div className="knx-mini-grid">
          {list.map((p) => {
            const pct = p.progress.total ? Math.round((p.progress.done / p.progress.total) * 100) : 0;
            return (
              <a key={p.id} className="knx-mini" href={projectHref(p.id)}>
                {showEmpresa && <EmpresaTag empresa={empresaById.get(p.empresaId)} />}
                <b>{p.name}</b>
                <span className="knx-pcard-prog"><span><i style={{ width: `${pct}%` }} /></span></span>
                <span className="knx-mini-m">
                  <span>{p.progress.done}/{plural(p.progress.total, KIND_UNIT[k])}</span>
                  {p.overdueCount ? <span className="knx-pcard-od">{p.overdueCount === 1 ? '1 vencida' : `${p.overdueCount} vencidas`}</span> : p.unseenCount ? <span>{p.unseenCount === 1 ? '1 novedad' : `${p.unseenCount} novedades`}</span> : null}
                </span>
                <span className="knx-mini-nx">{p.next ? `Sigue: ${p.next}` : !p.progress.total ? `Sin ${KIND_UNIT[k][1]} todavía` : p.progress.done >= p.progress.total ? 'Todo terminado' : `${p.progress.total - p.progress.done} por completar`}</span>
              </a>
            );
          })}
        </div>
      </div>
    );
  });
}

// ── Pantalla Empresas ────────────────────────────────────────────────────────
function EmpresasHome({ tenant, data, emp, people, projectHref, empresaHref }) {
  const [newIn, setNewIn] = useState(null); // empresaId de la tarea suelta que se está creando
  const byId = new Map(data.empresas.map((e) => [e.id, e]));
  const inScope = data.projects.filter((p) => emp.scope === 'all' || p.empresaId === emp.scope);
  const multi = emp.scope === 'all' && emp.selectable.length > 1;
  const pending = data.pending.filter((p) => emp.scope === 'all' || p.empresaId === emp.scope);
  const od = data.overdue.filter((o) => emp.scope === 'all' || o.empresaId === emp.scope);
  const scopeEmpresas = emp.selectable.filter((e) => emp.scope === 'all' || e.id === emp.scope);
  const scopeName = multi ? 'tus empresas' : byId.get(emp.scope)?.name ?? scopeEmpresas[0]?.name ?? '';
  const activeLoose = (id) => (data.loose[id] ?? []).filter((t) => t.status !== 'done').length;
  // Tarjetas: solo empresas con algo adentro (proyectos o tareas sueltas activas). Una empresa
  // vacía (ej. Grupo Sesuveca recién creada) no ocupa lugar: se le crea una tarea suelta con el
  // botón de arriba y desde ahí aparece sola.
  const visibleEmpresas = data.empresas.filter((e) => e.visible !== false);
  const cardEmpresas = visibleEmpresas.filter((e) => (emp.scope === 'all' || e.id === emp.scope)
    && (inScope.some((p) => p.empresaId === e.id) || activeLoose(e.id) > 0));
  const showCards = emp.scope === 'all' && cardEmpresas.length > 1;
  const canManage = !!data.level?.isSupervisorLevel;
  const newEmpresa = newIn ? byId.get(newIn) : null;
  const createLoose = async (patch) => {
    const { error } = await sendJson(`/api/kai-next/${tenant}/empresas/${newIn}/tasks`, 'POST', patch);
    if (error) return error;
    window.location.href = `${empresaHref(newIn)}#tareas-sueltas`;
    return null;
  };

  return (
    <>
      <div className="knx-emps-head">
        <h1 className="knx-emps-h1">Empresas</h1>
        {canManage && visibleEmpresas.length > 0 && (
          <button type="button" className="knx-admin-btn" onClick={() => setNewIn(emp.scope !== 'all' && byId.has(emp.scope) ? emp.scope : visibleEmpresas[0].id)}>+ Tarea suelta</button>
        )}
      </div>
      <p className="knx-emps-sub">
        {showCards ? `${plural(inScope.length, ['proyecto', 'proyectos'])} en ${cardEmpresas.length} empresas` : `${scopeName} · ${plural(inScope.length, ['proyecto', 'proyectos'])}`}
      </p>

      {showCards && (
        <div className="knx-emps-grid">
          {cardEmpresas.map((e) => {
            const ps = inScope.filter((p) => p.empresaId === e.id);
            const news = ps.reduce((n, p) => n + p.unseenCount, 0);
            const lc = activeLoose(e.id);
            const parts = [
              ps.length ? `${plural(ps.length, ['proyecto', 'proyectos'])} · ${[...new Set(ps.map((p) => KIND_LABEL[p.projectKind]))].join(', ')}` : 'Sin proyectos',
              lc ? plural(lc, ['tarea suelta', 'tareas sueltas']) : null,
            ].filter(Boolean);
            return (
              <a key={e.id} className="knx-emps-card" href={empresaHref(e.id)}>
                <span className="knx-emps-bar" style={{ background: e.color }} />
                <span className="knx-emps-main">
                  <b>{e.name}</b>
                  <span>{parts.join(' · ')}</span>
                </span>
                <span className="knx-emps-num"><b>{news}</b><span>{news === 1 ? 'novedad' : 'novedades'}</span></span>
              </a>
            );
          })}
        </div>
      )}

      <OverdueAlert od={od} people={people} projectHref={projectHref} looseHref={empresaHref} okLabel={`Nada vencido en ${scopeName}.`} />

      <PendingBox pending={pending} projectHref={projectHref} empresaHref={empresaHref} />

      <div className="knx-emps-sec"><h2>Proyectos <em>· {inScope.length}</em></h2></div>
      {!inScope.length
        ? <p className="knx-knowledge-empty">No tienes proyectos en esta empresa todavía.</p>
        : <ProjectsByKind ps={inScope} projectHref={projectHref} empresaById={byId} showEmpresa={multi} />}

      {newEmpresa && (
        <TaskPanel
          key="nueva"
          task={{}}
          empresa={newEmpresa}
          empresaChoices={visibleEmpresas}
          onEmpresaChange={setNewIn}
          people={people.filter((p) => p.empresaIds?.includes(newEmpresa.id))}
          canManage
          personId={data.personId ?? null}
          onClose={() => setNewIn(null)}
          onSave={createLoose}
        />
      )}
    </>
  );
}

// ── Panel de tarea suelta (crear y editar) ───────────────────────────────────
function TaskPanel({ task, empresa, people, canManage, personId, onClose, onSave, onDelete, empresaChoices, onEmpresaChange }) {
  const isNew = !task.id;
  const isMine = !!personId && task.responsables?.includes(personId);
  const canEdit = canManage;
  const [v, setV] = useState({
    nombre: task.nombre ?? '', descripcion: task.descripcion ?? '', status: task.status ?? 'todo', prioridad: task.prioridad ?? 'Media',
    fechaInicio: task.fechaInicio ?? (isNew ? today() : ''), fechaFin: task.fechaFin ?? '', estimatedHours: task.estimatedHours ?? '', actualHours: task.actualHours ?? '',
    responsables: task.responsables ?? (isNew && personId ? [personId] : []),
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setV((p) => ({ ...p, [k]: e.target.value }));
  const toggle = (id) => setV((p) => ({ ...p, responsables: p.responsables.includes(id) ? p.responsables.filter((x) => x !== id) : [...p.responsables, id] }));

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = async () => {
    if (!v.nombre.trim()) { setErr('Escribe el nombre de la tarea.'); return; }
    setBusy(true);
    setErr(null);
    const patch = canEdit ? v : { status: v.status, actualHours: v.actualHours, descripcion: v.descripcion };
    const error = await onSave(patch);
    setBusy(false);
    if (error) setErr(error);
  };

  return (
    <>
      <div className="knx-tdraw-scrim" onClick={onClose} aria-hidden="true" />
      <aside className="knx-tdraw" role="dialog" aria-modal="true" aria-label={isNew ? 'Nueva tarea' : 'Tarea'}>
        <div className="knx-tdraw-h">
          <h3>{isNew ? (empresaChoices ? 'Nueva tarea suelta' : `Nueva tarea · ${empresa.name}`) : 'Tarea'}</h3>
          <button type="button" className="knx-side-panel-close" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>
        <div className="knx-tdraw-b">
          {isNew && empresaChoices && (
            <label className="knx-emp-field"><span>Empresa</span>
              <select value={empresa.id} onChange={(e) => { onEmpresaChange(e.target.value); setV((p) => ({ ...p, responsables: p.responsables.filter((id) => id === personId) })); }} disabled={busy}>
                {empresaChoices.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </label>
          )}
          <label className="knx-emp-field"><span>Nombre</span><input value={v.nombre} onChange={set('nombre')} disabled={!canEdit || busy} placeholder="¿Qué hay que hacer?" autoFocus={isNew} /></label>
          <label className="knx-emp-field"><span>Descripción</span><textarea rows={4} value={v.descripcion} onChange={set('descripcion')} disabled={(!canEdit && !isMine) || busy} placeholder="Contexto, criterio de terminado…" /></label>
          <div className="knx-tdraw-two">
            <label className="knx-emp-field"><span>Estado</span>
              <select value={v.status} onChange={set('status')} disabled={(!canEdit && !isMine) || busy}>
                {STATUS_ORDER.map((k) => <option key={k} value={k}>{STATUS[k]}</option>)}
              </select>
            </label>
            <label className="knx-emp-field"><span>Prioridad</span>
              <select value={v.prioridad} onChange={set('prioridad')} disabled={!canEdit || busy}>{PRIORITIES.map((x) => <option key={x}>{x}</option>)}</select>
            </label>
          </div>
          <p className="knx-tdraw-hint">Al marcarla como Hecho queda «En revisión» hasta que la valida un Director o Supervisor que no sea responsable.</p>
          <div className="knx-tdraw-two">
            <label className="knx-emp-field"><span>Inicio</span><input type="date" value={v.fechaInicio ?? ''} onChange={set('fechaInicio')} disabled={!canEdit || busy} /></label>
            <label className="knx-emp-field"><span>Fin</span><input type="date" value={v.fechaFin ?? ''} onChange={set('fechaFin')} disabled={!canEdit || busy} /></label>
          </div>
          <div className="knx-tdraw-two">
            <label className="knx-emp-field"><span>Estimación (h)</span><input inputMode="decimal" value={v.estimatedHours ?? ''} onChange={set('estimatedHours')} disabled={!canEdit || busy} /></label>
            <label className="knx-emp-field"><span>Horas reales</span><input inputMode="decimal" value={v.actualHours ?? ''} onChange={set('actualHours')} disabled={(!canEdit && !isMine) || busy} /></label>
          </div>
          <div className="knx-emp-field">
            <span>Responsables</span>
            <div className="knx-tdraw-ppl">
              {people.length ? people.map((p) => (
                <label key={p.id} className="knx-role-check">
                  <input type="checkbox" checked={v.responsables.includes(p.id)} onChange={() => toggle(p.id)} disabled={!canEdit || busy} />
                  <span>{p.name}</span>
                </label>
              )) : <p className="knx-knowledge-empty">Nadie más tiene acceso a {empresa.name}.</p>}
            </div>
            <small className="knx-tdraw-hint">Solo personas con acceso a {empresa.name}.</small>
          </div>
          {err && <p className="knx-emp-err">{err}</p>}
        </div>
        <div className="knx-tdraw-f">
          {!isNew && canManage ? <button type="button" className="knx-admin-chip-btn knx-tdraw-del" onClick={onDelete} disabled={busy}>Eliminar</button> : <span />}
          <span className="knx-tdraw-actions">
            <button type="button" className="knx-admin-chip-btn" onClick={onClose} disabled={busy}>Cancelar</button>
            {(canEdit || isMine) && <button type="button" className="knx-admin-btn" onClick={save} disabled={busy}>{busy ? 'Guardando…' : isNew ? 'Crear tarea' : 'Guardar'}</button>}
          </span>
        </div>
      </aside>
    </>
  );
}

// ── Tareas sueltas de una empresa: lista, tablero y cronograma ────────────────
const TABS = [['act', 'Activas'], ['todo', 'Por hacer'], ['doing', 'Haciendo'], ['review', 'En revisión'], ['done', 'Terminadas'], ['all', 'Todas']];
const matchTab = (t, tab) => tab === 'all' || (tab === 'act' ? t.status !== 'done' : t.status === tab);

function LooseTasks({ tenant, empresa, people, onChanged }) {
  const [state, setState] = useState(null);
  const [tab, setTab] = useState('act');
  const [view, setView] = useState('lista');
  const [who, setWho] = useState('all');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null); // tarea | { } nueva
  const [removing, setRemoving] = useState(null);
  const [notice, setNotice] = useState(null);
  const url = `/api/kai-next/${tenant}/empresas/${empresa.id}/tasks`;

  const load = () => fetch(url).then((r) => r.json()).then((d) => setState(d.error ? { tasks: [], error: d.error } : d)).catch(() => setState({ tasks: [], error: 'No se pudieron cargar las tareas.' }));
  useEffect(() => { load(); }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!state) return <p className="knx-knowledge-empty">Cargando tareas…</p>;
  const { tasks = [], canManage, personId } = state;
  const nameOf = (id) => people.find((p) => p.id === id)?.name ?? '—';
  const whoNames = (t) => (t.responsables?.length ? t.responsables.map(nameOf).join(', ') : 'Sin responsable');
  const base = tasks.filter((t) => (who === 'all' || t.responsables?.includes(who)) && (!q.trim() || t.nombre.toLowerCase().includes(q.trim().toLowerCase())));
  const list = base.filter((t) => matchTab(t, tab)).sort((a, b) => (a.status === 'done') - (b.status === 'done') || String(a.fechaFin || '9').localeCompare(String(b.fechaFin || '9')));
  const canTouch = (t) => canManage || (!!personId && t.responsables?.includes(personId));

  const changeStatus = async (t, status) => {
    const { data, error } = await sendJson(`${url}/${t.id}`, 'PATCH', { status });
    if (error) { setNotice(error); return; }
    setNotice(data.sentToReview ? 'Quedó «En revisión»: la valida un Director o Supervisor.' : null);
    load(); onChanged?.();
  };
  const save = async (patch) => {
    const { data, error } = editing.id ? await sendJson(`${url}/${editing.id}`, 'PATCH', patch) : await sendJson(url, 'POST', patch);
    if (error) return error;
    setEditing(null);
    setNotice(data?.sentToReview ? 'Quedó «En revisión»: la valida un Director o Supervisor.' : null);
    load(); onChanged?.();
    return null;
  };
  const remove = async () => {
    const id = removing;
    setRemoving(null);
    setEditing(null);
    await sendJson(`${url}/${id}`, 'DELETE');
    load(); onChanged?.();
  };

  let body;
  if (view === 'tablero') {
    // Mismo tablero que las tareas de Proyectos: arrastrar entre columnas cambia el estado,
    // dentro de una columna reordena. Se actualiza al instante y se guarda en segundo plano.
    const patchLocal = (id, fields) => setState((st) => ({ ...st, tasks: st.tasks.map((x) => (x.id === id ? { ...x, ...fields } : x)) }));
    const saveOrder = async (id, order) => {
      patchLocal(id, { order });
      const { error } = await sendJson(`${url}/${id}`, 'PATCH', { order });
      if (error) { setNotice(error); load(); }
    };
    body = (
      <KaiNextTaskCanvas
        tasks={base}
        people={people}
        statuses={BOARD_COLUMNS}
        canManage={canManage}
        canMoveTask={canTouch}
        onStatusChange={async (id, status, order) => {
          patchLocal(id, { status, order });
          const { data, error } = await sendJson(`${url}/${id}`, 'PATCH', { status, order });
          if (error) { setNotice(error); load(); return; }
          setNotice(data.sentToReview ? 'Quedó «En revisión»: la valida un Director o Supervisor.' : null);
          load(); onChanged?.();
        }}
        onReorder={saveOrder}
        onBackfill={canManage ? saveOrder : () => {}}
        onSelectTask={(id) => setEditing(tasks.find((x) => x.id === id) ?? null)}
      />
    );
  } else if (view === 'crono') {
    const dated = list.filter((t) => t.fechaInicio && t.fechaFin);
    const min = dated.length ? dated.reduce((m, t) => (t.fechaInicio < m ? t.fechaInicio : m), dated[0].fechaInicio) : today();
    const max = dated.length ? dated.reduce((m, t) => (t.fechaFin > m ? t.fechaFin : m), dated[0].fechaFin) : today();
    const d0 = new Date(min); d0.setDate(d0.getDate() - 3);
    const d1 = new Date(max); d1.setDate(d1.getDate() + 3);
    const span = Math.max(7, (d1 - d0) / 864e5);
    const pos = (d) => Math.max(0, Math.min(100, ((new Date(d) - d0) / 864e5 / span) * 100));
    body = (
      <div className="knx-lt-gantt">
        {dated.map((t) => (
          <div key={t.id} className="knx-lt-gr">
            <button type="button" className="knx-lt-gl" onClick={() => setEditing(t)}><b>{t.nombre}</b><small>{whoNames(t)} · {fd(t.fechaInicio)} → {fd(t.fechaFin)}</small></button>
            <div className="knx-lt-ga">
              <span className={`knx-lt-bar knx-lt-bar--${isOverdue(t) ? 'od' : t.status}`} style={{ left: `${pos(t.fechaInicio)}%`, width: `${Math.max(2, pos(t.fechaFin) - pos(t.fechaInicio))}%` }} />
              <span className="knx-lt-today" style={{ left: `${pos(today())}%` }} />
            </div>
          </div>
        ))}
        {!dated.length && <p className="knx-knowledge-empty">No hay tareas con fechas.</p>}
        {list.length > dated.length && <p className="knx-knowledge-empty">{list.length - dated.length === 1 ? '1 tarea sin fechas no aparece' : `${list.length - dated.length} tareas sin fechas no aparecen`} en el cronograma.</p>}
      </div>
    );
  } else {
    body = list.length ? (
      <ul className="knx-lt-list">
        {list.map((t) => (
          <li key={t.id} className={`knx-lt-row${t.status === 'done' ? ' knx-lt-row--done' : ''}`}>
            <button
              type="button"
              className={`knx-lt-chk${t.status === 'done' ? ' knx-lt-chk--on' : t.status === 'review' ? ' knx-lt-chk--rev' : ''}`}
              aria-label={t.status === 'done' ? `Reabrir: ${t.nombre}` : `Marcar como hecha: ${t.nombre}`}
              disabled={!canTouch(t)}
              onClick={() => changeStatus(t, t.status === 'done' ? 'todo' : 'done')}
            />
            <button type="button" className="knx-lt-name" onClick={() => setEditing(t)}>
              <b>{t.nombre}</b>
              <small>{whoNames(t)}{t.fechaFin ? ` · ${fd(t.fechaInicio) || '—'} → ${fd(t.fechaFin)}` : ''}</small>
            </button>
            <span className="knx-lt-tags">
              {isOverdue(t) && <span className="knx-pcard-od">Vencida</span>}
              <span className={`knx-lt-st knx-lt-st--${t.status}`}>{STATUS[t.status]}</span>
              {t.prioridad === 'Alta' && <span className="knx-lt-pri">Alta</span>}
            </span>
          </li>
        ))}
      </ul>
    ) : <p className="knx-knowledge-empty">No hay tareas sueltas con estos filtros.</p>;
  }

  const responsablesPeople = people.filter((p) => p.empresaIds?.includes(empresa.id) || tasks.some((t) => t.responsables?.includes(p.id)));

  return (
    <section className="knx-lt">
      <div className="knx-lt-top">
        {/* En Tablero las columnas ya son los estados: las pestañas solo filtran Lista y Cronograma.
            "Activas" = todo lo que no está Hecho (Por hacer, Haciendo y En revisión). */}
        {view === 'tablero' ? <span /> : (
          <div className="knx-pt-nav knx-lt-tabs" role="tablist">
            {TABS.map(([k, label]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} className={`knx-pt-tab${tab === k ? ' knx-pt-tab--on' : ''}`} onClick={() => setTab(k)} title={k === 'act' ? 'Todo lo que no está Hecho: Por hacer, Haciendo y En revisión' : undefined}>
                {label}<span className="knx-pt-count">{base.filter((t) => matchTab(t, k)).length}</span>
              </button>
            ))}
          </div>
        )}
        <div className="knx-lt-views" role="group" aria-label="Vista">
          {[['lista', 'Lista'], ['tablero', 'Tablero'], ['crono', 'Cronograma']].map(([k, label]) => (
            <button key={k} type="button" aria-pressed={view === k} onClick={() => setView(k)}>{label}</button>
          ))}
        </div>
      </div>
      <div className="knx-lt-filters">
        <label className="knx-lt-sel">Responsable
          <select value={who} onChange={(e) => setWho(e.target.value)}>
            <option value="all">Todos</option>
            {responsablesPeople.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <input className="knx-lt-search" type="search" placeholder="Buscar tarea" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar tarea" />
        {canManage && <button type="button" className="knx-analisis-sources-save" onClick={() => setEditing({})}>+ Nueva tarea</button>}
      </div>
      {notice && <p className="knx-lt-notice">{notice}</p>}
      {state.error && <p className="knx-emp-err">{state.error}</p>}
      {body}
      {editing && (
        <TaskPanel
          task={editing}
          empresa={empresa}
          people={people.filter((p) => p.empresaIds?.includes(empresa.id))}
          canManage={canManage}
          personId={personId}
          onClose={() => setEditing(null)}
          onSave={save}
          onDelete={() => setRemoving(editing.id)}
        />
      )}
      <KaiNextConfirmDialog
        open={!!removing}
        title="Eliminar tarea"
        message="¿Eliminar esta tarea? No se puede deshacer."
        onConfirm={remove}
        onCancel={() => setRemoving(null)}
      />
    </section>
  );
}

// ── Resumen de una empresa ───────────────────────────────────────────────────
function EmpresaResumen({ tenant, data, empresa, people, projectHref, basePath, onChanged }) {
  const ps = data.projects.filter((p) => p.empresaId === empresa.id);
  const loose = data.loose[empresa.id] ?? [];
  const od = data.overdue.filter((o) => o.empresaId === empresa.id);
  const peopleCount = people.filter((p) => p.empresaIds?.includes(empresa.id)).length;
  const pending = data.pending.filter((p) => p.empresaId === empresa.id);

  return (
    <>
      <a className="knx-emps-back" href={`${basePath}/${tenant}/empresas`}>← Empresas</a>
      <div className="knx-emps-title"><span style={{ background: empresa.color }} /><h1 className="knx-emps-h1">{empresa.name}</h1></div>
      <p className="knx-emps-sub">
        {plural(ps.length, ['proyecto', 'proyectos'])} · {plural(loose.filter((t) => t.status !== 'done').length, ['tarea suelta activa', 'tareas sueltas activas'])} · {plural(peopleCount, ['persona con acceso', 'personas con acceso'])}
      </p>

      <OverdueAlert od={od} people={people} projectHref={projectHref} okLabel={`Nada vencido en ${empresa.name}.`} />

      <PendingBox pending={pending} projectHref={projectHref} empresaHref={() => '#tareas-sueltas'} />

      <div className="knx-emps-sec"><h2>Proyectos <em>· {ps.length}</em></h2></div>
      {!ps.length && <p className="knx-knowledge-empty">Esta empresa todavía no tiene proyectos que puedas ver.</p>}
      <ProjectsByKind ps={ps} projectHref={projectHref} empresaById={new Map([[empresa.id, empresa]])} showEmpresa={false} />

      <div className="knx-emps-sec" id="tareas-sueltas">
        <div>
          <h2>Tareas sueltas <em>· {loose.length}</em></h2>
          <p className="knx-emps-hint">Pendientes de {empresa.name} que no pertenecen a ningún proyecto.</p>
        </div>
      </div>
      <LooseTasks tenant={tenant} empresa={empresa} people={people} onChanged={onChanged} />
    </>
  );
}

export default function KaiNextEmpresas({ tenant, tenantName, basePath, userName, userHandle, isTeamUser, empresaId, people }) {
  const emp = useEmpresaScope(tenant);
  const [data, setData] = useState(null);
  const [chats, setChats] = useState([]);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleteChatTarget, setDeleteChatTarget] = useState(null);

  const load = () => {
    fetch(`/api/kai-next/${tenant}/overview${empresaId ? `?empresa=${encodeURIComponent(empresaId)}` : ''}`)
      .then((r) => r.json())
      .then((d) => setData(d.error ? { error: d.error } : d))
      .catch(() => setData({ error: 'No se pudo cargar. Revisa tu conexión e intenta de nuevo.' }));
  };
  useEffect(load, [tenant, empresaId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetch(`/api/kai-next/${tenant}`).then((r) => r.json()).then((d) => setChats(d.conversations ?? [])).catch(() => null);
  }, [tenant]);

  // Elegir una empresa en el selector, estando en el resumen de otra, lleva a la elegida.
  useEffect(() => {
    if (empresaId && emp.scope !== 'all' && emp.scope !== empresaId && !emp.fixed) {
      window.location.href = `${basePath}/${tenant}/empresas/${emp.scope}`;
    }
  }, [emp.scope]); // eslint-disable-line react-hooks/exhaustive-deps

  const from = empresaId ? `empresas/${empresaId}` : 'empresas';
  const projectHref = (id, tab) => `${basePath}/${tenant}/proyectos?p=${id}${tab ? `&tab=${tab}` : ''}&from=${encodeURIComponent(from)}`;
  const empresaHref = (id) => `${basePath}/${tenant}/empresas/${id}`;
  const empresa = useMemo(() => data?.empresas?.find((e) => e.id === empresaId) ?? null, [data, empresaId]);

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
  const confirmDeleteChat = async () => {
    const id = deleteChatTarget?.id;
    setDeleteChatTarget(null);
    if (!id) return;
    await fetch(`/api/kai-next/${tenant}?conversationId=${id}`, { method: 'DELETE' });
    setChats((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="knx-shell">
      <KaiNextSidebar
        tenant={tenant} tenantName={tenantName} userName={userName} userHandle={userHandle}
        isTeamUser={isTeamUser} basePath={basePath} chats={chats}
        onDeleteChat={(id) => setDeleteChatTarget({ id })} onLogout={handleLogout} loggingOut={loggingOut}
        active={empresaId ? `empresa:${empresaId}` : 'empresas'}
      />
      <main className="knx-main">
        <div className="knx-analisis-page knx-emps">
          {!data && <p className="knx-knowledge-empty">Cargando…</p>}
          {data?.error && (
            <div className="knx-analisis-empty"><p>{data.error}</p><button type="button" className="knx-canvas-mini" onClick={load}>Reintentar</button></div>
          )}
          {data && !data.error && !empresaId && <EmpresasHome tenant={tenant} data={data} emp={emp} people={people} projectHref={projectHref} empresaHref={empresaHref} />}
          {data && !data.error && empresaId && (empresa
            ? <EmpresaResumen tenant={tenant} data={data} empresa={empresa} people={people} projectHref={projectHref} basePath={basePath} onChanged={load} />
            : <div className="knx-analisis-empty"><p>No tienes acceso a esta empresa.</p><a className="knx-canvas-mini" href={`${basePath}/${tenant}/empresas`}>Volver a Empresas</a></div>)}
        </div>
      </main>
      <KaiNextConfirmDialog
        open={!!deleteChatTarget}
        title="Eliminar conversación"
        message="¿Eliminar esta conversación? No se puede deshacer."
        onConfirm={confirmDeleteChat}
        onCancel={() => setDeleteChatTarget(null)}
      />
    </div>
  );
}
