'use client';

import { useEffect, useState } from 'react';

const SA_EMAIL = 'id-aria-platform@bonsight-web.iam.gserviceaccount.com';

export default function LabsAdminTenantDetail({ tenant, tenantMeta }) {
  const tenantUrl = `https://labs.bonsight.co/${tenant}`;

  return (
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

      <DriveConnectPanel tenant={tenant} />
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
