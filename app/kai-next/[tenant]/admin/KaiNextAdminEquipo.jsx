'use client';

import { useEffect, useState } from 'react';
import { KAI_NEXT_SECTIONS, PROJECT_ROLES, PROJECT_ROLE_CAPS, NO_CAPABILITIES, projectRoleOf } from '@/lib/kaiNext/capabilities';

// Admin › Equipo de Kai Next (rediseño 2026-11-24): tabla con rol, empresas, funcionalidades y
// último acceso; "Editar" abre un panel lateral con dos pestañas (Acceso y funcionalidades /
// Datos personales). Usa las mismas rutas que el admin legacy (/api/kai/[tenant]/tenant-users),
// que ya aplican los límites del admin de alcance "equipo" (no puede dar Admin completo).

const TIMEZONE_OPTIONS = [
  { id: 'America/Mexico_City', label: 'México' },
  { id: 'America/Bogota', label: 'Colombia' },
  { id: 'America/Lima', label: 'Perú' },
  { id: 'America/Caracas', label: 'Venezuela' },
  { id: 'America/Santiago', label: 'Chile' },
  { id: 'America/Argentina/Buenos_Aires', label: 'Argentina' },
  { id: 'America/Sao_Paulo', label: 'Brasil' },
  { id: 'America/New_York', label: 'Estados Unidos (Este)' },
];
const ALL_SECTION_IDS = KAI_NEXT_SECTIONS.map((s) => s.id);
const ALL_CAP_IDS = KAI_NEXT_SECTIONS.flatMap((s) => s.capabilities.map((c) => c.id));
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fmtDay = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? null : `${String(d.getDate()).padStart(2, '0')} ${MES[d.getMonth()]} ${d.getFullYear()}`; };
const initials = (name = '') => name.replace(/^((ing|dr|dra|lic|arq)\.?\s+)+/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '·';

async function send(url, method, body) {
  try {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const d = await res.json().catch(() => ({}));
    return res.ok ? { data: d } : { error: d.error || 'No se pudo guardar.' };
  } catch {
    return { error: 'Error de conexión.' };
  }
}

function roleLabel(u, roles) {
  return roles.find((r) => r.id === u.roleId)?.name ?? projectRoleOf(u.access?.kaiNextCapabilities).label;
}

function funcSummary(u) {
  if (!u.access?.kaiNext) return { label: 'Sin acceso a Kai', cls: 'muted', sub: '' };
  if (!u.roleCustomized) return { label: 'Según su rol', cls: '', sub: '' };
  const n = (u.access.kaiNextSections?.length ? u.access.kaiNextSections : ALL_SECTION_IDS).length;
  return { label: 'Personalizado', cls: 'custom', sub: `${n} de ${ALL_SECTION_IDS.length} secciones` };
}

// ── Panel lateral: crear / editar persona ────────────────────────────────────
function PersonPanel({ tenant, user, roles, empresas, adminScope, onClose, onSaved }) {
  const isNew = !user;
  const u = user ?? { access: { kaiNext: true }, empresaIds: [] };
  const activeRoles = roles.filter((r) => r.active !== false || r.id === u.roleId);
  const initialRoleId = u.roleId ?? (isNew ? (activeRoles.find((r) => r.id === 'team_member')?.id ?? '') : projectRoleOf(u.access?.kaiNextCapabilities).id);
  const [tab, setTab] = useState(isNew ? 'datos' : 'acceso');
  const [datos, setDatos] = useState({ firstName: u.firstName ?? '', lastName: u.lastName ?? '', cargo: u.cargo ?? '', email: u.email ?? '', timezone: u.timezone ?? '' });
  const [roleId, setRoleId] = useState(activeRoles.some((r) => r.id === initialRoleId) ? initialRoleId : '');
  const [roleTouched, setRoleTouched] = useState(false);
  const [kaiNext, setKaiNext] = useState(!!u.access?.kaiNext);
  const [isAdmin, setIsAdmin] = useState(!!u.access?.isAdmin);
  const [other, setOther] = useState({ kai: !!u.access?.kai, aria: !!u.access?.aria });
  const [sections, setSections] = useState(new Set(u.access?.kaiNextSections?.length ? u.access.kaiNextSections : ALL_SECTION_IDS));
  const [caps, setCaps] = useState(new Set((u.access?.kaiNextCapabilities?.length ? u.access.kaiNextCapabilities : ALL_CAP_IDS).filter((c) => c !== NO_CAPABILITIES)));
  const [empresaIds, setEmpresaIds] = useState(new Set(u.empresaIds ?? []));
  const [cred, setCred] = useState({ username: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const role = roles.find((r) => r.id === roleId);
  // Un admin de alcance "equipo" no toca a un admin completo (el servidor también lo frena).
  const lockedAdmin = adminScope !== 'full' && u.access?.isAdmin && (u.access.adminScope || 'full') === 'full';

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toggleSet = (setter, id) => setter((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const pickRole = (id) => {
    setRoleId(id);
    setRoleTouched(true);
    const r = roles.find((x) => x.id === id);
    if (!r) return;
    setSections(new Set(r.sections));
    setCaps(new Set(r.capabilities));
    if (r.admin !== undefined) setIsAdmin(!!r.admin);
  };
  const allEmp = empresas.length > 0 && empresas.every((e) => empresaIds.has(e.id));

  const save = async () => {
    if (!datos.firstName.trim()) { setTab('datos'); setErr('El nombre es obligatorio.'); return; }
    if (kaiNext && !sections.size) { setTab('acceso'); setErr('Deja al menos una funcionalidad activa.'); return; }
    setBusy(true);
    setErr(null);
    let id = u.id;
    if (isNew) {
      const r = await send(`/api/kai/${tenant}/tenant-users`, 'POST', { ...datos, access: { kai: other.kai, aria: other.aria, kaiNext } });
      if (r.error) { setErr(r.error); setBusy(false); return; }
      id = r.data.user?.id;
    }
    const finalCaps = [...caps].filter((c) => c !== NO_CAPABILITIES);
    const body = {
      ...(isNew ? {} : datos),
      access: {
        kai: other.kai, aria: other.aria, kaiNext,
        ...(adminScope === 'full' || !lockedAdmin ? { isAdmin } : {}),
        ...(adminScope !== 'full' && isAdmin && !u.access?.isAdmin ? { adminScope: 'team' } : {}),
        kaiNextSections: [...sections],
        kaiNextCapabilities: finalCaps.length ? finalCaps : [NO_CAPABILITIES],
      },
    };
    if (roleId && (isNew || (roleTouched && roleId !== u.roleId))) body.roleId = roleId;
    if (empresas.length) body.empresaIds = [...empresaIds];
    if (id) {
      const r = await send(`/api/kai/${tenant}/tenant-users/${id}`, 'PATCH', body);
      if (r.error) { setErr(r.error); setBusy(false); return; }
    }
    if (!isNew && !u.username && cred.username.trim() && cred.password) {
      const r = await send(`/api/kai/${tenant}/tenant-users/${id}`, 'PATCH', { setCredentials: { username: cred.username.trim(), password: cred.password } });
      if (r.error) { setTab('datos'); setErr(r.error); setBusy(false); return; }
    }
    onSaved();
  };

  const tabs = [['acceso', 'Acceso y funcionalidades'], ['datos', 'Datos personales']];
  const name = [datos.firstName, datos.lastName].filter(Boolean).join(' ') || (isNew ? 'Nueva persona' : u.name);

  return (
    <div className="knx-fbp-backdrop" onClick={onClose}>
      <aside className="knx-fbp knx-eqp" role="dialog" aria-modal="true" aria-labelledby="knx-eqp-title" onClick={(e) => e.stopPropagation()}>
        <div className="knx-eqp-head">
          <div className="knx-fbp-head-row">
            <div className="knx-eqp-who">
              <span className="knx-eqp-av" aria-hidden="true">{initials(name)}</span>
              <div style={{ minWidth: 0 }}>
                <h2 id="knx-eqp-title" className="knx-fbp-title" style={{ margin: 0 }}>{name}</h2>
                {!isNew && <div className="knx-dlg-sub" style={{ margin: 0 }}>{[u.email, u.lastLoginAt ? `Último acceso ${fmtDay(u.lastLoginAt)}` : 'Aún no entra'].filter(Boolean).join(' · ')}</div>}
              </div>
            </div>
            <button type="button" className="knx-dlg-close" aria-label="Cerrar" onClick={onClose}>×</button>
          </div>
          <div role="tablist" className="knx-eqp-tabs">
            {tabs.map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} className={`knx-eqp-tab${tab === k ? ' knx-eqp-tab--on' : ''}`} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>
        </div>

        <div className="knx-eqp-body">
          {lockedAdmin && <p className="knx-eqp-note">Esta persona es admin con acceso completo: solo otro admin completo puede cambiar su acceso.</p>}

          {tab === 'datos' && (
            <div className="knx-eqp-grid">
              <div className="knx-dlg-field"><label className="knx-dlg-label" htmlFor="eq-fn">Nombre</label><input id="eq-fn" className="knx-dlg-input" value={datos.firstName} onChange={(e) => setDatos({ ...datos, firstName: e.target.value })} disabled={busy} /></div>
              <div className="knx-dlg-field"><label className="knx-dlg-label" htmlFor="eq-ln">Apellido</label><input id="eq-ln" className="knx-dlg-input" value={datos.lastName} onChange={(e) => setDatos({ ...datos, lastName: e.target.value })} disabled={busy} /></div>
              <div className="knx-dlg-field"><label className="knx-dlg-label" htmlFor="eq-cg">Cargo</label><input id="eq-cg" className="knx-dlg-input" placeholder="Opcional" value={datos.cargo} onChange={(e) => setDatos({ ...datos, cargo: e.target.value })} disabled={busy} /></div>
              <div className="knx-dlg-field"><label className="knx-dlg-label" htmlFor="eq-em">Email</label><input id="eq-em" className="knx-dlg-input" type="email" value={datos.email} onChange={(e) => setDatos({ ...datos, email: e.target.value })} disabled={busy} /></div>
              <div className="knx-dlg-field">
                <label className="knx-dlg-label" htmlFor="eq-tz">Zona horaria</label>
                <select id="eq-tz" className="knx-dlg-input" value={datos.timezone} onChange={(e) => setDatos({ ...datos, timezone: e.target.value })} disabled={busy}>
                  <option value="">Sin definir</option>
                  {TIMEZONE_OPTIONS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div className="knx-dlg-field">
                <span className="knx-dlg-label">Usuario</span>
                {u.username ? <span className="knx-eqp-user">{u.username}</span>
                  : isNew ? <span className="knx-dlg-hint" style={{ padding: '10px 0' }}>Se asigna después de crear la persona.</span>
                  : (
                    <div className="knx-eqp-cred">
                      <input className="knx-dlg-input" placeholder="Usuario" aria-label="Usuario" value={cred.username} onChange={(e) => setCred({ ...cred, username: e.target.value })} disabled={busy} />
                      <input className="knx-dlg-input" placeholder="Contraseña" aria-label="Contraseña" value={cred.password} onChange={(e) => setCred({ ...cred, password: e.target.value })} disabled={busy} />
                    </div>
                  )}
              </div>
            </div>
          )}

          {tab === 'acceso' && (
            <>
              <label className="knx-eqp-toggle-row">
                <span><strong>Acceso a Kai</strong><small>Sin esto la persona no puede entrar.</small></span>
                <input type="checkbox" className="knx-switch" checked={kaiNext} onChange={(e) => setKaiNext(e.target.checked)} disabled={busy || lockedAdmin} />
              </label>

              {kaiNext && (
                <>
                  <div className="knx-eqp-role">
                    <div className="knx-dlg-field">
                      <label className="knx-dlg-label" htmlFor="eq-role">Rol</label>
                      <select id="eq-role" className="knx-dlg-input" value={roleId} onChange={(e) => pickRole(e.target.value)} disabled={busy || lockedAdmin}>
                        {!roleId && <option value="">Sin rol</option>}
                        {activeRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                      {role?.description && <span className="knx-dlg-hint">{role.description}</span>}
                    </div>
                    <label className="knx-eqp-admin">
                      <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} disabled={busy || lockedAdmin} />
                      <span><strong>Entra a Admin</strong><small>{adminScope === 'full' ? 'Gestiona fuentes, equipo, empresas y costos' : 'Gestiona equipo y empresas'}</small></span>
                    </label>
                  </div>

                  {u.roleCustomized && roleId === u.roleId && !roleTouched && <p className="knx-eqp-note">Ajustado a mano: no recibe los cambios que se hagan al rol.</p>}

                  {empresas.length > 0 && (
                    <div className="knx-dlg-field" style={{ gap: 8 }}>
                      <span className="knx-dlg-label">Empresas que ve</span>
                      <div className="knx-eqp-chips">
                        <label className={`knx-eqp-chip${allEmp ? ' knx-eqp-chip--on' : ''}`}>
                          <input type="checkbox" checked={allEmp} onChange={() => setEmpresaIds(allEmp ? new Set() : new Set(empresas.map((e) => e.id)))} disabled={busy || lockedAdmin} />Todas
                        </label>
                        {empresas.map((e) => (
                          <label key={e.id} className={`knx-eqp-chip${empresaIds.has(e.id) ? ' knx-eqp-chip--on' : ''}`}>
                            <input type="checkbox" checked={empresaIds.has(e.id)} onChange={() => toggleSet(setEmpresaIds, e.id)} disabled={busy || lockedAdmin} />
                            <i style={{ background: e.color }} aria-hidden="true" />{e.name}
                          </label>
                        ))}
                      </div>
                      {empresaIds.size === 0 && <span className="knx-dlg-hint" style={{ color: '#8A5A0B' }}>Sin empresas no ve ningún proyecto.</span>}
                    </div>
                  )}

                  <div className="knx-dlg-field" style={{ gap: 8 }}>
                    <div className="knx-eqp-func-head"><span className="knx-dlg-label">Funcionalidades</span><span className="knx-dlg-hint">{sections.size} de {ALL_SECTION_IDS.length} activas</span></div>
                    <div className="knx-eqp-funcs">
                      {KAI_NEXT_SECTIONS.map((s) => {
                        const on = sections.has(s.id);
                        return (
                          <div key={s.id} className="knx-eqp-func">
                            <label className="knx-eqp-func-row">
                              <span><strong>{s.label}</strong><small>{s.description}</small></span>
                              <input type="checkbox" className="knx-switch" role="switch" aria-label={s.label} checked={on} onChange={() => toggleSet(setSections, s.id)} disabled={busy || lockedAdmin} />
                            </label>
                            {on && s.capabilities.length > 0 && (
                              <div className="knx-eqp-subs">
                                {s.capabilities.map((c) => (
                                  <label key={c.id}><input type="checkbox" checked={caps.has(c.id)} onChange={() => toggleSet(setCaps, c.id)} disabled={busy || lockedAdmin} />{c.label}</label>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {adminScope === 'full' && (
                <div className="knx-dlg-field" style={{ gap: 8 }}>
                  <span className="knx-dlg-label">Otros productos</span>
                  <div className="knx-eqp-chips">
                    <label className={`knx-eqp-chip${other.kai ? ' knx-eqp-chip--on' : ''}`}><input type="checkbox" checked={other.kai} onChange={(e) => setOther({ ...other, kai: e.target.checked })} disabled={busy} />Kai (legado)</label>
                    <label className={`knx-eqp-chip${other.aria ? ' knx-eqp-chip--on' : ''}`}><input type="checkbox" checked={other.aria} onChange={(e) => setOther({ ...other, aria: e.target.checked })} disabled={busy} />Aria</label>
                  </div>
                </div>
              )}
            </>
          )}
          {err && <p className="knx-dlg-error" role="alert">{err}</p>}
        </div>

        <div className="knx-dlg-foot">
          <button type="button" className="knx-dlg-btn" onClick={onClose} disabled={busy}>Cancelar</button>
          <button type="button" className="knx-dlg-btn knx-dlg-btn--primary" onClick={save} disabled={busy}>{busy ? 'Guardando…' : isNew ? 'Crear persona' : 'Guardar cambios'}</button>
        </div>
      </aside>
    </div>
  );
}

function RowMenu({ user: u, onAction }) {
  const [open, setOpen] = useState(false);
  const inactive = u.active === false;
  const pick = (a) => () => { setOpen(false); onAction(a); };
  return (
    <div className="knx-pr-menu-wrap">
      <button type="button" className="knx-eq-btn knx-eq-dots" aria-label={`Más acciones para ${u.name}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>⋯</button>
      {open && (
        <>
          <div className="knx-pr-menu-scrim" onClick={() => setOpen(false)} />
          <div role="menu" className="knx-pr-menu">
            {inactive ? <button type="button" role="menuitem" onClick={pick('activate')}>Activar</button> : (
              <>
                {u.username && <button type="button" role="menuitem" onClick={pick('reset')}>Resetear acceso</button>}
                <button type="button" role="menuitem" onClick={pick('deactivate')}>Desactivar</button>
                <div className="knx-pr-menu-sep" />
                <button type="button" role="menuitem" className="knx-pr-menu-danger" onClick={pick('delete')}>Eliminar</button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function KaiNextAdminEquipo({ tenant, reloadKey = 0, rolesSlot = null }) {
  const [users, setUsers] = useState(undefined);
  const [roles, setRoles] = useState(PROJECT_ROLES.map((r) => ({ id: r.id, name: r.label, description: r.description, active: true, sections: ALL_SECTION_IDS, capabilities: ALL_CAP_IDS.filter((c) => !PROJECT_ROLE_CAPS.includes(c) || r.caps.includes(c)) })));
  const [empresas, setEmpresas] = useState([]);
  const [adminScope, setAdminScope] = useState('full');
  const [editing, setEditing] = useState(null); // user | 'new' | null
  const [err, setErr] = useState(null);

  const load = () => {
    fetch(`/api/kai/${tenant}/tenant-users`).then((r) => r.json()).then((d) => setUsers(d.users ?? [])).catch(() => setUsers([]));
    fetch(`/api/kai-next/${tenant}/roles`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.roles) { setRoles(d.roles); setAdminScope(d.adminScope ?? 'full'); } }).catch(() => {});
    fetch(`/api/kai-next/${tenant}/empresas?admin=1`).then((r) => (r.ok ? r.json() : null)).then((d) => setEmpresas(d?.empresas ?? [])).catch(() => {});
  };
  useEffect(() => { load(); }, [tenant, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (u, a) => {
    setErr(null);
    const url = `/api/kai/${tenant}/tenant-users/${u.id}`;
    let r;
    if (a === 'reset') {
      if (!confirm(`Esto borra el usuario y la contraseña de ${u.name}: vas a tener que asignarle unos nuevos. ¿Seguro?`)) return;
      r = await send(url, 'PATCH', { resetCredentials: true });
    } else if (a === 'deactivate' || a === 'activate') {
      r = await send(url, 'PATCH', { active: a === 'activate' });
    } else if (a === 'delete') {
      if (!confirm(`¿Eliminar a ${u.name} del equipo? Es permanente; si solo quieres bloquearle el acceso, usa «Desactivar».`)) return;
      r = await send(url, 'DELETE');
    }
    if (r?.error) setErr(r.error);
    load();
  };

  const sorted = (users ?? []).slice().sort((a, b) => Number(a.active === false) - Number(b.active === false));
  const showEmpresas = empresas.length > 0;

  return (
    <>
      {rolesSlot}
      <section className="knx-eq">
        <div className="knx-eq-top">
          <div>
            <h2 className="knx-eq-title">Equipo{users?.length ? <span> · {users.length} {users.length === 1 ? 'persona' : 'personas'}</span> : null}</h2>
            <p className="knx-eq-sub">Cada persona entra con su usuario. Lo que ve y puede hacer depende de su rol, sus empresas y las funcionalidades activas.</p>
          </div>
          <button type="button" className="knx-dlg-btn knx-dlg-btn--primary" onClick={() => setEditing('new')}>+ Agregar persona</button>
        </div>
        {err && <p className="knx-dlg-error" role="alert" style={{ marginBottom: 10 }}>{err}</p>}

        <div className="knx-eq-table-wrap">
          <div className={`knx-eq-table${showEmpresas ? '' : ' knx-eq-table--noemp'}`}>
            <div className="knx-eq-row knx-eq-thead">
              <div>Persona</div><div>Rol</div>{showEmpresas && <div>Empresas</div>}<div>Funcionalidades</div><div>Último acceso</div><div />
            </div>
            {users === undefined && <p className="knx-eq-empty">Cargando…</p>}
            {users?.length === 0 && <p className="knx-eq-empty">Todavía no hay nadie en el equipo.</p>}
            {sorted.map((u) => {
              const inactive = u.active === false;
              const f = funcSummary(u);
              const allEmp = empresas.length > 0 && empresas.every((e) => u.empresaIds?.includes(e.id));
              const last = u.lastLoginAt ? fmtDay(u.lastLoginAt) : null;
              return (
                <div key={u.id} className={`knx-eq-row${inactive ? ' knx-eq-row--off' : ''}`}>
                  <div className="knx-eq-person">
                    <span className="knx-eqp-av knx-eq-av" aria-hidden="true">{initials(u.name)}</span>
                    <div style={{ minWidth: 0 }}>
                      <div className="knx-eq-name">{u.name}{inactive && <span className="knx-eq-off-tag">Desactivada</span>}</div>
                      <div className="knx-eq-mail">{u.email}{u.username ? <>{u.email ? ' · ' : ''}<code>{u.username}</code></> : <>{u.email ? ' · ' : ''}<em>sin usuario</em></>}</div>
                    </div>
                  </div>
                  <div className="knx-eq-role">
                    <span>{u.access?.kaiNext ? roleLabel(u, roles) : '—'}</span>
                    {u.access?.isAdmin && <span className="knx-eq-admin-tag">{(u.access.adminScope || 'full') === 'team' ? 'Admin de equipo' : 'Entra a Admin'}</span>}
                  </div>
                  {showEmpresas && (
                    <div className="knx-eq-emps">
                      {!u.access?.kaiNext ? <span className="knx-eq-muted">—</span>
                        : allEmp ? <span className="knx-eq-emp knx-eq-emp--all">Todas las empresas</span>
                        : !u.empresaIds?.length ? <span className="knx-eq-emp knx-eq-emp--none">Sin empresas</span>
                        : empresas.filter((e) => u.empresaIds.includes(e.id)).map((e) => <span key={e.id} className="knx-eq-emp"><i style={{ background: e.color }} aria-hidden="true" />{e.name}</span>)}
                    </div>
                  )}
                  <div className="knx-eq-func">
                    <span className={f.cls ? `knx-eq-func--${f.cls}` : ''}>{f.label}</span>
                    {f.sub && <small>{f.sub}</small>}
                  </div>
                  <div className={last ? 'knx-eq-last' : 'knx-eq-last knx-eq-muted'}>{last ?? 'Aún no entra'}</div>
                  <div className="knx-eq-actions">
                    {!inactive && <button type="button" className="knx-eq-btn" aria-label={`Editar a ${u.name}`} onClick={() => setEditing(u)}>Editar</button>}
                    <RowMenu user={u} onAction={(a) => act(u, a)} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {editing && (
        <PersonPanel
          tenant={tenant}
          user={editing === 'new' ? null : editing}
          roles={roles}
          empresas={empresas}
          adminScope={adminScope}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </>
  );
}
