'use client';

import { useEffect, useRef, useState } from 'react';
import { renderMessage } from '@/lib/aria/markdown';
import AriaAvatar from '@/lib/aria/AriaAvatar';
import AnalysisPresentation from '../components/AnalysisPresentation';
import AdvisoryPresentation from '../components/AdvisoryPresentation';
import Sidebar from '../components/Sidebar';

const ACTIVE_ID_KEY = (tenant) => `ariaTenant_${tenant}_activeInvestigationId`;

function mapStoredMessages(messages) {
  return (messages ?? []).map((m) =>
    m.role === 'assistant'
      ? { role: 'assistant', content: m.content, presentation: m.presentation ?? null, advisory: m.advisory ?? null }
      : { role: 'user', content: m.content }
  );
}

function upsertInvestigation(list, meta) {
  const rest = list.filter((inv) => inv.id !== meta.id);
  return [meta, ...rest];
}

function buildWelcomeText(tenantName, profile) {
  const hasData =
    profile?.objectives?.shortTerm?.length ||
    profile?.pains?.length ||
    profile?.opportunities?.length;

  if (!hasData) {
    return `Hola. Acabo de revisar el perfil de ${tenantName}. Kai aún no ha tenido conversaciones con este cliente. Cuando lo haga, tendré más contexto para analizar. Por ahora puedo ayudarte con lo que ya sabemos.`;
  }

  const insight =
    profile?.objectives?.shortTerm?.[0] ||
    profile?.pains?.[0] ||
    profile?.opportunities?.[0];

  return `Hola. Estoy lista para analizar ${tenantName}. Basándome en lo que Kai ha construido, veo que ${insight}. ¿Por dónde quieres empezar?`;
}

function buildChips(tenantName, profile) {
  if (!profile) {
    return [
      { label: '¿Qué sabemos?', prompt: `¿Qué sabemos de ${tenantName}?` },
      { label: 'Oportunidades', prompt: `¿Qué oportunidades existen para ${tenantName}?` },
      { label: 'Principales riesgos', prompt: `¿Cuáles son los principales riesgos de ${tenantName}?` },
    ];
  }

  const chips = [];

  if (profile.pains?.length > 0) {
    chips.push({
      label: 'Analizar dolores',
      prompt: `Analiza los principales dolores de ${tenantName} y qué iniciativas podrían resolverlos: ${profile.pains.slice(0, 2).join('; ')}`,
    });
  }
  if (profile.opportunities?.length > 0) {
    chips.push({
      label: 'Ver oportunidades',
      prompt: `¿Cuáles son las oportunidades más relevantes para ${tenantName} y cómo priorizarlas?`,
    });
  }
  if (profile.risks?.length > 0) {
    chips.push({
      label: 'Revisar riesgos',
      prompt: `¿Cuáles son los mayores riesgos actuales para ${tenantName} y cómo mitigarlos?`,
    });
  }
  if (profile.kpis?.length > 0) {
    chips.push({
      label: 'KPIs clave',
      prompt: `Analiza los KPIs de ${tenantName} e identifica cuáles merecen atención prioritaria: ${profile.kpis.slice(0, 3).join(', ')}`,
    });
  }

  if (chips.length === 0) {
    return [
      { label: '¿Qué sabemos?', prompt: `¿Qué sabemos de ${tenantName}?` },
      { label: 'Oportunidades', prompt: `¿Qué oportunidades existen para ${tenantName}?` },
      { label: 'Principales riesgos', prompt: `¿Cuáles son los principales riesgos de ${tenantName}?` },
    ];
  }

  return chips.slice(0, 4);
}

export default function AriaClientTenant({ tenant, tenantMeta, profile }) {
  const tenantName = tenantMeta?.name ?? tenant;
  const industry = tenantMeta?.industry ?? '';
  const country = tenantMeta?.country ?? '';
  const subtitle = [industry, country].filter(Boolean).join(' · ');

  const welcomeText = buildWelcomeText(tenantName, profile);
  const chips = buildChips(tenantName, profile);

  const [investigationId, setInvestigationId] = useState(null);
  const [investigations, setInvestigations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    async function init() {
      const res = await fetch(`/api/aria/${tenant}/investigations`);
      const data = await res.json();
      const list = data.investigations ?? [];

      const storedId = localStorage.getItem(ACTIVE_ID_KEY(tenant));
      let activeId = list.find((inv) => inv.id === storedId)?.id;
      if (!activeId && list.length > 0) activeId = list[0].id;

      if (activeId) {
        setInvestigations(list);
        const detailRes = await fetch(`/api/aria/${tenant}/investigations/${activeId}`);
        const detail = await detailRes.json();
        setInvestigationId(activeId);
        setMessages(mapStoredMessages(detail.messages));
        localStorage.setItem(ACTIVE_ID_KEY(tenant), activeId);
      } else {
        const createRes = await fetch(`/api/aria/${tenant}/investigations`, { method: 'POST' });
        const created = await createRes.json();
        setInvestigations([created.meta]);
        setInvestigationId(created.id);
        setMessages([]);
        localStorage.setItem(ACTIVE_ID_KEY(tenant), created.id);
      }
    }
    init();
  }, [tenant]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleNewInvestigation() {
    const res = await fetch(`/api/aria/${tenant}/investigations`, { method: 'POST' });
    const created = await res.json();
    setInvestigations((prev) => [created.meta, ...prev]);
    setInvestigationId(created.id);
    setMessages([]);
    localStorage.setItem(ACTIVE_ID_KEY(tenant), created.id);
  }

  async function handleSelectInvestigation(id) {
    if (id === investigationId) return;
    const res = await fetch(`/api/aria/${tenant}/investigations/${id}`);
    const data = await res.json();
    setInvestigationId(id);
    setMessages(mapStoredMessages(data.messages));
    localStorage.setItem(ACTIVE_ID_KEY(tenant), id);
  }

  async function handleDeleteInvestigation(id) {
    await fetch(`/api/aria/${tenant}/investigations/${id}`, { method: 'DELETE' });
    const remaining = investigations.filter((inv) => inv.id !== id);
    setInvestigations(remaining);
    if (investigationId === id) {
      const next = remaining.find((inv) => inv.estado !== 'archivada');
      if (next) {
        handleSelectInvestigation(next.id);
      } else if (remaining.length > 0) {
        handleSelectInvestigation(remaining[0].id);
      } else {
        handleNewInvestigation();
      }
    }
  }

  async function handleArchiveInvestigation(id) {
    const res = await fetch(`/api/aria/${tenant}/investigations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'archivada' }),
    });
    const data = await res.json();
    if (data.meta) {
      setInvestigations((prev) => upsertInvestigation(prev, data.meta));
      if (investigationId === id) {
        const next = investigations.find((inv) => inv.id !== id && inv.estado !== 'archivada');
        if (next) {
          handleSelectInvestigation(next.id);
        } else {
          handleNewInvestigation();
        }
      }
    }
  }

  async function handleRestoreInvestigation(id) {
    const res = await fetch(`/api/aria/${tenant}/investigations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'abierta' }),
    });
    const data = await res.json();
    if (data.meta) {
      setInvestigations((prev) => upsertInvestigation(prev, data.meta));
    }
  }

  async function send(overrideText) {
    const text = (overrideText ?? input).trim();
    if (!text || loading || !investigationId) return;

    const nextMessages = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    if (overrideText === undefined) setInput('');
    setLoading(true);

    try {
      const res = await fetch(`/api/aria/${tenant}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages, investigationId }),
      });
      const data = await res.json();
      setMessages([
        ...nextMessages,
        {
          role: 'assistant',
          content: data.reply || 'Sin respuesta.',
          presentation: data.presentation ?? null,
          advisory: data.advisory ?? null,
          topics: data.topics ?? [],
        },
      ]);
      if (data.investigationMeta) {
        setInvestigations((prev) => upsertInvestigation(prev, data.investigationMeta));
      }
    } catch {
      setMessages([
        ...nextMessages,
        { role: 'assistant', content: 'Ocurrió un error de conexión. Intenta de nuevo.', presentation: null, advisory: null },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="aria-layout">
      <Sidebar
        investigations={investigations}
        activeId={investigationId}
        onSelect={handleSelectInvestigation}
        onNew={handleNewInvestigation}
        onArchive={handleArchiveInvestigation}
        onRestore={handleRestoreInvestigation}
        onDelete={handleDeleteInvestigation}
      />
      <div className="aria-page">
        <header className="aria-header">
          <div className="aria-header-brand">
            <AriaAvatar size={36} />
            <div>
              <p className="aria-header-title">
                <span className="aria-gradient-text">Aria</span>
                {tenantName && (
                  <span style={{ color: 'var(--aria-text-muted, #6B7280)', fontWeight: 400 }}>
                    {' · '}{tenantName}
                  </span>
                )}
                <span className="aria-status-dot" />
              </p>
              {subtitle && <p className="aria-header-subtitle">{subtitle}</p>}
            </div>
          </div>
        </header>

        <div className="aria-messages">
          {messages.length === 0 && (
            <div className="aria-empty-hero">
              <div className="aria-empty-hero-avatar">
                <AriaAvatar size={64} animate />
              </div>
              <p className="aria-empty-hero-title aria-gradient-text">Aria</p>
              <p className="aria-empty-hero-subtitle">{subtitle || `Analista estratégica · ${tenantName}`}</p>
              <p className="aria-empty-hero-text">{welcomeText}</p>

              {chips.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 20 }}>
                  {chips.map((chip, i) => (
                    <button
                      key={i}
                      onClick={() => send(chip.prompt)}
                      disabled={loading || !investigationId}
                      style={{
                        padding: '7px 14px',
                        background: 'transparent',
                        border: '1px solid var(--aria-border, #2D3748)',
                        borderRadius: 20,
                        color: 'var(--aria-text-muted, #9CA3AF)',
                        fontSize: 12.5,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        fontFamily: 'inherit',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--aria-accent, #7C3AED)';
                        e.currentTarget.style.color = 'var(--aria-text, #E5E7EB)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--aria-border, #2D3748)';
                        e.currentTarget.style.color = 'var(--aria-text-muted, #9CA3AF)';
                      }}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((m, i) => {
            const isLastAssistant = m.role === 'assistant' && i === messages.length - 1;
            const showTopics = isLastAssistant && !loading && !m.presentation && !m.advisory && m.topics?.length > 0;
            return m.role === 'assistant' ? (
              <div key={i} className="aria-msg aria-msg-assistant">
                <div className={`aria-msg-assistant-inner${m.presentation || m.advisory ? ' aria-msg-assistant-inner-wide' : ''}`}>
                  <div className="aria-msg-label">
                    <AriaAvatar size={20} />
                    <span>Aria</span>
                  </div>
                  {m.presentation ? (
                    <AnalysisPresentation presentation={m.presentation} onFollowUp={(text) => send(text)} disabled={loading} />
                  ) : m.advisory ? (
                    <AdvisoryPresentation advisory={m.advisory} onFollowUp={(text) => send(text)} disabled={loading} />
                  ) : (
                    <div className="aria-msg-content">{renderMessage(m.content)}</div>
                  )}
                  {showTopics && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                      {m.topics.map((chip, ci) => (
                        <button
                          key={ci}
                          onClick={() => send(chip.prompt)}
                          disabled={loading}
                          style={{
                            padding: '5px 12px',
                            background: 'transparent',
                            border: '1px solid var(--aria-border, #2D3748)',
                            borderRadius: 20,
                            color: 'var(--aria-text-muted, #9CA3AF)',
                            fontSize: 12,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            fontFamily: 'inherit',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--aria-accent, #7C3AED)';
                            e.currentTarget.style.color = 'var(--aria-text, #E5E7EB)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--aria-border, #2D3748)';
                            e.currentTarget.style.color = 'var(--aria-text-muted, #9CA3AF)';
                          }}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div key={i} className="aria-msg aria-msg-user">
                <div className="aria-msg-content">{renderMessage(m.content)}</div>
              </div>
            )
          })}

          {loading && (
            <div className="aria-msg aria-msg-assistant aria-loading">
              <div className="aria-msg-assistant-inner">
                <div className="aria-msg-label">
                  <AriaAvatar size={20} animate />
                  <span>Aria</span>
                </div>
                <div className="aria-msg-content">Analizando…</div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="aria-input-bar">
          <textarea
            className="aria-input"
            rows={1}
            placeholder={`Pregunta sobre ${tenantName}…`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="aria-send-btn" onClick={() => send()} disabled={loading || !input.trim()}>
            →
          </button>
        </div>
        <p className="aria-disclaimer">Aria puede cometer errores. Verifica siempre la información crítica.</p>
      </div>
    </div>
  );
}
