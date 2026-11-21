'use client';

import { useEffect, useState } from 'react';
import { KAI_NEXT_SECTIONS } from '@/lib/kaiNext/capabilities';

// Roles del tenant (ver lib/kaiNext/roles.js): cada rol es una plantilla de lo que la persona
// puede HACER. Al asignarlo en Equipo se copian sus funcionalidades, que después se pueden
// ajustar por persona. Lo que cambie acá se aplica a quienes tienen el rol y no fueron
// ajustados a mano. Solo lo edita un admin con acceso completo.
const ADMIN_OPTIONS = [
  { id: '', label: 'No entra al Admin' },
  { id: 'team', label: 'Admin de Equipo y Empresas' },
  { id: 'full', label: 'Admin completo' },
];
const ADMIN_LABEL = { team: 'Admin de Equipo y Empresas', full: 'Admin completo' };

function RoleEditor({ initial, onSubmit, onCancel, submitLabel }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [admin, setAdmin] = useState(initial?.admin ?? '');
  const [sections, setSections] = useState(new Set(initial?.sections ?? KAI_NEXT_SECTIONS.map((s) => s.id)));
  const [caps, setCaps] = useState(new Set(initial?.capabilities ?? []));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const toggle = (setter, id) => setter((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!name.trim()) { setErr('Ponle un nombre al rol.'); return; }
    if (!sections.size) { setErr('Elige al menos una sección.'); return; }
    setBusy(true);
    setErr(null);
    // Una capacidad de una sección apagada no sirve de nada: no se guarda.
    const capabilities = [...caps].filter((c) => KAI_NEXT_SECTIONS.some((s) => sections.has(s.id) && s.capabilities.some((x) => x.id === c)));
    const error = await onSubmit({ name: name.trim(), description: description.trim(), admin: admin || null, sections: [...sections], capabilities });
    setBusy(false);
    if (error) setErr(error);
  };

  return (
    <form className="knx-role-editor" onSubmit={submit}>
      <div className="knx-role-editor-grid">
        <label className="knx-emp-field">
          <span>Nombre</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Supervisor" maxLength={40} disabled={busy} autoFocus />
        </label>
        <label className="knx-emp-field">
          <span>Admin</span>
          <select value={admin} onChange={(e) => setAdmin(e.target.value)} disabled={busy}>
            {ADMIN_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
      </div>
      <label className="knx-emp-field">
        <span>Qué hace <em>(opcional)</em></span>
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej. Lleva sus proyectos: crea tareas y pruebas, registra resultados" maxLength={200} disabled={busy} />
      </label>

      <div className="knx-role-sections">
        <span className="knx-role-sections-title">Qué puede ver y hacer</span>
        {KAI_NEXT_SECTIONS.map((s) => {
          const on = sections.has(s.id);
          return (
            <div key={s.id} className="knx-role-section">
              <label className="knx-role-check">
                <input type="checkbox" checked={on} onChange={() => toggle(setSections, s.id)} disabled={busy} />
                <span><b>{s.label}</b><small>{s.description}</small></span>
              </label>
              {s.capabilities.length > 0 && (
                <div className={`knx-role-caps${on ? '' : ' knx-role-caps--off'}`}>
                  {s.capabilities.map((c) => (
                    <label key={c.id} className="knx-role-check knx-role-check--cap">
                      <input type="checkbox" checked={caps.has(c.id)} onChange={() => toggle(setCaps, c.id)} disabled={busy || !on} />
                      <span>{c.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="knx-emp-form-foot">
        {err && <span className="knx-emp-err">{err}</span>}
        <button type="button" className="knx-admin-chip-btn" onClick={onCancel} disabled={busy}>Cancelar</button>
        <button type="submit" className="knx-admin-btn" disabled={busy}>{busy ? 'Guardando…' : submitLabel}</button>
      </div>
    </form>
  );
}

export default function KaiNextAdminRoles({ tenant, onChanged }) {
  const [data, setData] = useState(undefined);
  const [users, setUsers] = useState([]);
  const [editingId, setEditingId] = useState(null); // id | 'new' | null
  const [notice, setNotice] = useState(null);

  const load = () => {
    fetch(`/api/kai-next/${tenant}/roles`).then((r) => r.json()).then(setData).catch(() => setData({ roles: [], error: 'No se pudieron cargar los roles.' }));
    fetch(`/api/kai/${tenant}/tenant-users`).then((r) => r.json()).then((d) => setUsers(d.users ?? [])).catch(() => {});
  };
  useEffect(load, [tenant]);

  // Solo el admin completo ve el editor de roles; el resto los ve al asignarlos en Equipo.
  if (!data?.canEdit) return null;

  const send = async (url, method, body) => {
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return { error: d.error || 'No se pudo guardar.' };
      load();
      onChanged?.();
      return d;
    } catch {
      return { error: 'Error de conexión.' };
    }
  };

  const save = async (role, body) => {
    const d = role ? await send(`/api/kai-next/${tenant}/roles/${role.id}`, 'PATCH', body) : await send(`/api/kai-next/${tenant}/roles`, 'POST', body);
    if (d.error) return d.error;
    setEditingId(null);
    setNotice(d.updatedPeople ? `Se actualizó a ${d.updatedPeople} ${d.updatedPeople === 1 ? 'persona' : 'personas'} con este rol.` : null);
    return null;
  };

  const toggleActive = async (role) => {
    const d = await send(`/api/kai-next/${tenant}/roles/${role.id}`, 'PATCH', { active: role.active === false });
    setNotice(d.error ?? null);
  };

  const peopleWith = (id) => users.filter((u) => u.roleId === id && u.active !== false);

  return (
    <div className="admin-detail-card knx-roles">
      <div className="knx-emp-head">
        <div>
          <p className="eq-header-title">Roles{data.roles.length ? <span className="eq-header-count"> · {data.roles.length}</span> : null}</p>
          <p className="eq-header-sub">Cada rol trae lo que la persona puede hacer. Al asignarlo en Equipo se puede ajustar persona por persona. Las empresas que ve se asignan aparte.</p>
        </div>
        {editingId !== 'new' && <button type="button" className="eq-add-btn" onClick={() => setEditingId('new')}>+ Nuevo rol</button>}
      </div>

      {notice && <p className="knx-emp-note">{notice}</p>}

      {editingId === 'new' && (
        <RoleEditor submitLabel="Crear rol" initial={{ sections: KAI_NEXT_SECTIONS.map((s) => s.id), capabilities: [] }} onSubmit={(body) => save(null, body)} onCancel={() => setEditingId(null)} />
      )}

      <ul className="knx-role-list">
        {data.roles.map((r) => {
          const people = peopleWith(r.id);
          return (
            <li key={r.id} className={`knx-role-item${r.active === false ? ' knx-role-item--off' : ''}`}>
              {editingId === r.id ? (
                <RoleEditor submitLabel="Guardar rol" initial={r} onSubmit={(body) => save(r, body)} onCancel={() => setEditingId(null)} />
              ) : (
                <div className="knx-role-row">
                  <div className="knx-emp-main">
                    <b>{r.name}{r.active === false && <span className="knx-badge knx-badge--off" style={{ marginLeft: 8 }}>Desactivado</span>}</b>
                    {r.description && <span className="knx-emp-desc">{r.description}</span>}
                    <span className="knx-emp-meta">
                      {people.length ? people.map((p) => p.name).join(', ') : 'Nadie con este rol'}
                      {r.admin ? ` · ${ADMIN_LABEL[r.admin]}` : ''}
                    </span>
                  </div>
                  <div className="knx-emp-actions">
                    <button type="button" className="knx-admin-chip-btn knx-admin-chip-btn--sm" onClick={() => setEditingId(r.id)}>Editar</button>
                    <button type="button" className="knx-admin-chip-btn knx-admin-chip-btn--sm" onClick={() => toggleActive(r)}>{r.active === false ? 'Activar' : 'Desactivar'}</button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
