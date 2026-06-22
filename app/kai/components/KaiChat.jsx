'use client';

import { useEffect, useRef, useState } from 'react';
import KaiAvatar from './KaiAvatar';
import KaiMessage, { KaiTypingIndicator } from './KaiMessage';

const CONV_ID_KEY = 'kaiActiveConversationId';

function buildApiMessages(messages) {
  return messages.map((m) => {
    if (m.role === 'assistant') {
      const componentNote = m.component
        ? `\n[Componente visual mostrado: ${m.component.type}]`
        : '';
      return { role: 'assistant', content: (m.content ?? '') + componentNote };
    }
    return { role: 'user', content: m.content };
  });
}

export default function KaiChat() {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    async function init() {
      const storedId = localStorage.getItem(CONV_ID_KEY);
      if (!storedId) return;

      const res = await fetch(`/api/kai?id=${storedId}`);
      if (res.ok) {
        const data = await res.json();
        setConversationId(storedId);
        setMessages(data.messages ?? []);
      } else {
        localStorage.removeItem(CONV_ID_KEY);
      }
    }
    init();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  function handleNew() {
    setConversationId(null);
    setMessages([]);
    setInput('');
    localStorage.removeItem(CONV_ID_KEY);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setTranscribing(true);
        try {
          const form = new FormData();
          form.append('audio', blob);
          const res = await fetch('/api/kai/transcribe', { method: 'POST', body: form });
          const data = await res.json();
          if (data.text) setInput((prev) => (prev ? prev + ' ' + data.text : data.text));
        } catch { /* silently ignore */ }
        setTranscribing(false);
        inputRef.current?.focus();
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

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    const nextMessages = [...messages, userMsg];

    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/kai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: buildApiMessages(nextMessages),
          conversationId,
        }),
      });

      const data = await res.json();

      if (data.conversationId && data.conversationId !== conversationId) {
        setConversationId(data.conversationId);
        localStorage.setItem(CONV_ID_KEY, data.conversationId);
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply ?? '', component: data.component ?? null },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Lo siento, ocurrió un error. Por favor intenta de nuevo.', component: null },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const isEmpty = messages.length === 0 && !loading;

  return (
    <div className="kai-page">
      <header className="kai-header">
        <div className="kai-header-left">
          <KaiAvatar size={40} />
          <div className="kai-header-info">
            <div className="kai-header-name-row">
              <span className="kai-header-name">Kai</span>
              <span className="kai-status-dot kai-status-dot-pulse" />
            </div>
            <span className="kai-header-subtitle">Consultor estratégico de Bonsight</span>
            <span className="kai-header-status">En línea</span>
          </div>
        </div>
        <button className="kai-header-new-btn" onClick={handleNew}>
          + Nueva consulta
        </button>
      </header>

      <div className="kai-messages-area">
        {isEmpty && (
          <div className="kai-empty">
            <KaiAvatar size={52} />
            <p className="kai-empty-text">
              Hola. Antes de hablar de soluciones, quiero entender mejor tu negocio.
              ¿A qué se dedica tu empresa y cuál es el principal objetivo que buscas lograr
              en los próximos 12 meses?
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <KaiMessage key={i} message={msg} />
        ))}

        {loading && <KaiTypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      <div className="kai-input-wrap">
        <div className="kai-input-bar">
          <button
            className={`kai-input-mic${recording ? ' kai-input-mic--recording' : ''}`}
            title={recording ? 'Detener grabación' : 'Grabar voz'}
            onClick={recording ? stopRecording : startRecording}
            disabled={transcribing || loading}
          >
            {transcribing ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            ) : recording ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            )}
          </button>
          <textarea
            ref={inputRef}
            className="kai-input"
            placeholder={transcribing ? 'Transcribiendo…' : recording ? 'Grabando… (click para detener)' : 'Pregunta algo a Kai...'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            className="kai-input-send"
            onClick={handleSend}
            disabled={!input.trim() || loading}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <p className="kai-disclaimer">Kai puede cometer errores. Verifica siempre la información crítica.</p>
      </div>
    </div>
  );
}
