'use client';

import { useState, useEffect, useRef } from 'react';
import { KnowledgeSourcesTab } from '@/app/kai/admin/[tenant]/TenantDetail';

// ── Kebab menu genérico (Editar / Desactivar / Eliminar…) ──────────────────
function KebabMenu({ items, label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  return (
    <div className="knx-admin-kebab" ref={ref}>
      <button type="button" className="knx-admin-icon-btn" onClick={() => setOpen((o) => !o)} aria-label={label ?? 'Opciones'}>⋯</button>
      {open && (
        <div className="knx-admin-menu" role="menu">
          {items.map((it, i) => (
            <button
              key={i}
              type="button"
              role="menuitem"
              className={`knx-admin-menu-item${it.danger ? ' knx-admin-menu-item--danger' : ''}`}
              onClick={() => { setOpen(false); it.onClick(); }}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Plataformas (GA4 / Search Console / Google Ads / Notion) ───────────────
const LEVEL_LABEL = { 1: 'Datos observados', 2: 'Conocimiento validado', 3: 'Historial' };
const SA_PERMISSION = { ga4: 'Viewer / Lector en tu propiedad GA4', search_console: 'Full User en Google Search Console' };

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" className="knx-admin-chip-btn knx-admin-chip-btn--sm" onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }}>
      {copied ? '✓' : 'Copiar'}
    </button>
  );
}

function PlatformRow({ source, saEmail, onToggle, onValidate, loading }) {
  const isSoon = source.comingSoon;
  const isActive = source.status === 'active';
  const primaryKey = source.fields?.[0]?.key;
  const hasConfig = primaryKey ? !!source.config?.[primaryKey] : Object.keys(source.config ?? {}).length > 0;

  const [configuring, setConfiguring] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [fieldValues, setFieldValues] = useState(() => Object.fromEntries((source.fields ?? []).map((f) => [f.key, source.config?.[f.key] ?? ''])));
  const canSubmit = Object.values(fieldValues).some((v) => String(v).trim());

  const handleValidate = async () => {
    setValidating(true); setValidationError(null);
    const result = await onValidate(source.id, fieldValues);
    setValidating(false);
    if (result.ok) setConfiguring(false); else setValidationError(result.error);
  };

  const accMeta = source.config?.propertyName ?? source.config?.customerName ?? source.config?.siteUrl ?? (isActive ? 'Conectado' : 'Sin cuenta conectada');

  return (
    <>
      <div className="knx-src-row">
        <span className={`knx-src-dot${isActive ? ' knx-src-dot--on' : ''}${isSoon ? ' knx-src-dot--soon' : ''}`} />
        <div className="knx-src-main">
          <div className="knx-src-nm">{source.label}</div>
          <div className="knx-src-mt">{accMeta} · {source.capabilities?.slice(0, 3).join(', ')}</div>
        </div>
        <span className="knx-src-chip knx-src-chip--hm">{LEVEL_LABEL[source.evidenceLevel]}</span>
        {isSoon ? (
          <span className="knx-src-chip">Próximamente</span>
        ) : hasConfig ? (
          <>
            {source.config?.lastValidatedAt && <span className="knx-src-mt knx-src-mt--hm">Validado {new Date(source.config.lastValidatedAt).toLocaleDateString('es-ES')}</span>}
            <KebabMenu
              label={`Opciones de ${source.label}`}
              items={[
                { label: 'Editar configuración', onClick: () => { setConfiguring(true); setValidationError(null); } },
                { label: isActive ? 'Desactivar' : 'Activar', onClick: onToggle },
              ]}
            />
          </>
        ) : (
          <button type="button" className="knx-admin-chip-btn knx-admin-chip-btn--sm" disabled={loading} onClick={() => setConfiguring(true)}>Configurar</button>
        )}
      </div>
      {!isSoon && configuring && (
        <div className="knx-admin-source-form" style={{ margin: '0 0 10px' }}>
          {saEmail && SA_PERMISSION[source.id] && (
            <div className="knx-admin-source-form-step">
              <div className="knx-admin-source-form-step-label">1. Agrega este email como {SA_PERMISSION[source.id]}</div>
              <div className="knx-admin-source-form-sa"><span>{saEmail}</span><CopyBtn text={saEmail} /></div>
            </div>
          )}
          {(source.fields ?? []).map((f, idx) => (
            <div key={f.key} className="knx-admin-source-form-step">
              <label className="knx-admin-source-form-step-label">{saEmail && SA_PERMISSION[source.id] ? `${idx + 2}. ` : ''}{f.label}</label>
              <input type={f.type ?? 'text'} value={fieldValues[f.key] ?? ''} placeholder={f.placeholder} onChange={(e) => setFieldValues((p) => ({ ...p, [f.key]: e.target.value }))} />
            </div>
          ))}
          {validationError && <div className="knx-admin-test-result knx-admin-test-result--error">⚠ {validationError}</div>}
          <div className="knx-admin-db-form-actions">
            <button type="button" className="knx-admin-chip-btn" onClick={() => { setConfiguring(false); setValidationError(null); }}>Cancelar</button>
            <button type="button" className="knx-admin-btn" disabled={validating || !canSubmit} onClick={handleValidate}>{validating ? 'Validando…' : validationError ? 'Reintentar' : 'Guardar y validar'}</button>
          </div>
        </div>
      )}
    </>
  );
}

function PlatformsSection({ tenant, onCount }) {
  const [sources, setSources] = useState(null);
  const [saEmail, setSaEmail] = useState(null);
  const [loading, setLoading] = useState({});

  useEffect(() => {
    fetch(`/api/kai/${tenant}/intelligence-sources`)
      .then((r) => r.json())
      .then((d) => { setSources(d.sources ?? []); setSaEmail(d.saEmail ?? null); })
      .catch(() => setSources([]));
  }, [tenant]);

  useEffect(() => {
    if (!sources) return;
    const configurable = sources.filter((s) => !s.alwaysActive && !s.comingSoon);
    const active = configurable.filter((s) => s.status === 'active');
    onCount?.({ active: active.length, total: configurable.length, missing: configurable.filter((s) => s.status !== 'active').map((s) => s.label) });
  }, [sources]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = async (sourceId, currentStatus) => {
    setLoading((p) => ({ ...p, [sourceId]: true }));
    try {
      await fetch(`/api/kai/${tenant}/intelligence-sources`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceId, enabled: currentStatus !== 'active' }) });
      setSources((prev) => prev.map((s) => s.id === sourceId ? { ...s, status: currentStatus !== 'active' ? 'active' : 'inactive' } : s));
    } finally { setLoading((p) => ({ ...p, [sourceId]: false })); }
  };

  const validate = async (sourceId, fieldValues) => {
    setLoading((p) => ({ ...p, [sourceId]: true }));
    try {
      const endpoint = sourceId.replace(/_/g, '-');
      const res = await fetch(`/api/kai/${tenant}/intelligence-sources/${endpoint}/validate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fieldValues) });
      const data = await res.json();
      if (data.ok) {
        const { ok, ...config } = data;
        setSources((prev) => prev.map((s) => s.id === sourceId ? { ...s, status: 'active', config: { ...s.config, ...config, permissionStatus: 'validated', lastError: null } } : s));
        return { ok: true };
      }
      return { ok: false, error: data.error };
    } catch { return { ok: false, error: 'Error de conexión. Intenta de nuevo.' }; }
    finally { setLoading((p) => ({ ...p, [sourceId]: false })); }
  };

  if (!sources) return <p className="knx-admin-loading">Cargando…</p>;
  const configurable = sources.filter((s) => !s.alwaysActive && !s.comingSoon);
  const soon = sources.filter((s) => s.comingSoon);

  return (
    <div className="knx-src-list">
      {configurable.map((s) => <PlatformRow key={s.id} source={s} saEmail={saEmail} loading={!!loading[s.id]} onToggle={() => toggle(s.id, s.status)} onValidate={validate} />)}
      {soon.length > 0 && (
        <div className="knx-src-soon">Próximamente: {soon.map((s) => <span key={s.id} className="knx-src-chip">{s.label}</span>)}</div>
      )}
    </div>
  );
}

// ── Bases de datos ──────────────────────────────────────────────────────────
const DB_TYPES = [
  { value: 'postgres', label: 'PostgreSQL' }, { value: 'mysql', label: 'MySQL' }, { value: 'mariadb', label: 'MariaDB' },
  { value: 'redis', label: 'Redis' }, { value: 'bigquery', label: 'BigQuery' },
];
const DB_PLACEHOLDERS = {
  postgres: 'postgresql://user:pass@host:5432/db', mysql: 'mysql://user:pass@host:3306/db', mariadb: 'mysql://user:pass@host:3306/db',
  redis: 'redis://:password@host:6379', bigquery: '{ "type": "service_account", "project_id": "...", "private_key": "...", ... }',
};

function DatabasesSection({ tenant, onCount }) {
  const [sources, setSources] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ type: 'postgres', label: '', connectionString: '' });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState({});
  const [notesOpenId, setNotesOpenId] = useState(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    fetch(`/api/aria/${tenant}/databases`).then((r) => r.json()).then((d) => setSources(d.sources ?? [])).catch(() => setSources([]));
  }, [tenant]);

  useEffect(() => {
    if (!sources) return;
    onCount?.({ total: sources.length, withoutNotes: sources.filter((s) => !s.businessContext?.trim()).length });
  }, [sources]); // eslint-disable-line react-hooks/exhaustive-deps

  const apiPost = async (body) => {
    const r = await fetch(`/api/aria/${tenant}/databases`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return r.json();
  };

  const handleTest = async () => { setTesting(true); setTestResult(null); const d = await apiPost({ action: 'test', source: form }); setTesting(false); setTestResult(d); };
  const handleAdd = async () => {
    setSaving(true);
    const d = await apiPost({ action: 'add', source: form });
    setSaving(false);
    if (d.ok) { setSources((p) => [...(p ?? []), d.source]); setAdding(false); setForm({ type: 'postgres', label: '', connectionString: '' }); setTestResult(null); }
  };
  const handleToggle = async (id) => {
    setBusy((p) => ({ ...p, [id]: true }));
    await apiPost({ action: 'toggle', source: { id } });
    setSources((p) => p.map((s) => s.id === id ? { ...s, status: s.status === 'active' ? 'inactive' : 'active' } : s));
    setBusy((p) => ({ ...p, [id]: false }));
  };
  const handleRefresh = async (id) => {
    setBusy((p) => ({ ...p, [id]: true }));
    const d = await apiPost({ action: 'refresh', source: { id } });
    if (d.ok) setSources((p) => p.map((s) => s.id === id ? d.source : s));
    setBusy((p) => ({ ...p, [id]: false }));
  };
  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta conexión?')) return;
    setBusy((p) => ({ ...p, [id]: true }));
    await apiPost({ action: 'delete', source: { id } });
    setSources((p) => p.filter((s) => s.id !== id));
  };
  const openNotes = (s) => { setNotesOpenId(s.id); setNotesDraft(s.businessContext || ''); };
  const saveNotes = async (id) => {
    setSavingNotes(true);
    await apiPost({ action: 'notes', source: { id, businessContext: notesDraft } });
    setSources((p) => p.map((s) => s.id === id ? { ...s, businessContext: notesDraft } : s));
    setSavingNotes(false); setNotesOpenId(null);
  };

  if (!sources) return <p className="knx-admin-loading">Cargando…</p>;

  return (
    <>
      {!adding ? (
        <button type="button" className="knx-admin-btn" style={{ marginBottom: 12 }} onClick={() => setAdding(true)}>+ Conectar base de datos</button>
      ) : (
        <div className="knx-admin-db-form">
          <div className="knx-admin-db-form-title">Nueva conexión</div>
          <div className="knx-admin-db-form-row">
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value, connectionString: '' }))}>
              {DB_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input placeholder="Nombre de referencia" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
          </div>
          {form.type === 'bigquery'
            ? <textarea className="knx-admin-db-form-conn" placeholder={DB_PLACEHOLDERS[form.type]} value={form.connectionString} onChange={(e) => setForm((f) => ({ ...f, connectionString: e.target.value }))} rows={5} autoComplete="off" spellCheck={false} />
            : <input placeholder={DB_PLACEHOLDERS[form.type]} value={form.connectionString} onChange={(e) => setForm((f) => ({ ...f, connectionString: e.target.value }))} type="password" autoComplete="off" />}
          {testResult && <div className={`knx-admin-test-result${testResult.ok ? ' knx-admin-test-result--ok' : ' knx-admin-test-result--error'}`}>{testResult.ok ? `✓ ${testResult.message}` : `✗ ${testResult.error}`}</div>}
          <div className="knx-admin-db-form-actions">
            <button type="button" className="knx-admin-chip-btn" onClick={() => { setAdding(false); setTestResult(null); }}>Cancelar</button>
            <button type="button" className="knx-admin-chip-btn" disabled={testing || !form.connectionString} onClick={handleTest}>{testing ? 'Probando…' : 'Probar'}</button>
            <button type="button" className="knx-admin-btn" disabled={saving || !form.connectionString || !form.label} onClick={handleAdd}>{saving ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </div>
      )}

      {sources.length === 0 && !adding && <p className="knx-admin-empty">Sin bases de datos conectadas.</p>}

      <div className="knx-src-list">
        {sources.map((s) => {
          const tableCount = s.schema?.tables?.length ?? 0;
          const meta = s.type === 'redis' ? `${s.schema?.redisInfo?.totalKeys ?? '?'} keys` : `${tableCount} tabla${tableCount !== 1 ? 's' : ''}`;
          const hasNotes = !!s.businessContext?.trim();
          return (
            <div key={s.id}>
              <div className="knx-src-row">
                <span className={`knx-src-dot${s.status === 'active' ? ' knx-src-dot--on' : ''}`} />
                <div className="knx-src-main">
                  <div className="knx-src-nm">{s.label}</div>
                  <div className="knx-src-mt knx-src-mt--hm">{DB_TYPES.find((t) => t.value === s.type)?.label ?? s.type} · {meta}</div>
                </div>
                {hasNotes
                  ? <span className="knx-src-chip knx-src-chip--ok knx-src-chip--hm">Con notas</span>
                  : <button type="button" className="knx-admin-db-notes-toggle knx-src-chip--hm" onClick={() => openNotes(s)}>Sin notas de negocio</button>}
                <button type="button" className="knx-admin-icon-btn" onClick={() => handleRefresh(s.id)} disabled={!!busy[s.id]} title="Actualizar schema">{busy[s.id] ? '…' : '↺'}</button>
                <KebabMenu
                  label={`Opciones de ${s.label}`}
                  items={[
                    { label: hasNotes ? 'Editar notas de negocio' : 'Agregar notas de negocio', onClick: () => openNotes(s) },
                    { label: s.status === 'active' ? 'Desactivar' : 'Activar', onClick: () => handleToggle(s.id) },
                    { label: 'Eliminar', danger: true, onClick: () => handleDelete(s.id) },
                  ]}
                />
              </div>
              {notesOpenId === s.id && (
                <div className="knx-admin-db-notes-edit" style={{ margin: '0 0 10px' }}>
                  <textarea value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} placeholder="Significado de estados/enums, a qué tabla de otra BD conectada apunta cada FK, queries canónicas de ejemplo…" rows={8} />
                  <div className="knx-admin-db-form-actions">
                    <button type="button" className="knx-admin-chip-btn" onClick={() => setNotesOpenId(null)}>Cancelar</button>
                    <button type="button" className="knx-admin-btn" disabled={savingNotes} onClick={() => saveNotes(s.id)}>{savingNotes ? 'Guardando…' : 'Guardar notas'}</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── Google Drive (lista de conexiones, cada una con su rol) ─────────────────
const SA_EMAIL_DRIVE = 'id-aria-platform@bonsight-web.iam.gserviceaccount.com';
const ROLE_LABEL = { read: 'Solo lectura', write: 'Lectura y escritura' };

// Explorador de archivos de UNA carpeta de lectura ya conectada — reemplaza al de
// DriveConnectPanel (que ahora está oculto acá, ver hideDrivePanel en KnowledgeSourcesTab):
// mismas rutas (drive/files con folderId explícito, knowledge-sources para importar), pero
// puede haber uno de estos por cada conexión en vez de uno solo global.
function DriveExplorer({ tenant, connection }) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState(null);
  const [selected, setSelected] = useState({});
  const [importing, setImporting] = useState(false);

  const load = async () => {
    setOpen(true);
    setFiles(null);
    const res = await fetch(`/api/kai/${tenant}/drive/files?folderId=${connection.folderId}`);
    const data = await res.json();
    setFiles(data.files ?? []);
    setSelected({});
  };

  const importSelected = async () => {
    const toImport = (files ?? []).filter((f) => selected[f.id]);
    if (!toImport.length) return;
    setImporting(true);
    for (const f of toImport) {
      await fetch(`/api/kai/${tenant}/knowledge-sources`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceType: 'drive', name: f.name, driveFileId: f.id, driveMimeType: f.mimeType, driveModifiedTime: f.modifiedTime }),
      });
    }
    setSelected({});
    setImporting(false);
    setOpen(false);
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

  if (!open) return <button type="button" className="knx-admin-db-notes-toggle" onClick={load}>Explorar archivos</button>;

  return (
    <div className="knx-drive-explorer">
      {files === null ? (
        <p className="knx-admin-loading">Cargando…</p>
      ) : files.length === 0 ? (
        <p className="knx-admin-empty">Sin archivos compatibles en esta carpeta.</p>
      ) : (
        <>
          {files.map((f) => (
            <label key={f.id} className="knx-drive-explorer-row">
              <input type="checkbox" checked={!!selected[f.id]} onChange={() => setSelected((p) => ({ ...p, [f.id]: !p[f.id] }))} />
              <span>{f.folderPath ? `${f.folderPath}/` : ''}{f.name}</span>
            </label>
          ))}
          <div className="knx-admin-db-form-actions">
            <button type="button" className="knx-admin-chip-btn" onClick={() => setOpen(false)}>Cerrar</button>
            <button type="button" className="knx-admin-btn" disabled={!selectedCount || importing} onClick={importSelected}>
              {importing ? 'Importando…' : `Importar ${selectedCount || ''}`.trim()}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function DriveSection({ tenant, onCount }) {
  const [connections, setConnections] = useState(undefined);
  const [adding, setAdding] = useState(false);
  const [folderInput, setFolderInput] = useState('');
  const [role, setRole] = useState('read');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [removing, setRemoving] = useState({});

  const load = () => fetch(`/api/kai/${tenant}/drive-connections`).then((r) => r.json()).then((d) => setConnections(d.connections ?? [])).catch(() => setConnections([]));
  useEffect(() => { load(); }, [tenant]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (connections === undefined) return;
    onCount?.(connections.length);
  }, [connections]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasWrite = connections?.some((c) => c.role === 'write');

  const connect = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    const res = await fetch(`/api/kai/${tenant}/drive-connections`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folderId: folderInput, role }) });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(data.error ?? 'No se pudo conectar.'); return; }
    setConnections((p) => [...(p ?? []), data.connection]);
    setFolderInput(''); setAdding(false); setRole('read');
  };

  const disconnect = async (id) => {
    setRemoving((p) => ({ ...p, [id]: true }));
    await fetch(`/api/kai/${tenant}/drive-connections`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setConnections((p) => p.filter((c) => c.id !== id));
  };

  if (connections === undefined) return <p className="knx-admin-loading">Cargando…</p>;

  return (
    <div className="knx-drive">
      <div className="knx-drive-top">
        <div>
          <div className="knx-drive-top-title">Cuenta de servicio de Kai</div>
          <div className="knx-src-mt">Comparte cada carpeta con este correo — como Editor si va a ser de lectura y escritura.</div>
        </div>
        <div className="knx-drive-sa"><code>{SA_EMAIL_DRIVE}</code><CopyBtn text={SA_EMAIL_DRIVE} /></div>
      </div>

      {adding ? (
        <div className="knx-admin-db-form" style={{ marginBottom: 12 }}>
          <div className="knx-admin-db-form-title">Nueva conexión</div>
          <div className="knx-drive-role-toggle">
            <button type="button" className={`knx-admin-chip-btn${role === 'read' ? ' knx-admin-chip-btn--active' : ''}`} onClick={() => setRole('read')}>Solo lectura</button>
            <button
              type="button"
              className={`knx-admin-chip-btn${role === 'write' ? ' knx-admin-chip-btn--active' : ''}`}
              disabled={hasWrite}
              title={hasWrite ? 'Ya hay una carpeta de lectura y escritura conectada' : undefined}
              onClick={() => setRole('write')}
            >
              Lectura y escritura{hasWrite ? ' (ya hay una)' : ''}
            </button>
          </div>
          <input placeholder="Link o ID de la carpeta de Drive" value={folderInput} onChange={(e) => setFolderInput(e.target.value)} style={{ marginTop: 8 }} />
          {err && <div className="knx-admin-test-result knx-admin-test-result--error">{err}</div>}
          <div className="knx-admin-db-form-actions">
            <button type="button" className="knx-admin-chip-btn" onClick={() => { setAdding(false); setErr(''); setRole('read'); }}>Cancelar</button>
            <button type="button" className="knx-admin-btn" disabled={busy || !folderInput} onClick={connect}>{busy ? 'Conectando…' : 'Conectar'}</button>
          </div>
        </div>
      ) : (
        <button type="button" className="knx-admin-btn" style={{ marginBottom: 12 }} onClick={() => setAdding(true)}>+ Conectar carpeta de Drive</button>
      )}

      <div className="knx-src-list">
        {connections.length === 0 && !adding && <p className="knx-admin-empty" style={{ padding: '12px 14px' }}>Sin carpetas conectadas.</p>}
        {connections.map((c) => (
          <div key={c.id}>
            <div className="knx-src-row">
              <span className="knx-src-dot knx-src-dot--on" />
              <div className="knx-src-main">
                <div className="knx-src-nm">{c.folderName}</div>
                <div className="knx-src-mt knx-src-mt--hm">Conectada {new Date(c.connectedAt).toLocaleDateString('es-ES')}</div>
              </div>
              <span className={`knx-src-chip${c.role === 'write' ? ' knx-src-chip--ok' : ''}`}>{ROLE_LABEL[c.role]}</span>
              <button type="button" className="knx-admin-icon-btn knx-admin-icon-btn--danger" onClick={() => disconnect(c.id)} disabled={!!removing[c.id]} title="Desconectar">✕</button>
            </div>
            {c.role === 'read' && <div style={{ padding: '0 14px 12px' }}><DriveExplorer tenant={tenant} connection={c} /></div>}
            {c.role === 'write' && <p className="knx-admin-section-sub" style={{ padding: '0 14px 12px', margin: 0 }}>Lo que se sube desde Proyectos (Kai Next) queda acá, una subcarpeta por proyecto.</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Resumen + shell de la pestaña Fuentes ───────────────────────────────────
export default function KaiNextAdminFuentes({ tenant }) {
  const [platCount, setPlatCount] = useState(null);
  const [dbCount, setDbCount] = useState(null);
  const [driveCount, setDriveCount] = useState(null);

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div>
      <div className="knx-src-summary">
        <button type="button" onClick={() => scrollTo('knx-s-plat')}>
          <b>{platCount ? `${platCount.active} de ${platCount.total}` : '—'}</b><span>Plataformas</span>
          {platCount?.missing?.length > 0 && <small>{platCount.missing[0]} sin configurar</small>}
        </button>
        <button type="button" onClick={() => scrollTo('knx-s-db')}>
          <b>{dbCount?.total ?? '—'}</b><span>Bases de datos</span>
          {dbCount?.withoutNotes > 0 && <small>{dbCount.withoutNotes} sin notas de negocio</small>}
        </button>
        <button type="button" onClick={() => scrollTo('knx-s-drive')}>
          <b>{driveCount != null ? `${driveCount} carpeta${driveCount === 1 ? '' : 's'}` : '—'}</b><span>Google Drive</span>
        </button>
        <button type="button" onClick={() => scrollTo('knx-s-know')}>
          <b>Documentos</b><span>y notas</span>
        </button>
      </div>

      <div id="knx-s-plat" className="knx-admin-section">
        <h2 className="knx-admin-subsection-title" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>Plataformas</h2>
        <p className="knx-admin-section-sub">Datos que Kai observa en vivo: tráfico, búsqueda, publicidad.</p>
        <PlatformsSection tenant={tenant} onCount={setPlatCount} />
      </div>

      <div id="knx-s-db" className="knx-admin-section">
        <h2 className="knx-admin-subsection-title">Bases de datos</h2>
        <p className="knx-admin-section-sub">Kai las consulta desde el chat. Las notas de negocio le explican qué significa cada tabla; sin ellas adivina.</p>
        <DatabasesSection tenant={tenant} onCount={setDbCount} />
      </div>

      <div id="knx-s-drive" className="knx-admin-section">
        <h2 className="knx-admin-subsection-title">Google Drive</h2>
        <p className="knx-admin-section-sub">Una sola conexión, dos usos: una carpeta que Kai lee y otra donde Kai guarda.</p>
        <DriveSection tenant={tenant} onCount={setDriveCount} />
      </div>

      <div id="knx-s-know" className="knx-admin-section">
        <h2 className="knx-admin-subsection-title">Documentos y notas</h2>
        <KnowledgeSourcesTab slug={tenant} hideDrivePanel />
      </div>
    </div>
  );
}
