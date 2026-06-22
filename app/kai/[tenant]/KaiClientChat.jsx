'use client';

import { useState, useRef, useEffect } from 'react';

const AREAS_CONFIG = [
  { id: 'negocio',     label: 'Negocio' },
  { id: 'operaciones', label: 'Operaciones' },
  { id: 'tecnologia',  label: 'Tecnología' },
  { id: 'finanzas',    label: 'Finanzas' },
  { id: 'marketing',   label: 'Marketing' },
  { id: 'personas',    label: 'Personas' },
];

const IconSend = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

function AreaDots({ areaStatuses, size = 8 }) {
  return (
    <div className="kcv-session-dots">
      {AREAS_CONFIG.map((a) => {
        const status = areaStatuses[a.id] ?? 'pendiente';
        return (
          <div
            key={a.id}
            className={`kcv-area-dot kcv-area-dot--${status}`}
            style={{ width: size, height: size }}
            title={`${a.label}: ${status}`}
          />
        );
      })}
    </div>
  );
}

const ContextSub = ({ tenantName, knowledgeScore }) => (
  <span className="kcv-session-context-sub">
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" style={{ flexShrink: 0, opacity: 0.5 }}>
      <circle cx="12" cy="12" r="3"/><circle cx="12" cy="4" r="1.5"/><circle cx="19.2" cy="16" r="1.5"/><circle cx="4.8" cy="16" r="1.5"/>
      <line x1="12" y1="9" x2="12" y2="5.5"/><line x1="14.5" y1="13.5" x2="17.8" y2="15"/><line x1="9.5" y1="13.5" x2="6.2" y2="15"/>
    </svg>
    Alimentando conocimiento de <strong style={{ fontWeight: 500, color: 'var(--kai-text-muted)' }}>{tenantName}</strong>
    {knowledgeScore !== undefined && (
      <span style={{ color: '#1D9E75', marginLeft: 4 }}>· {knowledgeScore}% cubierto</span>
    )}
  </span>
);

function SessionHeader({ currentArea, areaStatuses, tenantName, knowledgeScore }) {
  const completedCount = Object.values(areaStatuses).filter((s) => s === 'completa').length;

  if (!currentArea) {
    return (
      <div className="kcv-session-header">
        <div className="kcv-session-header-left">
          <span className="kcv-session-exploring-label">Sesión</span>
          <span className="kcv-session-area-label" style={{ color: 'var(--kai-text-muted)' }}>En espera</span>
          {tenantName && <ContextSub tenantName={tenantName} knowledgeScore={knowledgeScore} />}
        </div>
        <div className="kcv-session-header-right">
          <span className="kcv-session-covered">0 de 6 temas</span>
          <AreaDots areaStatuses={areaStatuses} />
        </div>
      </div>
    );
  }

  return (
    <div className="kcv-session-header">
      <div className="kcv-session-header-left">
        <span className="kcv-session-exploring-label">Explorando</span>
        <span className="kcv-session-area-label">{currentArea.label}</span>
        {tenantName && <ContextSub tenantName={tenantName} knowledgeScore={knowledgeScore} />}
      </div>
      <div className="kcv-session-header-right">
        <span className="kcv-session-covered">{completedCount} de 6 temas</span>
        <AreaDots areaStatuses={areaStatuses} />
      </div>
    </div>
  );
}

// ── Insight separator ─────────────────────────────────────────────────────


const INSIGHT_TYPES = {
  dolor:       { icon: '⚠️', label: 'Dolor identificado',     color: '#E07B5A' },
  oportunidad: { icon: '🚀', label: 'Oportunidad detectada',  color: '#9B8FE4' },
  aprendizaje: { icon: '💡', label: 'Aprendizaje detectado',  color: '#1D9E75' },
};

function InsightSeparator({ type, bullets }) {
  const cfg = INSIGHT_TYPES[type] ?? INSIGHT_TYPES.aprendizaje;
  const [open, setOpen] = useState(false);
  const hasBullets = bullets?.length > 0;

  return (
    <div className="kcv-insight-sep">
      <div className="kcv-sep-line" style={{ background: cfg.color }} />
      <button
        className={`kcv-sep-label${open ? ' kcv-sep-label--open' : ''}`}
        style={{ color: cfg.color }}
        onClick={() => hasBullets && setOpen((o) => !o)}
        disabled={!hasBullets}
        type="button"
      >
        <span>{cfg.icon}</span>
        <span>{cfg.label}</span>
      </button>
      <div className="kcv-sep-line" style={{ background: cfg.color }} />

      {open && hasBullets && (
        <div className="kcv-insight-card" style={{ borderColor: cfg.color + '33' }}>
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

function ParticipantConfirmationCard({ matches, onConfirm, onDeny, resolved }) {
  if (resolved) return null;
  const single = matches.length === 1;
  return (
    <div className="kcv-participant-confirm-card">
      {single && (
        <div className="kcv-participant-confirm-info">
          <div className="kcv-participant-confirm-avatar">
            {matches[0].name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')}
          </div>
          <div>
            <div className="kcv-participant-confirm-name">{matches[0].name}</div>
            {matches[0].role && <div className="kcv-participant-confirm-role">{matches[0].role}</div>}
          </div>
        </div>
      )}
      <div className="kcv-participant-confirm-actions">
        {matches.map((p) => (
          <button
            key={p.id}
            className="kcv-participant-confirm-btn kcv-participant-confirm-btn--yes"
            onClick={() => onConfirm(p)}
          >
            {single ? `Sí, soy ${p.name.split(/\s+/)[0]}` : p.name}
          </button>
        ))}
        <button className="kcv-participant-confirm-btn kcv-participant-confirm-btn--no" onClick={onDeny}>
          No, soy otra persona
        </button>
      </div>
    </div>
  );
}

function buildInsightSeparators(sessionUpdates, newLearnings) {
  const groups = { dolor: [], oportunidad: [], aprendizaje: [] };

  for (const u of (sessionUpdates ?? [])) {
    const v = typeof u.value === 'object' ? [u.value.name, u.value.role].filter(Boolean).join(' · ') : String(u.value ?? '');
    if (!v) continue;
    if (u.field === 'pains')             groups.dolor.push(v);
    else if (u.field === 'opportunities') groups.oportunidad.push(v);
    else                                  groups.aprendizaje.push(v);
  }
  for (const l of (newLearnings ?? [])) {
    if (l.content) groups.aprendizaje.push(l.content);
  }

  return Object.entries(groups)
    .filter(([, bullets]) => bullets.length > 0)
    .map(([type, bullets]) => ({ type, bullets }));
}

function SessionStartCard({ data }) {
  return (
    <div className="kcv-session-start-card">
      <div className="kcv-session-start-label">Plan de esta sesión</div>
      <div className="kcv-session-start-focus">{data.focus}</div>
      <div className="kcv-session-start-meta">
        Área: <strong>{data.label}</strong> · Estimado: <strong>{data.estimatedMinutes || '3-5'} min</strong>
      </div>
    </div>
  );
}

function CheckpointCard({ data, areaStatuses }) {
  const mapStatuses = {
    ...areaStatuses,
    [data.area]: 'completa',
    ...(data.nextArea ? { [data.nextArea]: 'explorando' } : {}),
  };
  const completedCount = Object.values(mapStatuses).filter((s) => s === 'completa').length;

  return (
    <div className="kcv-checkpoint-card">
      <div className="kcv-checkpoint-header">
        <span className="kcv-checkpoint-check">✓</span>
        <span className="kcv-checkpoint-area-name">{data.label}</span>
        <span className="kcv-checkpoint-badge">Área cubierta</span>
      </div>

      {data.learned?.length > 0 && (
        <div className="kcv-checkpoint-section">
          <div className="kcv-checkpoint-section-title">Lo que aprendí</div>
          {data.learned.map((item, i) => (
            <div key={i} className="kcv-checkpoint-item">
              <span className="kcv-checkpoint-bullet">·</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}

      {data.risks?.length > 0 && (
        <div className="kcv-checkpoint-section">
          <div className="kcv-checkpoint-section-title kcv-checkpoint-section-title--risk">
            Riesgos detectados
          </div>
          {data.risks.map((item, i) => (
            <div key={i} className="kcv-checkpoint-item">
              <span className="kcv-checkpoint-bullet" style={{ color: '#F87171' }}>·</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}

      {data.opportunities?.length > 0 && (
        <div className="kcv-checkpoint-section">
          <div className="kcv-checkpoint-section-title kcv-checkpoint-section-title--opp">
            Oportunidades
          </div>
          {data.opportunities.map((item, i) => (
            <div key={i} className="kcv-checkpoint-item">
              <span className="kcv-checkpoint-bullet">·</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}

      <div className="kcv-checkpoint-map">
        {AREAS_CONFIG.map((a) => (
          <div key={a.id} className="kcv-checkpoint-map-item">
            <div
              className={`kcv-area-dot kcv-area-dot--${mapStatuses[a.id] ?? 'pendiente'}`}
              style={{ width: 7, height: 7 }}
            />
            <span>{a.label}</span>
          </div>
        ))}
      </div>

      {completedCount > 0 && (
        <div style={{ fontSize: 11, color: 'var(--kai-text-faint)', marginBottom: 8 }}>
          {completedCount} de 6 áreas cubiertas
        </div>
      )}

      {data.nextArea && (
        <div className="kcv-checkpoint-next">
          <span>Siguiente:</span>
          <strong>{data.nextLabel}</strong>
          {data.nextFocus && (
            <span className="kcv-checkpoint-next-focus">"{data.nextFocus}"</span>
          )}
        </div>
      )}
    </div>
  );
}

function KaiAvatar() {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      background: '#1F2937',
      border: '1px solid #374151',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" fill="#20C997"/>
        <circle cx="12" cy="4" r="2" fill="#20C997" opacity="0.7"/>
        <circle cx="19.2" cy="16" r="2" fill="#20C997" opacity="0.7"/>
        <circle cx="4.8" cy="16" r="2" fill="#20C997" opacity="0.7"/>
        <line x1="12" y1="9" x2="12" y2="6" stroke="#20C997" strokeWidth="1" opacity="0.5"/>
        <line x1="14.5" y1="13.5" x2="17.5" y2="15" stroke="#20C997" strokeWidth="1" opacity="0.5"/>
        <line x1="9.5" y1="13.5" x2="6.5" y2="15" stroke="#20C997" strokeWidth="1" opacity="0.5"/>
      </svg>
    </div>
  );
}

function parseInline(text) {
  const re = /\*\*(.+?)\*\*|(\d[\d,\.]*%?)/g;
  const parts = [];
  let last = 0, k = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      parts.push(<strong key={k++} style={{ color: '#E5E7EB', fontWeight: 600 }}>{m[1]}</strong>);
    } else {
      parts.push(<span key={k++} style={{ color: '#6EE7B7', fontWeight: 500 }}>{m[0]}</span>);
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
      <div key={`b${key}`} style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
        {bullets.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ color: '#20C997', marginTop: 2, fontSize: 10, flexShrink: 0 }}>▸</span>
            <span style={{ color: '#D1D5DB', fontSize: 13.5 }}>{parseInline(item)}</span>
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
        <p key={i} style={{ margin: result.length > 0 ? '8px 0 0' : 0, color: '#D1D5DB', fontSize: 13.5, lineHeight: 1.6 }}>
          {parseInline(t)}
        </p>
      );
    }
  });
  flushBullets('end');
  return result.length ? result : text;
}

function ProfileUpdateCard({ proposal, stateKey, proposalStates, onAccept, onReject }) {
  const state = proposalStates[stateKey];

  if (state === 'accepted') {
    return (
      <div style={{
        marginTop: 10, padding: '8px 12px',
        background: '#0A1F14', border: '1px solid #1A4731',
        borderRadius: 8, fontSize: 11.5, color: '#6EE7B7',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span>✓</span> Actualización aplicada al perfil
      </div>
    );
  }

  if (state === 'rejected') return null;

  return (
    <div style={{
      marginTop: 10, background: '#111827',
      border: '1px solid #1F2937', borderRadius: 8,
      overflow: 'hidden', fontSize: 12,
    }}>
      <div style={{
        padding: '7px 12px', borderBottom: '1px solid #1F2937',
        color: '#6B7280', display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ color: '#FBBF24', fontSize: 11 }}>◈</span>
        Propuesta de actualización del perfil
      </div>
      <div style={{ padding: '10px 12px' }}>
        <div style={{ color: '#6B7280', fontSize: 11, marginBottom: 3 }}>{proposal.label}</div>
        <div style={{ color: '#E5E7EB', fontWeight: 500, marginBottom: proposal.quote ? 8 : 10 }}>
          + {proposal.proposedValue}
        </div>
        {proposal.quote && (
          <div style={{
            color: '#4B5563', fontStyle: 'italic',
            borderLeft: '2px solid #1F2937', paddingLeft: 8, marginBottom: 10, fontSize: 11.5,
          }}>
            "{proposal.quote}"
          </div>
        )}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={onAccept}
            style={{
              padding: '4px 14px', background: '#20C997', border: 'none',
              borderRadius: 6, color: '#0D1117', fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Aceptar
          </button>
          <button
            onClick={onReject}
            style={{
              padding: '4px 12px', background: 'transparent',
              border: '1px solid #374151', borderRadius: 6,
              color: '#6B7280', fontSize: 11, cursor: 'pointer',
            }}
          >
            Rechazar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function KaiClientChat({ tenant, tenantName, knowledgeScore, currentArea, areaStatuses = {}, onSessionUpdate }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [proposalStates, setProposalStates] = useState({});
  const [confirmationResolved, setConfirmationResolved] = useState({});
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const greetingFired = useRef(false);
  // Server assigns conversationId on the first message; all subsequent messages use it.
  const activeConvIdRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Fetch contextual greeting on mount
  useEffect(() => {
    if (greetingFired.current) return;
    greetingFired.current = true;

    setLoading(true);
    fetch(`/api/kai/${tenant}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: '__greeting__' }],
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.conversationId) activeConvIdRef.current = data.conversationId;
        onSessionUpdate?.(data);
        setMessages([{
          role: 'assistant',
          content: data.reply,
          components: data.components ?? [],
          newLearnings: [],
          sessionStart: data.sessionStart ?? null,
          checkpoint: null,
          areaStatusesSnapshot: {},
        }]);
      })
      .catch(() => {
        setMessages([{
          role: 'assistant',
          content: `Hola. Soy Kai, tu consultor estratégico para ${tenantName}. ¿En qué empezamos hoy?`,
          components: [],
        }]);
      })
      .finally(() => setLoading(false));
  }, [tenant, tenantName]);

  const handleAcceptUpdate = async (stateKey, proposal) => {
    try {
      await fetch(`/api/kai/${tenant}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field: proposal.field,
          action: proposal.action,
          proposedValue: proposal.proposedValue,
        }),
      });
      setProposalStates(prev => ({ ...prev, [stateKey]: 'accepted' }));
    } catch {
      setProposalStates(prev => ({ ...prev, [stateKey]: 'accepted' }));
    }
  };

  const handleRejectUpdate = (stateKey) => {
    setProposalStates(prev => ({ ...prev, [stateKey]: 'rejected' }));
  };

  const handleParticipantConfirm = async (msgIdx, participant) => {
    setConfirmationResolved(prev => ({ ...prev, [msgIdx]: true }));
    setLoading(true);
    try {
      const res = await fetch(`/api/kai/${tenant}/confirm-participant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConvIdRef.current,
          participantName: participant.name,
          participantRole: participant.role,
          confirmed: true,
        }),
      });
      const data = await res.json();
      const firstName = participant.name.split(/\s+/)[0];
      setMessages(prev => [
        ...prev,
        { role: 'user', content: `Sí, soy ${firstName}` },
        { role: 'assistant', content: data.reply, components: [] },
      ]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error al confirmar. Intenta de nuevo.', components: [] }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleParticipantDeny = async (msgIdx) => {
    setConfirmationResolved(prev => ({ ...prev, [msgIdx]: true }));
    setLoading(true);
    try {
      const res = await fetch(`/api/kai/${tenant}/confirm-participant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConvIdRef.current,
          confirmed: false,
        }),
      });
      const data = await res.json();
      setMessages(prev => [
        ...prev,
        { role: 'user', content: 'No, soy otra persona' },
        { role: 'assistant', content: data.reply, components: [] },
      ]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error. Intenta de nuevo.', components: [] }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const send = async () => {
    const question = input.trim();
    if (!question || loading) return;

    const newMessages = [...messages, { role: 'user', content: question }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`/api/kai/${tenant}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          conversationId: activeConvIdRef.current,
        }),
      });
      const data = await res.json();
      if (data.conversationId) activeConvIdRef.current = data.conversationId;
      onSessionUpdate?.(data);
      const snap = data.checkpoint
        ? { ...areaStatuses, [data.checkpoint.area]: 'completa', ...(data.checkpoint.nextArea ? { [data.checkpoint.nextArea]: 'explorando' } : {}) }
        : { ...areaStatuses };
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply,
        components: data.components ?? [],
        newLearnings: data.newLearnings ?? [],
        sessionUpdates: data.sessionUpdates ?? [],
        sessionStart: data.sessionStart ?? null,
        checkpoint: data.checkpoint ?? null,
        areaStatusesSnapshot: snap,
        participantConfirmation: data.participantConfirmation ?? null,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Error de conexión. Inténtalo de nuevo.',
        components: [],
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Session header */}
      <SessionHeader currentArea={currentArea} areaStatuses={areaStatuses} tenantName={tenantName} knowledgeScore={knowledgeScore} />

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {loading && messages.length === 0 && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <KaiAvatar />
            <div style={{ display: 'flex', gap: 4, padding: '10px 4px', alignItems: 'center' }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: '50%', background: '#374151',
                  animation: `kaiDot 1.2s ${i * 0.2}s ease-in-out infinite`,
                }} />
              ))}
            </div>
          </div>
        )}

        {(() => {
          // Index of the first assistant message that has sessionStart — only that one renders the card
          const firstSessionStartIdx = messages.findIndex((m) => m.role === 'assistant' && m.sessionStart);
          return messages.map((m, msgIdx) => ({ m, msgIdx, firstSessionStartIdx }));
        })().map(({ m, msgIdx, firstSessionStartIdx }) => (
          <div key={msgIdx}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
              {m.role === 'assistant' && <KaiAvatar />}
              <div style={{
                maxWidth: '72%',
                background: m.role === 'user' ? '#1E3A2F' : 'transparent',
                border: m.role === 'user' ? '1px solid #2D5A42' : 'none',
                borderRadius: m.role === 'user' ? '14px 4px 14px 14px' : 0,
                padding: m.role === 'user' ? '9px 13px' : 0,
                color: m.role === 'user' ? '#A7F3D0' : undefined,
                fontSize: 13.5,
                lineHeight: 1.6,
              }}>
                {m.role === 'assistant' ? renderMessage(m.content) : m.content}

                {m.role === 'assistant' && m.components
                  ?.filter(c => c.type === 'profile_update_proposal')
                  .map((c, pIdx) => {
                    const stateKey = `${msgIdx}-${pIdx}`;
                    return (
                      <ProfileUpdateCard
                        key={pIdx}
                        proposal={c.data}
                        stateKey={stateKey}
                        proposalStates={proposalStates}
                        onAccept={() => handleAcceptUpdate(stateKey, c.data)}
                        onReject={() => handleRejectUpdate(stateKey)}
                      />
                    );
                  })}
              </div>
            </div>

            {/* Participant confirmation card */}
            {m.role === 'assistant' && m.participantConfirmation?.length > 0 && (
              <ParticipantConfirmationCard
                matches={m.participantConfirmation}
                resolved={!!confirmationResolved[msgIdx]}
                onConfirm={(p) => handleParticipantConfirm(msgIdx, p)}
                onDeny={() => handleParticipantDeny(msgIdx)}
              />
            )}

            {/* Session start card — solo la primera vez */}
            {m.role === 'assistant' && m.sessionStart && msgIdx === firstSessionStartIdx && (
              <SessionStartCard data={m.sessionStart} />
            )}

            {/* Checkpoint card */}
            {m.role === 'assistant' && m.checkpoint && (
              <CheckpointCard
                data={m.checkpoint}
                areaStatuses={m.areaStatusesSnapshot ?? {}}
              />
            )}

            {/* Insight separators — inline, after assistant message */}
            {m.role === 'assistant' && (() => {
              const seps = buildInsightSeparators(m.sessionUpdates, m.newLearnings);
              if (!seps.length) return null;
              return (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {seps.map((s, i) => <InsightSeparator key={i} type={s.type} bullets={s.bullets} />)}
                </div>
              );
            })()}
          </div>
        ))}

        {loading && messages.length > 0 && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <KaiAvatar />
            <div style={{ display: 'flex', gap: 4, padding: '10px 4px', alignItems: 'center' }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: '50%', background: '#374151',
                  animation: `kaiDot 1.2s ${i * 0.2}s ease-in-out infinite`,
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 20px 20px',
        borderTop: '1px solid var(--kai-border)',
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        background: 'var(--kai-bg)',
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Escribe algo a Kai…"
          disabled={loading}
          style={{
            flex: 1,
            background: '#1F2937',
            border: '1px solid #374151',
            borderRadius: 24,
            padding: '9px 16px',
            color: '#E5E7EB',
            fontSize: 13.5,
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: input.trim() ? '#20C997' : '#1F2937',
            border: '1px solid',
            borderColor: input.trim() ? '#20C997' : '#374151',
            color: input.trim() ? '#0D1117' : '#374151',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: input.trim() ? 'pointer' : 'default',
            transition: 'all 0.15s',
            flexShrink: 0,
          }}
        >
          <IconSend />
        </button>
      </div>

      <style>{`
        @keyframes kaiDot {
          0%, 60%, 100% { opacity: 0.2; transform: scale(1); }
          30% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
