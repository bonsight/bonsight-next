'use client';

import { useEffect, useRef, useState } from 'react';
import { renderMessage } from '@/lib/aria/markdown';
import AriaAvatar from '@/lib/aria/AriaAvatar';
import AnalysisPresentation from '../components/AnalysisPresentation';
import AdvisoryPresentation from '../components/AdvisoryPresentation';
import WorkshopCanvasPresentation from '../components/WorkshopCanvasPresentation';
import Sidebar from '../components/Sidebar';
import IntelligencePanel from '../components/IntelligencePanel';
import ChatInsightSeparator from '../components/ChatInsightSeparator';
import ArchiveContextCard from '../components/ArchiveContextCard';
import AriaDocumentCard from './AriaDocumentCard';

const ACTIVE_ID_KEY = (tenant) => `ariaTenant_${tenant}_activeInvestigationId`;

const TOOL_SOURCE_MAP = {
  query_ga4: ['ga4'],
  query_search_console: ['search_console'],
  query_google_ads: ['google_ads'],
};

function toolsToSourceIds(toolsUsed = [], sources = []) {
  const ids = new Set();
  for (const tool of toolsUsed) {
    const mapped = TOOL_SOURCE_MAP[tool];
    if (mapped) mapped.forEach((id) => ids.add(id));
    if (tool.startsWith('query_database:')) {
      const dbId = tool.slice('query_database:'.length);
      ids.add(dbId);
    }
  }
  return ids;
}

const TOOL_LABEL_MAP = {
  query_ga4:             'Google Analytics',
  query_search_console:  'Search Console',
  query_google_ads:      'Google Ads',
  search_notion:         'Notion',
  query_notion_database: 'Notion',
};

function toolsToSourceNames(toolsUsed = [], sources = []) {
  const names = ['Kai'];
  const seen  = new Set();
  for (const tool of toolsUsed) {
    let name = null;
    if (tool.startsWith('query_database:')) {
      const dbId = tool.slice('query_database:'.length);
      const src  = sources.find((s) => s.id === dbId);
      name = src?.name ?? null;
    } else {
      name = TOOL_LABEL_MAP[tool] ?? null;
    }
    if (name && !seen.has(name)) { seen.add(name); names.push(name); }
  }
  return names;
}

function SourcesFooter({ toolsUsed, sources }) {
  if (!toolsUsed?.length) return null;
  const names = toolsToSourceNames(toolsUsed, sources);
  return (
    <div className="aria-msg-sources-footer">
      <span className="aria-msg-sources-label">Fuentes:</span>
      {names.map((name) => (
        <span key={name} className="aria-msg-source-chip">{name}</span>
      ))}
    </div>
  );
}

const ANALYZING_PHASES = ['Consultando fuentes…', 'Procesando datos…', 'Elaborando respuesta…'];

function AnalyzingIndicator() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPhase((p) => (p + 1) % ANALYZING_PHASES.length), 2200);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="aria-analyzing">
      <div className="aria-analyzing-dots">
        <span /><span /><span />
      </div>
      <span key={phase} className="aria-analyzing-phase">{ANALYZING_PHASES[phase]}</span>
    </div>
  );
}

function mapStoredMessages(messages) {
  return (messages ?? []).map((m) =>
    m.role === 'assistant'
      ? { role: 'assistant', content: m.content, presentation: m.presentation ?? null, advisory: m.advisory ?? null, canvas: m.canvas ?? null }
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

function mapCategory(category) {
  if (!category) return 'hallazgo';
  const c = category.toLowerCase();
  if (c.includes('riesgo') || c.includes('risk')) return 'riesgo';
  if (c.includes('recomend') || c.includes('accion') || c.includes('acción')) return 'recomendacion';
  if (c.includes('oportunidad') || c.includes('opportunity')) return 'oportunidad';
  return 'hallazgo';
}

function extractIntelligence(presentation, advisory) {
  const items = [];
  let main = null;

  if (presentation) {
    if (presentation.headline?.title) main = presentation.headline.title;

    for (const insight of presentation.insights ?? []) {
      items.push({
        id: `intel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: mapCategory(insight.category),
        text: insight.text,
        priority: 'media',
        isNew: true,
      });
    }

    for (const action of presentation.actionItems ?? []) {
      items.push({
        id: `intel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'recomendacion',
        text: action.text,
        priority: action.priority || 'media',
        isNew: true,
      });
    }
  }

  if (advisory) {
    if (!main && advisory.risk?.title) main = advisory.risk.title;

    if (advisory.risk?.description) {
      items.push({
        id: `intel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'riesgo',
        text: advisory.risk.description,
        priority: advisory.risk.status === 'crítico' ? 'alta' : 'media',
        isNew: true,
      });
    }

    for (const dec of advisory.decisions ?? []) {
      const text = typeof dec === 'string' ? dec : (dec.text || dec.description || JSON.stringify(dec));
      items.push({
        id: `intel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'recomendacion',
        text,
        priority: dec.priority || 'media',
        isNew: true,
      });
    }
  }

  return { items, main };
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
  const [intelligenceItems, setIntelligenceItems] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelFilter, setPanelFilter] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mainInsight, setMainInsight] = useState(null);
  const [sources, setSources] = useState([]);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [activeSources, setActiveSources] = useState(new Set());
  const [copiedIdx, setCopiedIdx] = useState(null);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const waveformRef = useRef(null);
  const animFrameRef = useRef(null);
  const analyserRef = useRef(null);
  const audioCtxRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const html = document.documentElement;
    function updateBottomOffset() {
      const vv = window.visualViewport;
      if (!vv) return;
      const offset = Math.max(0, window.innerHeight - vv.offsetTop - vv.height);
      html.style.setProperty('--aria-bottom-offset', `${offset}px`);
    }
    updateBottomOffset();
    window.visualViewport?.addEventListener('resize', updateBottomOffset);
    window.visualViewport?.addEventListener('scroll', updateBottomOffset);
    return () => {
      window.visualViewport?.removeEventListener('resize', updateBottomOffset);
      window.visualViewport?.removeEventListener('scroll', updateBottomOffset);
    };
  }, []);

  useEffect(() => {
    async function init() {
      const [invRes, srcRes, dbRes] = await Promise.all([
        fetch(`/api/aria/${tenant}/investigations`),
        fetch(`/api/kai/${tenant}/intelligence-sources`).catch(() => null),
        fetch(`/api/aria/${tenant}/databases`).catch(() => null),
      ]);
      const data = await invRes.json();
      const combined = [];
      if (srcRes?.ok) {
        const srcData = await srcRes.json().catch(() => ({}));
        const srcList = Array.isArray(srcData.sources) ? srcData.sources : [];
        srcList
          .filter((s) => s.status === 'active' && !s.alwaysActive)
          .forEach((s) => combined.push({ id: s.id, name: s.label, active: true, isDb: false }));
      }
      if (dbRes?.ok) {
        const dbData = await dbRes.json().catch(() => ({}));
        (dbData.sources ?? [])
          .filter((s) => s.status === 'active')
          .forEach((s) => combined.push({ id: s.id, name: s.label, active: true, isDb: true, type: s.type }));
      }
      if (combined.length > 0) setSources(combined);
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

  async function compressImage(file) {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const MAX = 1280;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
      };
      img.src = url;
    });
  }

  async function readAsBase64(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result.split(',')[1]);
      reader.readAsDataURL(file);
    });
  }

  async function processFile(file) {
    if (!file) return;
    const maxMb = file.type.startsWith('image/') ? 4 : 10;
    if (file.size > maxMb * 1024 * 1024) { alert(`Archivo demasiado grande (máx ${maxMb} MB).`); return; }
    const id = Math.random().toString(36).slice(2);
    if (file.type.startsWith('image/')) {
      const data = await compressImage(file);
      const previewUrl = `data:image/jpeg;base64,${data}`;
      setAttachments((prev) => [...prev, { id, name: file.name || 'imagen.jpg', mimeType: 'image/jpeg', data, previewUrl }]);
    } else if (file.type === 'application/pdf') {
      const data = await readAsBase64(file);
      setAttachments((prev) => [...prev, { id, name: file.name, mimeType: 'application/pdf', data, previewUrl: null }]);
    } else if ([
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ].includes(file.type)) {
      const data = await readAsBase64(file);
      setAttachments((prev) => [...prev, { id, name: file.name, mimeType: file.type, data, previewUrl: null }]);
    }
  }

  function handlePaste(e) {
    const items = Array.from(e.clipboardData?.items ?? []);
    const imageItems = items.filter((it) => it.type.startsWith('image/'));
    if (imageItems.length > 0) {
      e.preventDefault();
      imageItems.forEach((it) => processFile(it.getAsFile()));
    }
  }

  function handleCopyMessage(idx, text) {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx((cur) => (cur === idx ? null : cur)), 1800);
  }

  async function send(overrideText) {
    const text = (overrideText ?? input).trim();
    const currentAttachments = overrideText === undefined ? attachments : [];
    if (!text && !currentAttachments.length || loading || !investigationId) return;

    const displayContent = text || `(${currentAttachments.length} archivo${currentAttachments.length !== 1 ? 's' : ''} adjunto${currentAttachments.length !== 1 ? 's' : ''})`;
    const displayMsg = {
      role: 'user',
      content: displayContent,
      _attachments: currentAttachments.length > 0
        ? currentAttachments.map(({ id, name, mimeType, previewUrl }) => ({ id, name, mimeType, previewUrl }))
        : undefined,
    };
    const apiMsg = { role: 'user', content: displayContent };
    const apiHistory = messages.map(({ role, content }) => ({ role, content: content || '…' }));

    const nextMessages = [...messages, displayMsg];
    setMessages(nextMessages);
    if (overrideText === undefined) { setInput(''); setAttachments([]); }
    setActiveSources(new Set());
    setLoading(true);

    try {
      const res = await fetch(`/api/aria/${tenant}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...apiHistory, apiMsg],
          investigationId,
          attachments: currentAttachments.map(({ mimeType, data, name }) => ({ mimeType, data, name })),
        }),
      });
      const data = await res.json();
      setMessages([
        ...nextMessages,
        {
          role: 'assistant',
          content: data.reply || 'Sin respuesta.',
          presentation: data.presentation ?? null,
          advisory: data.advisory ?? null,
          canvas: data.canvas ?? null,
          topics: data.topics ?? [],
          archiveMatch: data.archiveMatch ?? null,
          intelligence: data.intelligence ?? [],
          documents: data.documents ?? [],
          toolsUsed: data.toolsUsed ?? [],
        },
      ]);
      if (data.investigationMeta) {
        setInvestigations((prev) => upsertInvestigation(prev, data.investigationMeta));
      }
      if (data.toolsUsed?.length) {
        setActiveSources(toolsToSourceIds(data.toolsUsed, sources));
      }
      const newItems = [];

      if (data.presentation || data.advisory) {
        const { items, main } = extractIntelligence(data.presentation, data.advisory);
        newItems.push(...items);
        if (main) setMainInsight(main);
      }

      if (Array.isArray(data.intelligence) && data.intelligence.length > 0) {
        for (const item of data.intelligence) {
          if (item.type === 'insight_principal') {
            setMainInsight(item.text);
          } else {
            newItems.push({
              id: `intel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              type: item.type,
              text: item.text,
              priority: item.priority || 'media',
              isNew: true,
            });
          }
        }
      }

      if (newItems.length > 0) {
        setIntelligenceItems((prev) => [...newItems, ...prev]);
        setPanelOpen(true);
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

  function drawWaveform() {
    const canvas = waveformRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext('2d');
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const barCount = Math.min(data.length, 20);
    const barW = (canvas.width - (barCount - 1) * 2) / barCount;
    for (let i = 0; i < barCount; i++) {
      const value = data[i * Math.floor(data.length / barCount)] / 255;
      const barH = Math.max(3, value * canvas.height * 0.85);
      const y = (canvas.height - barH) / 2;
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.roundRect(i * (barW + 2), y, barW, barH, 2);
      ctx.fill();
    }
    animFrameRef.current = requestAnimationFrame(drawWaveform);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      audioCtx.createMediaStreamSource(stream).connect(analyser);
      analyserRef.current = analyser;

      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
        .find((t) => MediaRecorder.isTypeSupported(t)) || '';
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      const startedAt = Date.now();

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        cancelAnimationFrame(animFrameRef.current);
        audioCtxRef.current?.close();
        stream.getTracks().forEach((t) => t.stop());
        if (Date.now() - startedAt < 1500) return;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || 'audio/webm' });
        setTranscribing(true);
        try {
          const form = new FormData();
          form.append('audio', blob);
          const res = await fetch(`/api/aria/${tenant}/transcribe`, { method: 'POST', body: form });
          const data = await res.json();
          if (data.text) {
            setTranscribing(false);
            send(data.text);
            return;
          }
        } catch { /* silently ignore */ }
        setTranscribing(false);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      requestAnimationFrame(drawWaveform);
    } catch { /* mic permission denied */ }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  }

  function dismissArchiveCard(msgIndex) {
    setMessages((prev) =>
      prev.map((m, i) => (i === msgIndex ? { ...m, archiveMatch: null } : m))
    );
  }

  async function handleAcceptArchiveContext(match, msgIndex) {
    dismissArchiveCard(msgIndex);
    let contextBlock = `[Contexto recuperado de investigación archivada]\n\nInvestigación: "${match.title}" (${match.date})\nÁrea: ${match.area}`;
    if (match.summary) contextBlock += `\nResumen: ${match.summary}`;
    if (match.insights?.length) contextBlock += `\nInsights clave: ${match.insights.slice(0, 3).join('; ')}`;
    if (match.decisions?.length) contextBlock += `\nDecisiones tomadas: ${match.decisions.slice(0, 3).join('; ')}`;
    contextBlock += `\n\nIncorpora este contexto y continúa el análisis.`;

    await send(contextBlock);
  }

  const counters = {
    hallazgos: intelligenceItems.filter((i) => i.type === 'hallazgo').length,
    riesgos: intelligenceItems.filter((i) => i.type === 'riesgo').length,
    recomendaciones: intelligenceItems.filter((i) => i.type === 'recomendacion').length,
    oportunidades: intelligenceItems.filter((i) => i.type === 'oportunidad').length,
  };

  return (
    <div className={`aria-layout${panelOpen ? ' aria-layout--panel' : ''}`}>
      <div
        className={`aria-mobile-backdrop${(mobileSidebarOpen || panelOpen) ? ' aria-mobile-backdrop--visible' : ''}`}
        onClick={() => {
          setMobileSidebarOpen(false);
          if (panelOpen) { setPanelOpen(false); setPanelFilter(null); }
        }}
      />
      <Sidebar
        investigations={investigations}
        activeId={investigationId}
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        onSelect={(id) => { handleSelectInvestigation(id); setMobileSidebarOpen(false); }}
        onNew={() => { handleNewInvestigation(); setMobileSidebarOpen(false); }}
        onArchive={handleArchiveInvestigation}
        onRestore={handleRestoreInvestigation}
        onDelete={handleDeleteInvestigation}
        counters={counters}
        sources={sources}
        loading={loading}
        activeSources={activeSources}
        onIntelFilter={(type) => { setPanelFilter(type); setPanelOpen(true); setMobileSidebarOpen(false); }}
      />
      <div className="aria-page">
        <header className="aria-header">
          <div className="aria-header-brand">
            <button
              className="aria-header-menu-btn"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Abrir menú"
            >
              ☰
            </button>
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
            const showTopics = isLastAssistant && !loading && !m.presentation && !m.advisory && !m.canvas && m.topics?.length > 0;
            const hasIntelligence = m.role === 'assistant' && (m.presentation || m.advisory || m.intelligence?.length > 0);
            const dominantIntelType = m.intelligence?.find((i) => i.type !== 'insight_principal')?.type ?? 'analisis';
            const sepType = m.advisory?.risk ? 'riesgo' : m.presentation ? 'analisis' : dominantIntelType;
            return m.role === 'assistant' ? [
              hasIntelligence ? <ChatInsightSeparator key={`sep-${i}`} type={sepType} /> : null,
              <div key={i} className="aria-msg aria-msg-assistant">
                {m.archiveMatch && (
                  <ArchiveContextCard
                    match={m.archiveMatch}
                    loading={loading}
                    onAccept={(match) => handleAcceptArchiveContext(match, i)}
                    onIgnore={() => dismissArchiveCard(i)}
                  />
                )}
                <div className={`aria-msg-assistant-inner${m.presentation || m.advisory || m.canvas ? ' aria-msg-assistant-inner-wide' : ''}`}>
                  <div className="aria-msg-label">
                    <AriaAvatar size={20} />
                    <span>Aria</span>
                  </div>
                  {m.presentation ? (
                    <AnalysisPresentation presentation={m.presentation} onFollowUp={(text) => send(text)} disabled={loading} />
                  ) : m.advisory ? (
                    <AdvisoryPresentation advisory={m.advisory} onFollowUp={(text) => send(text)} disabled={loading} />
                  ) : m.canvas ? (
                    <WorkshopCanvasPresentation
                      canvas={m.canvas}
                      tenant={tenant}
                      investigationId={investigationId}
                      messageIndex={i}
                      onCanvasUpdate={(updated) => {
                        setMessages((prev) => prev.map((msg, mi) => (mi === i ? { ...msg, canvas: updated } : msg)));
                      }}
                    />
                  ) : (
                    <>
                      <div className="aria-msg-content">{renderMessage(m.content)}</div>
                      {m.content?.trim() && (
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(i, m.content)}
                          title="Copiar mensaje"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            marginTop: 6, padding: '3px 7px',
                            background: 'transparent', border: 'none',
                            borderRadius: 6, cursor: 'pointer',
                            color: copiedIdx === i ? 'var(--aria-accent, #7C3AED)' : 'var(--aria-text-muted, #9CA3AF)',
                            fontSize: 11, fontFamily: 'inherit',
                          }}
                        >
                          {copiedIdx === i ? '✓ Copiado' : 'Copiar'}
                        </button>
                      )}
                    </>
                  )}
                  {m.documents?.map((doc, di) => (
                    <AriaDocumentCard key={di} doc={doc} tenant={tenant} />
                  ))}
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
                  <SourcesFooter toolsUsed={m.toolsUsed} sources={sources} />
                </div>
              </div>,
            ] : (
              <div key={i} className="aria-msg aria-msg-user">
                {m._attachments?.length > 0 && (
                  <div className="aria-msg-attachments">
                    {m._attachments.map((att) =>
                      att.previewUrl
                        ? <img key={att.id} src={att.previewUrl} className="aria-msg-thumb" alt={att.name} />
                        : <div key={att.id} className="aria-msg-file-chip"><span>📄</span>{att.name}</div>
                    )}
                  </div>
                )}
                {m.content && !/^\(.*adjunto/.test(m.content) && (
                  <div className="aria-msg-content">{renderMessage(m.content)}</div>
                )}
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
                <AnalyzingIndicator />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {attachments.length > 0 && (
          <div className="aria-attach-strip">
            {attachments.map((att) => (
              <div key={att.id} className="aria-attach-chip">
                {att.previewUrl
                  ? <img src={att.previewUrl} className="aria-attach-thumb" alt={att.name} />
                  : <div className="aria-attach-icon">📄</div>
                }
                <span className="aria-attach-name">{att.name}</span>
                <button className="aria-attach-remove" onClick={() => setAttachments((p) => p.filter((a) => a.id !== att.id))}>✕</button>
              </div>
            ))}
          </div>
        )}

        <div className={`aria-input-bar${recording ? ' aria-input-bar--recording' : ''}`}>
          {!recording && !transcribing && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.pptx,.ppt,.docx,.doc,.xlsx,.xls,.csv"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => { Array.from(e.target.files).forEach(processFile); e.target.value = ''; }}
              />
              <button
                className="aria-clip-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                title="Adjuntar imagen o PDF"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
              </button>
            </>
          )}
          {recording ? (
            <canvas ref={waveformRef} className="aria-input-waveform" width={200} height={32} />
          ) : transcribing ? (
            <span className="aria-input-transcribing">Transcribiendo…</span>
          ) : (
            <textarea
              className="aria-input"
              rows={1}
              placeholder={`Pregunta sobre ${tenantName}…`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
            />
          )}

          {recording ? (
            <button className="aria-send-btn aria-send-btn--stop" onClick={stopRecording}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
            </button>
          ) : (input.trim() || attachments.length > 0) ? (
            <button className="aria-send-btn" onClick={() => send()} disabled={loading}>
              →
            </button>
          ) : (
            <button
              className="aria-mic-btn"
              onClick={startRecording}
              disabled={loading || transcribing}
              title="Grabar voz"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>
          )}
        </div>
        <p className="aria-disclaimer">Aria puede cometer errores. Verifica siempre la información crítica.</p>
      </div>
      {panelOpen && (
        <IntelligencePanel
          items={intelligenceItems}
          mainInsight={mainInsight}
          counters={counters}
          filter={panelFilter}
          onClearFilter={() => setPanelFilter(null)}
          onClose={() => { setPanelOpen(false); setPanelFilter(null); }}
        />
      )}
    </div>
  );
}
