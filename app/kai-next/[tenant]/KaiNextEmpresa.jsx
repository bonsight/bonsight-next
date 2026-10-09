'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import KaiNextSidebar from './KaiNextSidebar';
import KaiNextConfirmDialog from './KaiNextConfirmDialog';
import { draftChatUrl } from '@/lib/kaiNext/draftChat';

const IMPACT_LABELS = { alto: 'Urgente', medio: 'Info', bajo: 'Info' };
const SOURCE_LABELS = { 'conversación': 'Conversación', documento: 'Documento', aria: 'Aria' };
const CONFIANZA_LABELS = { alta: 'Confianza alta', media: 'Confianza media', baja: 'Confianza baja' };
const EJE_LABELS = { bloqueo_critico: 'Bloqueo crítico', oportunidad_clave: 'Oportunidad clave' };
const EJE_PLACEHOLDERS = [
  { titulo: 'Crecimiento y clientes', descripcion: 'Modelo de atracción, propuesta comercial o metas de adquisición.' },
  { titulo: 'Producto y operaciones', descripcion: 'Estructura operativa, eficiencia interna o roadmap de producto.' },
  { titulo: 'Financiero y métricas', descripcion: 'Metas de margen, retención o eficiencia de capital.' },
];

function confidenceLabel(score) {
  if (score >= 80) return 'Alta';
  if (score >= 60) return 'Media-alta';
  if (score >= 40) return 'Media';
  return 'Baja';
}

function tagLabel(x) {
  return typeof x === 'string' ? x : (x?.label ?? x?.name ?? '');
}

// Las prioridades vivían como string[] en Redis (kai:{tenant}:active_priorities, compartido con
// el admin de Kai legacy) — acá se les suma un estado "completada" sin romper datos viejos.
function normalizePriorities(list) {
  return (list ?? []).map((p) => (typeof p === 'string' ? { text: p, done: false } : { text: p?.text ?? '', done: !!p?.done }));
}

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

// Ledger de resueltos (lib/kai/resolutions.js) — no se importa ese módulo acá porque instancia
// un cliente de Redis a nivel de módulo, y esto es un componente cliente. `resolvedRefs` ya
// llega resuelto (sin juego de palabras) desde el server component.
function isResolved(resolvedRefs, type, ref) {
  return (resolvedRefs ?? []).some((r) => r.type === type && r.ref === ref);
}

export default function KaiNextEmpresa({
  tenant, tenantName, basePath, userName, userHandle, isTeamUser,
  bic, score, learnings, diagnosis, resolvedRefs,
}) {
  const [loggingOut, setLoggingOut] = useState(false);
  const [chats, setChats] = useState([]);
  const [priorities, setPriorities] = useState(() => normalizePriorities(bic?.active_priorities));
  const [addingPriority, setAddingPriority] = useState(false);
  const [priorityInput, setPriorityInput] = useState('');
  const [savingPriority, setSavingPriority] = useState(false);
  const [toast, setToast] = useState(null); // { text, nowDone }
  const toastTimerRef = useRef(null);
  const pillRefs = useRef(new Map());
  const prevRects = useRef(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState(null);
  const [shareError, setShareError] = useState('');
  const [shareCopied, setShareCopied] = useState(false);

  const [diag, setDiag] = useState(diagnosis);
  const [regenerating, setRegenerating] = useState(false);
  const [merging, setMerging] = useState(false);
  const [dupDismissed, setDupDismissed] = useState(false);
  const [diagError, setDiagError] = useState('');

  // Campos editables del Business Profile — solo se usan en el estado 0 (empresa recién creada,
  // sin nada todavía). Se inicializan desde bic una sola vez; el resto de la página (empresas
  // con datos reales) sigue leyendo bic directamente, de solo lectura, sin tocar esto.
  const [editGeneral, setEditGeneral] = useState(bic?.business ?? {});
  const [editObjectives, setEditObjectives] = useState(bic?.objectives ?? {});
  const [addingObjective, setAddingObjective] = useState(null); // 'shortTerm' | 'mediumTerm' | null
  const [objectiveInput, setObjectiveInput] = useState('');
  const [autofillUrl, setAutofillUrl] = useState('');
  const [autofilling, setAutofilling] = useState(false);
  const [autofillError, setAutofillError] = useState('');

  const savePriorities = async (next) => {
    setSavingPriority(true);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/active-priorities`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priorities: next }),
      });
      const data = await res.json();
      setPriorities(normalizePriorities(data.priorities ?? next));
    } finally {
      setSavingPriority(false);
    }
  };

  const addPriority = () => {
    const trimmed = priorityInput.trim();
    setPriorityInput('');
    setAddingPriority(false);
    if (!trimmed || priorities.some((p) => p.text === trimmed)) return;
    savePriorities([...priorities, { text: trimmed, done: false }]);
  };

  const removePriority = (text) => {
    captureRects();
    savePriorities(priorities.filter((p) => p.text !== text));
  };

  // Captura la posición actual de cada pill ANTES de reordenar, para poder animar el salto
  // (técnica FLIP) una vez que React ya cometió el nuevo orden al DOM — ver useLayoutEffect.
  const captureRects = () => {
    const map = new Map();
    pillRefs.current.forEach((el, key) => { if (el) map.set(key, el.getBoundingClientRect()); });
    prevRects.current = map;
  };

  useLayoutEffect(() => {
    if (!prevRects.current) return;
    const prev = prevRects.current;
    prevRects.current = null;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    pillRefs.current.forEach((el, key) => {
      const before = prev.get(key);
      if (!el || !before) return;
      const after = el.getBoundingClientRect();
      const dx = before.left - after.left;
      const dy = before.top - after.top;
      if (dx || dy) {
        el.animate(
          [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
          { duration: 420, easing: 'cubic-bezier(.2,.7,.2,1)' },
        );
      }
    });
  }, [priorities]);

  const moveToEnd = (list, text) => {
    const item = list.find((p) => p.text === text);
    if (!item) return list;
    return [...list.filter((p) => p.text !== text), item];
  };

  const moveBeforeFirstDone = (list, text) => {
    const item = list.find((p) => p.text === text);
    if (!item) return list;
    const rest = list.filter((p) => p.text !== text);
    const firstDoneIdx = rest.findIndex((p) => p.done);
    if (firstDoneIdx === -1) return [...rest, item];
    return [...rest.slice(0, firstDoneIdx), item, ...rest.slice(firstDoneIdx)];
  };

  // Mismo mecanismo que la referencia: marcar como completada no reordena de inmediato —
  // primero anima el check + tachado y muestra el toast "Completada · Deshacer" por 1.5s;
  // recién al vencer (sin deshacer) la prioridad salta al final del grupo. Clic directo sobre
  // una ya asentada al final, en cambio, vuelve de una al grupo activo sin toast.
  const togglePriorityDone = (text) => {
    clearTimeout(toastTimerRef.current);
    const target = priorities.find((p) => p.text === text);
    if (!target) return;

    if (!target.done) {
      const next = priorities.map((p) => (p.text === text ? { ...p, done: true } : p));
      setPriorities(next);
      savePriorities(next);
      setToast({ text, nowDone: true });
      toastTimerRef.current = setTimeout(() => {
        setToast(null);
        captureRects();
        setPriorities((cur) => moveToEnd(cur, text));
      }, 1500);
    } else {
      setToast(null);
      captureRects();
      const next = moveBeforeFirstDone(priorities.map((p) => (p.text === text ? { ...p, done: false } : p)), text);
      setPriorities(next);
      savePriorities(next);
    }
  };

  const undoToast = () => {
    if (!toast) return;
    clearTimeout(toastTimerRef.current);
    const { text } = toast;
    setToast(null);
    const next = priorities.map((p) => (p.text === text ? { ...p, done: false } : p));
    setPriorities(next);
    savePriorities(next);
  };

  const regenerateDiagnosis = async () => {
    setRegenerating(true);
    setDiagError('');
    try {
      const res = await fetch(`/api/kai-next/${tenant}/diagnosis`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setDiagError(data.error ?? 'No se pudo actualizar el diagnóstico.'); return; }
      setDiag(data.diagnosis);
      setDupDismissed(false);
    } finally {
      setRegenerating(false);
    }
  };

  // "Fusionar automáticamente" junta en el Business Profile (lib/kai/tenants.js, el mismo que
  // usa Kai Legacy) los ítems que Kai detectó como casi-duplicados, y de una vuelve a generar
  // el diagnóstico para que los ejes/duplicados reflejen el perfil ya consolidado.
  const fusionarDuplicados = async () => {
    if (!diag?.duplicados?.length) return;
    setMerging(true);
    try {
      for (const grupo of diag.duplicados) {
        await fetch(`/api/kai-next/${tenant}/profile/merge-duplicates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resumen: grupo.resumen, items: grupo.items }),
        });
      }
      await regenerateDiagnosis();
    } finally {
      setMerging(false);
    }
  };

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/kai-next/${tenant}`);
      if (res.ok) {
        const data = await res.json();
        setChats(data.conversations ?? []);
      }
    })();
  }, [tenant]);

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

  const [deleteTarget, setDeleteTarget] = useState(null); // { id, title }

  const handleDeleteChat = (id) => {
    const chat = chats.find((c) => c.id === id);
    setDeleteTarget({ id, title: chat?.title || 'Nuevo chat' });
  };

  const confirmDeleteChat = async () => {
    const id = deleteTarget?.id;
    setDeleteTarget(null);
    if (!id) return;
    await fetch(`/api/kai-next/${tenant}?conversationId=${id}`, { method: 'DELETE' });
    setChats((prev) => prev.filter((c) => c.id !== id));
  };

  const general = bic?.business ?? {};
  const objectives = bic?.objectives ?? {};
  const learningsCount = learnings?.length ?? 0;
  const lastLearningDate = formatDate(learnings?.[0]?.createdAt);
  const recentLearnings = (learnings ?? []).slice(0, 6);
  const midLongTerm = [...(objectives.mediumTerm ?? []), ...(objectives.longTerm ?? [])];

  const generalRows = [
    ['Industria', general.industry],
    ['Modelo', general.model],
    ['País', general.country],
    ['Tamaño', general.size],
    ['Madurez digital', general.digitalMaturity],
  ].filter(([, v]) => v);

  const totalDupItems = diag?.duplicados?.reduce((sum, g) => sum + (g.items?.length ?? 0), 0) ?? 0;

  // Estado 0: empresa recién creada, sin nada todavía. Acá sí tiene sentido ofrecer edición
  // directa de Información General/Objetivos (no hay nada que una edición manual pueda pisar o
  // desalinear) — para una empresa con historial, esos campos siguen siendo de solo lectura.
  const isZeroState = score === 0 && learningsCount === 0 && priorities.length === 0 && !diag;

  function buildMarkdownSummary() {
    const lines = [`# ${tenantName} — Resumen`, `Generado el ${new Date().toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}`, '', `## Madurez del perfil: ${score}%`, ''];
    if (diag?.problema_principal || diag?.oportunidad_principal) {
      lines.push('## Diagnóstico');
      if (diag.problema_principal) lines.push(`**Problema principal:** ${diag.problema_principal}`);
      if (diag.oportunidad_principal) lines.push(`**Oportunidad principal:** ${diag.oportunidad_principal}`);
      lines.push('');
    }
    if (diag?.ejes?.length) {
      lines.push('## Ejes estratégicos');
      diag.ejes.forEach((e) => lines.push(`- [${EJE_LABELS[e.categoria] ?? e.categoria}] ${e.titulo}: ${e.descripcion}`));
      lines.push('');
    }
    if (priorities.length) {
      lines.push('## Prioridades de esta semana');
      priorities.forEach((p) => lines.push(`- [${p.done ? 'x' : ' '}] ${p.text}`));
      lines.push('');
    }
    if (objectives.shortTerm?.length || midLongTerm.length) {
      lines.push('## Objetivos');
      if (objectives.shortTerm?.length) lines.push(`Corto plazo: ${objectives.shortTerm.map(tagLabel).join(', ')}`);
      if (midLongTerm.length) lines.push(`Mediano/largo plazo: ${midLongTerm.map(tagLabel).join(', ')}`);
      lines.push('');
    }
    if (bic?.kpis?.length) {
      lines.push('## KPIs');
      bic.kpis.forEach((k) => lines.push(`- ${tagLabel(k)}`));
      lines.push('');
    }
    if (recentLearnings.length) {
      lines.push('## Aprendizajes recientes');
      recentLearnings.forEach((l) => lines.push(`- ${l.content}${l.impact ? ` (${IMPACT_LABELS[l.impact] ?? l.impact})` : ''}`));
    }
    return lines.join('\n');
  }

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(buildMarkdownSummary());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard no disponible */ }
    setMenuOpen(false);
  };

  // El snapshot se arma acá, no server-side, para que el reporte sea exactamente lo que esta
  // persona estaba viendo al compartirlo (incluye ediciones en vivo de prioridades, por ejemplo).
  const shareReport = async () => {
    setSharing(true);
    setShareError('');
    try {
      const res = await fetch(`/api/kai-next/${tenant}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score,
          confianza: diag?.confianza ?? null,
          diagnosis: diag ? { problema_principal: diag.problema_principal, oportunidad_principal: diag.oportunidad_principal, impacto: diag.impacto } : null,
          ejes: diag?.ejes ?? [],
          priorities,
          objectives: { shortTerm: (objectives.shortTerm ?? []).map(tagLabel), mediumTerm: (objectives.mediumTerm ?? []).map(tagLabel), longTerm: (objectives.longTerm ?? []).map(tagLabel) },
          kpis: (bic?.kpis ?? []).map(tagLabel),
          learnings: recentLearnings,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo generar el reporte.');
      setShareUrl(`${window.location.origin}${basePath}/report/${data.id}`);
      setMenuOpen(false);
    } catch (e) {
      setShareError(e.message || 'No se pudo generar el reporte.');
    } finally {
      setSharing(false);
    }
  };

  const saveGeneralField = async (field, value) => {
    try {
      await fetch(`/api/kai-next/${tenant}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: `general.${field}`, action: 'set', value }),
      });
    } catch { /* best-effort, el input ya quedó actualizado localmente */ }
  };

  const addObjective = async (bucket) => {
    const trimmed = objectiveInput.trim();
    setObjectiveInput('');
    setAddingObjective(null);
    if (!trimmed) return;
    const current = editObjectives[bucket] ?? [];
    if (current.includes(trimmed)) return;
    setEditObjectives((o) => ({ ...o, [bucket]: [...current, trimmed] }));
    try {
      await fetch(`/api/kai-next/${tenant}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: `objectives.${bucket}`, action: 'append', value: trimmed }),
      });
    } catch { /* best-effort */ }
  };

  const runAutofill = async () => {
    const url = autofillUrl.trim();
    if (!url) return;
    setAutofilling(true);
    setAutofillError('');
    try {
      const res = await fetch(`/api/kai-next/${tenant}/profile/autofill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo autocompletar.');
      setEditGeneral(data.profile?.general ?? {});
      setEditObjectives(data.profile?.objectives ?? {});
    } catch (e) {
      setAutofillError(e.message || 'No se pudo autocompletar.');
    } finally {
      setAutofilling(false);
    }
  };

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch { /* clipboard no disponible */ }
  };

  return (
    <div className="knx-shell">
      <KaiNextSidebar
        tenant={tenant} tenantName={tenantName} userName={userName} userHandle={userHandle}
        isTeamUser={isTeamUser} basePath={basePath} chats={chats}
        onDeleteChat={handleDeleteChat} onLogout={handleLogout} loggingOut={loggingOut} active="empresa"
      />

      <main className="knx-main">
        <div className="knx-fuentes">
          <div className="knx-fuentes-top">
            <div className="knx-fuentes-head">
              <h1>{tenantName} — Centro de Decisiones</h1>
              <p>Información procesada por Kai para acelerar la ejecución del negocio.</p>
            </div>
            <div className="knx-empresa-header-actions">
              <div className="knx-empresa-score">
                <div className="knx-empresa-score-label">Madurez del perfil</div>
                <div className="knx-empresa-score-row">
                  <span className="knx-empresa-score-pct">{score}%</span>
                  <span className="knx-empresa-score-meta">({learningsCount} aprendizaje{learningsCount === 1 ? '' : 's'})</span>
                </div>
                {!isZeroState && (
                  <a
                    className="knx-empresa-update-btn"
                    href={draftChatUrl(basePath, tenant, 'Quiero contarte algo nuevo sobre la empresa para que actualices tu contexto.')}
                  >
                    + Actualizar contexto
                  </a>
                )}
              </div>
              {isZeroState && (
                <div className="knx-autofill-bar">
                  <span>⚡ Autocompletar con sitio web:</span>
                  <input
                    placeholder="tuempresa.com"
                    value={autofillUrl}
                    onChange={(e) => setAutofillUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') runAutofill(); }}
                    disabled={autofilling}
                  />
                  <button type="button" onClick={runAutofill} disabled={autofilling || !autofillUrl.trim()}>
                    {autofilling ? 'Analizando…' : 'Generar'}
                  </button>
                </div>
              )}
              <div className="knx-menu-wrap">
                <button type="button" className="knx-menu-btn" onClick={() => setMenuOpen((v) => !v)} aria-label="Más opciones">⋯</button>
                {menuOpen && (
                  <>
                    <div className="knx-menu-backdrop" onClick={() => setMenuOpen(false)} />
                    <div className="knx-menu">
                      <button type="button" onClick={copySummary}>{copied ? '✓ Copiado al portapapeles' : '📋 Copiar resumen'}</button>
                      <button type="button" onClick={shareReport} disabled={sharing}>{sharing ? 'Generando…' : '🔗 Guardar como reporte y compartir'}</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          {autofillError && <p className="knx-login-error">{autofillError}</p>}

          {shareUrl && (
            <div className="knx-share-result">
              <span>Reporte listo —</span>
              <a href={shareUrl} target="_blank" rel="noreferrer">{shareUrl}</a>
              <button type="button" onClick={copyShareUrl}>{shareCopied ? 'Copiado' : 'Copiar link'}</button>
              <button type="button" className="knx-share-close" onClick={() => setShareUrl(null)} aria-label="Cerrar">✕</button>
            </div>
          )}
          {shareError && <p className="knx-login-error">{shareError}</p>}

          {diag?.duplicados?.length > 0 && !dupDismissed && (
            <div className="knx-dup-alert">
              <span className="knx-dup-alert-icon">⚡</span>
              <div className="knx-dup-alert-body">
                <span className="knx-dup-alert-title">Optimización sugerida: {totalDupItems} ítems repetidos detectados</span>
                <span className="knx-dup-alert-sub">{diag.duplicados.map((g) => g.resumen).join(' · ')}</span>
              </div>
              <div className="knx-dup-alert-actions">
                <button type="button" onClick={fusionarDuplicados} disabled={merging}>{merging ? 'Fusionando…' : 'Fusionar automáticamente'}</button>
                <button type="button" className="knx-dup-alert-ignore" onClick={() => setDupDismissed(true)} disabled={merging}>Ignorar</button>
              </div>
            </div>
          )}

          <section className="knx-empresa-section">
            <div className="knx-fuentes-section-head">
              <h2>
                Prioridades de esta semana
                {priorities.length > 0 && <span> · {priorities.filter((p) => p.done).length} de {priorities.length} completadas</span>}
              </h2>
              <p>Las define el equipo. Kai las usa para enfocar sus respuestas. Haz clic en los círculos para marcarlas como completadas.</p>
            </div>
            <div className="knx-priorities-pills">
              {priorities.map((p) => (
                <span
                  key={p.text}
                  ref={(el) => { if (el) pillRefs.current.set(p.text, el); else pillRefs.current.delete(p.text); }}
                  className={`knx-priority-pill${p.done ? ' knx-priority-pill--done' : ''}`}
                >
                  <button
                    type="button"
                    className="knx-priority-check"
                    onClick={() => togglePriorityDone(p.text)}
                    aria-pressed={p.done}
                    aria-label={p.done ? `Marcar "${p.text}" como pendiente` : `Marcar "${p.text}" como completada`}
                  >
                    <span className="knx-priority-check-circle">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
                    </span>
                  </button>
                  {p.done ? (
                    <span className="knx-priority-text">{p.text}</span>
                  ) : (
                    <a
                      className="knx-priority-text knx-priority-text--link"
                      href={draftChatUrl(basePath, tenant, `Quiero avanzar en esta prioridad: "${p.text}". Ayúdame a definir los próximos pasos concretos y, si tiene sentido, genera un primer borrador de lo que haga falta.`)}
                      title="Trabajar en esto con Kai"
                    >
                      {p.text}
                    </a>
                  )}
                  <button type="button" className="knx-priority-remove" onClick={() => removePriority(p.text)} aria-label={`Quitar "${p.text}"`}>×</button>
                </span>
              ))}
              {priorities.length === 0 && !addingPriority && <span className="knx-empresa-card-empty">Todavía no hay prioridades activas definidas.</span>}
              {addingPriority ? (
                <span className="knx-priority-pill knx-priority-pill--input">
                  <input
                    autoFocus
                    placeholder="Nueva prioridad…"
                    value={priorityInput}
                    onChange={(e) => setPriorityInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); addPriority(); }
                      if (e.key === 'Escape') { setAddingPriority(false); setPriorityInput(''); }
                    }}
                    onBlur={() => (priorityInput.trim() ? addPriority() : setAddingPriority(false))}
                  />
                </span>
              ) : (
                <button type="button" className="knx-priority-add-pill" onClick={() => setAddingPriority(true)} disabled={savingPriority}>+ Agregar</button>
              )}
            </div>
            {toast && (
              <div className="knx-priorities-toast">
                <span>{toast.nowDone ? 'Completada' : 'Marcada como pendiente'}</span>
                <button type="button" onClick={undoToast}>Deshacer</button>
              </div>
            )}
          </section>

          <section className="knx-empresa-section">
            <div className="knx-fuentes-section-head">
              <h2>Ejes estratégicos & activadores de acción</h2>
              <span className="knx-diagnosis-refresh">
                {diag && <span className="knx-diagnosis-conf">{CONFIANZA_LABELS[diag.confianza] ?? diag.confianza}</span>}
                <button type="button" onClick={regenerateDiagnosis} disabled={regenerating || merging}>
                  {regenerating ? 'Actualizando…' : diag ? 'Actualizar diagnóstico' : 'Generar diagnóstico'}
                </button>
              </span>
            </div>
            {diagError && <p className="knx-login-error">{diagError}</p>}
            {diag?.ejes?.length > 0 ? (
              <div className="knx-ejes-grid">
                {diag.ejes.map((eje, i) => {
                  const ejeResolved = isResolved(resolvedRefs, 'eje', eje.titulo);
                  const ejeRef = { type: 'eje', refId: eje.titulo, label: `Eje estratégico "${eje.titulo}" — ${eje.descripcion}` };
                  return (
                    <div className={`knx-eje-card${ejeResolved ? ' knx-eje-card--resolved' : ''}`} key={i}>
                      {ejeResolved ? (
                        <span className="knx-badge-tag knx-badge-tag--resuelto">✓ Resuelto</span>
                      ) : (
                        <span className={`knx-badge-tag knx-badge-tag--${eje.categoria === 'bloqueo_critico' ? 'critico' : 'oportunidad'}`}>
                          {EJE_LABELS[eje.categoria] ?? eje.categoria}
                        </span>
                      )}
                      <h3>{eje.titulo}</h3>
                      <p>{eje.descripcion}</p>
                      {!ejeResolved && eje.acciones?.length > 0 && (
                        <div className="knx-eje-actions">
                          {eje.acciones.map((a, j) => (
                            <a key={j} className="knx-eje-action" href={draftChatUrl(basePath, tenant, a.prompt, ejeRef)}>{a.label}</a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              !regenerating && (
                <div className="knx-ejes-grid">
                  {EJE_PLACEHOLDERS.map((eje, i) => (
                    <div className="knx-eje-card knx-eje-card--placeholder" key={i}>
                      <h3>{eje.titulo}</h3>
                      <p>{eje.descripcion}</p>
                      <div className="knx-eje-actions">
                        <a
                          className="knx-eje-action"
                          href={draftChatUrl(basePath, tenant, `Ayúdame a pensar el eje estratégico de "${eje.titulo}" para ${tenantName}: ${eje.descripcion}`)}
                        >
                          ⚡ Pensar con Kai
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </section>

          <section className="knx-align-card">
            <h3>Alineación estratégica: objetivos y métricas</h3>
            <div className="knx-align-grid">
              <div>
                <span className="knx-align-col-label">Corto plazo</span>
                {isZeroState ? (
                  <>
                    {editObjectives.shortTerm?.length > 0 && (
                      <ul>
                        {editObjectives.shortTerm.map((o, i) => (
                          <li key={i}>
                            <a href={draftChatUrl(basePath, tenant, `Quiero avanzar en este objetivo: "${o}". Ayúdame a definir un plan concreto para lograrlo.`)}>{o}</a>
                          </li>
                        ))}
                      </ul>
                    )}
                    {addingObjective === 'shortTerm' ? (
                      <input
                        autoFocus
                        className="knx-align-add-input"
                        placeholder="Escribe un objetivo…"
                        value={objectiveInput}
                        onChange={(e) => setObjectiveInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') addObjective('shortTerm'); if (e.key === 'Escape') { setAddingObjective(null); setObjectiveInput(''); } }}
                        onBlur={() => (objectiveInput.trim() ? addObjective('shortTerm') : setAddingObjective(null))}
                      />
                    ) : (
                      <button type="button" className="knx-align-add-link" onClick={() => setAddingObjective('shortTerm')}>+ Escribir objetivo</button>
                    )}
                  </>
                ) : objectives.shortTerm?.length ? (
                  <ul>
                    {objectives.shortTerm.map((o, i) => (
                      <li key={i}>
                        <a href={draftChatUrl(basePath, tenant, `Quiero avanzar en este objetivo: "${tagLabel(o)}". Ayúdame a definir un plan concreto para lograrlo.`)}>{tagLabel(o)}</a>
                      </li>
                    ))}
                  </ul>
                ) : <p className="knx-empresa-card-empty">Sin datos todavía.</p>}
              </div>
              <div>
                <span className="knx-align-col-label">Mediano / largo plazo</span>
                {isZeroState ? (
                  <>
                    {editObjectives.mediumTerm?.length > 0 && (
                      <ul>
                        {editObjectives.mediumTerm.map((o, i) => (
                          <li key={i}>
                            <a href={draftChatUrl(basePath, tenant, `Quiero avanzar en este objetivo: "${o}". Ayúdame a definir un plan concreto para lograrlo.`)}>{o}</a>
                          </li>
                        ))}
                      </ul>
                    )}
                    {addingObjective === 'mediumTerm' ? (
                      <input
                        autoFocus
                        className="knx-align-add-input"
                        placeholder="Escribe un objetivo…"
                        value={objectiveInput}
                        onChange={(e) => setObjectiveInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') addObjective('mediumTerm'); if (e.key === 'Escape') { setAddingObjective(null); setObjectiveInput(''); } }}
                        onBlur={() => (objectiveInput.trim() ? addObjective('mediumTerm') : setAddingObjective(null))}
                      />
                    ) : (
                      <button type="button" className="knx-align-add-link" onClick={() => setAddingObjective('mediumTerm')}>+ Escribir objetivo</button>
                    )}
                  </>
                ) : midLongTerm.length ? (
                  <ul>
                    {midLongTerm.map((o, i) => (
                      <li key={i}>
                        <a href={draftChatUrl(basePath, tenant, `Quiero avanzar en este objetivo: "${tagLabel(o)}". Ayúdame a definir un plan concreto para lograrlo.`)}>{tagLabel(o)}</a>
                      </li>
                    ))}
                  </ul>
                ) : <p className="knx-empresa-card-empty">Sin datos todavía.</p>}
              </div>
              <div className="knx-align-kpis">
                <span className="knx-align-col-label">KPIs a monitorear</span>
                {bic?.kpis?.length ? (
                  <div className="knx-align-kpi-list">
                    {bic.kpis.map((k, i) => (
                      <a key={i} href={draftChatUrl(basePath, tenant, `Quiero hacer seguimiento a este KPI: "${tagLabel(k)}". Ayúdame a pensar cómo medirlo y qué deberíamos mirar.`)}>
                        • {tagLabel(k)}
                      </a>
                    ))}
                  </div>
                ) : isZeroState ? (
                  <a className="knx-align-add-link" href={`${basePath}/${tenant}/fuentes#datos`}>📊 Conectar GA4</a>
                ) : <p className="knx-empresa-card-empty">Sin datos todavía.</p>}
              </div>
            </div>
          </section>

          <div className="knx-empresa-card">
            <h3>Información general</h3>
            {isZeroState ? (
              <div className="knx-empresa-info-edit-grid">
                {[
                  ['industry', 'Industria', 'Ej. B2B SaaS / Consultoría'],
                  ['model', 'Modelo de negocio', 'Ej. Suscripción / Servicios'],
                  ['country', 'País principal', 'Ej. Chile / LATAM'],
                  ['size', 'Tamaño de equipo', 'Ej. 10-50 personas'],
                ].map(([field, label, placeholder]) => (
                  <div key={field}>
                    <span>{label}</span>
                    <input
                      value={editGeneral[field] ?? ''}
                      placeholder={placeholder}
                      onChange={(e) => setEditGeneral((g) => ({ ...g, [field]: e.target.value }))}
                      onBlur={(e) => saveGeneralField(field, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            ) : generalRows.length === 0 ? (
              <p className="knx-empresa-card-empty">Sin datos todavía.</p>
            ) : (
              <div className="knx-empresa-info-grid">
                {generalRows.map(([label, value]) => (
                  <div key={label}><span>{label}</span><span>{value}</span></div>
                ))}
              </div>
            )}
          </div>

          <section className="knx-empresa-section">
            <div className="knx-fuentes-section-head">
              <h2>Hallazgos recientes & decisiones de impacto</h2>
            </div>
            {recentLearnings.length === 0 ? (
              <p className="knx-empresa-card-empty">Todavía no hay aprendizajes registrados.</p>
            ) : (
              <div className="knx-learning-list">
                {recentLearnings.map((l, i) => {
                  const learningResolved = isResolved(resolvedRefs, 'learning', l.id);
                  const learningRef = { type: 'learning', refId: l.id, label: `Aprendizaje: "${l.content}"` };
                  return (
                    <div className="knx-learning-row" key={i}>
                      <div className="knx-learning-row-main">
                        <span className="knx-learning-row-text">{l.content}</span>
                        <span className="knx-learning-row-meta">
                          {SOURCE_LABELS[l.source] ?? 'Conversación'}{l.area ? ` · ${l.area}` : ''}{l.createdAt ? ` · ${formatDate(l.createdAt)}` : ''}
                        </span>
                      </div>
                      {learningResolved ? (
                        <span className="knx-impact-badge knx-impact-badge--resuelto">✓ Resuelto</span>
                      ) : (
                        <>
                          {l.impact && (
                            <span className={`knx-impact-badge knx-impact-badge--${l.impact}`}>{IMPACT_LABELS[l.impact] ?? l.impact}</span>
                          )}
                          <a
                            className={`knx-learning-action${l.impact === 'alto' ? ' knx-learning-action--urgent' : ''}`}
                            href={draftChatUrl(basePath, tenant, `Detectaste esto: "${l.content}". Ayúdame a resolverlo — dame un primer borrador o un plan de acción concreto.`, learningRef)}
                          >
                            {l.impact === 'alto' ? '⚡ Pedir borrador a Kai' : 'Ver detalle'}
                          </a>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      <KaiNextConfirmDialog
        open={!!deleteTarget}
        title="Eliminar conversación"
        message={`¿Eliminar "${deleteTarget?.title}"? No se puede deshacer.`}
        onConfirm={confirmDeleteChat}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
