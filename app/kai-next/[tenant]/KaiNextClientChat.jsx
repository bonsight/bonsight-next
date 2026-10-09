'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { renderMessage } from '@/lib/shared/markdown';
import KaiNextSidebar from './KaiNextSidebar';
import KaiNextConfirmDialog from './KaiNextConfirmDialog';
import KaiNextAnalysisView from './KaiNextAnalysisView';
import KaiNextDocumentCard from './KaiNextDocumentCard';
import KaiNextActivityDashboardCard from './KaiNextActivityDashboardCard';
import KaiNextActivityDraftCard from './KaiNextActivityDraftCard';

const SOURCE_LABELS = {
  query_ga4: 'Google Analytics 4',
  query_search_console: 'Search Console',
  query_google_ads: 'Google Ads',
  query_database: 'Base de datos',
};

const ACCEPT = 'image/*,.pdf,.docx,.pptx,.xlsx,.xls,.csv';
const MAX_ATTACHMENTS = 4;
const MAX_FILE_BYTES = 4 * 1024 * 1024;

const QUICK_ACTIONS = [
  'Resumen de la última semana',
  'Comparar septiembre con agosto',
  'Preparar un reporte ejecutivo',
];

const NUMERIC_VALUE_RE = /^-?\$?[\d.,]+%?$/;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

// Alinea a la derecha (con tabular-nums, ver CSS) las columnas donde todos los valores no
// vacíos parecen números ya formateados ("1,240", "58%", "$45.20") — así las cifras se
// comparan de un vistazo, sin necesitar que la tool marque explícitamente qué es numérico.
function isNumericColumn(rows, key) {
  const values = rows.map((r) => String(r[key] ?? '').trim()).filter((v) => v && v !== '—');
  return values.length > 0 && values.every((v) => NUMERIC_VALUE_RE.test(v));
}

const KNOWLEDGE_TYPE_LABELS = { file: 'Documento', url: 'Sitio web', text: 'Nota', drive: 'Drive' };

function formatSourceDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

// Registro visible de qué consultó Kai para esta respuesta — a diferencia del estado en vivo
// ("Consultando..."), esto queda para siempre junto al mensaje, no solo mientras piensa. Para
// query_knowledge, en vez de la etiqueta genérica, lista los documentos puntuales citados
// (nombre, tipo, fecha) — así la cita vive junto al resto de la traza, no como una tarjeta
// aparte que se confundía visualmente con un archivo adjunto.
function ToolTrace({ trace, citedSources }) {
  if (!trace?.length) return null;
  const uniqueLabels = [...new Set(trace.map((t) => t.label))];
  return (
    <details className="knx-trace">
      <summary>Consultó {uniqueLabels.join(' y ')}</summary>
      <ul>
        {trace.map((t, i) => {
          if (t.tool === 'query_knowledge' && citedSources?.length) {
            return citedSources.map((s) => {
              const isLink = s.type === 'url' && s.url;
              const text = `${s.name} — Conocimiento · ${KNOWLEDGE_TYPE_LABELS[s.type] ?? s.type}${s.date ? ` · ${formatSourceDate(s.date)}` : ''}`;
              return (
                <li key={s.id}>
                  {isLink ? <a href={s.url} target="_blank" rel="noreferrer">{text}</a> : text}
                </li>
              );
            });
          }
          return <li key={i}>{t.label}{t.period ? ` — ${t.period}` : ''}</li>;
        })}
      </ul>
    </details>
  );
}

function SourceTable({ result }) {
  if (!result?.data?.length) return null;
  const headers = Object.keys(result.data[0]);
  const numericCols = new Set(headers.filter((h) => isNumericColumn(result.data, h)));
  const label = result.source === 'query_database' ? (result.db ?? 'Base de datos') : SOURCE_LABELS[result.source] ?? result.source;
  return (
    <div className="knx-table-wrap">
      <div className="knx-table-source">{label}{result.period ? ` · ${result.period}` : ''}</div>
      <table className="knx-table">
        <thead>
          <tr>{headers.map((h) => <th key={h} className={numericCols.has(h) ? 'knx-table-num' : ''}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {result.data.map((row, i) => (
            <tr key={i}>
              {headers.map((h) => (
                <td key={h} className={numericCols.has(h) ? 'knx-table-num' : ''}>{String(row[h])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AttachmentIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function AttachmentChips({ attachments, onRemove }) {
  if (!attachments.length) return null;
  return (
    <div className="knx-attach-chips">
      {attachments.map((a, i) => (
        <div key={i} className="knx-attach-chip">
          {a.preview ? <img src={a.preview} alt="" /> : <AttachmentIcon />}
          <span>{a.name}</span>
          <button type="button" onClick={() => onRemove(i)} aria-label={`Quitar ${a.name}`}>×</button>
        </div>
      ))}
    </div>
  );
}

function Composer({
  input, setInput, attachments, setAttachments, sending, recording, transcribing,
  textareaRef, fileInputRef, onKeyDown, onPaste, onFileSelect, onSend, onStop,
  onStartRecording, onStopRecording, hasContent, placeholder,
}) {
  return (
    <div className={`knx-composer${sending ? ' knx-composer--working' : ''}`}>
      <AttachmentChips attachments={attachments} onRemove={(i) => setAttachments((prev) => prev.filter((_, j) => j !== i))} />
      <textarea
        ref={textareaRef}
        className="knx-composer-input"
        rows={1}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        placeholder={recording ? 'Grabando...' : sending ? 'Kai está respondiendo...' : placeholder}
        disabled={recording || sending}
      />
      <div className="knx-composer-row">
        {!sending && (
          <button type="button" className="knx-attach-btn" onClick={() => fileInputRef.current?.click()} title="Adjuntar archivo">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        )}
        <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept={ACCEPT} multiple onChange={onFileSelect} />
        <div className="knx-composer-row-right">
          {!sending && (
            <button
              type="button"
              className={`knx-mic-btn${recording ? ' knx-mic-btn--active' : ''}`}
              onClick={() => (recording ? onStopRecording() : onStartRecording())}
              disabled={transcribing}
              title={recording ? 'Detener grabación' : 'Hablar con Kai'}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
              </svg>
            </button>
          )}
          {sending ? (
            <button type="button" className="knx-send-btn knx-send-btn--stop" onClick={onStop} title="Detener">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
            </button>
          ) : (
            <button
              type="button"
              className={`knx-send-btn${hasContent ? ' knx-send-btn--active' : ''}`}
              onClick={() => onSend()}
              disabled={!hasContent}
              title="Enviar"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function KaiNextClientChat({ tenant, tenantName, userName, userHandle, isTeamUser, basePath, initialChatId, initialDraft, initialRef }) {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [sending, setSending] = useState(false);
  const [workingLabel, setWorkingLabel] = useState(null);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const abortRef = useRef(null);

  const loadChats = async () => {
    const res = await fetch(`/api/kai-next/${tenant}`);
    if (!res.ok) return;
    const data = await res.json();
    setChats(data.conversations ?? []);
  };

  useEffect(() => {
    loadChats();
    // Si llegamos acá con ?c={id} (ej. desde el sidebar de Fuentes, que no tiene el chat
    // montado para abrirlo en el momento), abrimos esa conversación de una.
    if (initialChatId) {
      openChat(initialChatId);
    } else if (initialDraft) {
      // Activadores de la página Empresa (prioridades, diagnóstico, aprendizajes) llegan acá
      // con ?draft=... — un primer mensaje pre-armado que se envía solo, como si el usuario ya
      // lo hubiera escrito. Se limpia el query param para que un refresh no lo reenvíe.
      send(initialDraft, { ref: initialRef });
      window.history.replaceState(null, '', `${basePath}/${tenant}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending, workingLabel]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 8 * 20)}px`;
  }, [input]);

  const openChat = async (id) => {
    setActiveChatId(id);
    const res = await fetch(`/api/kai-next/${tenant}?conversationId=${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setMessages(data.messages ?? []);
  };

  const newChat = () => {
    setActiveChatId(null);
    setMessages([]);
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
    if (id === activeChatId) newChat();
  };

  // Team-admin cierra su sesión de Bonsight (/api/team/logout); una persona del cliente cierra
  // su propia sesión de tenant-user (mismo endpoint que ya usa TenantAccountMenu en Kai/Aria).
  // En ambos casos vuelve al login de Kai Next, no a /team — ese es el picker interno, no la
  // puerta de entrada de este producto.
  const [loggingOut, setLoggingOut] = useState(false);
  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      if (isTeamUser) {
        await fetch('/api/team/logout', { method: 'POST' });
      } else {
        await fetch(`/api/kai/${tenant}/tenant-users/me`, { method: 'DELETE' });
      }
      window.location.href = `${basePath}/${tenant}`;
    } catch {
      setLoggingOut(false);
    }
  };

  // ── Adjuntos — mismo patrón que app/kai/[tenant]/KaiClientChat.jsx: imágenes se comprimen a
  // JPEG (máx 1280px) con preview local, PDF/office se leen tal cual en base64.
  function compressImage(file) {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX = 1280;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
          else { width = Math.round((width * MAX) / height); height = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve({
            data: reader.result.split(',')[1],
            mimeType: 'image/jpeg',
            name: file.name,
            preview: canvas.toDataURL('image/jpeg', 0.85),
          });
          reader.readAsDataURL(blob);
        }, 'image/jpeg', 0.85);
      };
      img.src = url;
    });
  }

  function readAsBase64(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve({ data: reader.result.split(',')[1], mimeType: file.type, name: file.name });
      reader.readAsDataURL(file);
    });
  }

  async function processFile(file) {
    if (file.size > MAX_FILE_BYTES) { alert(`"${file.name}" es demasiado grande (máx. 4 MB).`); return null; }
    if (file.type.startsWith('image/')) return compressImage(file);
    return readAsBase64(file);
  }

  async function handleFileSelect(e) {
    const files = Array.from(e.target.files ?? []);
    const processed = (await Promise.all(files.map(processFile))).filter(Boolean);
    setAttachments((prev) => [...prev, ...processed].slice(0, MAX_ATTACHMENTS));
    e.target.value = '';
  }

  async function handlePaste(e) {
    const imageItem = Array.from(e.clipboardData?.items ?? []).find((item) => item.type.startsWith('image/'));
    if (!imageItem) return;
    e.preventDefault();
    const att = await processFile(imageItem.getAsFile());
    if (att) setAttachments((prev) => [...prev, att].slice(0, MAX_ATTACHMENTS));
  }

  // ── Voz — reusa /api/kai-next/[tenant]/transcribe (mismo patrón que Kai actual).
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
        .find((t) => MediaRecorder.isTypeSupported(t)) || '';
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      const startedAt = Date.now();
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (Date.now() - startedAt < 500) return;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || 'audio/webm' });
        setTranscribing(true);
        try {
          const form = new FormData();
          form.append('audio', blob);
          const res = await fetch(`/api/kai-next/${tenant}/transcribe`, { method: 'POST', body: form });
          const data = await res.json();
          if (data.text) send(data.text);
        } catch { /* silently ignore */ }
        setTranscribing(false);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch { /* mic permission denied */ }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  }

  function stopSending() {
    abortRef.current?.abort();
  }

  const copyMessage = async (i, text) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(i);
      setTimeout(() => setCopiedIndex((cur) => (cur === i ? null : cur)), 1500);
    } catch { /* clipboard no disponible */ }
  };

  const send = async (override, opts = {}) => {
    const text = (override ?? input).trim();
    const atts = [...attachments];
    if ((!text && atts.length === 0) || sending) return;
    setInput('');
    setAttachments([]);
    setSending(true);
    setWorkingLabel('Kai está pensando...');
    setMessages((prev) => [...prev, { role: 'user', content: text, attachments: atts.map((a) => ({ name: a.name, mimeType: a.mimeType })) }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/kai-next/${tenant}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationId: activeChatId,
          attachments: atts.length ? atts.map(({ data, mimeType, name }) => ({ data, mimeType, name })) : undefined,
          ref: !activeChatId && opts.ref ? opts.ref : undefined,
        }),
        signal: controller.signal,
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let done = false;
      while (!done) {
        const chunk = await reader.read();
        done = chunk.done;
        buf += decoder.decode(chunk.value ?? new Uint8Array(), { stream: !done });
        let nl;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (!line.trim()) continue;
          const evt = JSON.parse(line);
          if (evt.type === 'tool_start') {
            setWorkingLabel(`${evt.label}...`);
          } else if (evt.type === 'done') {
            setSending(false);
            setWorkingLabel(null);
            setMessages((prev) => [...prev, { role: 'assistant', content: evt.reply, sourceResult: evt.sourceResult, toolTrace: evt.toolTrace, citedSources: evt.citedSources, presentation: evt.presentation, documents: evt.documents, activityDraft: evt.activityDraft, activityStart: evt.activityStart }]);
            if (!activeChatId && evt.conversationId) {
              setActiveChatId(evt.conversationId);
              loadChats();
            }
          } else if (evt.type === 'error') {
            setSending(false);
            setWorkingLabel(null);
            setMessages((prev) => [...prev, { role: 'assistant', content: evt.reply }]);
          }
        }
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Algo salió mal. Intenta de nuevo.' }]);
      }
    } finally {
      setSending(false);
      setWorkingLabel(null);
      abortRef.current = null;
    }
  };

  const hasContent = input.trim() || attachments.length > 0;
  const isHome = messages.length === 0;
  const firstName = (userName || '').split(/\s+/)[0];

  const composerProps = {
    input, setInput, attachments, setAttachments, sending, recording, transcribing,
    textareaRef, fileInputRef,
    onKeyDown: (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } },
    onPaste: handlePaste,
    onFileSelect: handleFileSelect,
    onSend: () => send(),
    onStop: stopSending,
    onStartRecording: startRecording,
    onStopRecording: stopRecording,
    hasContent,
  };

  return (
    <div className="knx-shell">
      <KaiNextSidebar
        tenant={tenant}
        tenantName={tenantName}
        userName={userName}
        userHandle={userHandle}
        isTeamUser={isTeamUser}
        basePath={basePath}
        chats={chats}
        activeChatId={activeChatId}
        onNewChat={newChat}
        onOpenChat={openChat}
        onDeleteChat={handleDeleteChat}
        onLogout={handleLogout}
        loggingOut={loggingOut}
        active="chat"
      />

      <main className="knx-main">
        {isHome ? (
          <div className="knx-home">
            <div className="knx-home-inner">
              <div className="knx-home-greeting">
                <div className="knx-home-hello">{greeting()}{firstName ? `, ${firstName}` : ''}</div>
                <h1 className="knx-home-title">¿En qué trabajamos hoy?</h1>
              </div>
              <Composer {...composerProps} placeholder="Pregúntale a Kai sobre tus datos" />
              <div className="knx-quick-actions">
                {QUICK_ACTIONS.map((q) => (
                  <button key={q} type="button" className="knx-quick-action" onClick={() => send(q)}>{q}</button>
                ))}
              </div>
              <div className="knx-composer-hint">Kai puede equivocarse. Revisa la evidencia de cada hallazgo.</div>
            </div>
          </div>
        ) : (
          <>
            <div className="knx-messages" ref={scrollRef}>
              <div className="knx-thread">
                {messages.map((m, i) => (
                  <Fragment key={i}>
                    <div className={`knx-msg knx-msg--${m.role}`}>
                      {m.attachments?.length > 0 && (
                        <div className="knx-msg-attachments">
                          {m.attachments.map((a, j) => <span key={j} className="knx-msg-attachment"><AttachmentIcon />{a.name}</span>)}
                        </div>
                      )}
                      {m.role === 'assistant' && <ToolTrace trace={m.toolTrace} citedSources={m.citedSources} />}
                      {m.role === 'assistant' ? renderMessage(m.content, { prefix: 'knx' }) : m.content}
                      {m.content && (
                        <button type="button" className="knx-msg-copy" onClick={() => copyMessage(i, m.content)} title="Copiar mensaje">
                          {copiedIndex === i ? <CheckIcon /> : <CopyIcon />}
                          {copiedIndex === i ? 'Copiado' : 'Copiar'}
                        </button>
                      )}
                    </div>
                    {m.sourceResult && <SourceTable result={m.sourceResult} />}
                    {m.presentation && (
                      <div className="knx-msg-presentation">
                        <KaiNextAnalysisView presentation={m.presentation} basePath={basePath} tenant={tenant} />
                      </div>
                    )}
                    {m.documents?.map((doc, di) => (
                      <KaiNextDocumentCard key={di} doc={doc} tenant={tenant} />
                    ))}
                    {m.activityStart ? (
                      <KaiNextActivityDashboardCard tenant={tenant} activity={m.activityStart} />
                    ) : m.activityDraft ? (
                      <KaiNextActivityDraftCard draft={m.activityDraft} />
                    ) : null}
                  </Fragment>
                ))}
                {sending && (
                  <div className="knx-thinking">
                    <span className="knx-thinking-dot" />
                    {workingLabel}
                  </div>
                )}
                {transcribing && (
                  <div className="knx-thinking">
                    <span className="knx-thinking-dot" />
                    Transcribiendo...
                  </div>
                )}
              </div>
            </div>

            <div className="knx-composer-wrap">
              <Composer {...composerProps} placeholder="Pregúntale a Kai..." />
              <div className="knx-composer-hint">Kai puede equivocarse. Revisa la evidencia de cada hallazgo.</div>
            </div>
          </>
        )}
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
