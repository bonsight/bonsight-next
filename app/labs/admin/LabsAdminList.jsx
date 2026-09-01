'use client';

import { useEffect, useState } from 'react';

export default function LabsAdminList() {
  const [tenants, setTenants] = useState(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const load = () => {
    fetch('/api/labs/tenants')
      .then((r) => r.json())
      .then((d) => setTenants(d.tenants ?? []))
      .catch(() => setTenants([]));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/labs/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'No se pudo crear.'); return; }
      setName('');
      setSlug('');
      load();
    } catch {
      setErr('Error de conexión.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="labs-page-shell">
    <div className="labs-admin-wrap">
      <h1 className="labs-admin-title">Labs <span className="living-word" style={{ color: 'var(--labs-living)', fontStyle: 'italic', fontWeight: 500 }}>· admin</span></h1>
      <p style={{ fontSize: 13.5, color: 'var(--labs-cream-dim)', marginBottom: 28 }}>
        Crear un espacio nuevo para un cliente. El código de acceso se comparte con todo su equipo — no hace falta login por persona.
      </p>

      <div className="card">
        <div className="section-title" style={{ color: 'var(--labs-cream)' }}>Nuevo tenant</div>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
          <input type="text" placeholder="Nombre (ej. Sesuveca)" value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
          <input type="text" placeholder="slug (ej. sesuveca)" value={slug} onChange={(e) => setSlug(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Creando…' : 'Crear'}</button>
        </form>
        {err && <p style={{ color: '#E19680', fontSize: 12.5, marginTop: 8 }}>{err}</p>}
      </div>

      <div className="divider-label"><span>Tenants</span></div>
      {tenants === null && <p className="empty-note">Cargando…</p>}
      {tenants?.length === 0 && <p className="empty-note">Todavía no hay ningún tenant creado.</p>}
      {tenants?.map((t) => (
        <div className="labs-tenant-row" key={t.slug}>
          <div>
            <div className="labs-tenant-name">{t.name}</div>
            <div className="labs-tenant-meta">labs.bonsight.co/{t.slug} · código {t.accessCode}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href={`/admin/${t.slug}`} className="btn btn-secondary" style={{ textDecoration: 'none' }}>Configurar</a>
            <a href={`https://labs.bonsight.co/${t.slug}`} target="_blank" rel="noreferrer" className="chip-btn" style={{ display: 'flex', alignItems: 'center' }}>Abrir →</a>
          </div>
        </div>
      ))}
    </div>

      <div className="labs-powered-by">
        <img src="/assets/bonsight-isotipo.png" alt="Bonsight" />
        <span>Powered by Bonsight</span>
      </div>
    </div>
  );
}
