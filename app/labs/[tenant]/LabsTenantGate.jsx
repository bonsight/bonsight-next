'use client';

import { useEffect, useState } from 'react';
import LabsClientTenant from './LabsClientTenant';

const ROLES = ['Registrador', 'Supervisor', 'Director'];

function storageKey(tenant) {
  return `labs_identity_${tenant}`;
}

export default function LabsTenantGate({ tenant, tenantMeta }) {
  const [identity, setIdentity] = useState(undefined); // undefined = loading, null = falta elegir
  const [name, setName] = useState('');
  const [role, setRole] = useState('Registrador');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(tenant));
      setIdentity(raw ? JSON.parse(raw) : null);
    } catch {
      setIdentity(null);
    }
  }, [tenant]);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/labs/${tenant}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'No se pudo continuar.'); return; }
      localStorage.setItem(storageKey(tenant), JSON.stringify(data.participant));
      setIdentity(data.participant);
    } catch {
      setErr('Error de conexión.');
    } finally {
      setBusy(false);
    }
  };

  if (identity === undefined) return null;

  if (!identity) {
    return (
      <div className="labs-entry-wrap">
        <div className="labs-entry-card">
          <h1 className="labs-entry-title">{tenantMeta.name} <span className="living-word">· vivo</span></h1>
          <p className="labs-entry-subtitle">¿Cómo te llamás y qué rol tenés acá?</p>
          <form onSubmit={handleJoin}>
            <input
              type="text"
              placeholder="Tu nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="labs-entry-input"
              autoFocus
              required
            />
            <div className="labs-entry-role-grid">
              {ROLES.map((r) => (
                <button
                  type="button"
                  key={r}
                  className={`labs-entry-role-btn${role === r ? ' active' : ''}`}
                  onClick={() => setRole(r)}
                >
                  {r}
                </button>
              ))}
            </div>
            {err && <p className="labs-login-error">{err}</p>}
            <button type="submit" className="labs-entry-button" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
          </form>
        </div>
      </div>
    );
  }

  return <LabsClientTenant tenant={tenant} tenantMeta={tenantMeta} identity={identity} />;
}
