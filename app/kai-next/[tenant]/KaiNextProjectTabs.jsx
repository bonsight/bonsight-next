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
        <button type="button" className="knx-canvas-mini" onClick={() => fileRef.current?.click()} disabled={busy}>Adjuntar</button>
        <input ref={fileRef} type="file" multiple hidden accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={(e) => { setFiles((p) => [...p, ...Array.from(e.target.files ?? [])]); e.target.value = ''; }} />
        {withVisibility && (
          <label className="knx-fb-vis-wrap">
            <span>Visible para</span>
            <select value={visibility} onChange={(e) => setVisibility(e.target.value)} disabled={busy} className="knx-fb-vis">
              <option>Todo el equipo</option>
              <option>Privado a Supervisor</option>
            </select>
          </label>
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

// ── Panel lateral de Feedback (rediseño 2026-11-24) ─────────────────────────
// Uno solo por ítem: una prueba abre su feedback y el de todos sus aportes, con pestañas
// Todo / Sobre la prueba / Sobre aportes; el resto de los ítems (tarea, partida, reporte…) abre
// el mismo panel con un único alcance. scopes: [{ type, id, tag }] — el primero es el principal.
const SCOPE_TAB_LABEL = { prueba: 'Sobre la prueba', aporte: 'Sobre aportes', tarea: 'Sobre la tarea', partida: 'Sobre la partida', reporte: 'Sobre el reporte', proyecto: 'Sobre el proyecto' };
const scopeKey = (s) => `${s.type}:${s.id ?? ''}`;

export function feedbackCountFor(feedback = [], scopes = []) {
  const keys = new Set(scopes.map(scopeKey));
  return feedback.filter((f) => keys.has(`${f.targetType}:${f.targetId ?? ''}`)).length;
}

const EMPTY_LABEL = { prueba: 'en esta prueba', tarea: 'en esta tarea', partida: 'en esta partida', reporte: 'en este reporte', aporte: 'en este aporte', proyecto: 'en este proyecto' };

// Tarjeta para escribir dentro del panel: "¿Sobre qué es tu feedback?" (botones), texto, y al
// pie Adjuntar · Visible para · Enviar. Al responder, el encabezado pasa a "Respondiendo a…".
function PanelComposer({ scopes, about, onAbout, replying, replyTag, onCancelReply, onSend }) {
  const [text, setText] = useState('');
  const [visibility, setVisibility] = useState('Todo el equipo');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const fileRef = useRef(null);
  const taRef = useRef(null);
  useEffect(() => { if (replying) taRef.current?.focus(); }, [replying]);

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
    <form className="knx-fbc" onSubmit={submit}>
      {replying ? (
        <div className="knx-fbc-reply">
          <span>↩ Respondiendo a <strong>{replying.who}</strong>{replyTag ? ` · ${replyTag}` : ''}</span>
          <button type="button" aria-label="Cancelar respuesta" onClick={onCancelReply}>×</button>
        </div>
      ) : scopes.length > 1 && (
        <div className="knx-fbc-about">
          <div className="knx-fbc-about-label" id="knx-fbc-about">¿Sobre qué es tu feedback?</div>
          <div role="radiogroup" aria-labelledby="knx-fbc-about" className="knx-fbc-pills">
            {scopes.map((sc) => {
              const k = scopeKey(sc);
              return <button key={k} type="button" role="radio" aria-checked={about === k} className={`knx-fbc-pill${about === k ? ' knx-fbc-pill--on' : ''}`} onClick={() => onAbout(k)}>{sc.tag}</button>;
            })}
          </div>
        </div>
      )}
      <label htmlFor="knx-fbc-text" className="knx-sr-only">Mensaje</label>
      <textarea id="knx-fbc-text" ref={taRef} rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={replying ? 'Escribe tu respuesta…' : 'Escribe tu feedback…'} disabled={busy} />
      {files.length > 0 && (
        <div className="knx-fb-atts" style={{ padding: '0 14px' }}>
          {files.map((f, i) => (
            <button key={i} type="button" className="knx-fb-att knx-fb-att--rm" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} title="Quitar">{f.name} ×</button>
          ))}
        </div>
      )}
      <div className="knx-fbc-foot">
        <div className="knx-fbc-tools">
          <button type="button" className="knx-fbc-tool" onClick={() => fileRef.current?.click()} disabled={busy}>Adjuntar</button>
          <input ref={fileRef} type="file" multiple hidden accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={(e) => { setFiles((p) => [...p, ...Array.from(e.target.files ?? [])]); e.target.value = ''; }} />
          {!replying && (
            <>
              <label htmlFor="knx-fbc-vis">Visible para</label>
              <select id="knx-fbc-vis" value={visibility} onChange={(e) => setVisibility(e.target.value)} disabled={busy}>
                <option>Todo el equipo</option>
                <option>Privado a Supervisor</option>
              </select>
            </>
          )}
        </div>
        <button type="submit" className="knx-fbc-send" disabled={busy || (!text.trim() && !files.length)}>{busy ? 'Enviando…' : 'Enviar'}</button>
      </div>
      {err && <p className="knx-dlg-error" role="alert" style={{ padding: '0 14px 10px' }}>{err}</p>}
    </form>
  );
}

export function FeedbackPanel({ tenant, projectId, feedback = [], scopes, initialScope = null, title, canWrite, canReply = canWrite, onChanged, onClose }) {
  const keys = new Set(scopes.map(scopeKey));
  const tagOf = new Map(scopes.map((sc) => [scopeKey(sc), sc.tag]));
  const mine = feedback.filter((f) => keys.has(`${f.targetType}:${f.targetId ?? ''}`));
  const types = [...new Set(scopes.map((sc) => sc.type))];
  const [tab, setTab] = useState(initialScope && types.length > 1 ? initialScope.type : 'todo');
  const [about, setAbout] = useState(scopeKey(initialScope ?? scopes[0]));
  const [replyTo, setReplyTo] = useState(null);
  const url = `/api/kai-next/${tenant}/projects/${projectId}/feedback`;

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const has = mine.length > 0;
  const top = mine.filter((f) => !f.replyTo && (tab === 'todo' || f.targetType === tab));
  const repliesOf = (id) => mine.filter((f) => f.replyTo === id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const count = (t) => mine.filter((f) => !f.replyTo && (t === 'todo' || f.targetType === t)).length;
  const replying = replyTo ? mine.find((f) => f.id === replyTo) : null;
  const tagFor = (f) => tagOf.get(`${f.targetType}:${f.targetId ?? ''}`);

  const send = async (p) => {
    const body = replying
      ? { text: p.text, attachments: p.attachments, replyTo: replying.id }
      : (() => { const sc = scopes.find((x) => scopeKey(x) === about) ?? scopes[0]; return { ...p, targetType: sc.type, targetId: sc.id ?? null }; })();
    const { error } = await sendJson(url, 'POST', body);
    if (!error) { setReplyTo(null); onChanged?.(); }
    return error;
  };

  const composer = (canWrite || replying) && (
    <PanelComposer
      scopes={scopes}
      about={about}
      onAbout={setAbout}
      replying={replying}
      replyTag={replying && types.length > 1 ? tagFor(replying) : null}
      onCancelReply={() => setReplyTo(null)}
      onSend={send}
    />
  );

  return (
    <div className="knx-fbp-backdrop" onClick={onClose}>
      <aside className="knx-fbp" role="dialog" aria-modal="true" aria-labelledby="knx-fbp-title" onClick={(e) => e.stopPropagation()}>
        <div className="knx-fbp-head">
          <div className="knx-fbp-head-row">
            <div style={{ minWidth: 0 }}>
              <div className="knx-fbp-eyebrow">Feedback</div>
              <h2 id="knx-fbp-title" className="knx-fbp-title">{title}</h2>
            </div>
            <button type="button" className="knx-dlg-close" aria-label="Cerrar" onClick={onClose}>×</button>
          </div>
          {has && types.length > 1 && (
            <div role="tablist" className="knx-fbp-tabs">
              {['todo', ...types].map((t) => (
                <button key={t} type="button" role="tab" aria-selected={tab === t} className={`knx-fbp-tab${tab === t ? ' knx-fbp-tab--on' : ''}`} onClick={() => setTab(t)}>
                  {t === 'todo' ? 'Todo' : SCOPE_TAB_LABEL[t] ?? t} <span>{count(t)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="knx-fbp-scroll">
          {!has ? (
            <>
              <div className="knx-fbp-empty">
                <div className="knx-fbp-empty-title">Aún no hay feedback {EMPTY_LABEL[scopes[0].type] ?? ''}</div>
                {canWrite && <div className="knx-fbp-empty-sub">{scopes.length > 1 ? 'Comenta la prueba completa o un aporte en particular.' : 'Sé la primera persona en comentar.'}</div>}
              </div>
              {composer && <div className="knx-fbp-compose">{composer}</div>}
            </>
          ) : (
            <>
              <div className="knx-fbp-list">
                {!top.length ? <p className="knx-knowledge-empty">No hay feedback en esta pestaña.</p> : top.map((f) => {
                  const rs = repliesOf(f.id);
                  const tag = tagFor(f);
                  return (
                    <div key={f.id} className={`knx-fbp-item${replyTo === f.id ? ' knx-fbp-item--on' : ''}`}>
                      <span className="knx-fbp-av" aria-hidden="true">{initials(f.who)}</span>
                      <div className="knx-fbp-body">
                        <div className="knx-fbp-meta"><strong>{f.who}</strong><span>{[f.whoRole, fmtDateTime(f.createdAt)].filter(Boolean).join(' · ')}</span></div>
                        <div className="knx-fbp-tags">
                          {types.length > 1 && tag && <span className={`knx-fbp-tag knx-fbp-tag--${f.targetType}`}>{tag}</span>}
                          {f.visibility === 'Privado a Supervisor' && <span className="knx-fb-private">Privado a Supervisor</span>}
                        </div>
                        {f.text && <p className="knx-fbp-text">{f.text}</p>}
                        <AttachmentLinks attachments={f.attachments} />
                        {f.suggestion && (
                          <div className="knx-fb-suggestion">
                            <span>Kai sugiere una nueva ejecución: {f.suggestion}</span>
                            {canWrite && <button type="button" className="knx-canvas-mini" onClick={async () => { await sendJson(url, 'DELETE', { feedbackId: f.id }); onChanged?.(); }}>Descartar</button>}
                          </div>
                        )}
                        {rs.length > 0 && (
                          <ul className="knx-fb-replies">
                            {rs.map((r) => (
                              <li key={r.id} className="knx-fb-reply">
                                <div className="knx-fbp-meta"><strong>{r.who}</strong><span>{fmtDateTime(r.createdAt)}</span></div>
                                {r.text && <p className="knx-fbp-text">{r.text}</p>}
                                <AttachmentLinks attachments={r.attachments} />
                              </li>
                            ))}
                          </ul>
                        )}
                        {canReply && <button type="button" className="knx-fb-reply-btn" onClick={() => setReplyTo(f.id)}>Responder</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
              {composer && <div className="knx-fbp-compose knx-fbp-compose--sticky">{composer}</div>}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

// Botón "Feedback (N)" de cada ítem (tarea, partida, prueba, aporte, reporte): abre el panel lateral.
export function FeedbackButton({ tenant, projectId, feedback = [], target, label, canWrite, onChanged }) {
  const [open, setOpen] = useState(false);
  const count = feedback.filter((f) => f.targetType === target.type && f.targetId === target.id).length;
  if (!canWrite && !count) return null;
  return (
    <>
      <button type="button" className={`knx-fb-btn${open ? ' knx-fb-btn--on' : ''}`} onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
        Feedback{count ? ` (${count})` : ''}
      </button>
      {open && (
        <FeedbackPanel tenant={tenant} projectId={projectId} feedback={feedback} scopes={[{ type: target.type, id: target.id, tag: label }]}
          title={label} canWrite={canWrite} onChanged={onChanged} onClose={() => setOpen(false)} />
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

// Tipos de evento que llevan a algún lado (ver goToEvent en KaiNextProjects.jsx). 'detalle' (cambios
// de fechas/estado del proyecto) y lo desconocido se quedan como texto.
const LINKABLE_EVENTS = new Set(['tarea', 'documento', 'reporte', 'feedback', 'gasto', 'aporte', 'validacion', 'reunion']);

// Historia (rediseño 2026-11-24): agrupada por día, con hora, filtros por tipo, monto en los gastos
// y "Mostrar más". Punto lleno = no visto; abrir un evento lo marca visto y lleva a lo que se hizo.
// lookups: tareas, documentos, gastos, partidas y pruebas del proyecto, para nombrar cada evento con
// el dato al día (si ya no existe, se usa el texto que quedó en el evento).
const HIST_KIND = {
  gasto: { group: 'gastos', label: 'Gastos' }, tarea: { group: 'tareas', label: 'Tareas' }, documento: { group: 'documentos', label: 'Documentos' },
  feedback: { group: 'feedback', label: 'Feedback' }, reporte: { group: 'reportes', label: 'Reportes' }, aporte: { group: 'pruebas', label: 'Pruebas' },
  validacion: { group: 'pruebas', label: 'Pruebas' }, reunion: { group: 'reuniones', label: 'Reuniones' }, detalle: { group: 'cambios', label: 'Cambios' },
};
const HIST_ORDER = ['gastos', 'tareas', 'documentos', 'pruebas', 'feedback', 'reportes', 'reuniones', 'cambios'];
const TASK_EVENT = { done: 'Tarea terminada', doing: 'Tarea en curso', todo: 'Tarea por hacer', backlog: 'Tarea a Backlog', review: 'Tarea en revisión' };
const WEEKDAY = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MES_U = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const HIST_PAGE = 30;
const HIST_STEP = 20;
const quoted = (t = '') => t.match(/[«"]([^»"]+)[»"]/)?.[1] ?? null;
const dayKey = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };

function describeEvent(e, L) {
  const stripActor = (t = '') => (e.actor && t.startsWith(e.actor) ? t.slice(e.actor.length).trim() : t);
  switch (e.type) {
    case 'tarea': {
      const t = L.tasks.get(e.taskId);
      if (e.kind === 'personas') return { kind: 'Personas', name: t?.nombre ?? quoted(e.title) ?? stripActor(e.title) };
      const validated = /validó/.test(e.title ?? '');
      return { kind: validated ? 'Tarea validada' : TASK_EVENT[e.status] ?? 'Tarea', name: t?.nombre ?? quoted(e.title) ?? stripActor(e.title) };
    }
    case 'documento': return { kind: 'Documento', name: L.docs.get(e.documentId)?.name ?? ((e.title ?? '').split(' — ').slice(1).join(' — ') || stripActor(e.title)) };
    case 'gasto': {
      const g = L.gastos.get(e.gastoId);
      const parsed = String(e.title ?? '').match(/gasto de ([\d.,]+)/)?.[1];
      const amount = g?.monto ?? (parsed ? Number(parsed.replace(/,/g, '')) : null);
      return { kind: 'Gasto', name: L.partidas.get(e.partidaId)?.descripcion ?? quoted(e.title) ?? stripActor(e.title), amount: Number.isFinite(amount) ? amount : null };
    }
    case 'feedback': return { kind: e.replyTo ? 'Respuesta' : 'Feedback', name: (e.title ?? '').split(' sobre ').slice(1).join(' sobre ') || stripActor(e.title) };
    case 'aporte': case 'validacion': return { kind: e.type === 'aporte' ? 'Aporte' : 'Validación', name: L.tests.get(e.testId)?.name ?? ((e.title ?? '').split(' — ').slice(1).join(' — ') || stripActor(e.title)) };
    case 'reunion': return { kind: 'Reunión', name: quoted(e.title) ?? stripActor(e.title) };
    case 'reporte': return { kind: 'Reporte', name: stripActor(e.title) };
    default: return { kind: null, name: stripActor(e.title) || e.title };
  }
}

export function HistoriaTab({ tenant, projectId, events = [], viewerKey, onSeen, onGoTo, lookups = {} }) {
  const [seenLocal, setSeenLocal] = useState(() => new Set());
  const [filter, setFilter] = useState('todo');
  const [limit, setLimit] = useState(HIST_PAGE);
  const isSeen = (e) => !viewerKey || seenLocal.has(e.id) || !!e.seenBy?.includes(viewerKey);
  const L = useMemo(() => ({
    tasks: new Map((lookups.tasks ?? []).map((x) => [x.id, x])),
    docs: new Map((lookups.documents ?? []).map((x) => [x.id, x])),
    gastos: new Map((lookups.gastos ?? []).map((x) => [x.id, x])),
    partidas: new Map((lookups.partidas ?? []).map((x) => [x.id, x])),
    tests: new Map((lookups.tests ?? []).map((x) => [x.id, x])),
  }), [lookups.tasks, lookups.documents, lookups.gastos, lookups.partidas, lookups.tests]);

  const markSeen = (ids) => {
    if (!viewerKey || !ids.length) return;
    setSeenLocal((prev) => new Set([...prev, ...ids]));
    sendJson(`/api/kai-next/${tenant}/projects/${projectId}/events/seen`, 'POST', { eventIds: ids }).then(() => onSeen?.());
  };
  const open = (e, linkable) => {
    if (!isSeen(e)) markSeen([e.id]);
    if (linkable) onGoTo(e);
  };

  if (!events.length) return <p className="knx-knowledge-empty">Sin actividad todavía.</p>;

  const groupOf = (e) => HIST_KIND[e.type]?.group ?? 'cambios';
  const counts = events.reduce((m, e) => { const g = groupOf(e); m[g] = (m[g] ?? 0) + 1; return m; }, {});
  const filters = HIST_ORDER.filter((g) => counts[g]);
  const filtered = filter === 'todo' ? events : events.filter((e) => groupOf(e) === filter);
  const shown = filtered.slice(0, limit);
  const unseen = events.filter((e) => !isSeen(e));
  const actors = [...new Set(shown.map((e) => e.actor).filter(Boolean))];
  const today = dayKey(new Date().toISOString());
  const yesterday = dayKey(new Date(Date.now() - 86400000).toISOString());

  let lastDay = null;
  let lastActor = null;
  const rows = [];
  for (const e of shown) {
    const dk = dayKey(e.date);
    if (dk !== lastDay) {
      const d = new Date(e.date);
      rows.push(
        <li key={`d-${dk}`} className="knx-hist-day">
          <span className="knx-hist-date">{d.getDate()} {MES_U[d.getMonth()]}</span>
          <span className="knx-hist-daymark" aria-hidden="true" />
          <span className="knx-hist-dayname">{dk === today ? 'Hoy' : dk === yesterday ? 'Ayer' : WEEKDAY[d.getDay()]}</span>
        </li>,
      );
      lastDay = dk;
      lastActor = null;
    }
    const linkable = !!onGoTo && LINKABLE_EVENTS.has(e.type);
    const seen = isSeen(e);
    const clickable = linkable || !seen;
    const dsc = describeEvent(e, L);
    const showActor = actors.length > 1 && e.actor && e.actor !== lastActor;
    lastActor = e.actor ?? lastActor;
    const time = new Date(e.date).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
    rows.push(
      <li key={e.id} className={`knx-hist-ev${seen ? ' knx-hist-ev--seen' : ''}${clickable ? ' knx-hist-ev--click' : ''}`}>
        <span className="knx-hist-time">{time}</span>
        <span className="knx-hist-dot" aria-hidden="true" />
        <div
          className="knx-hist-main"
          {...(clickable ? {
            role: 'button', tabIndex: 0, onClick: () => open(e, linkable),
            onKeyDown: (k) => { if (k.key === 'Enter' || k.key === ' ') { k.preventDefault(); open(e, linkable); } },
            title: linkable ? 'Abrir' : 'Marcar como visto',
          } : {})}
        >
          <span className="knx-hist-text">
            {dsc.kind && <span className="knx-hist-kind">{dsc.kind} · </span>}
            <strong>{dsc.name}</strong>
            {showActor && <span className="knx-hist-actor"> · {e.actor}</span>}
            {!seen && <span className="knx-sr-only"> (sin ver)</span>}
          </span>
          {dsc.amount != null && <span className="knx-hist-amount">{Number(dsc.amount).toLocaleString('es-PE', { maximumFractionDigits: 2 })}</span>}
        </div>
      </li>,
    );
  }

  return (
    <section className="knx-pt-panel">
      <div className="knx-hist-top">
        <div className="knx-hist-filters" role="tablist" aria-label="Filtrar historia">
          <button type="button" role="tab" aria-selected={filter === 'todo'} className={`knx-hist-pill${filter === 'todo' ? ' knx-hist-pill--on' : ''}`} onClick={() => { setFilter('todo'); setLimit(HIST_PAGE); }}>Todo <span>{events.length}</span></button>
          {filters.length > 1 && filters.map((g) => (
            <button key={g} type="button" role="tab" aria-selected={filter === g} className={`knx-hist-pill${filter === g ? ' knx-hist-pill--on' : ''}`} onClick={() => { setFilter(g); setLimit(HIST_PAGE); }}>
              {Object.values(HIST_KIND).find((k) => k.group === g)?.label} <span>{counts[g]}</span>
            </button>
          ))}
        </div>
        {unseen.length > 0 && (
          <div className="knx-hist-unseen">
            <span><i aria-hidden="true" />{unseen.length} sin ver</span>
            <button type="button" className="knx-eq-btn" onClick={() => markSeen(unseen.map((e) => e.id))}>Marcar todo como visto</button>
          </div>
        )}
      </div>
      <ol className="knx-hist">{rows}</ol>
      {filtered.length > limit && (
        <button type="button" className="knx-hist-more" onClick={() => setLimit((n) => n + HIST_STEP)}>
          Mostrar {Math.min(HIST_STEP, filtered.length - limit)} eventos más ▾
        </button>
      )}
      <p className="knx-hist-note">{actors.length === 1 ? `Todo por ${actors[0]} · ` : ''}el nombre aparece cuando cambia la persona.</p>
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

// ── Resumen experimental: tarjetas con valor + mejor resultado por criterio ──
const OP_SYM = { '>': '>', '<': '<', '=': '=', '>=': '≥', '<=': '≤' };
const MES3 = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fmtShort = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : `${d.getDate()} ${MES3[d.getMonth()]}`; };
const fmtLong = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '—' : `${String(d.getDate()).padStart(2, '0')} ${MES3[d.getMonth()]} ${d.getFullYear()}`; };
function numOf(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (/^(_*\s*n\s*\/?\s*a\s*_*|-+|—)?$/i.test(s.replace(/\s+[%a-zA-Z°]+$/, '').trim())) return null;
  const m = s.replace(',', '.').match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}
const passes = (op, n, v) => (op === '>' ? n > v : op === '<' ? n < v : op === '>=' ? n >= v : op === '<=' ? n <= v : op === '=' ? n === v : false);
const better = (op, a, b, v) => (op === '>' || op === '>=' ? a > b : op === '<' || op === '<=' ? a < b : Math.abs(a - v) < Math.abs(b - v));

function Bar({ parts }) {
  const total = parts.reduce((n, p) => n + p.n, 0);
  if (!total) return <div className="knx-rs-bar"><span style={{ flex: 1, background: '#EEF1F0' }} /></div>;
  return <div className="knx-rs-bar">{parts.filter((p) => p.n > 0).map((p) => <span key={p.label} style={{ flex: p.n, background: p.color }} title={`${p.n} ${p.label}`} />)}</div>;
}

function ExperimentalSummary({ tests, executions, onGoTo }) {
  const byTest = (id) => executions.filter((e) => e.testId === id);
  const hechas = tests.filter((t) => { const ex = byTest(t.id); return ex.length && ex.every((e) => e.validatedBy); }).length;
  const parciales = tests.filter((t) => { const ex = byTest(t.id); return ex.length && !ex.every((e) => e.validatedBy); }).length;
  const pendientes = tests.length - hechas - parciales;
  const tagN = (tag) => executions.filter((e) => e.tag === tag).length;
  const last = executions.reduce((m, e) => (e.createdAt && (!m || e.createdAt > m) ? e.createdAt : m), null);
  const validadas = executions.filter((e) => e.validatedBy).length;
  const esperando = executions.length - validadas;

  // Criterios: los campos numéricos con meta, agrupados por nombre+meta entre todas las pruebas.
  const crits = new Map();
  for (const t of tests) {
    for (const f of t.fields ?? []) {
      if (!f.operator || f.value == null) continue;
      const key = `${String(f.label).trim().toLowerCase()}|${f.operator}|${f.value}|${f.unit ?? ''}`;
      if (!crits.has(key)) crits.set(key, { label: f.label, operator: f.operator, value: f.value, unit: f.unit ?? '', best: null });
      const c = crits.get(key);
      for (const e of byTest(t.id)) {
        const n = numOf(e.values?.[f.key]);
        if (n == null) continue;
        if (!c.best || better(f.operator, n, c.best.n, f.value)) c.best = { n, raw: e.values[f.key], test: t.name, date: e.createdAt };
      }
    }
  }
  const list = [...crits.values()];
  const met = list.filter((c) => c.best && passes(c.operator, c.best.n, c.value)).length;

  return (
    <>
      <div className="knx-rs-grid">
        <button type="button" className="knx-rs-card knx-rs-card--link" onClick={() => onGoTo('pruebas')}>
          <div className="knx-rs-top"><span>Pruebas</span><span className="knx-rs-go">Ver pruebas →</span></div>
          <div className="knx-rs-num">{tests.length}</div>
          <Bar parts={[{ n: hechas, color: '#1F6B4A', label: 'hechas' }, { n: parciales, color: '#2F5FA8', label: 'parciales' }, { n: pendientes, color: '#E8B04B', label: 'pendientes' }]} />
          <div className="knx-rs-legend">
            <span><strong>{hechas}</strong> {hechas === 1 ? 'hecha' : 'hechas'}</span>
            {parciales > 0 && <span><strong>{parciales}</strong> {parciales === 1 ? 'parcial' : 'parciales'}</span>}
            <span><strong>{pendientes}</strong> {pendientes === 1 ? 'pendiente' : 'pendientes'}</span>
          </div>
        </button>
        <div className="knx-rs-card">
          <div className="knx-rs-top"><span>Ejecuciones</span><span>{last ? `Última: ${fmtLong(last)}` : 'Sin ejecuciones'}</span></div>
          <div className="knx-rs-num">{executions.length}</div>
          <Bar parts={[{ n: tagN('éxito'), color: '#1F6B4A', label: 'éxito' }, { n: tagN('parcial'), color: '#E8B04B', label: 'parcial' }, { n: tagN('fallo'), color: '#C2413A', label: 'fallo' }, { n: tagN('referencia'), color: '#D5DDDA', label: 'referencia' }]} />
          <div className="knx-rs-legend">
            <span><strong>{tagN('éxito')}</strong> éxito</span>
            <span><strong>{tagN('parcial')}</strong> parcial</span>
            <span><strong>{tagN('fallo')}</strong> fallo</span>
            {tagN('referencia') > 0 && <span className="knx-rs-muted"><strong>{tagN('referencia')}</strong> referencia</span>}
          </div>
        </div>
        <div className="knx-rs-card">
          <div className="knx-rs-top"><span>Validadas</span>{executions.length > 0 && (esperando ? <span className="knx-rs-warn">{esperando} por validar</span> : <span className="knx-rs-go">Al día</span>)}</div>
          <div className="knx-rs-num">{validadas} <small>de {executions.length}</small></div>
          <div className="knx-rs-bar"><span style={{ flex: validadas || 0, background: '#1F6B4A' }} /><span style={{ flex: esperando || (executions.length ? 0 : 1), background: '#EEF1F0' }} /></div>
          <div className="knx-rs-legend"><span><strong>{esperando}</strong> {esperando === 1 ? 'aporte esperando' : 'aportes esperando'} validación</span></div>
        </div>
      </div>

      {list.length > 0 && (
        <section className="knx-rs-crit">
          <div className="knx-rs-crit-head">
            <h3>Criterios de éxito · mejor resultado hasta hoy</h3>
            <span><strong>{met} de {list.length}</strong> {list.length === 1 ? 'criterio ya se cumplió' : 'criterios ya se cumplieron'} en algún aporte</span>
          </div>
          <div className="knx-rs-crit-grid">
            {list.map((c) => {
              const ok = c.best && passes(c.operator, c.best.n, c.value);
              return (
                <div key={`${c.label}${c.operator}${c.value}`} className={`knx-rs-crit-card knx-rs-crit-card--${ok ? 'ok' : 'warn'}`}>
                  <div className="knx-rs-crit-name">{c.label}</div>
                  <div className="knx-rs-crit-goal">Meta {OP_SYM[c.operator] ?? c.operator} {c.value}{c.unit ? ` ${c.unit}` : ''}</div>
                  <div className="knx-rs-crit-val">{c.best ? `${ok ? '✓ ' : ''}${c.best.n}${c.unit ? ` ${c.unit}` : ''}` : 'Sin datos'}</div>
                  <div className="knx-rs-crit-src">{c.best ? `${ok ? '' : 'No alcanza la meta · '}${c.best.test}${c.best.date ? ` · ${fmtShort(c.best.date)}` : ''}` : 'Ningún aporte lo ha medido'}</div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </>
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

      {isExperimental ? <ExperimentalSummary tests={tests} executions={executions} onGoTo={onGoTo} /> : (
      <div className="knx-pt-stats">
        {stats.map((s) => (
          <div key={s.label} className={`knx-pt-stat${s.bad ? ' knx-pt-stat--bad' : ''}`}>
            <span>{s.label}</span><b>{s.value}</b>{s.sub && <small>{s.sub}</small>}
          </div>
        ))}
      </div>
      )}

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
          {reports.map((r) => <div key={r.id} id={`report-${r.id}`}><ReportCard tenant={tenant} projectId={projectId} report={r} canApprove={canApprove} feedback={feedback} onChanged={onChanged} /></div>)}
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
