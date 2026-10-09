'use client';

import { useState, useRef } from 'react';

// Port del flujo Experimental de Labs (Pruebas + Ejecuciones + interpretación con IA) — ver
// lib/kaiNext/projects.js (createTest/addExecution/validateExecution) y
// lib/kaiNext/projectContribution.js (interpretContribution). La grabación de voz reusa el
// transcribe endpoint que Kai Next ya tiene (/api/kai-next/[tenant]/transcribe, mismo Whisper
// + filtro anti-alucinación que usa el resto del repo) — mismo patrón que ViewAportar de Labs.

const FIELD_TYPES = [{ value: 'text', label: 'Texto' }, { value: 'number', label: 'Número' }];
const CRITERIA_OPERATORS = [
  { value: '>', label: 'Mayor' }, { value: '<', label: 'Menor' }, { value: '=', label: 'Igual' },
  { value: '>=', label: 'Mayor o igual' }, { value: '<=', label: 'Menor o igual' },
];
const OPERATOR_SYMBOLS = { '>': '>', '<': '<', '=': '=', '>=': '≥', '<=': '≤' };
const EVIDENCE_ACCEPT = 'image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.dxf';
const VIDEO_MAX_MB = 500;
const DOC_MAX_MB = 10;
const TAG_LABEL = { 'éxito': 'Éxito', parcial: 'Parcial', fallo: 'Fallo', referencia: 'Referencia' };

function readAsBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result.split(',')[1]);
    reader.readAsDataURL(file);
  });
}

// Mismo esquema que el resto del repo: imágenes se comprimen client-side antes de mandarlas.
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

function formatFieldCriterion(f) {
  if (!f.operator) return `${f.label}${f.type === 'number' ? ' · número' : ''}`;
  const sym = OPERATOR_SYMBOLS[f.operator] || f.operator;
  return `${f.label} ${sym} ${f.value}${f.unit ? ` ${f.unit}` : ''}`;
}

export function CreateTestModal({ tenant, projectId, people, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [fields, setFields] = useState([{ key: '', label: '', type: 'text' }]);
  const [registradorIds, setRegistradorIds] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const updateField = (i, patch) => setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  const addField = () => setFields((prev) => [...prev, { key: '', label: '', type: 'text' }]);
  const removeField = (i) => setFields((prev) => prev.filter((_, idx) => idx !== i));
  const toggleRegistrador = (id) => setRegistradorIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const cleanFields = fields
        .filter((f) => f.label.trim())
        .map((f) => ({
          key: f.key.trim() || f.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_'),
          label: f.label.trim(),
          type: f.type,
          ...(f.type === 'number' && f.operator && f.value !== '' && f.value != null ? { operator: f.operator, value: f.value, unit: (f.unit || '').trim() } : {}),
        }));
      if (!cleanFields.length) { setErr('Agregá al menos un campo.'); return; }
      const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/tests`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, fields: cleanFields, registradorIds }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'No se pudo crear.'); return; }
      onCreated(data.test);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="knx-ficha-share-backdrop" onClick={onClose}>
      <div className="knx-ficha-review-modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(560px, 92vw)' }}>
        <div className="knx-ficha-review-head">
          <div><span className="knx-ficha-review-badge">Nueva prueba</span><h3 className="knx-ficha-review-title">Definí el formato</h3></div>
          <button type="button" className="knx-side-panel-close" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>
        {err && <p className="knx-canvas-error">{err}</p>}

        <div className="knx-ficha-review-field" style={{ marginBottom: 14 }}>
          <label>Nombre de la prueba</label>
          <input className="knx-canvas-meta-select" value={name} onChange={(e) => setName(e.target.value)} placeholder="ej. Resistencia del material" />
        </div>

        <label style={{ fontSize: 11, color: 'var(--knx-text-muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Campos que va a registrar cada aporte</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '8px 0 10px' }}>
          {fields.map((f, i) => (
            <div key={i} className="knx-canvas-item">
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="knx-canvas-meta-select" placeholder="Nombre del campo (ej. Humedad %)" value={f.label} onChange={(e) => updateField(i, { label: e.target.value })} style={{ flex: 1 }} />
                <select className="knx-canvas-meta-select" style={{ width: 120 }} value={f.type} onChange={(e) => updateField(i, { type: e.target.value })}>
                  {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                {fields.length > 1 && (
                  <button type="button" className="knx-canvas-icon-btn knx-canvas-icon-btn--danger" onClick={() => removeField(i)}>×</button>
                )}
              </div>
              {f.type === 'number' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <select className="knx-canvas-meta-select" style={{ width: 150 }} value={f.operator || ''} onChange={(e) => updateField(i, { operator: e.target.value })}>
                    <option value="">Sin criterio</option>
                    {CRITERIA_OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label} que…</option>)}
                  </select>
                  <input className="knx-canvas-meta-select" type="number" placeholder="Valor" value={f.value ?? ''} onChange={(e) => updateField(i, { value: e.target.value })} />
                  <input className="knx-canvas-meta-select" placeholder="Unidad (ej. %)" value={f.unit ?? ''} onChange={(e) => updateField(i, { unit: e.target.value })} />
                </div>
              )}
            </div>
          ))}
        </div>
        <button type="button" className="knx-canvas-mini" onClick={addField} style={{ marginBottom: 14 }}>+ Agregar campo</button>

        <div className="knx-ficha-review-field">
          <label>Registradores asignados</label>
          <div className="knx-canvas-meta-checklist">
            {!people.length ? <p className="knx-canvas-meta-empty">No hay personas en el equipo todavía.</p> : people.map((p) => (
              <label key={p.id} className="knx-canvas-meta-checkbox">
                <input type="checkbox" checked={registradorIds.includes(p.id)} onChange={() => toggleRegistrador(p.id)} />
                <span className="knx-canvas-meta-checkbox-box" />
                {p.name || p.email}
              </label>
            ))}
          </div>
        </div>

        <div className="knx-canvas-ficha-draft-actions" style={{ marginTop: 16 }}>
          <button type="button" className="knx-canvas-mini" onClick={onClose} disabled={busy}>Cancelar</button>
          <button type="button" className="knx-analisis-sources-save" onClick={submit} disabled={busy}>{busy ? 'Creando…' : 'Crear prueba'}</button>
        </div>
      </div>
    </div>
  );
}

function EditRegistradoresPanel({ tenant, projectId, test, people, onSaved }) {
  const [open, setOpen] = useState(false);
  const [ids, setIds] = useState(test.registradorIds ?? []);
  const [busy, setBusy] = useState(false);

  const toggle = (id) => setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const save = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/tests/${test.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ registradorIds: ids }),
      });
      if (res.ok) { setOpen(false); onSaved(); }
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="knx-canvas-mini" onClick={() => setOpen(true)}>
        {test.registradorIds?.length ? `${test.registradorIds.length} registrador${test.registradorIds.length !== 1 ? 'es' : ''}` : 'Sin registradores'}
      </button>
    );
  }

  return (
    <div className="knx-canvas-meta-checklist" style={{ marginTop: 6 }}>
      {people.map((p) => (
        <label key={p.id} className="knx-canvas-meta-checkbox">
          <input type="checkbox" checked={ids.includes(p.id)} onChange={() => toggle(p.id)} />
          <span className="knx-canvas-meta-checkbox-box" />
          {p.name || p.email}
        </label>
      ))}
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <button type="button" className="knx-canvas-mini" disabled={busy} onClick={save}>Guardar</button>
        <button type="button" className="knx-canvas-mini" onClick={() => setOpen(false)}>Cancelar</button>
      </div>
    </div>
  );
}

function ExecutionRow({ tenant, projectId, execution, test, canValidate, onValidated }) {
  const [busy, setBusy] = useState(false);

  const validate = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/executions/validate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ executionId: execution.id }),
      });
      if (res.ok) onValidated();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="knx-canvas-item">
      <div className="knx-canvas-item-head">
        <div className="knx-canvas-item-who">
          <span className="knx-canvas-item-name">{execution.contributor}</span>
          <span className={`knx-activity-status knx-activity-status--${execution.tag === 'éxito' ? 'finished' : execution.tag === 'fallo' ? 'ready' : 'active'}`}>{TAG_LABEL[execution.tag] ?? execution.tag}</span>
        </div>
        {execution.validatedBy ? (
          <span className="knx-canvas-ficha-progress">✓ validado por {execution.validatedBy}</span>
        ) : canValidate ? (
          <button type="button" className="knx-canvas-mini" disabled={busy} onClick={validate}>{busy ? 'Validando…' : 'Validar'}</button>
        ) : null}
      </div>
      <p className="knx-canvas-ficha-progress">
        {(test?.fields ?? []).map((f) => execution.values?.[f.key] != null && execution.values[f.key] !== '' ? `${f.label}: ${execution.values[f.key]}` : null).filter(Boolean).join(' · ')}
      </p>
      {execution.note && <p className="knx-canvas-item-text">{execution.note}</p>}
      {execution.evidence?.length > 0 && (
        <p className="knx-canvas-ficha-progress">{execution.evidence.length} adjunto{execution.evidence.length !== 1 ? 's' : ''}{execution.evidence.some((e) => e.driveUrl) ? ' — ' : ''}
          {execution.evidence.filter((e) => e.driveUrl).map((e, i) => (
            <span key={i}><a href={e.driveUrl} target="_blank" rel="noreferrer">{e.name}</a>{i < execution.evidence.filter((x) => x.driveUrl).length - 1 ? ', ' : ''}</span>
          ))}
        </p>
      )}
    </div>
  );
}

function TestCard({ tenant, projectId, test, executions, people, canManage, onReload }) {
  const testExecutions = executions.filter((e) => e.testId === test.id);
  return (
    <div className="knx-canvas-group">
      <div className="knx-canvas-group-head">
        <span className="knx-canvas-group-name">{test.icon} {test.name}</span>
        <span className="knx-canvas-group-count">{testExecutions.length} aporte{testExecutions.length !== 1 ? 's' : ''}</span>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        {test.fields.map((f) => <span key={f.key} className="knx-canvas-ficha-progress" style={{ border: '1px solid var(--knx-border)', borderRadius: 20, padding: '2px 8px' }}>{formatFieldCriterion(f)}</span>)}
      </div>
      {canManage && <EditRegistradoresPanel tenant={tenant} projectId={projectId} test={test} people={people} onSaved={onReload} />}
      <div className="knx-canvas-cards" style={{ marginTop: 10 }}>
        {!testExecutions.length ? <p className="knx-knowledge-empty">Sin aportes todavía.</p> : testExecutions.map((e) => (
          <ExecutionRow key={e.id} tenant={tenant} projectId={projectId} execution={e} test={test} canValidate={canManage} onValidated={onReload} />
        ))}
      </div>
    </div>
  );
}

// Flujo completo de "Aportar" — elegir prueba → texto/adjuntos → interpretar con IA → preview
// editable → confirmar. Pasos 0-4, igual que ViewAportar de Labs (sin grabación de voz, ver
// nota arriba).
export function AportarFlow({ tenant, projectId, tests, personId, onClose, onDone }) {
  const [step, setStep] = useState(0);
  const [testId, setTestId] = useState(null);
  const [freeText, setFreeText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [interpreted, setInterpreted] = useState(null);
  const [editedValues, setEditedValues] = useState({});
  const [err, setErr] = useState(null);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const test = tests.find((t) => t.id === testId);
  const assignedTests = tests.filter((t) => t.registradorIds?.includes(personId) || true); // el server ya filtra qué pruebas ve este usuario si es Registrador

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
          const res = await fetch(`/api/kai-next/${tenant}/transcribe`, { method: 'POST', body: form });
          const data = await res.json();
          if (data.text) setFreeText((prev) => (prev ? `${prev} ${data.text}` : data.text));
        } catch { /* ignora fallos puntuales de transcripción */ }
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

  const processFile = async (file) => {
    if (!file) return;
    setErr(null);
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const maxMb = isImage ? 4 : isVideo ? VIDEO_MAX_MB : DOC_MAX_MB;
    if (file.size > maxMb * 1024 * 1024) { setErr(`Archivo demasiado grande (máx ${maxMb} MB).`); return; }
    const id = Math.random().toString(36).slice(2);

    if (isImage) {
      const data = await compressImage(file);
      setAttachments((prev) => [...prev, { id, name: file.name || 'foto.jpg', mimeType: 'image/jpeg', kind: 'image', data, previewUrl: `data:image/jpeg;base64,${data}` }]);
      return;
    }

    if (isVideo) {
      if (!testId) { setErr('Elegí una prueba antes de adjuntar un video.'); return; }
      setAttachments((prev) => [...prev, { id, name: file.name, mimeType: file.type, kind: 'video', uploading: true, previewUrl: null }]);
      try {
        const urlRes = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/executions/video-upload-url`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ testId, name: file.name, mimeType: file.type }),
        });
        const urlData = await urlRes.json();
        if (!urlRes.ok) throw new Error(urlData.error || 'No se pudo iniciar la subida.');
        const putRes = await fetch(urlData.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
        if (!putRes.ok) throw new Error('No se pudo subir el video.');
        const uploaded = await putRes.json();
        setAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, uploading: false, driveFileId: uploaded.id, driveUrl: uploaded.webViewLink } : a)));
      } catch (e) {
        setErr(e.message || 'No se pudo subir el video.');
        setAttachments((prev) => prev.filter((a) => a.id !== id));
      }
      return;
    }

    const data = await readAsBase64(file);
    setAttachments((prev) => [...prev, { id, name: file.name, mimeType: file.type || 'application/octet-stream', kind: 'document', data, previewUrl: null }]);
  };

  const handleInterpret = async () => {
    if (!freeText.trim() && attachments.length === 0) return;
    setStep(2);
    setErr(null);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/executions/interpret`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId, freeText, evidence: attachments.map(({ name, mimeType, data }) => ({ name, mimeType, data })) }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'No se pudo interpretar.'); setStep(1); return; }
      setInterpreted(data);
      setEditedValues(data.values || {});
      setStep(3);
    } catch {
      setErr('Error de conexión.');
      setStep(1);
    }
  };

  const handleConfirm = async () => {
    setErr(null);
    try {
      const missingFields = test.fields.filter((f) => editedValues[f.key] === undefined || editedValues[f.key] === '').map((f) => f.key);
      const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/executions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId, values: editedValues, tag: interpreted.tag, missingFields, note: interpreted.note,
          evidence: attachments.map(({ name, mimeType, data, previewUrl, driveFileId, driveUrl, kind }) => ({ name, mimeType, data, previewUrl, driveFileId, driveUrl, kind })),
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
    <div className="knx-ficha-share-backdrop" onClick={step === 4 ? onClose : undefined}>
      <div className="knx-ficha-review-modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(620px, 92vw)' }}>
        <div className="knx-ficha-review-head">
          <div><span className="knx-ficha-review-badge">Aportar</span><h3 className="knx-ficha-review-title">Contanos qué pasó</h3></div>
          <button type="button" className="knx-side-panel-close" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>

        {step === 0 && (
          <div>
            {!assignedTests.length && <p className="knx-knowledge-empty">Todavía no hay ninguna prueba creada.</p>}
            <div className="knx-canvas-groups" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
              {assignedTests.map((t) => (
                <button key={t.id} type="button" className="knx-canvas-group" style={{ cursor: 'pointer', textAlign: 'left' }} onClick={() => { setTestId(t.id); setStep(1); }}>
                  <span className="knx-canvas-group-name">{t.icon} {t.name}</span>
                  <p className="knx-canvas-ficha-progress">{t.fields.length} campos</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && test && (
          <div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {test.fields.map((f) => <span key={f.key} className="knx-canvas-ficha-progress" style={{ border: '1px solid var(--knx-border)', borderRadius: 20, padding: '2px 8px' }}>{formatFieldCriterion(f)}</span>)}
            </div>
            <button
              type="button"
              className={`knx-voice-btn${recording ? ' knx-voice-btn--recording' : ''}`}
              onClick={recording ? stopRecording : startRecording}
            >
              <span style={{ fontSize: 18 }}>{recording ? '⏺' : '🎙️'}</span>
              <span>{recording ? 'Grabando… tocá para terminar.' : transcribing ? 'Transcribiendo…' : 'Tocá para grabar por voz, o escribí abajo.'}</span>
            </button>
            <div className="knx-ficha-review-field">
              <label>Qué pasó en "{test.name}"</label>
              <textarea rows={5} value={freeText} onChange={(e) => setFreeText(e.target.value)} placeholder="Contá los resultados, condiciones, y cualquier cosa que valga la pena registrar… (podés adjuntar una foto o documento con los resultados y la IA completa los campos sola)" />
            </div>
            <input ref={fileInputRef} type="file" accept={EVIDENCE_ACCEPT} multiple style={{ display: 'none' }} onChange={(e) => { Array.from(e.target.files).forEach(processFile); e.target.value = ''; }} />
            <button type="button" className="knx-canvas-mini" onClick={() => fileInputRef.current?.click()} style={{ marginTop: 8 }}>📎 Adjuntar archivo</button>

            {attachments.length > 0 && (
              <div className="knx-canvas-cards" style={{ marginTop: 10 }}>
                {attachments.map((att) => (
                  <div key={att.id} className="knx-canvas-item" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{att.kind === 'video' ? '🎥' : att.kind === 'image' ? '🖼️' : '📄'}</span>
                    <span className="knx-canvas-ficha-progress" style={{ flex: 1 }}>{att.uploading ? `Subiendo ${att.name}…` : att.name}</span>
                    <button type="button" className="knx-canvas-icon-btn knx-canvas-icon-btn--danger" disabled={att.uploading} onClick={() => setAttachments((p) => p.filter((a) => a.id !== att.id))}>×</button>
                  </div>
                ))}
              </div>
            )}

            {err && <p className="knx-canvas-error" style={{ marginTop: 8 }}>{err}</p>}
            <div className="knx-canvas-ficha-draft-actions" style={{ marginTop: 16 }}>
              <button type="button" className="knx-canvas-mini" onClick={() => setStep(0)}>Atrás</button>
              <button type="button" className="knx-analisis-sources-save" disabled={(!freeText.trim() && attachments.length === 0) || attachments.some((a) => a.uploading) || recording || transcribing} onClick={handleInterpret}>Continuar →</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="knx-analisis-loading"><span className="knx-thinking-dot" />La IA está interpretando tu aporte contra los campos de "{test?.name}"…</div>
        )}

        {step === 3 && interpreted && test && (
          <div>
            <p className="knx-ficha-review-badge" style={{ marginBottom: 10 }}>Interpretado por IA — editable</p>
            <div className="knx-ficha-review-grid">
              {test.fields.map((f) => (
                <div key={f.key} className="knx-ficha-review-field">
                  <label>{f.label}</label>
                  <input
                    className="knx-canvas-meta-select"
                    type={f.type === 'number' ? 'number' : 'text'}
                    value={editedValues[f.key] ?? ''}
                    placeholder="Sin especificar — completá a mano"
                    onChange={(e) => setEditedValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <p className="knx-canvas-ficha-progress" style={{ marginTop: 10 }}>Etiqueta: <strong>{TAG_LABEL[interpreted.tag] ?? interpreted.tag}</strong></p>
            {interpreted.note && <p className="knx-canvas-item-text">{interpreted.note}</p>}
            {interpreted.unanalyzed?.length > 0 && (
              <p className="knx-canvas-ficha-progress">No analizado: {interpreted.unanalyzed.map((u) => `${u.name}: ${u.reason}`).join(' · ')}</p>
            )}
            {err && <p className="knx-canvas-error" style={{ marginTop: 8 }}>{err}</p>}
            <div className="knx-canvas-ficha-draft-actions" style={{ marginTop: 16 }}>
              <button type="button" className="knx-canvas-mini" onClick={() => setStep(1)}>Editar aporte</button>
              <button type="button" className="knx-analisis-sources-save" onClick={handleConfirm}>Confirmar aporte →</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <p className="knx-knowledge-empty">✓ Agregaste un aporte nuevo a {test?.name}.</p>
            <div className="knx-canvas-ficha-draft-actions" style={{ marginTop: 10 }}>
              <button type="button" className="knx-analisis-sources-save" onClick={onClose}>Listo</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function PruebasSection({ tenant, projectId, tests, executions, people, canManage, personId, onReload }) {
  const [creatingTest, setCreatingTest] = useState(false);
  const [aportando, setAportando] = useState(false);

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span className="knx-canvas-group-name" style={{ fontSize: 16 }}>Pruebas</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {tests.length > 0 && <button type="button" className="knx-analisis-compare" onClick={() => setAportando(true)}>+ Aportar</button>}
          {canManage && <button type="button" className="knx-analisis-sources-save" onClick={() => setCreatingTest(true)}>+ Nueva prueba</button>}
        </div>
      </div>

      {!tests.length ? (
        <div className="knx-analisis-empty"><p>Sin pruebas todavía.</p></div>
      ) : (
        <div className="knx-canvas-groups">
          {tests.map((t) => (
            <TestCard key={t.id} tenant={tenant} projectId={projectId} test={t} executions={executions} people={people} canManage={canManage} onReload={onReload} />
          ))}
        </div>
      )}

      {creatingTest && (
        <CreateTestModal tenant={tenant} projectId={projectId} people={people} onClose={() => setCreatingTest(false)} onCreated={() => { setCreatingTest(false); onReload(); }} />
      )}
      {aportando && (
        <AportarFlow tenant={tenant} projectId={projectId} tests={tests} personId={personId} onClose={() => setAportando(false)} onDone={onReload} />
      )}
    </div>
  );
}
