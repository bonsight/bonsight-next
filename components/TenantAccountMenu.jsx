'use client';

import { useState } from 'react';

const PASSWORD_MIN_LENGTH = 8;

function passwordChecklist(password) {
  return [
    { ok: password.length >= PASSWORD_MIN_LENGTH, label: `Al menos ${PASSWORD_MIN_LENGTH} caracteres` },
    { ok: /[a-zA-Z]/.test(password) && /[0-9]/.test(password), label: 'Con letras y números' },
  ];
}
function isStrongPassword(password) {
  return passwordChecklist(password).every((c) => c.ok);
}

function initials(name = '') {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

// Compartido por Kai y Aria (mismo tenant-user, ver lib/kai/tenantUsers.js) — "cambiar
// contraseña" + "cerrar sesión" para la persona del cliente logueada. Estilos por props en vez
// de clases fijas porque cada producto tiene su propio sistema visual (Kai claro/verde, Aria
// oscuro/violeta) y esto vive dentro de ambos.
export default function TenantAccountMenu({ tenant, userName, accent = '#111', dark = false }) {
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const logout = async () => {
    await fetch(`/api/kai/${tenant}/tenant-users/me`, { method: 'DELETE' });
    window.location.reload();
  };

  const text = dark ? '#e5e5e5' : '#111';
  const dim = dark ? '#9ca3af' : '#888';
  const bg = dark ? '#1a1a1a' : '#fff';
  const border = dark ? 'rgba(255,255,255,0.12)' : '#e5e5e0';

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: accent, color: '#fff', fontSize: 12, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        title={userName}
      >
        {initials(userName)}
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: 40, right: 0, zIndex: 41, minWidth: 190,
            background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: 6,
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          }}>
            <div style={{ padding: '8px 10px', fontSize: 12.5, fontWeight: 600, color: text }}>{userName}</div>
            <div style={{ height: 1, background: border, margin: '2px 0' }} />
            <button
              type="button"
              onClick={() => { setOpen(false); setModalOpen(true); }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', fontSize: 12.5, color: text, background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6 }}
            >
              Cambiar contraseña
            </button>
            <button
              type="button"
              onClick={logout}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', fontSize: 12.5, color: '#e07856', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6 }}
            >
              Cerrar sesión
            </button>
          </div>
        </>
      )}

      {modalOpen && (
        <ChangePasswordModal tenant={tenant} bg={bg} text={text} dim={dim} border={border} accent={accent} onClose={() => setModalOpen(false)} />
      )}
    </div>
  );
}

function ChangePasswordModal({ tenant, bg, text, dim, border, accent, onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [done, setDone] = useState(false);

  const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', color: text, fontSize: 13.5, marginBottom: 10, fontFamily: 'inherit' };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!currentPassword) { setErr('Ingresá tu contraseña actual.'); return; }
    if (!isStrongPassword(newPassword)) { setErr('La contraseña nueva no cumple los requisitos de abajo.'); return; }
    if (newPassword !== confirm) { setErr('Las contraseñas nuevas no coinciden.'); return; }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/kai/${tenant}/tenant-users/me`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'No se pudo cambiar la contraseña.'); return; }
      setDone(true);
    } catch {
      setErr('Error de conexión.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: 28, width: '100%', maxWidth: 360 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, margin: '0 0 16px', color: text }}>Cambiar contraseña</h2>
        {done ? (
          <>
            <p style={{ fontSize: 13, color: dim }}>Listo — tu contraseña se actualizó.</p>
            <button type="button" onClick={onClose} style={{ marginTop: 16, padding: '9px 18px', borderRadius: 8, border: 'none', background: accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cerrar</button>
          </>
        ) : (
          <form onSubmit={handleSave}>
            <input type="password" placeholder="Contraseña actual" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} style={inputStyle} autoFocus />
            <input type="password" placeholder="Contraseña nueva" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={inputStyle} />
            <ul style={{ margin: '-4px 0 10px', padding: '0 0 0 16px', fontSize: 11.5, color: dim }}>
              {passwordChecklist(newPassword).map((c) => (
                <li key={c.label} style={{ color: c.ok ? accent : dim }}>{c.ok ? '✓' : '·'} {c.label}</li>
              ))}
            </ul>
            <input type="password" placeholder="Repetí la contraseña nueva" value={confirm} onChange={(e) => setConfirm(e.target.value)} style={inputStyle} />
            {err && <p style={{ color: '#e07856', fontSize: 12, margin: '0 0 10px' }}>{err}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
              <button type="button" onClick={onClose} style={{ padding: '9px 16px', borderRadius: 8, border: `1px solid ${border}`, background: 'none', color: text, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button type="submit" disabled={busy} style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{busy ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
