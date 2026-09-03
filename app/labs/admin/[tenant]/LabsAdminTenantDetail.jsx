'use client';

import { useEffect, useState } from 'react';

const SA_EMAIL = 'id-aria-platform@bonsight-web.iam.gserviceaccount.com';
const PROJECT_KINDS = [
  { id: 'experimental', label: 'Experimental', hint: 'Pruebas y aportes tipo lab de innovación.' },
  { id: 'civil', label: 'Civil', hint: 'Obra civil — Cronograma, Presupuesto, partidas.' },
  { id: 'seguimiento', label: 'Seguimiento', hint: 'Seguimiento de tareas genérico — Cronograma sin presupuesto.' },
];

export default function LabsAdminTenantDetail({ tenant, tenantMeta }) {
  const tenantUrl = `https://labs.bonsight.co/${tenant}`;

  return (
    <div className="labs-page-shell">
    <div className="labs-admin-wrap">
      <a href="/admin" className="chip-btn" style={{ marginBottom: 18, display: 'inline-block', textDecoration: 'none' }}>← Todos los tenants</a>
      <h1 className="labs-admin-title">{tenantMeta.name}</h1>

      <div className="card">
        <div className="section-title" style={{ color: 'var(--labs-cream)' }}>Acceso</div>
        <div style={{ marginTop: 10, fontSize: 13.5, color: 'var(--labs-cream-dim)', lineHeight: 1.8 }}>
          <div>URL: <a href={tenantUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--labs-living)' }}>{tenantUrl}</a></div>
          <div>Código de acceso: <span style={{ fontFamily: 'var(--labs-mono)', color: 'var(--labs-cream)' }}>{tenantMeta.accessCode}</span></div>
        </div>
      </div>

      <ProjectKindsPanel tenant={tenant} initialAllowed={tenantMeta.allowedProjectKinds} />

      <TeamPanel tenant={tenant} />

      <DriveConnectPanel tenant={tenant} />
    </div>

      <div className="labs-powered-by">
        <img src="/assets/bonsight-isotipo.png" alt="Bonsight" />
        <span>Powered by Bonsight</span>
      </div>
    </div>
  );
}

// allowedProjectKinds vacío/ausente = sin restricción — se muestra todo tildado por defecto,
// consistente con cómo lo interpreta el backend (ver lib/labs/tenants.js).
function ProjectKindsPanel({ tenant, initialAllowed }) {
  const [allowed, setAllowed] = useState(new Set(initialAllowed?.length ? initialAllowed : PROJECT_KINDS.map((k) => k.id)));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggle = (id) => {
    setSaved(false);
    setAllowed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch(`/api/labs/${tenant}/meta`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowedProjectKinds: [...allowed] }),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="section-title" style={{ color: 'var(--labs-cream)' }}>Tipos de proyecto habilitados</div>
      <p style={{ fontSize: 12.5, color: 'var(--labs-cream-faint)', marginTop: 4, marginBottom: 12 }}>
        Define qué opciones ve el Director de este cliente al crear un proyecto nuevo.
      </p>
      {PROJECT_KINDS.map((k) => (
        <label key={k.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', cursor: 'pointer' }}>
          <input type="checkbox" checked={allowed.has(k.id)} onChange={() => toggle(k.id)} style={{ marginTop: 3 }} />
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--labs-cream)' }}>{k.label}</div>
            <div style={{ fontSize: 12, color: 'var(--labs-cream-faint)' }}>{k.hint}</div>
          </div>
        </label>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
        <button className="btn btn-primary" disabled={saving || allowed.size === 0} onClick={save}>{saving ? 'Guardando…' : 'Guardar'}</button>
        {saved && <span style={{ fontSize: 12, color: 'var(--labs-living)' }}>Guardado.</span>}
      </div>
    </div>
  );
}

const ROLES = ['Registrador', 'Supervisor', 'Director'];

const IconPencil = ({ className }) => (
  <svg className={className} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
  </svg>
);

// Autoservicio inverso: acá edita el admin (a diferencia de PATCH .../users/me, que es la
// propia persona editando su nombre desde adentro de Labs) — mismo patrón de lapicito que
// los títulos de tarea en el Sprint board de Aria.
function EditableUserName({ tenant, user, onRenamed }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(user.name);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === user.name) { setEditing(false); return; }
    setSaving(true);
    try {
      await fetch(`/api/labs/${tenant}/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      onRenamed();
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <input
        className="labs-tenant-name-input"
        value={value}
        autoFocus
        disabled={saving}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
        onBlur={save}
      />
    );
  }
  return (
    <button type="button" className="labs-tenant-name labs-name-edit-trigger" onClick={() => { setValue(user.name); setEditing(true); }} title="Editar nombre">
      {user.name}
      <IconPencil className="labs-name-edit-pencil" />
    </button>
  );
}

function TeamPanel({ tenant }) {
  const [users, setUsers] = useState(undefined); // undefined = cargando
  const [name, setName] = useState('');
  const [role, setRole] = useState('Registrador');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const load = () => {
    fetch(`/api/labs/${tenant}/users`)
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []))
      .catch(() => setUsers([]));
  };

  useEffect(() => { load(); }, [tenant]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/labs/${tenant}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'No se pudo crear.'); return; }
      setName('');
      load();
    } catch {
      setErr('Error de conexión.');
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (userId, newRole) => {
    await fetch(`/api/labs/${tenant}/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    });
    load();
  };

  const removeUser = async (userId) => {
    await fetch(`/api/labs/${tenant}/users/${userId}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="card">
      <div className="section-title" style={{ color: 'var(--labs-cream)' }}>Equipo</div>
      <p style={{ fontSize: 12.5, color: 'var(--labs-cream-faint)', marginTop: 4, marginBottom: 12 }}>
        Cada persona entra con su código individual — el rol define qué puede hacer adentro (solo Director crea proyectos, Supervisor asigna Registradores en las pruebas).
      </p>

      <form onSubmit={handleCreate} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <input type="text" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Creando…' : '+ Agregar'}</button>
      </form>
      {err && <p style={{ color: '#E19680', fontSize: 12.5, marginBottom: 12 }}>{err}</p>}

      {users === undefined && <p className="empty-note">Cargando…</p>}
      {users?.length === 0 && <p className="empty-note">Todavía no hay nadie en el equipo.</p>}
      {users?.map((u) => (
        <div key={u.id} className="labs-tenant-row" style={{ alignItems: 'center' }}>
          <div>
            <EditableUserName tenant={tenant} user={u} onRenamed={load} />
            <div className="labs-tenant-meta">
              Código: <span style={{ fontFamily: 'var(--labs-mono)' }}>{u.accessCode}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <button className="chip-btn" onClick={() => removeUser(u.id)}>Eliminar</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function DriveConnectPanel({ tenant }) {
  const [config, setConfig] = useState(undefined); // undefined = cargando, null = sin conectar
  const [folderInput, setFolderInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const load = () => {
    fetch(`/api/labs/${tenant}/drive`)
      .then((r) => r.json())
      .then((d) => setConfig(d.config ?? null))
      .catch(() => setConfig(null));
  };

  useEffect(() => { load(); }, [tenant]);

  const connect = async (e) => {
    e.preventDefault();
    if (!folderInput.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/labs/${tenant}/drive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: folderInput }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'No se pudo conectar.'); return; }
      setConfig(data.config);
      setFolderInput('');
    } catch {
      setErr('Error de conexión.');
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await fetch(`/api/labs/${tenant}/drive`, { method: 'DELETE' });
      setConfig(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <div className="section-title" style={{ color: 'var(--labs-cream)' }}>Repositorio de Drive</div>
      <p style={{ fontSize: 12.5, color: 'var(--labs-cream-faint)', marginTop: 4, marginBottom: 12 }}>
        Los aportes con evidencia y los reportes generados van a quedar guardados acá, organizados por proyecto.
      </p>

      {config === undefined && <p className="empty-note">Cargando…</p>}

      {config === null && (
        <>
          <div className="missing-prompt" style={{ marginBottom: 14 }}>
            <span className="mp-ic">⚠</span>
            <div className="mp-text">
              Antes de conectar, compartí la carpeta en Drive con <b style={{ fontFamily: 'var(--labs-mono)', fontSize: 12 }}>{SA_EMAIL}</b> como <b>Editor</b> — Labs necesita crear carpetas y subir archivos ahí, no solo leer.
            </div>
          </div>
          <form onSubmit={connect} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input type="text" placeholder="Link o ID de la carpeta de Drive" value={folderInput} onChange={(e) => setFolderInput(e.target.value)} style={{ flex: 1, minWidth: 220 }} />
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Conectando…' : 'Conectar'}</button>
          </form>
          {err && <p style={{ color: '#E19680', fontSize: 12.5, marginTop: 8 }}>{err}</p>}
        </>
      )}

      {config && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13.5, color: 'var(--labs-cream-dim)' }}>
            📁 <b style={{ color: 'var(--labs-cream)' }}>{config.folderName}</b>
            <div style={{ fontSize: 11.5, color: 'var(--labs-cream-faint)', marginTop: 2 }}>Conectado {new Date(config.connectedAt).toLocaleDateString('es-ES')}</div>
          </div>
          <button className="chip-btn" disabled={busy} onClick={disconnect}>{busy ? '…' : 'Desconectar'}</button>
        </div>
      )}
    </div>
  );
}
