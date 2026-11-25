'use client';

import { useEffect, useRef, useState } from 'react';

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

const BUBBLE = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /><path d="M8.5 12h.01M12 12h.01M15.5 12h.01" /></svg>;
const AV_ICON = { late: '!', move: '→', add: '@', copy: '✉', comment: BUBBLE, meeting: BUBBLE };

function timeAgo(iso) {
  const d = new Date(iso);
  const min = Math.round((Date.now() - d.getTime()) / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 6) return `hace ${h} h`;
  if (d.toDateString() === new Date().toDateString()) return `hoy, ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (h < 24) return `hace ${h} h`;
  const days = Math.round(h / 24);
  return days === 1 ? 'ayer' : days < 7 ? `hace ${days} días` : d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

// Panel "Avisos de Kai": lo mismo que llega por correo, en todos los proyectos de la persona.
// Se abre al costado del menú lateral (fixed: el menú lateral recorta lo que se sale de él).
function AvisosPanel({ basePath, inbox, anchor, onRead, onClose }) {
  // Por defecto solo los pendientes; "Ver avisos anteriores" muestra también los ya leídos.
  const [showAll, setShowAll] = useState(false);
  const pending = inbox.items.filter((it) => it.unread);
  const shown = showAll ? inbox.items : pending;
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  // Alineado al menú de usuario: mismo borde inferior y, como mínimo, su misma altura. Si hay más
  // avisos crece hacia arriba hasta dejar 16 px libres arriba; desde ahí la lista hace scroll.
  const style = anchor
    ? { left: anchor.left, bottom: anchor.bottom, minHeight: anchor.minHeight, maxHeight: anchor.maxHeight }
    : { left: 300, bottom: 20 };
  const open = (it) => {
    if (it.unread) onRead([it.id]);
    onClose();
    if (it.path) window.location.href = `${basePath}${it.path}`;
  };
  return (
    <>
      <div className="knx-av" role="dialog" aria-labelledby="knx-av-t" style={style}>
        <div className="knx-av-head">
          <div>
            <h2 id="knx-av-t">Avisos de Kai</h2>
            {showAll
              ? <p>Todos tus avisos</p>
              : inbox.unread > 0 && <p>{`${inbox.unread} ${inbox.unread === 1 ? 'pendiente' : 'pendientes'} en todos tus proyectos`}</p>}
          </div>
          <div className="knx-av-head-actions">
            {inbox.unread > 0 && <button type="button" onClick={() => onRead('all')}>Marcar todo como leído</button>}
            <button type="button" className="knx-dlg-close knx-av-x" aria-label="Cerrar" onClick={onClose}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        </div>
        <ul className="knx-av-list">
          {!shown.length && (
            <li className="knx-av-empty">
              <span className="knx-av-empty-ic" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              </span>
              <strong>Todo al día</strong>
              <span>Te avisaremos cuando haya algo en tus tareas o proyectos.</span>
            </li>
          )}
          {shown.map((it) => (
            <li key={it.id}>
              <button type="button" className={`knx-av-item${it.unread ? ' knx-av-item--unread' : ''}`} onClick={() => open(it)}>
                <span className={`knx-av-ic knx-av-ic--${it.kind}`} aria-hidden="true">{AV_ICON[it.kind] ?? '→'}</span>
                <span className="knx-av-body">
                  <span className="knx-av-text">{it.unread ? <strong>{it.title}</strong> : it.title}</span>
                  <span className="knx-av-meta">{[it.project, timeAgo(it.at)].filter(Boolean).join(' · ')}</span>
                </span>
                {it.unread && <span className="knx-av-dot" aria-label="Sin leer" />}
              </button>
            </li>
          ))}
        </ul>
        <div className="knx-av-foot">
          <button type="button" className="knx-av-more" onClick={() => setShowAll((v) => !v)}>{showAll ? 'Ver solo pendientes' : 'Ver avisos anteriores'}</button>
        </div>
      </div>
    </>
  );
}

export default function KaiNextUserMenu({ tenant, basePath = '', userName, userHandle, isTeamUser, onLogout, loggingOut }) {
  const [open, setOpen] = useState(false);
  const [avOpen, setAvOpen] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const [inbox, setInbox] = useState({ items: [], unread: 0 });
  const [pwOpen, setPwOpen] = useState(false);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const loadInbox = () => {
    if (isTeamUser) return;
    fetch(`/api/kai-next/${tenant}/inbox`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setInbox(d); }).catch(() => null);
  };
  useEffect(() => {
    loadInbox();
    const t = setInterval(loadInbox, 90000);
    return () => clearInterval(t);
  }, [tenant, isTeamUser]); // eslint-disable-line react-hooks/exhaustive-deps

  const markRead = async (ids) => {
    setInbox((prev) => ({
      items: prev.items.map((it) => (ids === 'all' || ids.includes(it.id) ? { ...it, unread: false } : it)),
      unread: ids === 'all' ? 0 : Math.max(0, prev.unread - prev.items.filter((it) => it.unread && ids.includes(it.id)).length),
    }));
    await fetch(`/api/kai-next/${tenant}/inbox`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ read: ids }) }).catch(() => null);
  };

  // El menú queda abierto (con "Avisos de Kai" marcado) y el panel sale a la derecha del menú lateral.
  const measure = () => {
    const menu = menuRef.current?.getBoundingClientRect();
    if (!menu) return null;
    return {
      left: menu.right + 10,
      bottom: Math.max(0, window.innerHeight - menu.bottom),
      minHeight: menu.height,
      maxHeight: Math.max(menu.height, menu.bottom - 16),
    };
  };
  const openAvisos = () => {
    if (avOpen) { setAvOpen(false); return; }
    setAnchor(measure());
    setAvOpen(true);
    loadInbox();
  };
  useEffect(() => {
    if (!avOpen) return undefined;
    const onResize = () => setAnchor(measure());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [avOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  const closeAll = () => { setAvOpen(false); setOpen(false); };

  return (
    <div className="knx-um">
      {open && (
        <>
          <div className="knx-um-scrim" onClick={closeAll} />
          <div ref={menuRef} role="menu" aria-label="Menú de usuario" className="knx-um-menu">
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
                <button type="button" role="menuitem" aria-expanded={avOpen} className={`knx-um-item${avOpen ? ' knx-um-item--on' : ''}`} onClick={openAvisos}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
                  <span className="knx-um-grow">Avisos de Kai</span>
                  {inbox.unread > 0 && <span className="knx-um-count">{inbox.unread > 99 ? '99+' : inbox.unread}</span>}
                  <span className="knx-um-chev" aria-hidden="true">›</span>
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
      <button ref={triggerRef} type="button" className={`knx-user-row knx-um-trigger${open ? ' knx-um-trigger--open' : ''}`} aria-haspopup="menu" aria-expanded={open}
        aria-label={inbox.unread ? `${userName}: ${inbox.unread} avisos sin leer` : undefined} onClick={() => { if (open) closeAll(); else setOpen(true); }}>
        <span className="knx-um-avwrap">
          <span className="knx-user-avatar">{initials(userName)}</span>
          {inbox.unread > 0 && <span className="knx-um-reddot" aria-hidden="true" />}
        </span>
        <span className="knx-user-info">
          <span className="knx-user-name">{userName}</span>
          {userHandle && <span className="knx-user-handle">{userHandle}</span>}
        </span>
        <span className="knx-um-caret" aria-hidden="true">{open ? '▾' : '▴'}</span>
      </button>
      {avOpen && open && (
        <AvisosPanel basePath={basePath} inbox={inbox} anchor={anchor} onRead={markRead} onClose={closeAll} />
      )}
      {pwOpen && <ChangePasswordModal tenant={tenant} email={userHandle} onClose={() => setPwOpen(false)} />}
    </div>
  );
}
