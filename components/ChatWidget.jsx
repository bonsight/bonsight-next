'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const T = {
  en: {
    title: 'Analytics Assistant',
    subtitle: 'Analytics · Last 30 days',
    clearTitle: 'Clear conversation',
    sessions: 'Sessions',
    users: 'Users',
    avgDuration: 'Avg. Duration',
    quickQueries: 'Quick queries',
    placeholder: 'Ask about traffic, pages, sources…',
    nudgeLabel: 'Analytics Assistant',
    nudgeText: 'Ask about your website traffic →',
    error: 'Something went wrong. Try again.',
    suggestions: [
      { icon: '↗', text: 'Most visited pages' },
      { icon: '◈', text: 'Traffic trends' },
      { icon: '◎', text: 'Top conversion sources' },
      { icon: '⊕', text: 'Countries visiting' },
    ],
  },
  es: {
    title: 'Asistente Analytics',
    subtitle: 'Analytics · Últimos 30 días',
    clearTitle: 'Limpiar conversación',
    sessions: 'Sesiones',
    users: 'Usuarios',
    avgDuration: 'Duración media',
    quickQueries: 'Consultas rápidas',
    placeholder: 'Pregunta sobre tráfico, páginas, fuentes…',
    nudgeLabel: 'Asistente Analytics',
    nudgeText: 'Pregunta sobre el tráfico de tu web →',
    error: 'Algo salió mal. Inténtalo de nuevo.',
    suggestions: [
      { icon: '↗', text: 'Páginas más visitadas' },
      { icon: '◈', text: 'Tendencias de tráfico' },
      { icon: '◎', text: 'Principales fuentes' },
      { icon: '⊕', text: 'Países visitantes' },
    ],
  },
};

const IconAnalytics = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="17" cy="27" r="10" fill="rgba(52,211,153,0.07)" stroke="rgba(52,211,153,0.22)" strokeWidth="0.8"/>
    <circle cx="24" cy="21" r="10" fill="rgba(52,211,153,0.09)" stroke="rgba(52,211,153,0.28)" strokeWidth="0.8"/>
    <circle cx="31" cy="27" r="10" fill="rgba(52,211,153,0.07)" stroke="rgba(52,211,153,0.22)" strokeWidth="0.8"/>
    <polyline points="13,30 19,23 25,27 33,18" stroke="rgba(52,211,153,0.85)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="13" cy="30" r="1.5" fill="rgba(52,211,153,0.4)"/>
    <circle cx="19" cy="23" r="1.75" fill="rgba(52,211,153,0.65)"/>
    <circle cx="25" cy="27" r="1.75" fill="rgba(52,211,153,0.65)"/>
    <circle cx="33" cy="18" r="2.5" fill="#34d399"/>
  </svg>
);

const IconClose = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const IconReset = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
    <path d="M3 3v5h5"/>
  </svg>
);

const IconSend = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

function MetricCard({ label, value, loading }) {
  return (
    <div className="chat-metric-card">
      <div className="chat-metric-value">{loading ? '···' : value}</div>
      <div className="chat-metric-label">{label}</div>
    </div>
  );
}

export default function ChatWidget() {
  const pathname = usePathname();
  const locale = pathname?.startsWith('/es') ? 'es' : 'en';
  const t = T[locale];

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [nudge, setNudge] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (sessionStorage.getItem('chatNudge_v2')) return;
    const show = setTimeout(() => setNudge(true), 1500);
    const hide = setTimeout(() => {
      setNudge(false);
      sessionStorage.setItem('chatNudge_v2', '1');
    }, 8000);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, []);

  useEffect(() => {
    if (open) {
      setNudge(false);
      sessionStorage.setItem('chatNudge_v2', '1');
      setTimeout(() => inputRef.current?.focus(), 300);
      if (!stats && !statsLoading) {
        setStatsLoading(true);
        fetch('/api/stats')
          .then((r) => r.json())
          .then((d) => { if (!d.error) setStats(d); })
          .finally(() => setStatsLoading(false));
      }
    }
  }, [open]);

  const send = async (text) => {
    const question = (text || input).trim();
    if (!question || loading) return;

    const newMessages = [...messages, { role: 'user', content: question }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, locale }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: t.error }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={`chat-panel ${open ? 'chat-panel--open' : ''}`}>
        <div className="chat-header">
          <div className="chat-header-info">
            <div className="chat-avatar"><IconAnalytics size={32} /></div>
            <div>
              <div className="chat-title">
                {t.title}
                <span className="chat-live-dot" />
              </div>
              <div className="chat-subtitle">{t.subtitle}</div>
            </div>
          </div>
          <div className="chat-header-actions">
            {messages.length > 0 && (
              <button className="chat-reset" onClick={() => setMessages([])} title={t.clearTitle}>
                <IconReset />
              </button>
            )}
            <button className="chat-close" onClick={() => setOpen(false)}><IconClose /></button>
          </div>
        </div>

        <div className="chat-body">
          {messages.length === 0 && (
            <div className="chat-welcome">
              <div className="chat-metrics-row">
                <MetricCard label={t.sessions} value={stats?.sessions} loading={statsLoading} />
                <MetricCard label={t.users} value={stats?.users} loading={statsLoading} />
                <MetricCard label={t.avgDuration} value={stats?.duration} loading={statsLoading} />
              </div>
              <div className="chat-queries-label">{t.quickQueries}</div>
              <div className="chat-suggestions">
                {t.suggestions.map((s) => (
                  <button key={s.text} className="chat-suggestion" onClick={() => send(s.text)}>
                    <span className="chat-suggestion-icon">{s.icon}</span>
                    {s.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`chat-msg chat-msg--${m.role}`}>
              {m.role === 'assistant' && <div className="chat-msg-label">GA4</div>}
              <div className="chat-bubble">{m.content}</div>
            </div>
          ))}

          {loading && (
            <div className="chat-msg chat-msg--assistant">
              <div className="chat-msg-label">GA4</div>
              <div className="chat-bubble chat-bubble--loading">
                <span/><span/><span/>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="chat-footer">
          <input
            ref={inputRef}
            className="chat-input"
            placeholder={t.placeholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            disabled={loading}
          />
          <button className="chat-send" onClick={() => send()} disabled={loading || !input.trim()}>
            <IconSend />
          </button>
        </div>
      </div>

      <div className={`chat-nudge ${nudge && !open ? 'chat-nudge--visible' : ''}`} onClick={() => { setOpen(true); }}>
        <div className="chat-nudge-label">{t.nudgeLabel}</div>
        <div className="chat-nudge-text">{t.nudgeText}</div>
      </div>

      <button className="chat-fab" onClick={() => setOpen((o) => !o)} aria-label={t.title}>
        {open ? <IconClose /> : <IconAnalytics size={52} />}
      </button>
    </>
  );
}
