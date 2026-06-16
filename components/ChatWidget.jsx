'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const CALENDLY = 'https://calendly.com/rafa-bonsight/30min';
const WA_NUMBER = '13123509796';
const MAX_MESSAGES = 10;
const STORAGE_KEY = 'bsAdvisorData';
const RESET_HOURS = 24;
const dl = (obj) => { if (typeof window !== 'undefined') { window.dataLayer = window.dataLayer || []; window.dataLayer.push(obj); } };

const T = {
  en: {
    name: 'Bonsight Advisor',
    subtitle: 'BONSIGHT LLC · ONLINE',
    closeBtn: 'Close',
    placeholder: 'Type your message…',
    nudgeLabel: 'Bonsight Advisor',
    nudgeText: 'What challenge is your company facing? →',
    error: 'Something went wrong. Try again.',
    initialMessage: "Hi, welcome to Bonsight. I'm here to understand what you need and see if we can help.\n\nWhat does your company do?",
    ctaTitle: 'Next step',
    ctaCall: 'Schedule a 30-min call',
    ctaWA: 'Chat on WhatsApp',
    waMsg: 'Hi, I came from the Bonsight website and would like to continue the conversation with the team.',
    limitMsg: "You've reached the conversation limit. Schedule a call or reach out on WhatsApp to continue.",
  },
  es: {
    name: 'Bonsight Advisor',
    subtitle: 'BONSIGHT LLC · EN LÍNEA',
    closeBtn: 'Cerrar',
    placeholder: 'Escribe tu mensaje…',
    nudgeLabel: 'Bonsight Advisor',
    nudgeText: '¿Qué reto está enfrentando tu empresa? →',
    error: 'Algo salió mal. Inténtalo de nuevo.',
    initialMessage: 'Hola, bienvenido a Bonsight. Estoy aquí para entender qué necesitas y ver si podemos ayudarte.\n\n¿A qué se dedica tu empresa?',
    ctaTitle: 'Próximo paso',
    ctaCall: 'Agendar llamada de 30 min',
    ctaWA: 'Escribir por WhatsApp',
    waMsg: 'Hola, vengo del sitio de Bonsight y quisiera continuar la conversación con el equipo.',
    limitMsg: 'Has llegado al límite de esta conversación. Agenda una llamada o escríbenos por WhatsApp para continuar.',
  },
};

function readStorage() {
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const expired = d.resetAt && Date.now() > d.resetAt;
    if (expired) return { count: 0, resetAt: null };
    return { count: d.count || 0, resetAt: d.resetAt || null };
  } catch { return { count: 0, resetAt: null }; }
}

function writeStorage(count) {
  try {
    const resetAt = Date.now() + RESET_HOURS * 3600 * 1000;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ count, resetAt }));
  } catch {}
}

function parseInline(text) {
  const re = /\*\*(.+?)\*\*|(\d[\d,\.]*%?)/g;
  const parts = [];
  let last = 0, k = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      parts.push(<strong key={k++} className="chat-bold">{m[1]}</strong>);
    } else {
      parts.push(<span key={k++} className="chat-num">{m[0]}</span>);
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
      <div key={`b${key}`} className="chat-list">
        {bullets.map((item, i) => (
          <div key={i} className="chat-list-item">
            <span className="chat-list-dot" />
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
        <p key={i} className={result.length > 0 ? 'chat-msg-para' : ''}>{parseInline(t)}</p>
      );
    }
  });
  flushBullets('end');
  return result.length ? result : text;
}

const BonsightMark = ({ size = 'sm' }) => {
  const lg = size === 'lg';
  return (
    <div style={{
      width: lg ? 46 : 32,
      height: lg ? 46 : 32,
      background: '#fff',
      border: '0.5px solid #e0e0dc',
      borderRadius: lg ? 10 : 8,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      <svg width={lg ? 32 : 20} height={lg ? 26 : 16} viewBox="0 0 72 58" fill="none">
        <circle cx="22" cy="38" r="20" fill="#9FDBC8"/>
        <circle cx="36" cy="22" r="20" fill="#085041"/>
        <circle cx="50" cy="38" r="20" fill="#2EBF8E"/>
      </svg>
    </div>
  );
};

const IconClose = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const IconSend = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

const IconCalendar = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const IconWA = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export default function ChatWidget() {
  const pathname = usePathname();
  const locale = pathname?.startsWith('/es') ? 'es' : 'en';
  const t = T[locale];

  if (pathname?.includes('/consulta')) return null;

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: t.initialMessage },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [limited, setLimited] = useState(false);
  const [showCta, setShowCta] = useState(false);
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
  }, [messages, loading]);

  useEffect(() => {
    if (sessionStorage.getItem('advisorNudge')) return;
    const show = setTimeout(() => setNudge(true), 2000);
    const hide = setTimeout(() => {
      setNudge(false);
      sessionStorage.setItem('advisorNudge', '1');
    }, 9000);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, []);

  useEffect(() => {
    if (open) {
      dl({ event: 'widget_open', widget: 'advisor', page_path: window.location.pathname });
      setNudge(false);
      sessionStorage.setItem('advisorNudge', '1');
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  useEffect(() => {
    if (assistantCount >= 5) setShowCta(true);
  }, [assistantCount]);

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
      const res = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, locale }),
      });
      const data = await res.json();
      const reply = data.reply;
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      dl({ event: 'chat_message_sent', widget: 'advisor', page_path: window.location.pathname });
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
    <>
      <div className={`chat-panel ${open ? 'chat-panel--open' : ''}`}>
        <div className="chat-header">
          <div className="chat-header-info">
            <BonsightMark size="sm" />
            <div>
              <div className="chat-title">{t.name}</div>
              <div className="chat-subtitle">
                <span className="chat-live-dot" />
                {t.subtitle}
              </div>
            </div>
          </div>
          <button className="chat-close" onClick={() => setOpen(false)} aria-label={t.closeBtn}>
            <IconClose />
          </button>
        </div>

        <div className="chat-body">
          {messages.map((m, i) => (
            <div key={i} className={`chat-msg chat-msg--${m.role}`}>
              {m.role === 'assistant' && (
                <div className="chat-msg-avatar">
                  <BonsightMark size="sm" />
                </div>
              )}
              <div className="chat-bubble">
                {m.role === 'assistant' ? renderMessage(m.content) : m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="chat-msg chat-msg--assistant">
              <div className="chat-msg-avatar">
                <BonsightMark size="sm" />
              </div>
              <div className="chat-bubble chat-bubble--loading">
                <span /><span /><span />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {showCta && (
          <div className="chat-cta">
            <div className="chat-cta-label">{t.ctaTitle}</div>
            <div className="chat-cta-actions">
              <a
                className="chat-cta-primary"
                href={CALENDLY}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => dl({ event: 'cta_click', cta_text: 'calendly', widget: 'advisor', page_path: window.location.pathname })}
              >
                <IconCalendar />
                {t.ctaCall}
              </a>
              <a
                className="chat-cta-wa"
                href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(t.waMsg)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => dl({ event: 'cta_click', cta_text: 'whatsapp', widget: 'advisor', page_path: window.location.pathname })}
              >
                <IconWA />
                {t.ctaWA}
              </a>
            </div>
          </div>
        )}

        {limited ? (
          <div className="chat-limit">{t.limitMsg}</div>
        ) : (
          <div className="chat-footer">
            <div className="chat-footer-inner">
              <input
                ref={inputRef}
                className="chat-input"
                placeholder={t.placeholder}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                disabled={loading}
              />
              <button
                className="chat-send"
                onClick={() => send()}
                disabled={loading || !input.trim()}
              >
                <IconSend />
              </button>
            </div>
            <div className="chat-powered">Powered by <span>Bonsight LLC</span></div>
          </div>
        )}
      </div>

      <div
        className={`chat-nudge ${nudge && !open ? 'chat-nudge--visible' : ''}`}
        onClick={() => setOpen(true)}
      >
        <div className="chat-nudge-label">{t.nudgeLabel}</div>
        <div className="chat-nudge-text">{t.nudgeText}</div>
      </div>

      <button
        className={`chat-fab${open ? ' chat-fab--open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? t.closeBtn : t.name}
      >
        <div className="chat-fab-inner">
          {open ? <IconClose /> : (
            <svg width="32" height="26" viewBox="0 0 72 58" fill="none">
              <circle cx="22" cy="38" r="20" fill="#9FDBC8"/>
              <circle cx="36" cy="22" r="20" fill="#085041"/>
              <circle cx="50" cy="38" r="20" fill="#2EBF8E"/>
            </svg>
          )}
        </div>
      </button>
    </>
  );
}
