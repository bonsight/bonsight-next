'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import KaiNextSidebar from './KaiNextSidebar';
import KaiNextConfirmDialog from './KaiNextConfirmDialog';
import KaiNextSourceConnectModal from './KaiNextSourceConnectModal';
import { draftChatUrl } from '@/lib/kaiNext/draftChat';

const TYPE_LABELS = { file: 'Documento', url: 'Sitio web', text: 'Nota', drive: 'Drive' };
const STATUS_LABELS = { pending: 'En cola', processing: 'Procesando…', ready: 'Listo', error: 'Error' };
const FILTERS = [
  { id: 'all', label: 'Todo' },
  { id: 'file', label: 'Documentos' },
  { id: 'drive', label: 'Drive' },
  { id: 'url', label: 'Web' },
  { id: 'text', label: 'Notas' },
];

const DATA_SOURCES = [
  { id: 'ga4', label: 'Google Analytics 4', desc: (s) => s?.config?.propertyId ? `Propiedad ${s.config.propertyId}` : 'Tráfico, conversiones y comportamiento' },
  { id: 'search_console', label: 'Google Search Console', desc: (s) => s?.config?.siteUrl ?? 'Búsqueda orgánica' },
  { id: 'google_ads', label: 'Google Ads', desc: (s) => s?.config?.customerId ? `Cuenta ${s.config.customerId}` : 'Campañas, keywords, costos y conversiones' },
];

// Fila por defecto cuando no hay ninguna base conectada (ver prop `dbSources`, de
// lib/aria/databases.js) — en cuanto hay al menos una, cada una se lista por separado en vez de
// este placeholder genérico.
const NO_DATABASE_ROW = { id: 'database', label: 'Base de datos propia', desc: () => 'PostgreSQL, MySQL, SQL Server o BigQuery', active: false, isDatabase: true };

// Mismo flujo de conexión que ya existe en el admin de Aria (AriaAdminDetail.jsx) — un solo
// campo por fuente, reusando los mismos endpoints de validación (ya autorizan sesión de Kai o
// de Aria, así que una sesión de equipo de Kai Next ya puede llamarlos sin backend nuevo).
const CONNECT_CONFIG = {
  ga4: { endpoint: 'ga4', field: 'propertyId', label: 'Property ID de GA4', placeholder: 'Ej: 123456789', needsSaEmail: true, saRole: 'Viewer / Lector en esa propiedad de GA4' },
  search_console: { endpoint: 'search-console', field: 'siteUrl', label: 'URL del sitio en Search Console', placeholder: 'Ej: sc-domain:bonsight.co', needsSaEmail: true, saRole: 'Full User en Search Console' },
  google_ads: { endpoint: 'google-ads', field: 'customerId', label: 'Customer ID de Google Ads', placeholder: 'Ej: 123-456-7890', needsSaEmail: false },
};

function FileIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></svg>;
}
function GlobeIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>;
}
function NoteIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></svg>;
}
function ProfileIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2" /><circle cx="12" cy="10" r="3" /><path d="M8 17c1-2 7-2 8 0" /></svg>;
}
function ChatBubbleIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>;
}
function HistoryIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></svg>;
}
function DataBarsIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>;
}
function SearchIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>;
}
function AdsIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l15-6v14L3 13z" /><path d="M7 13v5h3" /></svg>;
}
function DatabaseIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" /><path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" /></svg>;
}

const TYPE_ICON = { file: FileIcon, url: GlobeIcon, text: NoteIcon, drive: FileIcon };
const DATA_ICON = { ga4: DataBarsIcon, search_console: SearchIcon, google_ads: AdsIcon, database: DatabaseIcon };

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

// Label genérico por tipo de fuente — no inventamos categorías de análisis a medida por cada
// documento (eso solo funciona para el tenant demo); esto sirve igual para cualquier cliente.
const KNOWLEDGE_ACTION = {
  file: { label: '📄 Resumir documento', prompt: (s) => `Resume el documento "${s.name}" del conocimiento de la organización y dime qué es lo más importante que debería saber.` },
  drive: { label: '📄 Resumir documento', prompt: (s) => `Resume el documento "${s.name}" del conocimiento de la organización y dime qué es lo más importante que debería saber.` },
  url: { label: '🌐 Analizar sitio', prompt: (s) => `Analiza el sitio "${s.name}" que está en el conocimiento de la organización y dime qué aprendizajes clave podemos sacar.` },
  text: { label: '📝 Profundizar en esto', prompt: (s) => `Profundiza en la nota "${s.name}" del conocimiento de la organización y dime qué implicaciones tiene para el negocio.` },
};

const DATA_ACTION = {
  ga4: { label: '📈 Auditar tráfico reciente', prompt: (name) => `Dame un resumen del tráfico y las conversiones más recientes de ${name} en Google Analytics 4 — qué cambió y qué deberíamos mirar con más atención.` },
  search_console: { label: '🔑 Analizar keywords SEO', prompt: (name) => `Dame un resumen del rendimiento de búsqueda orgánica de ${name} en Search Console — qué keywords están funcionando y dónde hay oportunidad.` },
  google_ads: { label: '💰 Revisar campañas', prompt: (name) => `Dame un resumen del rendimiento de las campañas de Google Ads de ${name} — costo, conversiones y dónde hay oportunidad de optimizar.` },
  database: { label: '🗄️ Consultar la base', prompt: (label) => `Dame un resumen de lo más relevante que encuentres en la base de datos "${label}" — qué deberíamos mirar con más atención.` },
};

export default function KaiNextFuentes({
  tenant, tenantName, basePath, userName, userHandle, userEmail, isTeamUser,
  intelligenceSources, bic, archivedCount, saEmail, dbSources: dbSourcesProp,
}) {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [addMode, setAddMode] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [chats, setChats] = useState([]);
  const [intelSources, setIntelSources] = useState(intelligenceSources);
  const [connectingId, setConnectingId] = useState(null);
  const [connectValue, setConnectValue] = useState('');
  const [connectBusy, setConnectBusy] = useState(false);
  const [connectError, setConnectError] = useState('');
  const fileInputRef = useRef(null);

  // Conectar una carpeta de Drive y después elegir qué archivos importar como conocimiento —
  // misma conexión (`kai:{tenant}:drive:config`) que ya usa el admin de Kai Legacy, mismo
  // lib/kai/googleDrive.js, solo con UI propia de Kai Next. Conectar la carpeta (compartirla con
  // la cuenta de servicio) ahora pasa por el flujo comercial, igual que las demás fuentes sin
  // conectar — ver KaiNextSourceConnectModal.
  const [driveConfig, setDriveConfig] = useState(null);
  const [driveFiles, setDriveFiles] = useState([]);
  const [driveFilesLoading, setDriveFilesLoading] = useState(false);
  const [driveSelected, setDriveSelected] = useState({});
  const [driveImporting, setDriveImporting] = useState(false);
  const [driveChecking, setDriveChecking] = useState(false);
  const [driveCheckResult, setDriveCheckResult] = useState(null);
  const [driveDisconnecting, setDriveDisconnecting] = useState(false);

  const openConnect = (d) => {
    setConnectingId(d.id);
    setConnectValue(d.source?.config?.[CONNECT_CONFIG[d.id].field] ?? '');
    setConnectError('');
  };

  const closeConnect = () => {
    setConnectingId(null);
    setConnectValue('');
    setConnectError('');
  };

  const submitConnect = async (d) => {
    const cfg = CONNECT_CONFIG[d.id];
    const value = connectValue.trim();
    if (!value) { setConnectError('Este campo es obligatorio.'); return; }
    setConnectBusy(true);
    setConnectError('');
    try {
      const res = await fetch(`/api/kai/${tenant}/intelligence-sources/${cfg.endpoint}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [cfg.field]: value }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.error || 'No se pudo guardar.');
      setIntelSources((prev) => [
        ...prev.filter((s) => s.id !== d.id),
        { id: d.id, status: 'active', config: { ...(d.source?.config ?? {}), [cfg.field]: value } },
      ]);
      closeConnect();
    } catch (e) {
      setConnectError(e.message || 'No se pudo guardar.');
    } finally {
      setConnectBusy(false);
    }
  };

  const load = async () => {
    const res = await fetch(`/api/kai-next/${tenant}/knowledge-sources`);
    if (res.ok) {
      const data = await res.json();
      setSources(data.sources ?? []);
    }
    setLoading(false);
  };

  const loadChats = async () => {
    const res = await fetch(`/api/kai-next/${tenant}`);
    if (res.ok) {
      const data = await res.json();
      setChats(data.conversations ?? []);
    }
  };

  const loadDriveConfig = async () => {
    const res = await fetch(`/api/kai-next/${tenant}/drive`);
    if (res.ok) {
      const data = await res.json();
      setDriveConfig(data.config ?? null);
    }
  };

  useEffect(() => {
    load();
    loadChats();
    loadDriveConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant]);

  const disconnectDrive = async () => {
    setDriveDisconnecting(true);
    await fetch(`/api/kai-next/${tenant}/drive`, { method: 'DELETE' });
    setDriveConfig(null);
    setDriveFiles([]);
    setDriveSelected({});
    setDriveDisconnecting(false);
  };

  const loadDriveFiles = async () => {
    setDriveFilesLoading(true);
    const res = await fetch(`/api/kai-next/${tenant}/drive/files`);
    const data = await res.json();
    setDriveFiles(data.files ?? []);
    setDriveSelected({});
    setDriveFilesLoading(false);
  };

  const checkDriveUpdates = async () => {
    setDriveChecking(true); setDriveCheckResult(null);
    const res = await fetch(`/api/kai-next/${tenant}/drive/check-updates`, { method: 'POST' });
    const data = await res.json();
    setDriveCheckResult(data.updatedCount ?? 0);
    setDriveChecking(false);
    await load();
  };

  const toggleDriveFile = (id, disabled) => {
    if (disabled) return;
    setDriveSelected((s) => ({ ...s, [id]: !s[id] }));
  };

  const importSelectedDriveFiles = async () => {
    const toImport = driveFiles.filter((f) => driveSelected[f.id]);
    if (!toImport.length) return;
    setDriveImporting(true);
    for (const f of toImport) {
      const res = await fetch(`/api/kai-next/${tenant}/knowledge-sources`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceType: 'drive', name: f.name, driveFileId: f.id, driveMimeType: f.mimeType, driveModifiedTime: f.modifiedTime }),
      });
      const data = await res.json();
      if (res.ok && data.source) await processSource(data.source.id);
    }
    setDriveSelected({});
    setDriveImporting(false);
    await load();
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      if (isTeamUser) await fetch('/api/team/logout', { method: 'POST' });
      else await fetch(`/api/kai/${tenant}/tenant-users/me`, { method: 'DELETE' });
    } finally {
      window.location.href = `${basePath}/${tenant}`;
    }
  };

  // Un solo modal de confirmación genérico para las dos acciones destructivas de esta página
  // (borrar chat, borrar fuente) — `deleteTarget.type` decide qué hace confirmDelete().
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'chat'|'source', id, title, message }

  // Modal comercial "Conectar con Bonsight" — fuente única (desde una fila) o bundle (desde el
  // banner de arriba, con checklist de todas las fuentes faltantes). Ver KaiNextSourceConnectModal.
  const [sourceModal, setSourceModal] = useState(null); // { mode: 'single', source } | { mode: 'bundle', sources }

  const handleDeleteChat = (id) => {
    const chat = chats.find((c) => c.id === id);
    setDeleteTarget({ type: 'chat', id, title: 'Eliminar conversación', message: `¿Eliminar "${chat?.title || 'Nuevo chat'}"? No se puede deshacer.` });
  };

  const confirmDelete = async () => {
    const target = deleteTarget;
    setDeleteTarget(null);
    if (!target) return;
    if (target.type === 'chat') {
      await fetch(`/api/kai-next/${tenant}?conversationId=${target.id}`, { method: 'DELETE' });
      setChats((prev) => prev.filter((c) => c.id !== target.id));
    } else if (target.type === 'source') {
      await fetch(`/api/kai-next/${tenant}/knowledge-sources/${target.id}`, { method: 'DELETE' });
      await load();
    }
  };

  const processSource = async (id) => {
    await fetch(`/api/kai-next/${tenant}/knowledge-sources/${id}/process`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    });
  };

  async function handleAddUrl(formData) {
    setBusy(true); setError('');
    try {
      const name = String(formData.get('name') ?? '').trim();
      const url = String(formData.get('url') ?? '').trim();
      const res = await fetch(`/api/kai-next/${tenant}/knowledge-sources`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceType: 'url', name: name || url, url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await processSource(data.source.id);
      setAddMode(null);
      await load();
    } catch (e) {
      setError(e.message || 'No se pudo agregar.');
    } finally {
      setBusy(false);
    }
  }

  async function handleAddText(formData) {
    setBusy(true); setError('');
    try {
      const name = String(formData.get('name') ?? '').trim();
      const text = String(formData.get('text') ?? '').trim();
      const res = await fetch(`/api/kai-next/${tenant}/knowledge-sources`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceType: 'text', name: name || 'Nota', text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await processSource(data.source.id);
      setAddMode(null);
      await load();
    } catch (e) {
      setError(e.message || 'No se pudo agregar.');
    } finally {
      setBusy(false);
    }
  }

  async function handleUploadFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/kai-next/${tenant}/knowledge-sources/upload`, { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await processSource(data.source.id);
      await load();
    } catch (e) {
      setError(e.message || 'No se pudo subir el archivo.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function handleDelete(id) {
    const source = sources.find((s) => s.id === id);
    setDeleteTarget({ type: 'source', id, title: 'Eliminar fuente', message: `¿Eliminar "${source?.name || 'esta fuente'}" del conocimiento? No se puede deshacer.` });
  }

  const counts = {
    all: sources.length,
    file: sources.filter((s) => s.sourceType === 'file').length,
    drive: sources.filter((s) => s.sourceType === 'drive').length,
    url: sources.filter((s) => s.sourceType === 'url').length,
    text: sources.filter((s) => s.sourceType === 'text').length,
  };
  // driveFileId → fuente ya importada, para marcar "Importado"/"Actualizar" en el explorador.
  const driveImportedMap = {};
  for (const s of sources) if (s.driveFileId) driveImportedMap[s.driveFileId] = s;
  const filtered = filter === 'all' ? sources : sources.filter((s) => s.sourceType === filter);

  // ── Memoria — estado real, no decorativo: refleja lo que buildBIC/formatBICForPrompt ya
  // inyectan siempre en el prompt de Kai Next (ver app/api/kai-next/[tenant]/route.js).
  const hasProfile = (bic?.confidence?.overall ?? 0) > 0;
  const profileTags = [
    (bic?.objectives?.shortTerm?.length || bic?.objectives?.mediumTerm?.length || bic?.objectives?.longTerm?.length) && 'Objetivos',
    (bic?.processes?.length || bic?.initiatives?.length) && 'Procesos',
    bic?.risks?.length && 'Riesgos',
    bic?.kpis?.length && 'KPIs',
  ].filter(Boolean);
  const hasLearnings = (bic?.recent_learnings?.length ?? 0) > 0;

  const activeDbSources = (dbSourcesProp ?? []).filter((s) => s.status === 'active');
  const databaseRows = activeDbSources.length > 0
    ? activeDbSources.map((s) => ({
        id: `database:${s.id}`,
        dbId: s.id,
        label: s.label,
        desc: () => [s.type?.toUpperCase(), s.tableCount != null ? `${s.tableCount} tabla${s.tableCount !== 1 ? 's' : ''}` : null].filter(Boolean).join(' · '),
        active: true,
        isDatabase: true,
      }))
    : [NO_DATABASE_ROW];

  const dataSources = [
    ...DATA_SOURCES.map((d) => ({
      ...d,
      source: intelSources.find((s) => s.id === d.id),
      active: intelSources.find((s) => s.id === d.id)?.status === 'active',
    })),
    ...databaseRows,
  ];
  const activeDataCount = dataSources.filter((d) => d.active).length;
  const missingSources = dataSources.filter((d) => !d.active).map((d) => ({ id: d.id, label: d.label }));
  const totalCount = 3 + activeDataCount + sources.length; // Memoria (3) + Datos activas + Conocimiento

  // Salud del contexto — composite real, no decorativo: promedio de memoria (confianza 0-1 del
  // Business Profile, la misma que ya usa Kai Next para razonar), datos (fuentes activas / 3) y
  // conocimiento (¿hay algo documentado?). Sin inventar un número — se arma con los mismos datos
  // que ya se ven abajo en cada sección.
  const memoriaScore = bic?.confidence?.overall ?? 0;
  const datosScore = dataSources.length ? activeDataCount / dataSources.length : 0;
  const conocimientoScore = sources.length > 0 ? 1 : 0;
  const healthScore = Math.round(((memoriaScore + datosScore + conocimientoScore) / 3) * 100);
  const missingDataSources = missingSources.map((d) => d.label);
  const healthGaps = [
    !hasProfile && 'el Business Profile está incompleto',
    missingDataSources.length > 0 && `falta conectar ${missingDataSources.join(', ')}`,
    sources.length === 0 && 'todavía no hay conocimiento documentado',
  ].filter(Boolean);
  const healthDesc = healthGaps.length > 0
    ? `${healthGaps.join('. ')}.`.replace(/^./, (c) => c.toUpperCase())
    : 'Memoria, datos y conocimiento están activos y al día.';
  const weakestAnchor = missingDataSources.length > 0 ? '#datos' : (!hasProfile ? '#memoria' : '#conocimiento');

  return (
    <div className="knx-shell">
      <KaiNextSidebar
        tenant={tenant} tenantName={tenantName} userName={userName} userHandle={userHandle}
        isTeamUser={isTeamUser} basePath={basePath} chats={chats}
        onDeleteChat={handleDeleteChat} onLogout={handleLogout} loggingOut={loggingOut} active="fuentes"
      />

      <main className="knx-main">
        <div className="knx-fuentes">
          <div className="knx-fuentes-top">
            <div className="knx-fuentes-head">
              <h1>Fuentes</h1>
              <p>¿Con qué está razonando Kai? Todo lo que usa para responder sobre {tenantName}, en un solo lugar.</p>
            </div>
            <div className="knx-fuentes-top-actions">
              <a className="knx-fuentes-ask-all" href={draftChatUrl(basePath, tenant, `Quiero que me ayudes a entender todo lo que sabes sobre ${tenantName} — dame un resumen de lo más importante y qué deberíamos priorizar.`)}>
                ⚡ Preguntar sobre todo el contexto
              </a>
              <div className="knx-fuentes-count">
                <div className="knx-fuentes-count-num">{totalCount}</div>
                <div className="knx-fuentes-count-label">fuentes activas</div>
              </div>
            </div>
          </div>

          {missingSources.length > 0 && (
            <div className="knx-source-banner">
              <div className="knx-source-banner-text">
                <span className="knx-source-banner-title">
                  {missingSources.length === dataSources.length ? 'Kai todavía no ve tus datos' : 'A Kai le faltan algunas fuentes'}
                </span>
                <span className="knx-source-banner-sub">
                  Faltan {missingSources.length} fuente{missingSources.length !== 1 ? 's' : ''} de datos. El equipo de Bonsight las conecta por ti.
                </span>
              </div>
              <button type="button" className="knx-source-banner-cta" onClick={() => setSourceModal({ mode: 'bundle', sources: missingSources })}>
                Completar con Bonsight →
              </button>
            </div>
          )}

          <div className="knx-health-banner">
            <div className="knx-health-banner-main">
              <span className={`knx-health-dot${healthGaps.length === 0 ? ' knx-health-dot--ok' : ''}`} />
              <div className="knx-health-banner-text">
                <span className="knx-health-banner-title">Salud del contexto: {healthScore}% de cobertura</span>
                <span className="knx-health-banner-sub">{healthDesc}</span>
              </div>
            </div>
            {healthGaps.length > 0 && <a className="knx-health-banner-cta" href={weakestAnchor}>Revisar faltantes</a>}
          </div>

          <div className="knx-fuentes-pills">
            <a href="#memoria" className="knx-filter-pill knx-filter-pill--dark">Memoria · {hasProfile || hasLearnings ? 3 : 0}</a>
            <a href="#datos" className="knx-filter-pill">Datos · {activeDataCount}</a>
            <a href="#conocimiento" className="knx-filter-pill">Conocimiento · {sources.length}</a>
          </div>

          {/* ── Memoria ──────────────────────────────────────────────────── */}
          <section id="memoria" className="knx-fuentes-section">
            <div className="knx-fuentes-section-head">
              <h2>Memoria <span>· 3</span></h2>
              <p>Lo que Kai ya sabe de {tenantName}. Siempre activa, no requiere configuración.</p>
            </div>
            <div className="knx-memoria-grid">
              <div className="knx-memoria-card">
                <div className="knx-memoria-card-top">
                  <span className="knx-memoria-card-icon"><ProfileIcon /></span>
                  <span className={`knx-badge ${hasProfile ? 'knx-badge--active' : 'knx-badge--off'}`}>{hasProfile ? 'Validado' : 'Sin completar'}</span>
                </div>
                <div className="knx-memoria-card-body">
                  <span className="knx-memoria-card-title">Business Profile</span>
                  <span className="knx-memoria-card-sub">Lo que la organización es y persigue.</span>
                </div>
                {profileTags.length > 0 && (
                  <div className="knx-memoria-card-tags">{profileTags.map((t) => <span key={t}>{t}</span>)}</div>
                )}
                <a className="knx-memoria-card-action" href={draftChatUrl(basePath, tenant, `Quiero revisar y actualizar el Business Profile de ${tenantName} — hazme las preguntas que falten para completarlo.`)}>
                  ⚡ Reevaluar perfil
                </a>
              </div>

              <div className="knx-memoria-card">
                <div className="knx-memoria-card-top">
                  <span className="knx-memoria-card-icon"><ChatBubbleIcon /></span>
                  <span className={`knx-badge ${hasLearnings ? 'knx-badge--active' : 'knx-badge--off'}`}>{hasLearnings ? 'Validado' : 'Sin datos'}</span>
                </div>
                <div className="knx-memoria-card-body">
                  <span className="knx-memoria-card-title">Conversaciones de discovery</span>
                  <span className="knx-memoria-card-sub">Sesiones con Kai y aprendizajes que dejaron.</span>
                </div>
                <div className="knx-memoria-card-tags"><span>Sesiones</span>{hasLearnings && <span>Aprendizajes</span>}</div>
                <a className="knx-memoria-card-action" href={draftChatUrl(basePath, tenant, `Dame un resumen de los aprendizajes más importantes que has registrado sobre ${tenantName} hasta ahora.`)}>
                  ⚡ Ver hallazgos
                </a>
              </div>

              <div className="knx-memoria-card">
                <div className="knx-memoria-card-top">
                  <span className="knx-memoria-card-icon"><HistoryIcon /></span>
                  <span className="knx-badge knx-badge--history">Historial</span>
                </div>
                <div className="knx-memoria-card-body">
                  <span className="knx-memoria-card-title">Decisiones anteriores</span>
                  <span className="knx-memoria-card-sub">Análisis, decisiones confirmadas y recomendaciones emitidas{archivedCount ? ` · ${archivedCount} archivadas` : ''}.</span>
                </div>
                <div className="knx-memoria-card-tags"><span>Decisiones</span><span>Recomendaciones</span></div>
                <a className="knx-memoria-card-action" href={draftChatUrl(basePath, tenant, `Dame un resumen de las decisiones y recomendaciones confirmadas anteriormente para ${tenantName}.`)}>
                  ⚡ Auditar decisiones
                </a>
              </div>
            </div>
          </section>

          {/* ── Datos ────────────────────────────────────────────────────── */}
          <section id="datos" className="knx-fuentes-section">
            <div className="knx-fuentes-section-head">
              <h2>Datos <span>· {activeDataCount}</span></h2>
              <p>Lo que muestran los sistemas. Kai los consulta cuando la pregunta lo necesita.</p>
              {!isTeamUser && <span className="knx-fuentes-hint">Solo administradores conectan o desactivan</span>}
            </div>
            <div className="knx-knowledge-table">
              {dataSources.map((d) => {
                const Icon = d.isDatabase ? DatabaseIcon : DATA_ICON[d.id];
                const active = d.active;
                const cfg = CONNECT_CONFIG[d.id];
                const isConnecting = connectingId === d.id;
                return (
                  <Fragment key={d.id}>
                    <div className="knx-source-row">
                      <div className="knx-source-row-main">
                        <span className="knx-source-row-icon"><Icon /></span>
                        <div className="knx-source-row-text">
                          <span className="knx-source-row-title">{d.label}</span>
                          <span className="knx-source-row-sub">{d.desc(d.source)}</span>
                        </div>
                      </div>
                      <div className="knx-source-row-actions">
                        <span className={`knx-source-row-status${active ? ' knx-source-row-status--active' : ''}`}>● {active ? 'Conectado' : 'Sin conectar'}</span>
                        {active && d.isDatabase && (
                          <a className="knx-pill-action" href={draftChatUrl(basePath, tenant, DATA_ACTION.database.prompt(d.label))}>{DATA_ACTION.database.label}</a>
                        )}
                        {active && !d.isDatabase && DATA_ACTION[d.id] && (
                          <a className="knx-pill-action" href={draftChatUrl(basePath, tenant, DATA_ACTION[d.id].prompt(tenantName))}>{DATA_ACTION[d.id].label}</a>
                        )}
                        {active && cfg && isTeamUser && (
                          <button type="button" className="knx-pill-action knx-pill-action--secondary" onClick={() => (isConnecting ? closeConnect() : openConnect(d))}>
                            {isConnecting ? 'Cancelar' : '⚙️ Configurar'}
                          </button>
                        )}
                        {!active && (
                          <button type="button" className="knx-pill-action knx-pill-action--bonsight" onClick={() => setSourceModal({ mode: 'single', source: { id: d.id, label: d.label } })}>
                            Conectar con Bonsight →
                          </button>
                        )}
                      </div>
                    </div>
                    {isConnecting && cfg && (
                      <div className="knx-connect-form">
                        {cfg.needsSaEmail && saEmail && (
                          <p className="knx-connect-note">
                            Comparte acceso con <code>{saEmail}</code> ({cfg.saRole}) antes de guardar.
                          </p>
                        )}
                        {d.id === 'google_ads' && (
                          <p className="knx-connect-note">
                            Esta cuenta debe estar vinculada como cliente al Manager Account de Bonsight en Google Ads — pídeselo a quien lo administre.
                          </p>
                        )}
                        <div className="knx-connect-row">
                          <input
                            autoFocus
                            value={connectValue}
                            onChange={(e) => setConnectValue(e.target.value)}
                            placeholder={cfg.placeholder}
                            onKeyDown={(e) => { if (e.key === 'Enter') submitConnect(d); }}
                          />
                          <button type="button" onClick={() => submitConnect(d)} disabled={connectBusy}>
                            {connectBusy ? 'Guardando…' : 'Guardar y validar'}
                          </button>
                        </div>
                        {connectError && <p className="knx-login-error">{connectError}</p>}
                      </div>
                    )}
                  </Fragment>
                );
              })}
            </div>
          </section>

          {/* ── Conocimiento ─────────────────────────────────────────────── */}
          <section id="conocimiento" className="knx-fuentes-section">
            <div className="knx-fuentes-section-head">
              <h2>Conocimiento <span>· {sources.length}</span></h2>
              <p>Lo que la organización sabe y tiene escrito. Cualquiera del equipo puede sumar.</p>
            </div>

            <div className="knx-knowledge-add-grid">
              <button type="button" className="knx-knowledge-add-tile" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <span className="knx-knowledge-add-icon"><FileIcon /></span>
                <span>
                  <span className="knx-knowledge-add-title">{uploading ? 'Subiendo…' : 'Subir archivo'}</span>
                  <span className="knx-knowledge-add-sub">PDF, Word, Excel</span>
                </span>
              </button>
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".pdf,.doc,.docx,.xls,.xlsx,.csv" onChange={handleUploadFile} />

              <button
                type="button"
                className="knx-knowledge-add-tile"
                onClick={() => {
                  if (!driveConfig) { setSourceModal({ mode: 'single', source: { id: 'drive', label: 'Google Drive' } }); return; }
                  const next = addMode === 'drive' ? null : 'drive';
                  setAddMode(next);
                  if (next === 'drive') loadDriveFiles();
                }}
              >
                <span className="knx-knowledge-add-icon"><GlobeIcon /></span>
                <span>
                  <span className="knx-knowledge-add-title">Desde Drive</span>
                  <span className="knx-knowledge-add-sub">{driveConfig ? driveConfig.folderName : 'Conectar con Bonsight →'}</span>
                </span>
              </button>

              <button type="button" className="knx-knowledge-add-tile" onClick={() => setAddMode(addMode === 'url' ? null : 'url')}>
                <span className="knx-knowledge-add-icon"><GlobeIcon /></span>
                <span>
                  <span className="knx-knowledge-add-title">Pegar enlace</span>
                  <span className="knx-knowledge-add-sub">Kai lee la página</span>
                </span>
              </button>

              <button type="button" className="knx-knowledge-add-tile" onClick={() => setAddMode(addMode === 'text' ? null : 'text')}>
                <span className="knx-knowledge-add-icon"><NoteIcon /></span>
                <span>
                  <span className="knx-knowledge-add-title">Escribir nota</span>
                  <span className="knx-knowledge-add-sub">Contexto no escrito</span>
                </span>
              </button>
            </div>

            {error && <p className="knx-login-error">{error}</p>}

            {addMode === 'url' && (
              <form action={handleAddUrl} className="knx-knowledge-add-form">
                <input name="name" placeholder="Nombre (opcional)" />
                <input name="url" type="url" placeholder="https://..." required autoFocus />
                <button type="submit" disabled={busy}>{busy ? 'Agregando…' : 'Agregar'}</button>
              </form>
            )}
            {addMode === 'text' && (
              <form action={handleAddText} className="knx-knowledge-add-form knx-knowledge-add-form--note">
                <input name="name" placeholder="Título de la nota" autoFocus />
                <textarea name="text" placeholder="Escribe el contexto acá..." rows={4} required />
                <button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar nota'}</button>
              </form>
            )}
            {addMode === 'drive' && driveConfig && (
              <div className="knx-drive-panel">
                  <div className="knx-drive-connected">
                    <div className="knx-drive-connected-head">
                      <span className="knx-drive-dot" />
                      <span className="knx-drive-folder-name">{driveConfig.folderName}</span>
                      <div className="knx-drive-connected-actions">
                        <button type="button" onClick={checkDriveUpdates} disabled={driveChecking}>
                          {driveChecking ? 'Verificando…' : 'Verificar actualizaciones'}
                        </button>
                        <button type="button" onClick={loadDriveFiles} disabled={driveFilesLoading}>
                          {driveFilesLoading ? 'Cargando…' : 'Refrescar archivos'}
                        </button>
                        <button type="button" className="knx-drive-disconnect" onClick={disconnectDrive} disabled={driveDisconnecting}>
                          Desconectar
                        </button>
                      </div>
                    </div>
                    {driveCheckResult !== null && (
                      <p className={`knx-drive-check-result${driveCheckResult > 0 ? ' knx-drive-check-result--stale' : ''}`}>
                        {driveCheckResult > 0
                          ? `${driveCheckResult} archivo${driveCheckResult !== 1 ? 's' : ''} desactualizado${driveCheckResult !== 1 ? 's' : ''}.`
                          : 'Todo está actualizado.'}
                      </p>
                    )}
                    <div className="knx-drive-file-list">
                      {driveFilesLoading && <p className="knx-knowledge-empty">Cargando archivos…</p>}
                      {!driveFilesLoading && driveFiles.length === 0 && (
                        <p className="knx-knowledge-empty">Sin archivos compatibles en esta carpeta (PDF, Word, Excel, CSV, PowerPoint, Google Docs/Sheets/Slides).</p>
                      )}
                      {driveFiles.map((f) => {
                        const existing = driveImportedMap[f.id];
                        const isStale = existing && existing.driveModifiedTime && f.modifiedTime && existing.driveModifiedTime !== f.modifiedTime;
                        const isImported = existing && !isStale;
                        return (
                          <label key={f.id} className={`knx-drive-file-row${driveSelected[f.id] ? ' knx-drive-file-row--selected' : ''}`}>
                            {isImported ? (
                              <span className="knx-drive-imported-check">✓</span>
                            ) : (
                              <input
                                type="checkbox"
                                checked={!!driveSelected[f.id]}
                                onChange={() => toggleDriveFile(f.id, isImported)}
                                disabled={isImported}
                              />
                            )}
                            <span className="knx-drive-file-name">
                              {f.name}
                              {f.folderPath && <span className="knx-drive-file-path">{f.folderPath}</span>}
                            </span>
                            {isStale && <span className="knx-drive-file-badge knx-drive-file-badge--stale">Actualizar</span>}
                            {isImported && <span className="knx-drive-file-badge knx-drive-file-badge--imported">Importado</span>}
                          </label>
                        );
                      })}
                    </div>
                    {Object.values(driveSelected).some(Boolean) && (
                      <button type="button" className="knx-drive-import-btn" onClick={importSelectedDriveFiles} disabled={driveImporting}>
                        {driveImporting ? 'Importando…' : `Importar ${Object.values(driveSelected).filter(Boolean).length}`}
                      </button>
                    )}
                  </div>
              </div>
            )}

            <div className="knx-knowledge-filters">
              {FILTERS.map((f) => (
                <button key={f.id} type="button" className={`knx-filter-pill${filter === f.id ? ' knx-filter-pill--active' : ''}`} onClick={() => setFilter(f.id)}>
                  {f.label} · {counts[f.id]}
                </button>
              ))}
            </div>

            <div className="knx-knowledge-table">
              {loading && <p className="knx-knowledge-empty">Cargando…</p>}
              {!loading && filtered.length === 0 && <p className="knx-knowledge-empty">Todavía no hay nada acá.</p>}
              {filtered.map((s) => {
                const Icon = TYPE_ICON[s.sourceType] ?? FileIcon;
                const date = formatDate(s.processedAt ?? s.createdAt);
                const statusText = s.status === 'ready' ? (date ? `Actualizado ${date}` : 'Listo') : (STATUS_LABELS[s.status] ?? s.status);
                return (
                  <div className="knx-source-row" key={s.id}>
                    <div className="knx-source-row-main">
                      <span className="knx-source-row-icon"><Icon /></span>
                      <div className="knx-source-row-text">
                        <span className="knx-source-row-title">{s.name}</span>
                        <span className="knx-source-row-sub">{TYPE_LABELS[s.sourceType] ?? s.sourceType} · {statusText}</span>
                      </div>
                    </div>
                    <div className="knx-source-row-actions">
                      {s.status === 'ready' && KNOWLEDGE_ACTION[s.sourceType] && (
                        <a className="knx-pill-action" href={draftChatUrl(basePath, tenant, KNOWLEDGE_ACTION[s.sourceType].prompt(s))}>{KNOWLEDGE_ACTION[s.sourceType].label}</a>
                      )}
                      <button type="button" className="knx-source-row-delete" onClick={() => handleDelete(s.id)} title="Eliminar">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>

      <KaiNextConfirmDialog
        open={!!deleteTarget}
        title={deleteTarget?.title}
        message={deleteTarget?.message}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {sourceModal && (
        <KaiNextSourceConnectModal
          tenant={tenant}
          tenantName={tenantName}
          userName={userName}
          userEmail={userEmail}
          source={sourceModal.mode === 'single' ? sourceModal.source : undefined}
          sources={sourceModal.mode === 'bundle' ? sourceModal.sources : undefined}
          onClose={() => setSourceModal(null)}
        />
      )}
    </div>
  );
}
