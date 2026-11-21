'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

// Pestañas comunes del detalle de un proyecto (no 'desarrollo'), traídas de Labs: Resumen,
// Historia, Feedback y Reportes. Las propias de cada tipo (Tareas, Cronograma, Partidas,
// Pruebas) siguen viviendo en KaiNextProjects.jsx / KaiNextProjectExperimental.jsx.
// Pensado para el celular primero: pestañas con scroll horizontal, tarjetas a todo el ancho.

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

async function sendJson(url, method, body) {
  try {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    return res.ok ? { data } : { error: data.error || 'No se pudo guardar.' };
  } catch {
    return { error: 'Error de conexión.' };
  }
}

// ── Navegación de pestañas ──────────────────────────────────────────────────
export function ProjectTabsNav({ tabs, active, onChange }) {
  return (
    <nav className="knx-pt-nav" aria-label="Secciones del proyecto">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`knx-pt-tab${active === t.id ? ' knx-pt-tab--on' : ''}`}
          aria-current={active === t.id ? 'page' : undefined}
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {t.count ? <span className={`knx-pt-count${t.alert ? ' knx-pt-count--alert' : ''}`}>{t.count}</span> : null}
        </button>
      ))}
    </nav>
  );
}

// ── Adjuntos del feedback (fotos comprimidas, PDF, Office) ───────────────────
const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function compressImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = url; });
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82).split(',')[1];
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function toAttachment(file) {
  if (file.type.startsWith('image/')) {
    return { name: file.name.replace(/\.\w+$/, '') + '.jpg', mimeType: 'image/jpeg', data: await compressImage(file) };
  }
  if (file.size > MAX_ATTACHMENT_BYTES) throw new Error(`«${file.name}» pesa más de 3 MB.`);
  return { name: file.name, mimeType: file.type || 'application/octet-stream', data: await fileToBase64(file) };
}

function AttachmentLinks({ attachments }) {
  if (!attachments?.length) return null;
  return (
    <div className="knx-fb-atts">
      {attachments.map((a, i) => (
        a.driveUrl
          ? <a key={i} href={a.driveUrl} target="_blank" rel="noreferrer" className="knx-fb-att">📎 {a.name}</a>
          : <span key={i} className="knx-fb-att">📎 {a.name}</span>
      ))}
    </div>
  );
}

// Caja para escribir feedback o una respuesta. Con visibilidad solo en el primer nivel.
function FeedbackComposer({ onSend, placeholder = 'Escribe tu feedback…', withVisibility = true, autoFocus = false, onCancel }) {
  const [text, setText] = useState('');
  const [visibility, setVisibility] = useState('Todo el equipo');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const fileRef = useRef(null);

  const submit = async (e) => {
    e.preventDefault();
    if (busy || (!text.trim() && !files.length)) return;
    setBusy(true);
    setErr(null);
    try {
      const attachments = await Promise.all(files.map(toAttachment));
      const error = await onSend({ text: text.trim(), visibility, attachments });
      if (error) { setErr(error); return; }
      setText('');
      setFiles([]);
    } catch (ex) {
      setErr(ex.message || 'No se pudo adjuntar el archivo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="knx-fb-composer" onSubmit={submit}>
      <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} disabled={busy} autoFocus={autoFocus} />
      {files.length > 0 && (
        <div className="knx-fb-atts">
          {files.map((f, i) => (
            <button key={i} type="button" className="knx-fb-att knx-fb-att--rm" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} title="Quitar">📎 {f.name} ✕</button>
          ))}
        </div>
      )}
      <div className="knx-fb-composer-foot">
        <button type="button" className="knx-canvas-mini" onClick={() => fileRef.current?.click()} disabled={busy}>📎 Adjuntar</button>
        <input ref={fileRef} type="file" multiple hidden accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={(e) => { setFiles((p) => [...p, ...Array.from(e.target.files ?? [])]); e.target.value = ''; }} />
        {withVisibility && (
          <select value={visibility} onChange={(e) => setVisibility(e.target.value)} disabled={busy} aria-label="Quién lo ve" className="knx-fb-vis">
            <option>Todo el equipo</option>
            <option>Privado a Supervisor</option>
          </select>
        )}
        <span className="knx-fb-spacer" />
        {err && <span className="knx-emp-err">{err}</span>}
        {onCancel && <button type="button" className="knx-canvas-mini" onClick={onCancel} disabled={busy}>Cancelar</button>}
        <button type="submit" className="knx-analisis-sources-save" disabled={busy || (!text.trim() && !files.length)}>{busy ? 'Enviando…' : 'Enviar'}</button>
      </div>
    </form>
  );
}

function FeedbackItem({ f, replies, canWrite, canReply = canWrite, onReply, onDismissSuggestion, showTarget }) {
  const [replying, setReplying] = useState(false);
  return (
    <li className="knx-fb-item">
      <span className="knx-fb-av" aria-hidden="true">{initials(f.who)}</span>
      <div className="knx-fb-body">
        <div className="knx-fb-head">
          <b>{f.who}</b>
          {f.whoRole && <span className="knx-fb-role">{f.whoRole}</span>}
          <time>{fmtDateTime(f.createdAt)}</time>
        </div>
        {(showTarget || f.visibility === 'Privado a Supervisor') && (
          <div className="knx-fb-tags">
            {showTarget && <span className="knx-fb-target">{f.targetLabel}</span>}
            {f.visibility === 'Privado a Supervisor' && <span className="knx-fb-private">Privado a Supervisor</span>}
          </div>
        )}
        {f.text && <p className="knx-fb-text">{f.text}</p>}
        <AttachmentLinks attachments={f.attachments} />
        {f.suggestion && (
          <div className="knx-fb-suggestion">
            <span>💡 Kai sugiere una nueva ejecución: {f.suggestion}</span>
            {canWrite && <button type="button" className="knx-canvas-mini" onClick={() => onDismissSuggestion(f.id)}>Descartar</button>}
          </div>
        )}
        {replies.length > 0 && (
          <ul className="knx-fb-replies">
            {replies.map((r) => (
              <li key={r.id} className="knx-fb-reply">
                <div className="knx-fb-head"><b>{r.who}</b><time>{fmtDateTime(r.createdAt)}</time></div>
                {r.text && <p className="knx-fb-text">{r.text}</p>}
                <AttachmentLinks attachments={r.attachments} />
              </li>
            ))}
          </ul>
        )}
        {canReply && (replying
          ? <FeedbackComposer withVisibility={false} placeholder="Escribe tu respuesta…" autoFocus onCancel={() => setReplying(false)} onSend={async (p) => { const e = await onReply(f.id, p); if (!e) setReplying(false); return e; }} />
          : <button type="button" className="knx-fb-reply-btn" onClick={() => setReplying(true)}>Responder</button>)}
      </div>
    </li>
  );
}

// Lista de hilos (primer nivel + respuestas). target: si viene, solo los de ese ítem.
export function FeedbackThreads({ tenant, projectId, feedback = [], target = null, canWrite, canReply = canWrite, onChanged, showTarget = false, emptyText = 'Sin feedback todavía.' }) {
  const list = target ? feedback.filter((f) => f.targetType === target.type && (f.targetId ?? null) === (target.id ?? null)) : feedback;
  const top = list.filter((f) => !f.replyTo);
  const repliesOf = (id) => list.filter((f) => f.replyTo === id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const url = `/api/kai-next/${tenant}/projects/${projectId}/feedback`;

  const post = async (body) => {
    const { error } = await sendJson(url, 'POST', body);
    if (!error) onChanged?.();
    return error;
  };

  return (
    <div className="knx-fb">
      {canWrite && target && (
        <FeedbackComposer onSend={(p) => post({ ...p, targetType: target.type, targetId: target.id ?? null })} />
      )}
      {!top.length ? <p className="knx-knowledge-empty">{emptyText}</p> : (
        <ul className="knx-fb-list">
          {top.map((f) => (
            <FeedbackItem
              key={f.id}
              f={f}
              replies={repliesOf(f.id)}
              canWrite={canWrite}
              canReply={canReply}
              showTarget={showTarget}
              onReply={(replyTo, p) => post({ text: p.text, attachments: p.attachments, replyTo })}
              onDismissSuggestion={async (feedbackId) => { await sendJson(url, 'DELETE', { feedbackId }); onChanged?.(); }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// Botón "Feedback (N)" de cada ítem (tarea, partida, prueba, aporte, reporte) que abre el hilo.
export function FeedbackButton({ tenant, projectId, feedback = [], target, label, canWrite, onChanged }) {
  const [open, setOpen] = useState(false);
  const count = feedback.filter((f) => f.targetType === target.type && f.targetId === target.id).length;
  if (!canWrite && !count) return null;
  return (
    <>
      <button type="button" className="knx-fb-btn" onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
        💬 Feedback{count ? ` (${count})` : ''}
      </button>
      {open && (
        <div className="knx-ficha-share-backdrop" onClick={() => setOpen(false)}>
          <div className="knx-ficha-review-modal knx-fb-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Feedback sobre ${label}`}>
            <div className="knx-ficha-review-head">
              <div>
                <span className="knx-ficha-review-badge">Feedback</span>
                <h3 className="knx-ficha-review-title">{label}</h3>
              </div>
              <button type="button" className="knx-side-panel-close" aria-label="Cerrar" onClick={() => setOpen(false)}>×</button>
            </div>
            <FeedbackThreads tenant={tenant} projectId={projectId} feedback={feedback} target={target} canWrite={canWrite} onChanged={onChanged} />
          </div>
        </div>
      )}
    </>
  );
}

// ── Pestaña Feedback: todo el feedback del proyecto, filtrable por tipo de ítem ─
const TARGET_FILTERS = [
  { id: 'all', label: 'Todo' },
  { id: 'proyecto', label: 'Proyecto' },
  { id: 'tarea', label: 'Tareas' },
  { id: 'partida', label: 'Partidas' },
  { id: 'prueba', label: 'Pruebas' },
  { id: 'aporte', label: 'Aportes' },
  { id: 'reporte', label: 'Reportes' },
];

export function FeedbackTab({ tenant, projectId, feedback = [], canWrite, onChanged }) {
  const [filter, setFilter] = useState('all');
  const present = new Set(feedback.map((f) => f.targetType));
  const filters = TARGET_FILTERS.filter((t) => t.id === 'all' || present.has(t.id));
  const shown = filter === 'all' ? feedback : feedback.filter((f) => f.targetType === filter);
  return (
    <section className="knx-pt-panel">
      <div className="knx-pt-head">
        <p>{canWrite ? 'Feedback general del proyecto y de cada ítem. Para comentar un ítem puntual, usa su botón «Feedback».' : 'El feedback que dejaron sobre el proyecto y sobre lo tuyo.'}</p>
      </div>
      {canWrite && (
        <div className="knx-pt-card">
          <span className="knx-pt-label">Feedback sobre el proyecto</span>
          <FeedbackComposerInline tenant={tenant} projectId={projectId} onChanged={onChanged} />
        </div>
      )}
      {filters.length > 2 && (
        <div className="knx-knowledge-filters" style={{ margin: '4px 0 10px' }}>
          {filters.map((t) => (
            <button key={t.id} type="button" className={`knx-filter-pill${filter === t.id ? ' knx-filter-pill--active' : ''}`} onClick={() => setFilter(t.id)}>{t.label}</button>
          ))}
        </div>
      )}
      <FeedbackThreads tenant={tenant} projectId={projectId} feedback={shown} canWrite={canWrite} onChanged={onChanged} showTarget emptyText="Sin feedback todavía." />
    </section>
  );
}

function FeedbackComposerInline({ tenant, projectId, onChanged }) {
  return (
    <FeedbackComposer
      onSend={async (p) => {
        const { error } = await sendJson(`/api/kai-next/${tenant}/projects/${projectId}/feedback`, 'POST', { ...p, targetType: 'proyecto' });
        if (!error) onChanged?.();
        return error;
      }}
    />
  );
}

// ── Pestaña Historia: eventos con lo nuevo resaltado ─────────────────────────
const EVENT_TONE = { feedback: 'fb', reporte: 'rep', detalle: 'det' };

export function HistoriaTab({ tenant, projectId, events = [], viewerKey, onSeen }) {
  // Lo nuevo se calcula al abrir la pestaña y se mantiene resaltado mientras estás en ella,
  // aunque en el mismo momento se marque como visto en el servidor.
  const [newIds] = useState(() => new Set(events.filter((e) => viewerKey && !e.seenBy?.includes(viewerKey)).map((e) => e.id)));
  useEffect(() => {
    if (newIds.size) sendJson(`/api/kai-next/${tenant}/projects/${projectId}/events/seen`, 'POST', { eventIds: [...newIds] }).then(() => onSeen?.());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!events.length) return <p className="knx-knowledge-empty">Sin actividad todavía.</p>;
  return (
    <section className="knx-pt-panel">
      {newIds.size > 0 && <p className="knx-pt-new">{newIds.size} {newIds.size === 1 ? 'novedad' : 'novedades'} desde tu última visita</p>}
      <ul className="knx-tl">
        {events.map((e) => (
          <li key={e.id} className={`knx-tl-item knx-tl-item--${EVENT_TONE[e.type] ?? 'base'}${newIds.has(e.id) ? ' knx-tl-item--new' : ''}`}>
            <div className="knx-tl-head">
              <span className="knx-tl-title">{e.title}</span>
              <time>{fmtDateTime(e.date)}</time>
            </div>
            {e.body && <p className="knx-tl-body">{e.body}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ── Pestaña Resumen ──────────────────────────────────────────────────────────
function DimensionBars({ dimensions }) {
  return (
    <div className="knx-ai-dims">
      {dimensions.map((d) => (
        <div key={d.name} className="knx-ai-dim">
          <span className="knx-ai-dim-name">{d.name}</span>
          <span className="knx-ai-dim-bar"><i style={{ width: `${Math.max(0, Math.min(100, Number(d.pct) || 0))}%` }} /></span>
          <span className="knx-ai-dim-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function AiAnalysisCard({ tenant, projectId }) {
  const [state, setState] = useState({ loading: true });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const url = `/api/kai-next/${tenant}/projects/${projectId}/summary`;

  useEffect(() => {
    fetch(url).then((r) => r.json()).then((d) => setState({ ...d, loading: false })).catch(() => setState({ loading: false }));
  }, [url]);

  if (state.loading || !state.role) return null;
  const s = state.summary;

  const regenerate = async () => {
    setBusy(true);
    setErr(null);
    const { data, error } = await sendJson(url, 'POST');
    setBusy(false);
    if (error) setErr(error);
    else setState((p) => ({ ...p, summary: data.summary }));
  };

  return (
    <div className="knx-pt-card knx-ai-card">
      <div className="knx-ai-top">
        <span className="knx-pt-label">Análisis de Kai</span>
        <button type="button" className="knx-canvas-mini" onClick={regenerate} disabled={busy}>{busy ? 'Analizando…' : s ? 'Actualizar' : 'Generar análisis'}</button>
      </div>
      {err && <p className="knx-emp-err">{err}</p>}
      {!s && !busy && <p className="knx-knowledge-empty">Kai lee las pruebas, ejecuciones y feedback, y te da una conclusión con evaluación de hipótesis, éxito, ejecución, conocimiento y trazabilidad.</p>}
      {s && state.role === 'director' && (
        <>
          <h4 className="knx-ai-headline">{s.headline}</h4>
          <p className="knx-ai-when">Análisis del {fmtDateTime(s.generatedAt)}</p>
          {s.narrative && <p className="knx-ai-text">{s.narrative}</p>}
          {s.dimensions?.length > 0 && <DimensionBars dimensions={s.dimensions} />}
          <div className="knx-ai-cols">
            {s.wentWell?.length > 0 && <div><span className="knx-pt-label">Lo que salió bien</span><ul>{s.wentWell.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
            {s.needsAttention?.length > 0 && <div><span className="knx-pt-label">Requiere atención</span><ul>{s.needsAttention.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
          </div>
        </>
      )}
      {s && state.role === 'supervisor' && (
        <>
          <p className="knx-ai-when">Análisis del {fmtDateTime(s.generatedAt)}</p>
          <p className="knx-ai-text">{s.whatChanged}</p>
          {s.priorities?.length > 0 && (
            <ul className="knx-ai-prios">
              {s.priorities.map((p, i) => <li key={i}><span aria-hidden="true">{p.icon}</span><div><b>{p.title}</b><p>{p.why}</p></div></li>)}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function DetailsEditor({ meta, onSave, onCancel }) {
  const [code, setCode] = useState(meta.code ?? '');
  const [type, setType] = useState(meta.type ?? '');
  const [purpose, setPurpose] = useState(meta.purpose ?? '');
  const [hypothesis, setHypothesis] = useState(meta.hypothesis ?? '');
  const [requiresReview, setRequiresReview] = useState(!!meta.requiresReview);
  const [busy, setBusy] = useState(false);
  const isExperimental = meta.projectKind === 'experimental';
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const patch = { code, type };
    if (isExperimental) Object.assign(patch, { purpose, hypothesis });
    if (meta.projectKind === 'seguimiento') patch.requiresReview = requiresReview;
    await onSave(patch);
    setBusy(false);
  };
  return (
    <form className="knx-emp-form" onSubmit={submit}>
      <div className="knx-role-editor-grid">
        <label className="knx-emp-field"><span>Código</span><input value={code} onChange={(e) => setCode(e.target.value)} disabled={busy} /></label>
        <label className="knx-emp-field"><span>Tipo</span><input value={type} onChange={(e) => setType(e.target.value)} disabled={busy} /></label>
      </div>
      {isExperimental && (
        <>
          <label className="knx-emp-field"><span>Objetivo</span><textarea rows={3} value={purpose} onChange={(e) => setPurpose(e.target.value)} disabled={busy} /></label>
          <label className="knx-emp-field"><span>Hipótesis</span><textarea rows={3} value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} disabled={busy} /></label>
        </>
      )}
      {meta.projectKind === 'seguimiento' && (
        <label className="knx-role-check">
          <input type="checkbox" checked={requiresReview} onChange={(e) => setRequiresReview(e.target.checked)} disabled={busy} />
          <span><b>Las tareas pasan por revisión</b><small>Una tarea terminada queda «En revisión» hasta que un Director o Supervisor del proyecto la valida.</small></span>
        </label>
      )}
      <div className="knx-emp-form-foot">
        <button type="button" className="knx-admin-chip-btn" onClick={onCancel} disabled={busy}>Cancelar</button>
        <button type="submit" className="knx-admin-btn" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </form>
  );
}

export function ResumenTab({ tenant, projectId, meta, level, people = [], tasks = [], tests = [], executions = [], civilMetrics, events = [], viewerKey, onSaveDetails, onGoTo }) {
  const [editing, setEditing] = useState(false);
  const isExperimental = meta.projectKind === 'experimental';
  const team = (meta.supervisorIds ?? []).map((id) => people.find((p) => p.id === id)?.name).filter(Boolean);
  const unseen = viewerKey ? events.filter((e) => !e.seenBy?.includes(viewerKey)) : [];
  const today = new Date().toISOString().slice(0, 10);
  const vencidas = tasks.filter((t) => t.status !== 'done' && t.fechaFin && t.fechaFin.slice(0, 10) < today).length;
  const enRevision = tasks.filter((t) => t.status === 'review').length;
  const doneTasks = tasks.filter((t) => t.status === 'done').length;
  const stats = isExperimental
    ? [
      { label: 'Pruebas', value: tests.length },
      { label: 'Ejecuciones', value: executions.length },
      { label: 'Validadas', value: executions.filter((e) => e.validatedBy).length },
    ]
    : [
      { label: 'Avance', value: tasks.length ? `${Math.round((doneTasks / tasks.length) * 100)}%` : '—', sub: `${doneTasks} de ${tasks.length} tareas` },
      { label: 'Vencidas', value: vencidas, bad: vencidas > 0 },
      ...(meta.requiresReview ? [{ label: 'En revisión', value: enRevision }] : []),
      ...(meta.projectKind === 'civil' && civilMetrics?.totalImporte > 0 ? [{ label: 'Ejecución financiera', value: `${civilMetrics.pctFinanciero}%` }] : []),
    ];

  return (
    <section className="knx-pt-panel">
      {unseen.length > 0 && (
        <button type="button" className="knx-pt-news" onClick={() => onGoTo('historia')}>
          <b>{unseen.length} {unseen.length === 1 ? 'novedad' : 'novedades'}</b> desde tu última visita · {unseen[0].title} <span>Ver →</span>
        </button>
      )}

      <div className="knx-pt-stats">
        {stats.map((s) => (
          <div key={s.label} className={`knx-pt-stat${s.bad ? ' knx-pt-stat--bad' : ''}`}>
            <span>{s.label}</span><b>{s.value}</b>{s.sub && <small>{s.sub}</small>}
          </div>
        ))}
      </div>

      <div className="knx-pt-card">
        <div className="knx-ai-top">
          <span className="knx-pt-label">Datos del proyecto</span>
          {level.isDirectorLevel && !editing && <button type="button" className="knx-canvas-mini" onClick={() => setEditing(true)}>Editar</button>}
        </div>
        {editing ? (
          <DetailsEditor meta={meta} onCancel={() => setEditing(false)} onSave={async (patch) => { await onSaveDetails(patch); setEditing(false); }} />
        ) : (
          <dl className="knx-pt-dl">
            {meta.code && <><dt>Código</dt><dd>{meta.code}</dd></>}
            {meta.type && <><dt>Tipo</dt><dd>{meta.type}</dd></>}
            {isExperimental && <><dt>Objetivo</dt><dd>{meta.purpose || <em>Sin objetivo cargado.</em>}</dd></>}
            {isExperimental && meta.hypothesis && <><dt>Hipótesis</dt><dd>{meta.hypothesis}</dd></>}
            {isExperimental && meta.successCriteria?.length > 0 && (
              <><dt>Criterios de éxito</dt><dd>{meta.successCriteria.map((c) => (typeof c === 'string' ? c : [c.label ?? c.name, c.operator, c.value, c.unit].filter(Boolean).join(' '))).join(' · ')}</dd></>
            )}
            {meta.projectKind === 'seguimiento' && <><dt>Revisión</dt><dd>{meta.requiresReview ? 'Las tareas terminadas pasan por revisión' : 'Sin revisión'}</dd></>}
            <dt>Equipo</dt><dd>{team.length ? team.join(', ') : <em>Sin equipo asignado.</em>}</dd>
            {meta.fechaInicioProyecto && <><dt>Fechas</dt><dd>{fmtDate(meta.fechaInicioProyecto)} → {fmtDate(meta.fechaFinProyecto)}</dd></>}
          </dl>
        )}
      </div>

      {isExperimental && level.isSupervisorLevel && <AiAnalysisCard tenant={tenant} projectId={projectId} />}
    </section>
  );
}

// ── Pestaña Reportes ─────────────────────────────────────────────────────────
const REPORT_STATUS = { borrador: 'Borrador', enviado: 'Enviado a Dirección', aprobado: 'Aprobado' };

function ReportBody({ report, editing, draft, setDraft }) {
  if (report.kind === 'civil') {
    const m = report.metrics ?? {};
    return (
      <>
        <div className="knx-pt-stats">
          <div className="knx-pt-stat"><span>Tareas</span><b>{m.pctTareas ?? 0}%</b><small>{m.tareasTerminadas ?? 0} de {m.totalTareas ?? 0}</small></div>
          {m.totalImporte > 0 && <div className="knx-pt-stat"><span>Financiero</span><b>{m.pctFinanciero}%</b></div>}
          <div className="knx-pt-stat"><span>Tiempo</span><b>{m.pctTiempo ?? 0}%</b></div>
        </div>
        {editing
          ? <textarea className="knx-rep-edit" rows={10} value={draft} onChange={(e) => setDraft(e.target.value)} />
          : <div className="knx-rep-text">{(report.analysis || '').split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}</div>}
      </>
    );
  }
  const d = report.doc ?? {};
  if (editing) {
    return (
      <>
        <label className="knx-emp-field"><span>Resumen</span><textarea rows={4} value={draft.summary ?? ''} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} /></label>
        <label className="knx-emp-field"><span>Resultados</span><textarea rows={4} value={draft.results ?? ''} onChange={(e) => setDraft({ ...draft, results: e.target.value })} /></label>
        <label className="knx-emp-field"><span>Aprendizajes</span><textarea rows={3} value={draft.learnings ?? ''} onChange={(e) => setDraft({ ...draft, learnings: e.target.value })} /></label>
      </>
    );
  }
  return (
    <div className="knx-rep-text">
      {d.summary && <p>{d.summary}</p>}
      {d.whatWasTested?.length > 0 && <><span className="knx-pt-label">Qué se probó</span><ul>{d.whatWasTested.map((x, i) => <li key={i}>{x}</li>)}</ul></>}
      {d.results && <><span className="knx-pt-label">Resultados</span><p>{d.results}</p></>}
      {d.learnings && <><span className="knx-pt-label">Aprendizajes</span><p>{d.learnings}</p></>}
      {d.highlightedFeedback && <><span className="knx-pt-label">Feedback destacado</span><p>{d.highlightedFeedback}</p></>}
      {d.nextSteps?.length > 0 && <><span className="knx-pt-label">Próximos pasos</span><ul>{d.nextSteps.map((x, i) => <li key={i}>{x}</li>)}</ul></>}
    </div>
  );
}

function ReportCard({ tenant, projectId, report, canApprove, feedback, onChanged }) {
  const [open, setOpen] = useState(report.status !== 'aprobado');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(report.kind === 'civil' ? report.analysis ?? '' : report.doc ?? {});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const url = `/api/kai-next/${tenant}/projects/${projectId}/reports`;

  const act = async (action, extra = {}) => {
    setBusy(true);
    setErr(null);
    const { error } = await sendJson(url, 'PATCH', { reportId: report.id, action, ...extra });
    setBusy(false);
    if (error) { setErr(error); return; }
    setEditing(false);
    onChanged?.();
  };

  return (
    <li className="knx-rep">
      <button type="button" className="knx-rep-head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="knx-rep-title">Reporte del {fmtDate(report.createdAt)}<small>{report.generatedBy ? `Generado por ${report.generatedBy}` : ''}</small></span>
        <span className={`knx-rep-status knx-rep-status--${report.status}`}>{REPORT_STATUS[report.status] ?? report.status}</span>
      </button>
      {open && (
        <div className="knx-rep-content">
          <ReportBody report={report} editing={editing} draft={draft} setDraft={setDraft} />
          {err && <p className="knx-emp-err">{err}</p>}
          <div className="knx-rep-actions">
            <a className="knx-canvas-mini" href={`${url}/${report.id}/pdf`}>Descargar PDF</a>
            {report.status === 'borrador' && !editing && <button type="button" className="knx-canvas-mini" onClick={() => setEditing(true)} disabled={busy}>Editar</button>}
            {editing && (
              <>
                <button type="button" className="knx-canvas-mini" onClick={() => setEditing(false)} disabled={busy}>Cancelar</button>
                <button type="button" className="knx-analisis-sources-save" disabled={busy} onClick={() => act('edit', report.kind === 'civil' ? { analysis: draft } : { doc: draft })}>Guardar</button>
              </>
            )}
            {report.status === 'borrador' && !editing && <button type="button" className="knx-analisis-sources-save" disabled={busy} onClick={() => act('submit')}>Enviar a Dirección</button>}
            {report.status === 'enviado' && canApprove && <button type="button" className="knx-analisis-sources-save" disabled={busy} onClick={() => act('approve')}>Aprobar</button>}
            {report.status === 'enviado' && !canApprove && <span className="knx-rep-wait">Esperando la aprobación de un Director.</span>}
            <FeedbackButton tenant={tenant} projectId={projectId} feedback={feedback} target={{ type: 'reporte', id: report.id }} label={`Reporte del ${fmtDate(report.createdAt)}`} canWrite onChanged={onChanged} />
          </div>
        </div>
      )}
    </li>
  );
}

export function ReportesTab({ tenant, projectId, reports = [], feedback = [], canApprove, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const pendientes = useMemo(() => reports.filter((r) => r.status === 'enviado').length, [reports]);

  const generate = async () => {
    setBusy(true);
    setErr(null);
    const { error } = await sendJson(`/api/kai-next/${tenant}/projects/${projectId}/reports`, 'POST', {});
    setBusy(false);
    if (error) setErr(error);
    else onChanged?.();
  };

  return (
    <section className="knx-pt-panel">
      <div className="knx-pt-head">
        <p>Kai arma el borrador con el estado actual del proyecto. Lo revisas, lo envías a Dirección y un Director lo aprueba.{canApprove && pendientes ? ` Tienes ${pendientes} por aprobar.` : ''}</p>
        <button type="button" className="knx-analisis-sources-save" onClick={generate} disabled={busy}>{busy ? 'Generando… (puede tardar un minuto)' : '+ Generar reporte'}</button>
      </div>
      {err && <p className="knx-emp-err">{err}</p>}
      {!reports.length ? <p className="knx-knowledge-empty">Sin reportes todavía.</p> : (
        <ul className="knx-rep-list">
          {reports.map((r) => <ReportCard key={r.id} tenant={tenant} projectId={projectId} report={r} canApprove={canApprove} feedback={feedback} onChanged={onChanged} />)}
        </ul>
      )}
    </section>
  );
}

// Feedback de un ítem que se carga solo (para pantallas que no traen el feedback del proyecto,
// como las tareas y épicas de Desarrollo).
export function ItemFeedback({ tenant, projectId, target, title = 'Feedback' }) {
  const [state, setState] = useState(null);
  const load = () => {
    fetch(`/api/kai-next/${tenant}/projects/${projectId}/feedback`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setState(d ?? { feedback: [], canWrite: false, canReply: false }))
      .catch(() => setState({ feedback: [], canWrite: false, canReply: false }));
  };
  useEffect(load, [tenant, projectId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return null;
  const mine = state.feedback.filter((f) => f.targetType === target.type && f.targetId === target.id);
  if (!state.canWrite && !mine.length) return null;
  return (
    <div className="knx-task-feedback">
      <span className="knx-pt-label">{title}{mine.length ? ` (${mine.filter((f) => !f.replyTo).length})` : ''}</span>
      <FeedbackThreads
        tenant={tenant}
        projectId={projectId}
        feedback={state.feedback}
        target={target}
        canWrite={state.canWrite}
        canReply={state.canReply}
        onChanged={load}
      />
    </div>
  );
}
