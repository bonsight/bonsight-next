'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const POLL_MS = 4000;
const storageKey = (code) => `kai_activity_${code}_participant`;

function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

// Mini-parser de **negrita** — mismo criterio liviano que KaiClientChat.jsx, sin dependencias.
function renderBubbleText(text) {
  const re = /\*\*(.+?)\*\*/g;
  const parts = [];
  let last = 0, k = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(<strong key={k++}>{m[1]}</strong>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : [text];
}

export default function ActivityParticipantChat({ code, activityId, activityName }) {
  const [step, setStep] = useState('name');
  const [name, setName] = useState('');
  const [participantId, setParticipantId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState(null);
  const [questionTiming, setQuestionTiming] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  const displayedIndexRef = useRef(0);
  const pollRef = useRef(null);
  const tickRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Sobrevivir a un refresh: si ya nos habíamos unido, saltamos directo al chat.
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(storageKey(code)) : null;
    if (saved) {
      try {
        const { participantId: pid } = JSON.parse(saved);
        if (pid) {
          setParticipantId(pid);
          setStep('chat');
        }
      } catch { /* ignore */ }
    }
  }, [code]);

  const sendToKai = useCallback(async (content, { record = true } = {}) => {
    if (record) setMessages((prev) => [...prev, { role: 'user', content }]);
    setLoading(true);
    try {
      const res = await fetch(`/api/kai/activity/${code}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, message: { role: 'user', content } }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Ocurrió un error.');
        return;
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      if (typeof data.questionIndex === 'number') displayedIndexRef.current = data.questionIndex;
      if (data.finished) setFinished(true);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Error de conexión. Probá de nuevo.' }]);
    } finally {
      setLoading(false);
    }
  }, [code, participantId]);

  // Saludo inicial una vez que tenemos participantId
  const greetedRef = useRef(false);
  useEffect(() => {
    if (step !== 'chat' || !participantId || greetedRef.current) return;
    greetedRef.current = true;
    sendToKai('__activity_greeting__', { record: false });
  }, [step, participantId, sendToKai]);

  // Polling de status: detecta si el organizador avanzó de pregunta
  useEffect(() => {
    if (step !== 'chat' || !participantId) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/kai/activity/${code}/status?participantId=${participantId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'finished') {
          setFinished(true);
          clearInterval(pollRef.current);
          clearInterval(tickRef.current);
          return;
        }
        setQuestionTiming({ startedAt: data.currentQuestionStartedAt, durationSeconds: data.questionDurationSeconds });
        if (data.currentQuestionIndex > displayedIndexRef.current && !loading) {
          sendToKai('__next_question__', { record: false });
        }
      } catch { /* ignora fallos puntuales */ }
    };

    poll();
    pollRef.current = setInterval(poll, POLL_MS);
    tickRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(pollRef.current);
      clearInterval(tickRef.current);
    };
  }, [step, participantId, code, sendToKai, loading]);

  const remainingSeconds = questionTiming?.startedAt
    ? questionTiming.durationSeconds - (now - new Date(questionTiming.startedAt).getTime()) / 1000
    : null;

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/kai/activity/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo unir a la actividad.');
        return;
      }
      localStorage.setItem(storageKey(code), JSON.stringify({ participantId: data.participantId }));
      setParticipantId(data.participantId);
      setStep('chat');
    } catch {
      setError('Error de conexión. Probá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || loading || finished) return;
    setInput('');
    sendToKai(text);
  };

  if (step === 'name') {
    return (
      <div className="act-wrap act-wrap--center">
        <form className="act-panel" onSubmit={handleJoin}>
          <span className="act-eyebrow">Bienvenido</span>
          <h1 className="act-panel-title">Estás ingresando a: {activityName}</h1>
          <p className="act-panel-text">Antes de comenzar… ¿cómo te llamás?</p>
          <input
            className="act-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            autoFocus
            disabled={loading}
          />
          {error && <p className="act-error">{error}</p>}
          <button className="act-btn act-btn--primary" type="submit" disabled={loading || !name.trim()}>
            Continuar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="act-wrap">
      <div className="act-header">
        <span className="act-header-name">{activityName}</span>
        {!finished && remainingSeconds !== null && (
          <span className={`act-header-timer ${remainingSeconds <= 0 ? 'act-header-timer--expired' : ''}`}>
            ⏱ {formatDuration(remainingSeconds)}
          </span>
        )}
        {finished && <span className="act-header-badge">Finalizada</span>}
      </div>
      <div className="act-messages">
        {messages.map((m, i) => (
          <div key={i} className={`act-bubble-row act-bubble-row--${m.role}`}>
            <div className={`act-bubble act-bubble--${m.role}`}>{renderBubbleText(m.content)}</div>
          </div>
        ))}
        {loading && (
          <div className="act-bubble-row act-bubble-row--assistant">
            <div className="act-bubble act-bubble--assistant act-bubble--typing">···</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {!finished ? (
        <div className="act-inputbar">
          <input
            className="act-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Escribí tu respuesta…"
            disabled={loading}
          />
          <button className="act-btn act-btn--primary" onClick={handleSend} disabled={loading || !input.trim()}>
            Enviar
          </button>
        </div>
      ) : (
        <div className="act-inputbar act-inputbar--closed">Gracias por participar 🎉</div>
      )}
    </div>
  );
}
