'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const CALENDLY = 'https://calendly.com/rafa-bonsight/30min';
const WA_NUMBER = '13123509796';
const dl = (obj) => { if (typeof window !== 'undefined') { window.dataLayer = window.dataLayer || []; window.dataLayer.push(obj); } };
const MAX_MESSAGES = 20;
const RESET_HOURS = 24;
const STORAGE_KEY = 'bsKaiData';

const T = {
  es: {
    chatSub: 'Consultor Bonsight · En línea',
    placeholder: 'Escribe tu respuesta…',
    ctaTitle: 'Próximo paso',
    ctaCall: 'Agendar llamada de 30 min',
    ctaWA: 'Escribir por WhatsApp',
    waMsg: 'Hola, vengo del sitio de Bonsight y quisiera continuar la conversación con el equipo.',
    error: 'Algo salió mal. Intenta de nuevo.',
    limitMsg: 'Has llegado al límite de esta conversación. Para continuar, agenda una llamada o escríbenos por WhatsApp.',
    initialMessage: 'Hola, soy Kai, el asistente de Bonsight. Estoy aquí para entender qué está buscando y ver si podemos ayudarle.\n\n¿Qué problema está intentando resolver en este momento?',
  },
  en: {
    chatSub: 'Bonsight Consultant · Online',
    placeholder: 'Type your response…',
    ctaTitle: 'Next step',
    ctaCall: 'Schedule a 30-min call',
    ctaWA: 'Chat on WhatsApp',
    waMsg: 'Hi, I came from the Bonsight website and would like to continue the conversation with the team.',
    error: 'Something went wrong. Please try again.',
    limitMsg: "You've reached the limit for this conversation. To continue, schedule a call or reach out on WhatsApp.",
    initialMessage: "Hi, I'm Kai, Bonsight's consulting assistant. I'm here to understand what you're looking for and see if we can help.\n\nWhat problem are you trying to solve right now?",
  },
};

function parseInline(text) {
  const re = /\*\*(.+?)\*\*|(\d[\d,\.]*%?)/g;
  const parts = [];
  let last = 0, k = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      parts.push(<strong key={k++} className="kai-bold">{m[1]}</strong>);
    } else {
      parts.push(<span key={k++} className="kai-num">{m[0]}</span>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : [text];
}

function renderMessage(text) {
  const lines = text.split('\n');
  const result = [];
  let bullets = [];

  const flushBullets = (key) => {
    if (!bullets.length) return;
    result.push(
      <div key={`b${key}`} className="kai-list">
        {bullets.map((item, i) => (
          <div key={i} className="kai-list-item">
            <span className="kai-list-dot" />
            <span>{parseInline(item)}</span>
          </div>
        ))}
      </div>
    );
    bullets = [];
  };

  lines.forEach((line, i) => {
    const t = line.trim();
    if (!t) return;
    if (/^[-•*]\s/.test(t)) {
      bullets.push(t.replace(/^[-•*]\s+/, ''));
    } else {
      flushBullets(i);
      result.push(
        <p key={i} className={result.length > 0 ? 'kai-para' : ''}>{parseInline(t)}</p>
      );
    }
  });
  flushBullets('end');
  return result.length ? result : text;
}

const KaiAvatar = ({ size = 40, thinking = false }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={thinking ? 'kai-avatar--thinking' : ''}>
    <circle cx="20" cy="20" r="19.5" fill="rgba(52,211,153,0.06)" stroke="rgba(52,211,153,0.18)" strokeWidth="1"/>
    <line x1="13" y1="13" x2="27" y2="13" stroke="rgba(52,211,153,0.18)" strokeWidth="0.9"/>
    <line x1="13" y1="13" x2="20" y2="28" stroke="rgba(52,211,153,0.18)" strokeWidth="0.9"/>
    <line x1="27" y1="13" x2="20" y2="28" stroke="rgba(52,211,153,0.18)" strokeWidth="0.9"/>
    <line x1="13" y1="13" x2="20" y2="20" stroke="rgba(52,211,153,0.38)" strokeWidth="0.9"/>
    <line x1="27" y1="13" x2="20" y2="20" stroke="rgba(52,211,153,0.38)" strokeWidth="0.9"/>
    <line x1="20" y1="28" x2="20" y2="20" stroke="rgba(52,211,153,0.38)" strokeWidth="0.9"/>
    <circle cx="13" cy="13" r="2.2" fill="rgba(52,211,153,0.1)" stroke="rgba(52,211,153,0.5)" strokeWidth="1" className="kai-node kai-node--1"/>
    <circle cx="27" cy="13" r="2.2" fill="rgba(52,211,153,0.1)" stroke="rgba(52,211,153,0.5)" strokeWidth="1" className="kai-node kai-node--2"/>
    <circle cx="20" cy="28" r="2.2" fill="rgba(52,211,153,0.1)" stroke="rgba(52,211,153,0.5)" strokeWidth="1" className="kai-node kai-node--3"/>
    <circle cx="20" cy="20" r="4" fill="rgba(52,211,153,0.15)" stroke="#34d399" strokeWidth="1.2"/>
    <circle cx="20" cy="20" r="1.8" fill="#34d399" className="kai-dot"/>
  </svg>
);

const IconSend = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

const IconCalendar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const IconWA = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

function readStorage() {
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const expired = d.resetAt && Date.now() > d.resetAt;
    if (expired) return { count: 0, resetAt: null };
    return { count: d.count || 0, resetAt: d.resetAt || null };
  } catch {
    return { count: 0, resetAt: null };
  }
}

function writeStorage(count) {
  try {
    const resetAt = Date.now() + RESET_HOURS * 3600 * 1000;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ count, resetAt }));
  } catch {}
}

export default function ConsultaPage() {
  const pathname = usePathname();
  const locale = pathname?.startsWith('/es') ? 'es' : 'en';
  const t = T[locale];

  const [messages, setMessages] = useState([
    { role: 'assistant', content: t.initialMessage },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCta, setShowCta] = useState(false);
  const [limited, setLimited] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const msgCountRef = useRef(0);

  const assistantCount = messages.filter((m) => m.role === 'assistant').length;

  useEffect(() => {
    const { count } = readStorage();
    msgCountRef.current = count;
    if (count >= MAX_MESSAGES) { setLimited(true); setShowCta(true); }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, showCta]);

  useEffect(() => {
    if (assistantCount >= 4) setShowCta(true);
  }, [assistantCount]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const send = async (text) => {
    const question = (text || input).trim();
    if (!question || loading || limited) return;

    const newCount = msgCountRef.current + 1;
    msgCountRef.current = newCount;
    writeStorage(newCount);
    if (newCount >= MAX_MESSAGES) { setLimited(true); setShowCta(true); }

    const newMessages = [...messages, { role: 'user', content: question }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/kai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, locale }),
      });
      const data = await res.json();
      const reply = data.reply;
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      if (reply.includes('opciones para continuar') || reply.includes('options to continue')) {
        setShowCta(true);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: t.error }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  return (
    <div className="consulta-wrap">
      <div className="consulta-chat">

        <div className="consulta-chat-header">
          <KaiAvatar size={40} thinking={loading} />
          <div>
            <div className="consulta-chat-name">
              Kai
              <span className="consulta-live-dot" />
            </div>
            <div className="consulta-chat-sub">{t.chatSub}</div>
          </div>
        </div>

        <div className="consulta-messages">
          {messages.map((m, i) => (
            <div key={i} className={`consulta-msg consulta-msg--${m.role}`}>
              {m.role === 'assistant' && (
                <div className="consulta-msg-avatar">
                  <KaiAvatar size={28} />
                </div>
              )}
              <div className="consulta-bubble">
                {m.role === 'assistant' ? renderMessage(m.content) : m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="consulta-msg consulta-msg--assistant">
              <div className="consulta-msg-avatar">
                <KaiAvatar size={28} thinking={true} />
              </div>
              <div className="consulta-bubble consulta-bubble--loading">
                <span /><span /><span />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {limited ? (
          <div className="consulta-limit">{t.limitMsg}</div>
        ) : (
          <div className="consulta-footer">
            <input
              ref={inputRef}
              className="consulta-input"
              placeholder={t.placeholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              disabled={loading}
            />
            <button
              className="consulta-send"
              onClick={() => send()}
              disabled={loading || !input.trim()}
            >
              <IconSend />
            </button>
          </div>
        )}

        {showCta && (
          <div className="consulta-cta">
            <div className="consulta-cta-label">{t.ctaTitle}</div>
            <div className="consulta-cta-actions">
              <a className="consulta-cta-primary" href={CALENDLY} target="_blank" rel="noopener noreferrer" onClick={() => dl({ event: 'cta_click', cta_text: 'calendly', cta_location: 'kai_cta', destination: 'calendly', page_path: window.location.pathname })}>
                <IconCalendar />
                {t.ctaCall}
              </a>
              <a
                className="consulta-cta-wa"
                href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(t.waMsg)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => dl({ event: 'cta_click', cta_location: 'kai_cta', destination: 'whatsapp', page_path: window.location.pathname })}
              >
                <IconWA />
                {t.ctaWA}
              </a>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
