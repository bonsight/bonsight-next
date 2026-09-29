'use client';

import { useState } from 'react';

// Compartido por los 3 admin (Labs/Kai/Aria) — mismo login único (lib/team/auth.js), cada uno
// le pasa su propio className/style para que combine con su sistema visual.
export default function TeamLogoutButton({ className, style, children = 'Cerrar sesión' }) {
  const [busy, setBusy] = useState(false);

  const handleLogout = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await fetch('/api/team/logout', { method: 'POST' });
    } finally {
      window.location.href = '/team';
    }
  };

  return (
    <button type="button" className={className} style={style} onClick={handleLogout} disabled={busy}>
      {busy ? '...' : children}
    </button>
  );
}
