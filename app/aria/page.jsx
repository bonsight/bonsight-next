'use client';

import { useEffect, useRef, useState } from 'react';
import { renderMessage } from '@/lib/aria/markdown';
import AriaAvatar from '@/lib/aria/AriaAvatar';
import AnalysisPresentation from './components/AnalysisPresentation';
import AdvisoryPresentation from './components/AdvisoryPresentation';
import Sidebar from './components/Sidebar';

const ACTIVE_ID_KEY = 'ariaActiveInvestigationId';

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

export default function AriaPage() {
  const [investigationId, setInvestigationId] = useState(null);
  const [investigations, setInvestigations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    async function init() {
      const res = await fetch('/api/aria/investigations');
      const data = await res.json();
      const list = data.investigations ?? [];

      const storedId = localStorage.getItem(ACTIVE_ID_KEY);
      let activeId = list.find((inv) => inv.id === storedId)?.id;
      if (!activeId && list.length > 0) activeId = list[0].id;

      if (activeId) {
        setInvestigations(list);
        const detailRes = await fetch(`/api/aria/investigations/${activeId}`);
        const detail = await detailRes.json();
        setInvestigationId(activeId);
        setMessages(mapStoredMessages(detail.messages));
        localStorage.setItem(ACTIVE_ID_KEY, activeId);
      } else {
        const createRes = await fetch('/api/aria/investigations', { method: 'POST' });
        const created = await createRes.json();
        setInvestigations([created.meta]);
        setInvestigationId(created.id);
        setMessages([]);
        localStorage.setItem(ACTIVE_ID_KEY, created.id);
      }
    }
    init();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleNewInvestigation() {
    const res = await fetch('/api/aria/investigations', { method: 'POST' });
    const created = await res.json();
    setInvestigations((prev) => [created.meta, ...prev]);
    setInvestigationId(created.id);
    setMessages([]);
    localStorage.setItem(ACTIVE_ID_KEY, created.id);
  }

  async function handleSelectInvestigation(id) {
    if (id === investigationId) return;
    const res = await fetch(`/api/aria/investigations/${id}`);
    const data = await res.json();
    setInvestigationId(id);
    setMessages(mapStoredMessages(data.messages));
    localStorage.setItem(ACTIVE_ID_KEY, id);
  }

  async function handleDeleteInvestigation(id) {
    await fetch(`/api/aria/investigations/${id}`, { method: 'DELETE' });
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
    const res = await fetch(`/api/aria/investigations/${id}`, {
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
    const res = await fetch(`/api/aria/investigations/${id}`, {
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
      const res = await fetch('/api/aria', {
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
                <span className="aria-status-dot" />
              </p>
              <p className="aria-header-subtitle">Analista digital de Bonsight</p>
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
              <p className="aria-empty-hero-subtitle">Analista digital de Bonsight</p>
              <p className="aria-empty-hero-text">
                Pregúntale a Aria sobre tráfico, conversiones, canales, países o cualquier dato de GA4.
              </p>
            </div>
          )}
          {messages.map((m, i) =>
            m.role === 'assistant' ? (
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
                </div>
              </div>
            ) : (
              <div key={i} className="aria-msg aria-msg-user">
                <div className="aria-msg-content">{renderMessage(m.content)}</div>
              </div>
            )
          )}
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
            placeholder="Escribe tu pregunta…"
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
