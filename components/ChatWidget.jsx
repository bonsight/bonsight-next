'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const FREE_QUESTIONS = 3;
const MAX_QUESTIONS = 6;
const BLOCK_HOURS = 24;
const FORMSPREE = 'https://formspree.io/f/xkoejwqn';
const WA_NUMBER = '13123509796';
const dl = (obj) => { if (typeof window !== 'undefined') { window.dataLayer = window.dataLayer || []; window.dataLayer.push(obj); } };

const T = {
  en: {
    title: 'Analytics Assistant',
    subtitle: 'Analytics · Last 30 days',
    clearTitle: 'Clear conversation',
    closeBtn: 'Close',
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
    gate: {
      label: 'Want to go deeper?',
      title: 'Get a full analytics audit',
      text: 'A Bonsight specialist will review your data and send you a personalized report.',
      placeholder: 'your@company.com',
      button: 'Request audit →',
      sending: 'Sending…',
      success: "Done! We'll be in touch within 24 hours.",
    },
    block: {
      label: 'Demo limit reached',
      title: 'Your demo access has ended',
      text: 'This is a live demo with limited access. Come back in 24 hours, or talk to our team now to get full access.',
      wa: 'Chat on WhatsApp',
      waMsg: 'Hi! I tried the Bonsight analytics demo and would like to learn more.',
      email: 'Send us an email',
    },
  },
  es: {
    title: 'Asistente Analytics',
    subtitle: 'Analytics · Últimos 30 días',
    clearTitle: 'Limpiar conversación',
    closeBtn: 'Cerrar',
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
    gate: {
      label: '¿Quieres ir más a fondo?',
      title: 'Solicita una auditoría analytics',
      text: 'Un especialista de Bonsight revisará tus datos y te enviará un reporte personalizado.',
      placeholder: 'tu@empresa.com',
      button: 'Solicitar auditoría →',
      sending: 'Enviando…',
      success: '¡Listo! Te contactamos en menos de 24 horas.',
    },
    block: {
      label: 'Límite del demo alcanzado',
      title: 'Tu acceso al demo ha finalizado',
      text: 'Este es un demo con acceso limitado. Vuelve en 24 horas, o habla con nuestro equipo ahora para obtener acceso completo.',
      wa: 'Escribir por WhatsApp',
      waMsg: '¡Hola! Probé el demo de analytics de Bonsight y me gustaría saber más.',
      email: 'Enviar un correo',
    },
  },
};

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

  if (pathname?.includes('/consulta')) return null;

  const initChat = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('bsChatData') || '{}');
      const blockedAt = stored.blockedAt || null;
      const stillBlocked = blockedAt && Date.now() - blockedAt < BLOCK_HOURS * 3600 * 1000;
      return {
        questionsUsed: stillBlocked ? MAX_QUESTIONS : (stored.questionsUsed || 0),
        hardBlocked: !!stillBlocked,
        gated: !stillBlocked && (stored.questionsUsed || 0) >= FREE_QUESTIONS && !(stored.leadDone),
        leadDone: !!stored.leadDone,
      };
    } catch { return { questionsUsed: 0, hardBlocked: false, gated: false, leadDone: false }; }
  };

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [questionsUsed, setQuestionsUsed] = useState(() => initChat().questionsUsed);
  const [gated, setGated] = useState(() => initChat().gated);
  const [hardBlocked, setHardBlocked] = useState(() => initChat().hardBlocked);
  const [leadEmail, setLeadEmail] = useState('');
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadDone, setLeadDone] = useState(() => initChat().leadDone);
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
      dl({ event: 'widget_open', widget: 'analytics', page_path: window.location.pathname });
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

  const saveChat = (data) => {
    try { localStorage.setItem('bsChatData', JSON.stringify(data)); } catch {}
  };

  const send = async (text) => {
    const question = (text || input).trim();
    if (!question || loading || gated || hardBlocked) return;

    const isQuickSuggestion = !!text;
    dl({ event: 'chat_message_sent', widget: 'analytics', is_suggestion: isQuickSuggestion, page_path: window.location.pathname });

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
      const next = questionsUsed + 1;
      setQuestionsUsed(next);
      if (next >= MAX_QUESTIONS) {
        const blockedAt = Date.now();
        setHardBlocked(true);
        dl({ event: 'widget_hard_blocked', widget: 'analytics', page_path: window.location.pathname });
        saveChat({ questionsUsed: next, blockedAt, leadDone });
      } else if (next >= FREE_QUESTIONS && !leadDone) {
        setGated(true);
        dl({ event: 'widget_gate_shown', widget: 'analytics', page_path: window.location.pathname });
        saveChat({ questionsUsed: next, leadDone });
      } else {
        saveChat({ questionsUsed: next, leadDone });
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: t.error }]);
    } finally {
      setLoading(false);
    }
  };

  const submitLead = async (e) => {
    e.preventDefault();
    if (!leadEmail || leadLoading) return;
    setLeadLoading(true);
    try {
      await fetch(FORMSPREE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email: leadEmail, source: 'analytics-chat', locale }),
      });
      setLeadDone(true);
      setGated(false);
      saveChat({ questionsUsed, leadDone: true });
      dl({ event: 'lead_captured', widget: 'analytics', page_path: window.location.pathname });
      setMessages((prev) => [...prev, { role: 'assistant', content: t.gate.success }]);
    } catch {
      setLeadDone(true);
    } finally {
      setLeadLoading(false);
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
              <div className="chat-bubble">
                {m.role === 'assistant' ? renderMessage(m.content) : m.content}
              </div>
            </div>
          ))}

          {gated && !leadDone && (
            <div className="chat-msg chat-msg--assistant">
              <div className="chat-msg-label">GA4</div>
              <div className="chat-gate">
                <div className="chat-gate-label">{t.gate.label}</div>
                <div className="chat-gate-title">{t.gate.title}</div>
                <div className="chat-gate-text">{t.gate.text}</div>
                <form className="chat-gate-form" onSubmit={submitLead}>
                  <input
                    type="email"
                    required
                    className="chat-gate-input"
                    placeholder={t.gate.placeholder}
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    disabled={leadLoading}
                  />
                  <button type="submit" className="chat-gate-btn" disabled={leadLoading}>
                    {leadLoading ? t.gate.sending : t.gate.button}
                  </button>
                </form>
              </div>
            </div>
          )}

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

        {hardBlocked ? (
          <div className="chat-block">
            <div className="chat-block-label">{t.block.label}</div>
            <div className="chat-block-title">{t.block.title}</div>
            <div className="chat-block-text">{t.block.text}</div>
            <div className="chat-block-actions">
              <a
                className="chat-block-wa"
                href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(t.block.waMsg)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                {t.block.wa}
              </a>
              <button
                className="chat-block-email"
                onClick={() => {
                  setOpen(false);
                  document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {t.block.email}
              </button>
            </div>
          </div>
        ) : (
          <div className="chat-footer">
            <input
              ref={inputRef}
              className="chat-input"
              placeholder={t.placeholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              disabled={loading || gated}
            />
            <button className="chat-send" onClick={() => send()} disabled={loading || gated || !input.trim()}>
              <IconSend />
            </button>
          </div>
        )}
      </div>

      <div className={`chat-nudge ${nudge && !open ? 'chat-nudge--visible' : ''}`} onClick={() => { setOpen(true); }}>
        <div className="chat-nudge-label">{t.nudgeLabel}</div>
        <div className="chat-nudge-text">{t.nudgeText}</div>
      </div>

      <button className={`chat-fab${open ? ' chat-fab--open' : ''}`} onClick={() => setOpen((o) => !o)} aria-label={open ? t.closeBtn : t.title}>
        {open ? <IconClose /> : <IconAnalytics size={52} />}
      </button>
    </>
  );
}
