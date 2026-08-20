'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const NAV = {
  Registrador: [
    { id: 'resumen', label: 'Resumen', ic: '◈' },
    { id: 'aportar', label: 'Aportar', ic: '✎' },
    { id: 'pruebas', label: 'Pruebas', ic: '⬢' },
    { id: 'historia', label: 'Historia', ic: '~' },
    { id: 'feedback', label: 'Feedback recibido', ic: '◔' },
  ],
  Supervisor: [
    { id: 'resumen', label: 'Resumen', ic: '◈' },
    { id: 'aportar', label: 'Aportar', ic: '✎' },
    { id: 'pruebas', label: 'Pruebas', ic: '⬢' },
    { id: 'historia', label: 'Historia', ic: '~' },
    { id: 'feedback', label: 'Feedback recibido', ic: '◔' },
    { id: 'reportes', label: 'Reportes', ic: '▤' },
  ],
  Director: [
    { id: 'resumen', label: 'Resumen', ic: '◈' },
    { id: 'pruebas', label: 'Pruebas', ic: '⬢' },
    { id: 'historia', label: 'Historia', ic: '~' },
    { id: 'feedback', label: 'Feedback', ic: '◔' },
    { id: 'reportes', label: 'Reportes', ic: '▤' },
  ],
};

const FIELD_TYPES = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
];

function tagClass(tag) {
  if (tag === 'éxito') return 'tag-living';
  if (tag === 'parcial') return 'tag-ember';
  if (tag === 'fallo') return 'tag-alert';
  return 'tag-neutral';
}

function initials(name) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function LabsClientTenant({ tenant, tenantMeta, identity }) {
  const [experiments, setExperiments] = useState(null);
  const [experimentId, setExperimentId] = useState(null);
  const [experiment, setExperiment] = useState(null);
  const [view, setView] = useState('resumen');

  const loadExperiments = useCallback(() => {
    fetch(`/api/labs/${tenant}/experiments`)
      .then((r) => r.json())
      .then((d) => setExperiments(d.experiments ?? []))
      .catch(() => setExperiments([]));
  }, [tenant]);

  useEffect(() => { loadExperiments(); }, [loadExperiments]);

  const loadExperiment = useCallback((id) => {
    fetch(`/api/labs/${tenant}/experiments/${id}`)
      .then((r) => r.json())
      .then((d) => { if (!d.error) setExperiment(d); })
      .catch(() => {});
  }, [tenant]);

  useEffect(() => {
    if (experimentId) loadExperiment(experimentId);
  }, [experimentId, loadExperiment]);

  if (experiments === null) {
    return <div className="labs-entry-wrap"><p style={{ color: 'var(--labs-cream-dim)' }}>Cargando…</p></div>;
  }

  if (!experimentId || !experiment) {
    return (
      <ExperimentPicker
        tenant={tenant}
        tenantMeta={tenantMeta}
        identity={identity}
        experiments={experiments}
        onSelect={setExperimentId}
        onCreated={(id) => { loadExperiments(); setExperimentId(id); }}
      />
    );
  }

  const nav = NAV[identity.role];
  const refresh = () => loadExperiment(experimentId);

  return (
    <div id="app">
      <header className="topbar">
        <div className="brand">
          <div className="pulse-wrap"><div className="pulse-dot"></div></div>
          <div className="brand-text">
            <span className="brand-eyebrow">{tenantMeta.name}</span>
            <span className="brand-name">{experiment.meta.name} <span className="living-word">· vivo</span></span>
          </div>
        </div>
        <div className="role-switch" role="tablist" aria-label="Tu identidad">
          <span className="role-btn active"><span className="dot"></span>{identity.name} · {identity.role}</span>
        </div>
        <div className="topbar-actions">
          <button className="btn-ghost-top" onClick={() => { setExperimentId(null); setExperiment(null); }}>Otros experimentos</button>
        </div>
      </header>

      <nav className="mobile-tabs">
        {nav.map((item) => (
          <button key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`} onClick={() => setView(item.id)}>
            <span className="ic">{item.ic}</span>{item.label}
          </button>
        ))}
      </nav>

      <div className="shell">
        <nav className="sidenav" aria-label="Secciones del experimento">
          <div className="nav-label">{experiment.meta.name}</div>
          {nav.map((item) => (
            <button key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`} onClick={() => setView(item.id)}>
              <span className="ic">{item.ic}</span>{item.label}
            </button>
          ))}
        </nav>
        <main>
          {view === 'resumen' && (
            <ViewResumen tenant={tenant} experiment={experiment} identity={identity} onGo={setView} />
          )}
          {view === 'aportar' && (
            <ViewAportar tenant={tenant} experiment={experiment} identity={identity} onDone={refresh} />
          )}
          {view === 'pruebas' && (
            <ViewPruebas tenant={tenant} experiment={experiment} identity={identity} onUpdate={refresh} />
          )}
          {view === 'historia' && <ViewHistoria experiment={experiment} />}
          {view === 'feedback' && (
            <ViewFeedback tenant={tenant} experiment={experiment} identity={identity} onUpdate={refresh} />
          )}
          {view === 'reportes' && (
            <ViewReportes tenant={tenant} experiment={experiment} onUpdate={refresh} />
          )}
        </main>
      </div>
    </div>
  );
}

/* ======================= Experiment picker + create ======================= */

function ExperimentPicker({ tenant, tenantMeta, identity, experiments, onSelect, onCreated }) {
  const [open, setOpen] = useState(false);
  const canCreate = identity.role !== 'Registrador';

  return (
    <div className="labs-admin-wrap">
      <h1 className="labs-admin-title">{tenantMeta.name} <span className="living-word" style={{ color: 'var(--labs-living)', fontStyle: 'italic', fontWeight: 500 }}>· vivo</span></h1>
      <p style={{ fontSize: 13.5, color: 'var(--labs-cream-dim)', marginBottom: 24 }}>
        Hola {identity.name} — elegí un experimento{canCreate ? ' o creá uno nuevo' : ''}.
      </p>

      {canCreate && (
        <button className="btn btn-primary" style={{ marginBottom: 20 }} onClick={() => setOpen(true)}>+ Crear experimento</button>
      )}

      {experiments.length === 0 && <p className="empty-note">Todavía no hay ningún experimento en este espacio.</p>}
      {experiments.map((e) => (
        <div className="labs-tenant-row" key={e.id} style={{ cursor: 'pointer' }} onClick={() => onSelect(e.id)}>
          <div>
            <div className="labs-tenant-name">{e.name}</div>
            <div className="labs-tenant-meta">{e.status} · actualizado {formatDate(e.updatedAt)}</div>
          </div>
          <span className="chip-btn">Entrar →</span>
        </div>
      ))}

      {open && <CreateExperimentModal tenant={tenant} onClose={() => setOpen(false)} onCreated={(id) => { setOpen(false); onCreated(id); }} />}
    </div>
  );
}

function CreateExperimentModal({ tenant, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [hypothesis, setHypothesis] = useState('');
  const [criteriaText, setCriteriaText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const successCriteria = criteriaText.split('\n').map((l) => l.trim()).filter(Boolean);
      const res = await fetch(`/api/labs/${tenant}/experiments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, purpose, hypothesis, successCriteria }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'No se pudo crear.'); return; }
      onCreated(data.meta.id);
    } catch {
      setErr('Error de conexión.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ position: 'relative' }}>
        <button className="modal-x" style={{ position: 'absolute', top: 18, right: 18 }} onClick={onClose}>✕</button>
        <span className="eyebrow-mini on-dark">Crear experimento</span>
        <h2 style={{ fontFamily: 'var(--labs-serif)', fontSize: 22, fontWeight: 600, margin: '6px 0 16px' }}>Nuevo experimento</h2>
        <form onSubmit={handleCreate}>
          <label className="field-label">Nombre</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ marginBottom: 14 }} required />
          <label className="field-label">¿Qué queremos conseguir o descubrir?</label>
          <textarea rows={3} value={purpose} onChange={(e) => setPurpose(e.target.value)} style={{ marginBottom: 14 }} />
          <label className="field-label">Hipótesis a validar o refutar</label>
          <textarea rows={2} value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} style={{ marginBottom: 14 }} />
          <label className="field-label">Criterios de éxito (uno por línea)</label>
          <textarea rows={3} value={criteriaText} onChange={(e) => setCriteriaText(e.target.value)} placeholder={'Resistencia ≥ 45 kgf\nTiempo de secado ≤ 10 horas'} />
          {err && <p className="labs-login-error" style={{ marginTop: 10 }}>{err}</p>}
          <div className="modal-footer">
            <button type="button" className="btn btn-quiet" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Creando…' : 'Crear experimento →'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ======================= Resumen ======================= */

function ViewResumen({ tenant, experiment, identity, onGo }) {
  if (identity.role === 'Director') return <ViewResumenDirector tenant={tenant} experiment={experiment} onGo={onGo} />;
  if (identity.role === 'Supervisor') return <ViewResumenSupervisor tenant={tenant} experiment={experiment} />;
  return <ViewResumenRegistrador experiment={experiment} identity={identity} onGo={onGo} />;
}

function ViewResumenRegistrador({ experiment, identity, onGo }) {
  const recent = [...experiment.events].slice(0, 4);
  return (
    <div className="view">
      <div className="hero-prompt">
        <span className="eyebrow-mini on-dark">Hoy · {experiment.meta.name}</span>
        <h2>¿Qué hiciste hoy en {experiment.meta.name}?</h2>
        <button className="btn btn-primary" onClick={() => onGo('aportar')}>Aportar al experimento →</button>
        <div className="hero-meta-row">
          <div className="hero-meta-item">⬢ <b>{experiment.tests.length}</b> pruebas activas</div>
          <div className="hero-meta-item">✎ <b>{experiment.executions.length}</b> aportes en total</div>
          <div className="hero-meta-item">◔ <b>{experiment.feedback.length}</b> feedback recibido</div>
        </div>
      </div>
      <div className="divider-label"><span>Últimos eventos</span></div>
      {recent.length === 0 && <p className="empty-note">Todavía no hay actividad — sé el primero en aportar.</p>}
      <div className="recent-list">
        {recent.map((ev) => (
          <div className="recent-item" key={ev.id}>
            <div className="recent-avatar">{initials(ev.actor)}</div>
            <div className="recent-body">
              <div className="recent-top"><span className="recent-name">{ev.title}</span><span className="recent-time">{formatDateTime(ev.date)}</span></div>
              <div className="recent-text">{ev.body}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ViewResumenSupervisor({ tenant, experiment }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    setLoading(true);
    setErr(null);
    fetch(`/api/labs/${tenant}/experiments/${experiment.meta.id}/summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'Supervisor' }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.error) setErr(d.error); else setSummary(d.summary); })
      .catch(() => setErr('Error de conexión.'))
      .finally(() => setLoading(false));
  }, [tenant, experiment.meta.id, experiment.meta.updatedAt]);

  return (
    <div className="view">
      <div className="view-header">
        <span className="view-eyebrow">Resumen · {experiment.meta.name}</span>
        <h1 className="view-title">Desde tu última revisión</h1>
        <p className="view-sub">Primero la síntesis, el detalle está en Pruebas e Historia.</p>
      </div>

      <div className="synth-banner">
        <div className="section-title" style={{ color: 'var(--labs-cream)' }}>Qué cambió</div>
        {loading && <p className="empty-note">Analizando el estado del experimento…</p>}
        {err && <p className="labs-login-error">{err}</p>}
        {summary && <div style={{ fontSize: 13.5, color: 'var(--labs-cream-dim)', lineHeight: 1.6 }}>{summary.whatChanged}</div>}
        <div className="synth-stats">
          <div className="synth-stat"><b>{experiment.executions.length}</b><span>aportes totales</span></div>
          <div className="synth-stat"><b>{experiment.tests.length}</b><span>pruebas</span></div>
          <div className="synth-stat"><b>{experiment.executions.filter((e) => !e.validatedBy).length}</b><span>sin validar</span></div>
        </div>
      </div>

      {summary?.priorities?.length > 0 && (
        <>
          <div className="divider-label"><span>Necesita tu atención</span></div>
          {summary.priorities.map((p, i) => (
            <div className="priority-row" key={i}>
              <span className="pr-ic">{p.icon || '⚠'}</span>
              <div className="pr-body">
                <div className="pr-title">{p.title}</div>
                <div className="pr-why"><span className="ai-note">La IA nota</span> — {p.why}</div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function ViewResumenDirector({ tenant, experiment, onGo }) {
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    setLoading(true);
    setErr(null);
    fetch(`/api/labs/${tenant}/experiments/${experiment.meta.id}/summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'Director' }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.error) setErr(d.error); else setBrief(d.brief); })
      .catch(() => setErr('Error de conexión.'))
      .finally(() => setLoading(false));
  }, [tenant, experiment.meta.id, experiment.meta.updatedAt]);

  return (
    <div className="view">
      <div className="view-header">
        <span className="view-eyebrow">Resumen · {experiment.meta.name}</span>
        <h1 className="view-title">En 30 segundos</h1>
      </div>

      <div className="brief-card">
        {loading && <p className="empty-note">Sintetizando…</p>}
        {err && <p className="labs-login-error">{err}</p>}
        {brief && (
          <>
            <div className="section-title" style={{ fontSize: 16, color: 'var(--labs-cream)' }}>{brief.headline}</div>
            <p style={{ fontSize: 13, color: 'var(--labs-cream-dim)', lineHeight: 1.6, marginTop: 8 }}>{brief.narrative}</p>
            <div className="dim-grid">
              {brief.dimensions.map((d, i) => (
                <div className="dim-item" key={i}>
                  <div className="dim-name">{d.name}</div>
                  <div className="dim-bar"><div className="dim-fill" style={{ width: `${Math.min(100, Math.max(0, d.pct))}%` }} /></div>
                  <div className="dim-label">{d.label}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {brief && (
        <>
          <div className="divider-label"><span>Qué salió bien / qué salió mal</span></div>
          <div className="wentwell-grid">
            <div className="ww-card ww-good">
              <div className="ww-title">Bien</div>
              <ul className="ww-list">{brief.wentWell.map((w, i) => <li key={i}>{w}</li>)}</ul>
            </div>
            <div className="ww-card ww-bad">
              <div className="ww-title">Requiere atención</div>
              <ul className="ww-list">{brief.needsAttention.map((w, i) => <li key={i}>{w}</li>)}</ul>
            </div>
          </div>
        </>
      )}

      <div className="divider-label"><span>Acceso rápido</span></div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" onClick={() => onGo('historia')}>Ver historia completa</button>
        <button className="btn btn-primary" onClick={() => onGo('feedback')}>Dejar feedback →</button>
      </div>
    </div>
  );
}

/* ======================= Aportar ======================= */

function ViewAportar({ tenant, experiment, identity, onDone }) {
  const [step, setStep] = useState(0); // 0 elegir prueba, 1 escribir, 2 pensando, 3 preview, 4 confirmado
  const [testId, setTestId] = useState(null);
  const [freeText, setFreeText] = useState('');
  const [interpreted, setInterpreted] = useState(null);
  const [err, setErr] = useState(null);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const test = experiment.tests.find((t) => t.id === testId);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((t) => MediaRecorder.isTypeSupported(t)) || '';
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || 'audio/webm' });
        setTranscribing(true);
        try {
          const form = new FormData();
          form.append('audio', blob);
          const res = await fetch(`/api/labs/${tenant}/transcribe`, { method: 'POST', body: form });
          const data = await res.json();
          if (data.text) setFreeText((prev) => (prev ? `${prev} ${data.text}` : data.text));
        } catch { /* ignore */ }
        setTranscribing(false);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch { /* permiso denegado */ }
  };
  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  };

  const handleInterpret = async () => {
    if (!freeText.trim()) return;
    setStep(2);
    setErr(null);
    try {
      const res = await fetch(`/api/labs/${tenant}/experiments/${experiment.meta.id}/executions/interpret`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId, freeText }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'No se pudo interpretar.'); setStep(1); return; }
      setInterpreted(data);
      setStep(3);
    } catch {
      setErr('Error de conexión.');
      setStep(1);
    }
  };

  const handleConfirm = async () => {
    setErr(null);
    try {
      const res = await fetch(`/api/labs/${tenant}/experiments/${experiment.meta.id}/executions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId, contributor: identity.name, role: identity.role,
          values: interpreted.values, tag: interpreted.tag,
          missingFields: interpreted.missingFields, note: interpreted.note,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'No se pudo guardar.'); return; }
      setStep(4);
      onDone?.();
    } catch {
      setErr('Error de conexión.');
    }
  };

  return (
    <div className="view">
      <div className="view-header">
        <span className="view-eyebrow">Aportar · {experiment.meta.name}</span>
        <h1 className="view-title">Contanos qué pasó</h1>
        <p className="view-sub">Elegí la prueba, hablá o escribí — la IA organiza el resto contra sus campos.</p>
      </div>

      <div className="stepper-track">
        {[0, 1, 2, 3, 4].map((i) => <div key={i} className={`step-dot ${i < step ? 'done' : ''} ${i === step ? 'now' : ''}`} />)}
      </div>

      {step === 0 && (
        <div>
          {experiment.tests.length === 0 && <p className="empty-note">Todavía no hay ninguna prueba creada — pedile a tu Supervisor que cree una en la pestaña Pruebas.</p>}
          <div className="mode-grid">
            {experiment.tests.map((t) => (
              <button key={t.id} className="mode-card" onClick={() => { setTestId(t.id); setStep(1); }}>
                <span className="mode-ic">{t.icon}</span>
                <div className="mode-title">{t.name}</div>
                <div className="mode-sub">{t.fields.length} campos</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && test && (
        <div>
          <div className="voice-sim" style={{ cursor: 'pointer' }} onClick={recording ? stopRecording : startRecording}>
            {recording ? (
              <div className="wave"><span></span><span></span><span></span><span></span><span></span><span></span></div>
            ) : (
              <span style={{ fontSize: 18 }}>🎙️</span>
            )}
            <div style={{ fontSize: 13, color: 'var(--labs-cream-dim)' }}>
              {recording ? 'Grabando… tocá para terminar.' : transcribing ? 'Transcribiendo…' : 'Tocá para grabar por voz, o escribí abajo.'}
            </div>
          </div>
          <label className="field-label">Qué pasó en "{test.name}"</label>
          <textarea rows={6} value={freeText} onChange={(e) => setFreeText(e.target.value)} placeholder="Contá los resultados, condiciones, y cualquier cosa que valga la pena registrar…" />
          {err && <p className="labs-login-error" style={{ marginTop: 8 }}>{err}</p>}
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button className="btn btn-secondary" onClick={() => setStep(0)}>Atrás</button>
            <button className="btn btn-primary" disabled={!freeText.trim()} onClick={handleInterpret}>Continuar →</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="thinking-row"><div className="thinking-dots"><span></span><span></span><span></span></div> La IA está interpretando tu aporte contra los campos de "{test?.name}"…</div>
      )}

      {step === 3 && interpreted && test && (
        <div>
          <div className="structured-preview">
            <div className="sp-head">
              <span style={{ fontSize: 13, fontWeight: 600 }}>{test.name}</span>
              <span className="ai-badge"><span className="dot"></span>Interpretado por IA</span>
            </div>
            {test.fields.map((f, i) => (
              <div className={`sp-row ${i % 2 ? 'dark-bg' : ''}`} key={f.key}>
                <div className="k">{f.label}</div>
                <div className={`v ${interpreted.missingFields.includes(f.key) ? 'missing' : ''}`}>
                  {interpreted.values[f.key] ?? 'Sin especificar'}
                </div>
              </div>
            ))}
            <div className="sp-row dark-bg"><div className="k">Etiqueta</div><div className="v"><span className={`tag ${tagClass(interpreted.tag)}`}>{interpreted.tag}</span></div></div>
            {interpreted.note && <div className="sp-row"><div className="k">Nota</div><div className="v">{interpreted.note}</div></div>}
          </div>
          {err && <p className="labs-login-error" style={{ marginBottom: 12 }}>{err}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)}>Editar aporte</button>
            <button className="btn btn-primary" onClick={handleConfirm}>Confirmar aporte →</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <div className="confirm-banner">
            <div className="confirm-ic">✓</div>
            <div className="confirm-text">
              <b>Agregaste un aporte nuevo a {test?.name}</b>
              <span>El experimento está actualizado.</span>
            </div>
          </div>
          <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={() => { setStep(0); setTestId(null); setFreeText(''); setInterpreted(null); }}>Aportar algo más</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ======================= Pruebas ======================= */

function ViewPruebas({ tenant, experiment, identity, onUpdate }) {
  const [openTest, setOpenTest] = useState(experiment.tests[0]?.id ?? null);
  const [createOpen, setCreateOpen] = useState(false);
  const canCreateTest = identity.role !== 'Registrador';

  return (
    <div className="view">
      <div className="view-header">
        <span className="view-eyebrow">Pruebas · {experiment.meta.name}</span>
        <h1 className="view-title">Pruebas y ejecuciones</h1>
        <p className="view-sub">Cada prueba es un formato repetible con su propio esquema de campos.</p>
      </div>

      {canCreateTest && (
        <button className="btn btn-primary" style={{ marginBottom: 16 }} onClick={() => setCreateOpen(true)}>+ Nueva prueba</button>
      )}

      {experiment.tests.length === 0 && <p className="empty-note">Todavía no hay pruebas creadas.</p>}
      {experiment.tests.map((t) => {
        const execs = experiment.executions.filter((e) => e.testId === t.id);
        const isOpen = openTest === t.id;
        return (
          <div className={`test-card ${isOpen ? 'open' : ''}`} key={t.id}>
            <button className="test-head" style={{ width: '100%', background: 'none', border: 'none', color: 'inherit' }} onClick={() => setOpenTest(isOpen ? null : t.id)}>
              <div className="test-head-left">
                <div className="test-ic">{t.icon}</div>
                <div><div className="test-name">{t.name}</div><div className="test-meta">{execs.length} ejecuciones</div></div>
              </div>
              <span className="chev">⌄</span>
            </button>
            <div className="exec-list">
              {execs.map((e) => (
                <div className="exec-row" key={e.id}>
                  <div className="exec-date">{formatDate(e.createdAt)}</div>
                  <div className="exec-detail">
                    <b>{e.contributor}</b> ({e.role}) — {t.fields.map((f) => `${f.label}: ${e.values[f.key] ?? '—'}`).join(' · ')}
                    {e.note && <div style={{ marginTop: 3, color: 'var(--labs-cream-faint)' }}>{e.note}</div>}
                    {e.validatedBy && <div style={{ marginTop: 3, color: 'var(--labs-living)', fontSize: 11.5 }}>✓ validado por {e.validatedBy}</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                    <span className={`tag ${tagClass(e.tag)}`}>{e.tag}</span>
                    {identity.role !== 'Registrador' && !e.validatedBy && (
                      <ValidateButton tenant={tenant} experimentId={experiment.meta.id} executionId={e.id} by={identity.name} onDone={onUpdate} />
                    )}
                  </div>
                </div>
              ))}
              {execs.length === 0 && <div style={{ padding: '13px 18px', fontSize: 12.5, color: 'var(--labs-cream-faint)' }}>Sin ejecuciones todavía.</div>}
            </div>
          </div>
        );
      })}

      {createOpen && <CreateTestModal tenant={tenant} experimentId={experiment.meta.id} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); onUpdate(); }} />}
    </div>
  );
}

function ValidateButton({ tenant, experimentId, executionId, by, onDone }) {
  const [busy, setBusy] = useState(false);
  const handle = async () => {
    setBusy(true);
    try {
      await fetch(`/api/labs/${tenant}/experiments/${experimentId}/executions/validate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ executionId, by }),
      });
      onDone?.();
    } finally { setBusy(false); }
  };
  return <button className="chip-btn" disabled={busy} onClick={handle}>{busy ? '…' : 'Validar'}</button>;
}

function CreateTestModal({ tenant, experimentId, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🧪');
  const [fields, setFields] = useState([{ key: '', label: '', type: 'text' }]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const updateField = (i, patch) => setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  const addField = () => setFields((prev) => [...prev, { key: '', label: '', type: 'text' }]);
  const removeField = (i) => setFields((prev) => prev.filter((_, idx) => idx !== i));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const cleanFields = fields
        .filter((f) => f.label.trim())
        .map((f) => ({ ...f, key: f.key.trim() || f.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_') }));
      const res = await fetch(`/api/labs/${tenant}/experiments/${experimentId}/tests`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, icon, fields: cleanFields }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'No se pudo crear.'); return; }
      onCreated();
    } catch {
      setErr('Error de conexión.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ position: 'relative' }}>
        <button className="modal-x" style={{ position: 'absolute', top: 18, right: 18 }} onClick={onClose}>✕</button>
        <span className="eyebrow-mini on-dark">Nueva prueba</span>
        <h2 style={{ fontFamily: 'var(--labs-serif)', fontSize: 22, fontWeight: 600, margin: '6px 0 16px' }}>Definí el formato</h2>
        <form onSubmit={handleCreate}>
          <label className="field-label">Nombre de la prueba</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ marginBottom: 14 }} required />
          <label className="field-label">Ícono (un emoji)</label>
          <input type="text" value={icon} onChange={(e) => setIcon(e.target.value)} style={{ marginBottom: 14, maxWidth: 80 }} />
          <label className="field-label">Campos que va a registrar cada aporte</label>
          {fields.map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input type="text" placeholder="Nombre del campo (ej. Humedad %)" value={f.label} onChange={(e) => updateField(i, { label: e.target.value })} style={{ flex: 1 }} />
              <select value={f.type} onChange={(e) => updateField(i, { type: e.target.value })} style={{ background: 'var(--labs-dark-3)', border: '1px solid var(--labs-line-dark)', color: 'var(--labs-cream)', borderRadius: 8, padding: '0 10px' }}>
                {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {fields.length > 1 && <button type="button" className="chip-btn" onClick={() => removeField(i)}>✕</button>}
            </div>
          ))}
          <button type="button" className="chip-btn" onClick={addField} style={{ marginBottom: 14 }}>+ Agregar campo</button>
          {err && <p className="labs-login-error">{err}</p>}
          <div className="modal-footer">
            <button type="button" className="btn btn-quiet" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Creando…' : 'Crear prueba →'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ======================= Historia ======================= */

function ViewHistoria({ experiment }) {
  return (
    <div className="view">
      <div className="view-header">
        <span className="view-eyebrow">Historia · {experiment.meta.name}</span>
        <h1 className="view-title">Memoria del experimento</h1>
        <p className="view-sub">No se escribe a mano — emerge de los aportes, validaciones y feedback del equipo.</p>
      </div>
      {experiment.events.length === 0 && <p className="empty-note">Todavía no hay historia — el primer aporte la va a empezar.</p>}
      <div className="timeline">
        {experiment.events.map((ev) => (
          <div className={`tl-item type-${ev.type}`} key={ev.id}>
            <div className="tl-dot"></div>
            <div className="tl-date">{formatDateTime(ev.date)}</div>
            <div className="tl-title">{ev.title}</div>
            <div className="tl-body">{ev.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ======================= Feedback ======================= */

function ViewFeedback({ tenant, experiment, identity, onUpdate }) {
  if (identity.role === 'Director') {
    return <FeedbackCompose tenant={tenant} experiment={experiment} identity={identity} onUpdate={onUpdate} />;
  }
  return <FeedbackReceived tenant={tenant} experiment={experiment} identity={identity} onUpdate={onUpdate} />;
}

function FeedbackCompose({ tenant, experiment, identity, onUpdate }) {
  const [target, setTarget] = useState('Experimento general');
  const [text, setText] = useState('');
  const [visibility, setVisibility] = useState('Todo el equipo');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const targets = ['Experimento general', ...experiment.tests.map((t) => t.name)];

  const handleSend = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/labs/${tenant}/experiments/${experiment.meta.id}/feedback`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ who: identity.name, target, text, visibility }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'No se pudo enviar.'); return; }
      setText('');
      onUpdate();
    } catch {
      setErr('Error de conexión.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="view">
      <div className="view-header">
        <span className="view-eyebrow">Feedback · {experiment.meta.name}</span>
        <h1 className="view-title">Dejar feedback</h1>
        <p className="view-sub">Sobre el experimento en general o algo puntual. Vos decidís quién lo ve.</p>
      </div>
      <div className="feedback-compose">
        <label className="field-label">¿Sobre qué es este feedback?</label>
        <div className="target-select">
          {targets.map((t) => (
            <button key={t} className={`target-chip ${target === t ? 'active' : ''}`} onClick={() => setTarget(t)}>{t}</button>
          ))}
        </div>
        <textarea rows={4} placeholder="Escribí tu feedback…" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="visibility-row">
          <div className="vis-toggle">
            <button className={`vis-btn ${visibility === 'Todo el equipo' ? 'active' : ''}`} onClick={() => setVisibility('Todo el equipo')}>Todo el equipo</button>
            <button className={`vis-btn ${visibility === 'Privado a Supervisor' ? 'active' : ''}`} onClick={() => setVisibility('Privado a Supervisor')}>Privado a Supervisor</button>
          </div>
          <button className="btn btn-primary" disabled={busy || !text.trim()} onClick={handleSend}>{busy ? 'Enviando…' : 'Enviar feedback →'}</button>
        </div>
        {err && <p className="labs-login-error" style={{ marginTop: 10 }}>{err}</p>}
      </div>
      <div className="divider-label"><span>Feedback anterior</span></div>
      {experiment.feedback.map((f) => <FeedbackItem key={f.id} f={f} tenant={tenant} experimentId={experiment.meta.id} onUpdate={onUpdate} />)}
    </div>
  );
}

function FeedbackReceived({ tenant, experiment, identity, onUpdate }) {
  const visible = experiment.feedback.filter((f) => f.visibility === 'Todo el equipo' || (identity.role === 'Supervisor' && f.visibility === 'Privado a Supervisor'));
  return (
    <div className="view">
      <div className="view-header">
        <span className="view-eyebrow">Feedback · {experiment.meta.name}</span>
        <h1 className="view-title">Feedback recibido</h1>
        <p className="view-sub">Lo que el Director comparte sobre el experimento, en un solo lugar.</p>
      </div>
      {visible.length === 0 && <p className="empty-note">Todavía no hay feedback.</p>}
      {visible.map((f) => <FeedbackItem key={f.id} f={f} tenant={tenant} experimentId={experiment.meta.id} onUpdate={onUpdate} />)}
    </div>
  );
}

function FeedbackItem({ f, tenant, experimentId, onUpdate }) {
  const [busy, setBusy] = useState(false);
  const dismiss = async () => {
    setBusy(true);
    try {
      await fetch(`/api/labs/${tenant}/experiments/${experimentId}/feedback`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedbackId: f.id }),
      });
      onUpdate();
    } finally { setBusy(false); }
  };
  return (
    <div className="feedback-item">
      <div className="fb-top">
        <div className="fb-who"><span className="recent-avatar" style={{ width: 24, height: 24, fontSize: 10.5 }}>{initials(f.who)}</span>{f.who} <span className="tag tag-neutral">{f.visibility}</span></div>
        <span className="recent-time">{formatDateTime(f.createdAt)} · {f.target}</span>
      </div>
      <div className="fb-text">{f.text}</div>
      {f.suggestion && (
        <div className="fb-suggest">
          <span>{f.suggestion}</span>
          <div className="fb-suggest-actions">
            <button className="chip-btn" disabled={busy} onClick={dismiss}>Descartar</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ======================= Reportes ======================= */

function ViewReportes({ tenant, experiment, onUpdate }) {
  const [generating, setGenerating] = useState(false);
  const [err, setErr] = useState(null);
  const latest = experiment.reports[0];

  const handleGenerate = async () => {
    setGenerating(true);
    setErr(null);
    try {
      const res = await fetch(`/api/labs/${tenant}/experiments/${experiment.meta.id}/reports`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'No se pudo generar.'); return; }
      onUpdate();
    } catch {
      setErr('Error de conexión.');
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async () => {
    await fetch(`/api/labs/${tenant}/experiments/${experiment.meta.id}/reports`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId: latest.id }),
    });
    onUpdate();
  };

  return (
    <div className="view">
      <div className="view-header">
        <span className="view-eyebrow">Reportes · {experiment.meta.name}</span>
        <h1 className="view-title">El reporte, como subproducto</h1>
        <p className="view-sub">No nace de cero — se sintetiza a partir de lo que ya quedó registrado.</p>
      </div>

      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div className="section-title" style={{ color: 'var(--labs-cream)' }}>Reporte de {experiment.meta.name}</div>
          <div style={{ fontSize: 12.5, color: 'var(--labs-cream-dim)' }}>{experiment.executions.length} ejecuciones · {experiment.feedback.length} feedback</div>
        </div>
        <button className="btn btn-primary" disabled={generating} onClick={handleGenerate}>{generating ? 'Sintetizando…' : 'Generar borrador →'}</button>
      </div>
      {err && <p className="labs-login-error">{err}</p>}

      {latest && (
        <div className="report-doc" style={{ marginTop: 16 }}>
          <div className="report-meta-strip">
            <span className="eyebrow-mini">{latest.status === 'aprobado' ? 'Aprobado' : 'Borrador generado por IA'}</span>
            <span className={`tag ${latest.status === 'aprobado' ? 'tag-living' : 'tag-ember'} on-paper`}>{latest.status}</span>
          </div>
          <h3>Resumen</h3>
          <p>{latest.doc.summary}</p>
          <h3>Qué se probó</h3>
          <ul>{latest.doc.whatWasTested.map((w, i) => <li key={i}>{w}</li>)}</ul>
          <h3>Resultados</h3>
          <p>{latest.doc.results}</p>
          <h3>Aprendizajes</h3>
          <p>{latest.doc.learnings}</p>
          {latest.doc.highlightedFeedback && (<><h3>Feedback destacado</h3><p>{latest.doc.highlightedFeedback}</p></>)}
          <h3>Próximos pasos sugeridos</h3>
          <ul>{latest.doc.nextSteps.map((n, i) => <li key={i}>{n}</li>)}</ul>
          {latest.status !== 'aprobado' && (
            <div className="report-actions">
              <button className="btn btn-primary" onClick={handleApprove}>Aprobar y compartir</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
