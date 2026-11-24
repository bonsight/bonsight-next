'use client';

import { useEffect, useState } from 'react';

// Menú de la persona, al pie del menú lateral: avisos por correo de Kai, cambiar contraseña y salir.
// El equipo Bonsight (login de equipo) no tiene cuenta de tenant: solo ve "Salir".

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '·';
}

function ChangePasswordModal({ tenant, email, onClose }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [done, setDone] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setErr(null);
    if (next !== repeat) return setErr('La nueva contraseña no coincide en los dos campos.');
    setBusy(true);
    try {
      const res = await fetch(`/api/kai/${tenant}/tenant-users/me`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'No se pudo cambiar la contraseña.');
      setDone(true);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="knx-dlg-backdrop" onClick={onClose}>
      <form className="knx-dlg knx-dlg--sm" role="dialog" aria-modal="true" aria-labelledby="knx-pw-title" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <div className="knx-dlg-head">
          <div>
            <h2 id="knx-pw-title" className="knx-dlg-title">Cambiar contraseña</h2>
            {email && <p className="knx-dlg-sub">{email}</p>}
          </div>
          <button type="button" className="knx-dlg-close" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>
        {done ? (
          <>
            <div className="knx-dlg-body"><p className="knx-dlg-ok">Listo: tu contraseña quedó cambiada. La próxima vez entra con la nueva.</p></div>
            <div className="knx-dlg-foot"><button type="button" className="knx-dlg-btn knx-dlg-btn--primary" onClick={onClose}>Cerrar</button></div>
          </>
        ) : (
          <>
            <div className="knx-dlg-body">
              <div className="knx-dlg-field">
                <label className="knx-dlg-label" htmlFor="knx-pw-current">Contraseña actual</label>
                <input id="knx-pw-current" className="knx-dlg-input" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} disabled={busy} required autoFocus />
              </div>
              <div className="knx-dlg-field">
                <label className="knx-dlg-label" htmlFor="knx-pw-new">Nueva contraseña</label>
                <input id="knx-pw-new" className="knx-dlg-input" type="password" autoComplete="new-password" aria-describedby="knx-pw-hint" value={next} onChange={(e) => setNext(e.target.value)} disabled={busy} required />
                <p id="knx-pw-hint" className="knx-dlg-hint">Al menos 8 caracteres, con letras y números.</p>
              </div>
              <div className="knx-dlg-field">
                <label className="knx-dlg-label" htmlFor="knx-pw-repeat">Repite la nueva contraseña</label>
                <input id="knx-pw-repeat" className="knx-dlg-input" type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} disabled={busy} required />
              </div>
              {err && <p className="knx-dlg-error" role="alert">{err}</p>}
            </div>
            <div className="knx-dlg-foot">
              <button type="button" className="knx-dlg-btn" onClick={onClose} disabled={busy}>Cancelar</button>
              <button type="submit" className="knx-dlg-btn knx-dlg-btn--primary" disabled={busy || !current || !next || !repeat}>{busy ? 'Guardando…' : 'Guardar contraseña'}</button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}

export default function KaiNextUserMenu({ tenant, userName, userHandle, isTeamUser, onLogout, loggingOut }) {
  const [open, setOpen] = useState(false);
  const [notify, setNotify] = useState(null); // null = cargando / no aplica
  const [savingNotify, setSavingNotify] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  useEffect(() => {
    if (!open || isTeamUser || notify !== null) return;
    fetch(`/api/kai/${tenant}/tenant-users/me`).then((r) => (r.ok ? r.json() : null)).then((d) => setNotify(d ? d.notifyEmail : null)).catch(() => null);
  }, [open, isTeamUser, notify, tenant]);

  const toggleNotify = async () => {
    if (notify === null || savingNotify) return;
    const nextVal = !notify;
    setSavingNotify(true);
    setNotify(nextVal);
    try {
      const res = await fetch(`/api/kai/${tenant}/tenant-users/me`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notifyEmail: nextVal }),
      });
      if (!res.ok) setNotify(!nextVal);
    } catch {
      setNotify(!nextVal);
    } finally {
      setSavingNotify(false);
    }
  };

  return (
    <div className="knx-um">
      {open && (
        <>
          <div className="knx-um-scrim" onClick={() => setOpen(false)} />
          <div role="menu" aria-label="Menú de usuario" className="knx-um-menu">
            <div className="knx-um-head">
              <span className="knx-user-avatar knx-um-avatar">{initials(userName)}</span>
              <span className="knx-user-info">
                <span className="knx-user-name">{userName}</span>
                {userHandle && <span className="knx-user-handle">{userHandle}</span>}
              </span>
            </div>
            <div className="knx-um-sep" />
            {!isTeamUser && (
              <>
                <button type="button" role="menuitemcheckbox" aria-checked={!!notify} className="knx-um-item" onClick={toggleNotify} disabled={notify === null || savingNotify}
                  title="Correos de Kai: hitos de proyectos, resumen diario de vencidas y documentos compartidos contigo">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
                  <span className="knx-um-grow">Avisos de Kai</span>
                  <span className={`knx-um-pill${notify ? ' knx-um-pill--on' : ''}`}>{notify === null ? '…' : notify ? 'Activados' : 'Desactivados'}</span>
                </button>
                <button type="button" role="menuitem" className="knx-um-item" onClick={() => { setOpen(false); setPwOpen(true); }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="7.5" cy="15.5" r="4.5" /><path d="M10.7 12.3 21 2M16 7l3 3M18 5l2 2" /></svg>
                  Cambiar contraseña
                </button>
                <div className="knx-um-sep" />
              </>
            )}
            <button type="button" role="menuitem" className="knx-um-item" onClick={onLogout} disabled={loggingOut}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></svg>
              {loggingOut ? 'Saliendo…' : 'Salir'}
            </button>
          </div>
        </>
      )}
      <button type="button" className={`knx-user-row knx-um-trigger${open ? ' knx-um-trigger--open' : ''}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="knx-user-avatar">{initials(userName)}</span>
        <span className="knx-user-info">
          <span className="knx-user-name">{userName}</span>
          {userHandle && <span className="knx-user-handle">{userHandle}</span>}
        </span>
        <span className="knx-um-caret" aria-hidden="true">{open ? '▾' : '▴'}</span>
      </button>
      {pwOpen && <ChangePasswordModal tenant={tenant} email={userHandle} onClose={() => setPwOpen(false)} />}
    </div>
  );
}
