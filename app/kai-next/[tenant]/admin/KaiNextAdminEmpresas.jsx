'use client';

import { useEffect, useState } from 'react';

// Admin › Empresas — el nivel entre el tenant y sus proyectos (ver lib/kaiNext/empresas.js).
// Si el tenant no crea ninguna, la capa no existe y Kai se ve igual que siempre.
const COLORS = ['#0E7C5A', '#2F5FA8', '#7A3FB0', '#B45309', '#BE185D', '#0F766E', '#4D5BD6', '#A16207', '#64748B'];

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

function ColorPicker({ value, onChange, disabled }) {
  return (
    <div className="knx-emp-colors" role="radiogroup" aria-label="Color">
      {COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={`Color ${c}`}
          className={`knx-emp-color${value === c ? ' knx-emp-color--on' : ''}`}
          style={{ background: c }}
          disabled={disabled}
          onClick={() => onChange(c)}
        />
      ))}
    </div>
  );
}

function EmpresaForm({ initial, submitLabel, onSubmit, onCancel }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [color, setColor] = useState(initial?.color ?? COLORS[0]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setErr(null);
    const error = await onSubmit({ name: name.trim(), description: description.trim(), color });
    setBusy(false);
    if (error) setErr(error);
  };

  return (
    <form className="knx-emp-form" onSubmit={submit}>
      <label className="knx-emp-field">
        <span>Nombre</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Induminorte" autoFocus disabled={busy} maxLength={60} />
      </label>
      <label className="knx-emp-field">
        <span>Descripción <em>(opcional)</em></span>
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej. Holding: proyectos corporativos y contexto común" disabled={busy} maxLength={200} />
      </label>
      <div className="knx-emp-field">
        <span>Color</span>
        <ColorPicker value={color} onChange={setColor} disabled={busy} />
      </div>
      <div className="knx-emp-form-foot">
        {err && <span className="knx-emp-err">{err}</span>}
        <button type="button" className="knx-admin-chip-btn" onClick={onCancel} disabled={busy}>Cancelar</button>
        <button type="submit" className="knx-admin-btn" disabled={busy || !name.trim()}>{busy ? 'Guardando…' : submitLabel}</button>
      </div>
    </form>
  );
}

// Proyectos que aún no tienen empresa: se ven según el rol, como antes de existir empresas.
// Asignarlos es lo que activa la restricción por empresa para cada uno.
function UnassignedProjects({ projects, empresas, onAssign }) {
  const [selected, setSelected] = useState(new Set(projects.map((p) => p.id)));
  const [empresaId, setEmpresaId] = useState(empresas.length === 1 ? empresas[0].id : '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const toggle = (id) => setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const assign = async () => {
    if (!empresaId || !selected.size || busy) return;
    setBusy(true);
    setErr(null);
    const error = await onAssign(empresaId, [...selected]);
    setBusy(false);
    if (error) setErr(error);
  };

  return (
    <div className="knx-emp-note knx-emp-note--warn">
      <b>{projects.length} {projects.length === 1 ? 'proyecto no tiene' : 'proyectos no tienen'} empresa.</b>{' '}
      Mientras tanto se ven como siempre, según el rol de cada persona. Al asignarlos, solo los verán quienes tengan esa empresa.
      <ul className="knx-emp-unassigned">
        {projects.map((p) => (
          <li key={p.id}>
            <label className="knx-role-check">
              <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} disabled={busy} />
              <span>{p.name}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="knx-emp-form-foot" style={{ justifyContent: 'flex-start' }}>
        <select className="knx-emp-select" value={empresaId} onChange={(e) => setEmpresaId(e.target.value)} disabled={busy} aria-label="Empresa a asignar">
          <option value="">Elige una empresa</option>
          {empresas.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <button type="button" className="knx-admin-btn" onClick={assign} disabled={busy || !empresaId || !selected.size}>
          {busy ? 'Asignando…' : `Asignar ${selected.size} ${selected.size === 1 ? 'proyecto' : 'proyectos'}`}
        </button>
        {err && <span className="knx-emp-err">{err}</span>}
      </div>
    </div>
  );
}

export default function KaiNextAdminEmpresas({ tenant }) {
  const [data, setData] = useState(undefined);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [rowErr, setRowErr] = useState({});

  const load = () => {
    fetch(`/api/kai-next/${tenant}/empresas?admin=1`)
      .then((r) => r.json())
      .then((d) => setData(d.error ? { empresas: [], unassignedProjects: [], error: d.error } : d))
      .catch(() => setData({ empresas: [], unassignedProjects: [], error: 'No se pudieron cargar las empresas.' }));
  };
  useEffect(load, [tenant]);

  const send = async (url, method, body) => {
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return d.error || 'No se pudo guardar.';
      load();
      return null;
    } catch {
      return 'Error de conexión.';
    }
  };

  const create = async (body) => {
    const error = await send(`/api/kai-next/${tenant}/empresas`, 'POST', body);
    if (!error) setAdding(false);
    return error;
  };

  const update = async (id, body) => {
    const error = await send(`/api/kai-next/${tenant}/empresas/${id}`, 'PATCH', body);
    if (!error) setEditingId(null);
    return error;
  };

  const toggleVisible = async (e) => {
    const error = await send(`/api/kai-next/${tenant}/empresas/${e.id}`, 'PATCH', { visible: !e.visible });
    setRowErr((p) => ({ ...p, [e.id]: error }));
  };

  const remove = async (e) => {
    if (!confirm(`¿Eliminar la empresa «${e.name}»?`)) return;
    const error = await send(`/api/kai-next/${tenant}/empresas/${e.id}`, 'DELETE');
    setRowErr((p) => ({ ...p, [e.id]: error }));
  };

  const empresas = data?.empresas ?? [];

  return (
    <div className="knx-admin-section">
      <div className="knx-emp-head">
        <div>
          <h2>Empresas{empresas.length ? ` · ${empresas.length}` : ''}</h2>
          <p className="knx-admin-section-sub">
            Cada proyecto pertenece a una empresa, y cada persona ve solo las empresas que tiene asignadas en Equipo.
            El rol dice qué puede hacer; las empresas, qué puede ver.
          </p>
        </div>
        {!adding && <button type="button" className="knx-admin-btn" onClick={() => { setAdding(true); setEditingId(null); }}>+ Nueva empresa</button>}
      </div>

      {adding && <EmpresaForm submitLabel="Crear empresa" onSubmit={create} onCancel={() => setAdding(false)} initial={{ color: COLORS[empresas.length % COLORS.length] }} />}

      {data === undefined && <p className="knx-admin-loading">Cargando…</p>}
      {data?.error && <p className="knx-emp-err">{data.error}</p>}

      {data && !data.error && empresas.length === 0 && !adding && (
        <div className="knx-emp-empty">
          <b>Este tenant no usa empresas.</b>
          <p>Kai se ve como siempre: todos los proyectos juntos. Crea empresas solo si el cliente tiene varias (por ejemplo, un grupo con distintas compañías) y cada persona debe ver solo las suyas.</p>
        </div>
      )}

      {empresas.length > 0 && (
        <ul className="knx-emp-list">
          {empresas.map((e) => (
            <li key={e.id} className="knx-emp-item">
              {editingId === e.id ? (
                <EmpresaForm initial={e} submitLabel="Guardar" onSubmit={(body) => update(e.id, body)} onCancel={() => setEditingId(null)} />
              ) : (
                <div className="knx-emp-row">
                  <span className="knx-emp-swatch" style={{ background: e.color }} aria-hidden="true" />
                  <div className="knx-emp-main">
                    <b>{e.name}</b>
                    {e.description && <span className="knx-emp-desc">{e.description}</span>}
                    <span className="knx-emp-meta">
                      {e.projectCount} {e.projectCount === 1 ? 'proyecto' : 'proyectos'} · {e.people.length} {e.people.length === 1 ? 'persona' : 'personas'}
                      {e.projectCount === 0 && ' · no aparece en el selector hasta que tenga un proyecto'}
                    </span>
                  </div>
                  <span className="knx-emp-people" aria-label={e.people.map((p) => p.name).join(', ') || 'Sin personas'}>
                    {e.people.slice(0, 5).map((p) => <span key={p.id} className="knx-emp-av" title={p.name}>{initials(p.name)}</span>)}
                    {e.people.length > 5 && <span className="knx-emp-av knx-emp-av--more">+{e.people.length - 5}</span>}
                  </span>
                  <label className="knx-emp-vis" title="Mostrar en el selector de empresa de Kai">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!!e.visible}
                      aria-label={`Visible en el selector: ${e.name}`}
                      className="knx-switch"
                      onClick={() => toggleVisible(e)}
                    />
                    <span>{e.visible ? 'Visible' : 'Oculta'}</span>
                  </label>
                  <div className="knx-emp-actions">
                    <button type="button" className="knx-admin-chip-btn knx-admin-chip-btn--sm" onClick={() => { setEditingId(e.id); setAdding(false); }}>Editar</button>
                    <button type="button" className="knx-admin-chip-btn knx-admin-chip-btn--sm" onClick={() => remove(e)}>Eliminar</button>
                  </div>
                  {rowErr[e.id] && <span className="knx-emp-err knx-emp-row-err">{rowErr[e.id]}</span>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {empresas.length > 0 && data?.unassignedProjects?.length > 0 && (
        <UnassignedProjects
          projects={data.unassignedProjects}
          empresas={empresas}
          onAssign={async (empresaId, projectIds) => {
            const error = await send(`/api/kai-next/${tenant}/empresas/${empresaId}`, 'POST', { projectIds });
            return error;
          }}
        />
      )}

      {empresas.length > 0 && (
        <p className="knx-emp-note">
          Si el cliente es un grupo, conviene una empresa para lo del holding (proyectos corporativos, políticas, contexto común).
          Se asigna a las personas igual que las demás. Una empresa oculta o sin proyectos no aparece en el selector de Kai.
        </p>
      )}
    </div>
  );
}
