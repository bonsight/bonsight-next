'use client';

import { useState, useRef, useEffect } from 'react';
import { getDemoScript } from '@/lib/kai/demoScripts';

const STEP_DELAY   = 1800;
const THINK_DELAY  = 900;  // ms of thinking animation before assistant message
const SEP_HOLD_MS  = 3000;
const SEP_FADE_MS  = 500;
const CHAR_DELAY   = 38;   // ms per character while typing

const INSIGHT_TYPES = {
  dolor:       { icon: '⚠️', label: 'Dolor identificado',    color: '#E07B5A' },
  oportunidad: { icon: '🚀', label: 'Oportunidad detectada', color: '#9B8FE4' },
  aprendizaje: { icon: '💡', label: 'Aprendizaje detectado', color: '#1D9E75' },
};

function InsightSeparator({ type, bullets, forceOpen = false, fading = false }) {
  const cfg = INSIGHT_TYPES[type] ?? INSIGHT_TYPES.aprendizaje;
  const [userOpen, setUserOpen] = useState(false);
  const isOpen   = userOpen || forceOpen;
  const showFade = fading && !userOpen;

  return (
    <div className="kcv-insight-sep">
      <div className="kcv-sep-line" style={{ background: cfg.color }} />
      <button
        className={`kcv-sep-label${isOpen ? ' kcv-sep-label--open' : ''}`}
        style={{ color: cfg.color }}
        onClick={() => setUserOpen((o) => !o)}
        type="button"
      >
        <span>{cfg.icon}</span>
        <span>{cfg.label}</span>
      </button>
      <div className="kcv-sep-line" style={{ background: cfg.color }} />
      {isOpen && (
        <div
          className={`kcv-insight-card${showFade ? ' kcv-insight-card--fading' : ''}`}
          style={{ borderColor: cfg.color + '33' }}
        >
          <ul className="kcv-insight-card-bullets">
            {bullets.map((b, i) => (
              <li key={i}>
                <span className="kcv-insight-card-dot" style={{ background: cfg.color }} />
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function KaiAvatar() {
  return (
    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1F2937', border: '1px solid #374151', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" fill="#20C997"/>
        <circle cx="12" cy="4"  r="2" fill="#20C997" opacity="0.7"/>
        <circle cx="19.2" cy="16" r="2" fill="#20C997" opacity="0.7"/>
        <circle cx="4.8"  cy="16" r="2" fill="#20C997" opacity="0.7"/>
        <line x1="12" y1="9"   x2="12"   y2="6"  stroke="#20C997" strokeWidth="1" opacity="0.5"/>
        <line x1="14.5" y1="13.5" x2="17.5" y2="15" stroke="#20C997" strokeWidth="1" opacity="0.5"/>
        <line x1="9.5"  y1="13.5" x2="6.5"  y2="15" stroke="#20C997" strokeWidth="1" opacity="0.5"/>
      </svg>
    </div>
  );
}

function parseInline(text) {
  const re = /\*\*(.+?)\*\*/g;
  const parts = [];
  let last = 0, k = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(<strong key={k++} style={{ color: '#E5E7EB', fontWeight: 600 }}>{m[1]}</strong>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : [text];
}

function renderMessage(text) {
  return text.split('\n').filter(Boolean).map((line, i) => (
    <p key={i} style={{ margin: i > 0 ? '8px 0 0' : 0, color: '#D1D5DB', fontSize: 13.5, lineHeight: 1.6 }}>
      {parseInline(line)}
    </p>
  ));
}

const IconSend = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

function DemoSummaryCard({ script, onReset }) {
  const separators = script.filter((s) => s.type === 'separator');
  const byType = {
    dolor:       separators.filter((s) => s.insightType === 'dolor').flatMap((s) => s.bullets),
    aprendizaje: separators.filter((s) => s.insightType === 'aprendizaje').flatMap((s) => s.bullets),
    oportunidad: separators.filter((s) => s.insightType === 'oportunidad').flatMap((s) => s.bullets),
  };

  return (
    <div className="kcv-checkpoint-card">
      <div className="kcv-checkpoint-header">
        <span className="kcv-checkpoint-check">✓</span>
        <span className="kcv-checkpoint-area-name">Resumen de la sesión</span>
        <span className="kcv-checkpoint-badge">Demo completada</span>
      </div>

      {byType.aprendizaje.length > 0 && (
        <div className="kcv-checkpoint-section">
          <div className="kcv-checkpoint-section-title">Lo que aprendí</div>
          {byType.aprendizaje.map((item, i) => (
            <div key={i} className="kcv-checkpoint-item">
              <span className="kcv-checkpoint-bullet">·</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}

      {byType.dolor.length > 0 && (
        <div className="kcv-checkpoint-section">
          <div className="kcv-checkpoint-section-title kcv-checkpoint-section-title--risk">
            Dolores identificados
          </div>
          {byType.dolor.map((item, i) => (
            <div key={i} className="kcv-checkpoint-item">
              <span className="kcv-checkpoint-bullet" style={{ color: '#F87171' }}>·</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}

      {byType.oportunidad.length > 0 && (
        <div className="kcv-checkpoint-section">
          <div className="kcv-checkpoint-section-title kcv-checkpoint-section-title--opp">
            Oportunidades detectadas
          </div>
          {byType.oportunidad.map((item, i) => (
            <div key={i} className="kcv-checkpoint-item">
              <span className="kcv-checkpoint-bullet">·</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}

      <button className="kdp-done-reset" onClick={onReset} type="button" style={{ marginTop: 12 }}>
        ↺ Ver de nuevo
      </button>
    </div>
  );
}

export default function DemoChatPlayer({ tenant, tenantName, knowledgeScore = 0, onStepRevealed, onPlayChange }) {
  const script = getDemoScript(tenant);

  const [revealed,      setRevealed]      = useState(0);
  const [playing,       setPlaying]       = useState(false);
  const [typing,        setTyping]        = useState('');
  const [isTyping,      setIsTyping]      = useState(false);
  const [showThinking,  setShowThinking]  = useState(false);
  const [openSeps,      setOpenSeps]      = useState(() => new Set());
  const [fadingSeps,    setFadingSeps]    = useState(() => new Set());

  const bottomRef  = useRef(null);
  const timerRef   = useRef(null);
  const sepTimers  = useRef({});
  const typeTimers = useRef([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [revealed, typing]);

  // Main auto-play loop — pauses while typewriter is running
  useEffect(() => {
    if (!playing || isTyping) { clearTimeout(timerRef.current); return; }
    if (revealed >= script.length) { setPlaying(false); return; }

    const nextStep = script[revealed];

    if (nextStep?.type === 'user') {
      // Typewriter: clear input first, then type it char by char
      setIsTyping(true);
      setTyping('');
      const text = nextStep.content;
      const timers = [];
      for (let i = 1; i <= text.length; i++) {
        timers.push(setTimeout(() => setTyping(text.slice(0, i)), i * CHAR_DELAY));
      }
      const sendDelay = text.length * CHAR_DELAY + 250;
      timers.push(setTimeout(() => {
        setTyping('');
        setIsTyping(false);
        setRevealed((r) => r + 1);
      }, sendDelay));
      typeTimers.current = timers;
    } else if (nextStep?.type === 'assistant') {
      // Wait, then show thinking animation, then reveal
      timerRef.current = setTimeout(() => {
        setShowThinking(true);
        const t = setTimeout(() => {
          setShowThinking(false);
          setRevealed((r) => r + 1);
        }, THINK_DELAY);
        typeTimers.current.push(t);
      }, STEP_DELAY - THINK_DELAY);
    } else {
      timerRef.current = setTimeout(() => setRevealed((r) => r + 1), STEP_DELAY);
    }

    return () => clearTimeout(timerRef.current);
  }, [playing, revealed, isTyping, script]);

  // Notify parent on step reveal (session_start or separator)
  useEffect(() => {
    if (revealed === 0) return;
    const step = script[revealed - 1];
    if (step?.type === 'session_start') onStepRevealed?.('session_start', step);
    if (step?.type === 'separator')     onStepRevealed?.('separator');
  }, [revealed]);

  // Auto-open separator + schedule fade. No cleanup return — timers outlive
  // subsequent revealed changes; cancelled only in reset().
  useEffect(() => {
    if (revealed === 0) return;
    const step = script[revealed - 1];
    if (step?.type !== 'separator') return;

    const idx = revealed - 1;
    setOpenSeps((prev) => { const s = new Set(prev); s.add(idx); return s; });

    const holdTimer = setTimeout(() => {
      setFadingSeps((prev) => { const s = new Set(prev); s.add(idx); return s; });
      const fadeTimer = setTimeout(() => {
        setOpenSeps((prev)   => { const s = new Set(prev); s.delete(idx); return s; });
        setFadingSeps((prev) => { const s = new Set(prev); s.delete(idx); return s; });
      }, SEP_FADE_MS);
      sepTimers.current[idx] = [sepTimers.current[idx]?.[0], fadeTimer];
    }, SEP_HOLD_MS);

    sepTimers.current[idx] = [holdTimer, null];
  }, [revealed]);

  const cancelAll = () => {
    clearTimeout(timerRef.current);
    typeTimers.current.forEach(clearTimeout);
    typeTimers.current = [];
    Object.values(sepTimers.current).forEach(([h, f]) => { clearTimeout(h); clearTimeout(f); });
    sepTimers.current = {};
  };

  const reset = () => {
    cancelAll();
    setPlaying(false);
    setRevealed(0);
    setTyping('');
    setIsTyping(false);
    setShowThinking(false);
    setOpenSeps(new Set());
    setFadingSeps(new Set());
    onStepRevealed?.('reset');
  };

  const next = () => {
    if (showThinking) {
      clearTimeout(timerRef.current);
      typeTimers.current.forEach(clearTimeout);
      typeTimers.current = [];
      setShowThinking(false);
      setRevealed((r) => r + 1);
    } else if (isTyping) {
      cancelAll();
      const step = script[revealed];
      if (step?.type === 'user') {
        setTyping('');
        setIsTyping(false);
        setRevealed((r) => r + 1);
      }
    } else if (revealed < script.length) {
      clearTimeout(timerRef.current);
      setRevealed((r) => r + 1);
    }
  };

  const toggle = () => {
    if (playing) {
      cancelAll();
      setIsTyping(false);
      setTyping('');
      setShowThinking(false);
    }
    setPlaying((p) => !p);
  };

  const done    = revealed >= script.length && !isTyping && !showThinking;
  const sending = isTyping && typing.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

      {/* Session header — con controles integrados */}
      <div className="kcv-session-header">
        <div className="kcv-session-header-left">
          <span className="kcv-session-exploring-label">Sesión</span>
          <span className="kcv-session-area-label" style={{ color: 'var(--kai-text-muted)' }}>En espera</span>
          {tenantName && (
            <span className="kcv-session-context-sub">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" style={{ flexShrink: 0, opacity: 0.5 }}>
                <circle cx="12" cy="12" r="3"/><circle cx="12" cy="4" r="1.5"/><circle cx="19.2" cy="16" r="1.5"/><circle cx="4.8" cy="16" r="1.5"/>
                <line x1="12" y1="9" x2="12" y2="5.5"/><line x1="14.5" y1="13.5" x2="17.8" y2="15"/><line x1="9.5" y1="13.5" x2="6.2" y2="15"/>
              </svg>
              Alimentando conocimiento de{' '}
              <strong style={{ fontWeight: 500, color: 'var(--kai-text-muted)' }}>{tenantName}</strong>
              <span style={{ color: '#1D9E75', marginLeft: 4 }}>· {knowledgeScore}% cubierto</span>
            </span>
          )}
        </div>
        <div className="kcv-session-header-right">
          <span className="kdp-demo-badge">DEMO</span>
          <button className={`kdp-btn${playing ? ' kdp-btn--active' : ''}`} onClick={toggle} disabled={done} type="button">
            {playing ? '⏸ Pausar' : '▶ Reproducir'}
          </button>
          <button className="kdp-btn" onClick={next} disabled={done} type="button">
            ⏭ Siguiente
          </button>
          <button className="kdp-btn kdp-btn--reset" onClick={reset} type="button">
            ↺ Reiniciar
          </button>
          <span className="kcv-session-covered">{revealed} de {script.length} pasos</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {revealed === 0 && !isTyping && !playing && !showThinking && (
          <div className="kdp-start-hint">
            Presiona <strong>▶ Reproducir</strong> para ver una conversación de ejemplo con Kai
          </div>
        )}

        {script.slice(0, revealed).map((step, i) => {
          if (step.type === 'session_start') {
            return (
              <div key={i} className="kcv-session-start-card">
                <div className="kcv-session-start-label">Plan de esta sesión</div>
                <div className="kcv-session-start-focus">{step.focus}</div>
                <div className="kcv-session-start-meta">
                  Área: <strong>{step.label}</strong> · Estimado: <strong>{step.estimatedMinutes} min</strong>
                </div>
              </div>
            );
          }
          if (step.type === 'separator') {
            return (
              <InsightSeparator
                key={i}
                type={step.insightType}
                bullets={step.bullets}
                forceOpen={openSeps.has(i)}
                fading={fadingSeps.has(i)}
              />
            );
          }
          const isUser = step.type === 'user';
          return (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: isUser ? 'row-reverse' : 'row' }}>
              {!isUser && <KaiAvatar />}
              <div style={{
                maxWidth: '72%',
                background: isUser ? '#1E3A2F' : 'transparent',
                border: isUser ? '1px solid #2D5A42' : 'none',
                borderRadius: isUser ? '14px 4px 14px 14px' : 0,
                padding: isUser ? '9px 13px' : 0,
                color: isUser ? '#A7F3D0' : undefined,
                fontSize: 13.5, lineHeight: 1.6,
              }}>
                {isUser ? step.content : renderMessage(step.content)}
              </div>
            </div>
          );
        })}

        {showThinking && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <KaiAvatar />
            <div style={{ display: 'flex', gap: 5, alignItems: 'center', paddingTop: 2 }}>
              <span className="kdp-think-dot" />
              <span className="kdp-think-dot" />
              <span className="kdp-think-dot" />
            </div>
          </div>
        )}

        {done && <DemoSummaryCard script={script} onReset={reset} />}

        <div ref={bottomRef} />
      </div>

      {/* Input — shows typewriter text while typing */}
      <div style={{ padding: '12px 20px 20px', borderTop: '1px solid var(--kai-border)', display: 'flex', gap: 8, alignItems: 'center', background: 'var(--kai-bg)' }}>
        <div style={{
          flex: 1, background: '#1F2937', border: `1px solid ${sending ? '#374151' : '#2A3240'}`,
          borderRadius: 24, padding: '9px 16px',
          color: sending ? '#A7F3D0' : '#4B5563',
          fontSize: 13.5, lineHeight: 1.6, minHeight: 38,
          display: 'flex', alignItems: 'center',
          transition: 'color 0.15s',
        }}>
          {sending
            ? <span>{typing}<span className="kdp-cursor" /></span>
            : <span style={{ color: '#4B5563' }}>Esta es una conversación de demostración…</span>
          }
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: sending ? '#20C997' : '#1F2937',
          border: `1px solid ${sending ? '#20C997' : '#374151'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          color: sending ? '#0D1117' : '#374151',
          transition: 'all 0.2s',
        }}>
          <IconSend />
        </div>
      </div>

      <style>{`
        .kdp-cursor {
          display: inline-block;
          width: 2px;
          height: 13px;
          background: #A7F3D0;
          margin-left: 1px;
          vertical-align: middle;
          animation: kdp-blink 0.8s step-end infinite;
        }
        @keyframes kdp-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        .kdp-think-dot {
          display: inline-block;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #374151;
          animation: kdp-think 1.2s ease-in-out infinite;
        }
        .kdp-think-dot:nth-child(1) { animation-delay: 0ms; }
        .kdp-think-dot:nth-child(2) { animation-delay: 180ms; }
        .kdp-think-dot:nth-child(3) { animation-delay: 360ms; }
        @keyframes kdp-think {
          0%, 60%, 100% { opacity: 0.3; transform: scale(1); }
          30%            { opacity: 1;   transform: scale(1.3); background: #6EE7B7; }
        }
      `}</style>
    </div>
  );
}
