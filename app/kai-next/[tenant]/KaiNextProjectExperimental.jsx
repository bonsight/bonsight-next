'use client';

import { useState, useRef, useEffect } from 'react';
import { FeedbackPanel, feedbackCountFor } from './KaiNextProjectTabs';

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
      if (!cleanFields.length) { setErr('Agrega al menos un campo.'); return; }
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
          <div><span className="knx-ficha-review-badge">Nueva prueba</span><h3 className="knx-ficha-review-title">Define el formato</h3></div>
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

// ── Tarjeta de prueba (rediseño 2026-11-24): cabecera con fechas y menú ⋯, aportes en tabla por
// criterio (último aporte a la vista, los anteriores desplegables) y ventanas Editar / Mover.

const MES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function fmtDay(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${String(d.getDate()).padStart(2, '0')} ${MES_CORTO[d.getMonth()]} ${d.getFullYear()}`;
}
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
// Valor faltante: vacío, o los marcadores que dejó la IA / la migración de Labs ("__NA__", "N/A", "-").
const isMissingValue = (raw) => raw == null || /^(_*\s*n\s*\/?\s*a\s*_*|-+|—|sin dato)?$/i.test(String(raw).trim().replace(/\s+[%a-zA-Z°]+$/, '').trim());
const TAG_CLS = { 'éxito': 'ok', parcial: 'part', fallo: 'bad', referencia: 'ref' };

// ¿El valor cumple el criterio del campo? true/false, o null si no hay criterio o no hay número.
function meetsCriterion(f, raw) {
  if (!f.operator || f.value == null || raw == null || raw === '') return null;
  const n = Number(String(raw).replace(',', '.').match(/-?\d+(\.\d+)?/)?.[0]);
  if (Number.isNaN(n)) return null;
  switch (f.operator) {
    case '>': return n > f.value;
    case '<': return n < f.value;
    case '>=': return n >= f.value;
    case '<=': return n <= f.value;
    case '=': return n === f.value;
    default: return null;
  }
}
const criterionTarget = (f) => (f.operator ? `${OPERATOR_SYMBOLS[f.operator] || f.operator} ${f.value}${f.unit ? ` ${f.unit}` : ''}` : f.type === 'number' ? 'sin criterio' : 'texto');

// Estado de la prueba según sus aportes: Pendiente (ninguno), Parcial (hay aportes sin validar)
// o Hecho (todos validados).
function testStatus(testExecutions) {
  if (!testExecutions.length) return { label: 'Pendiente', cls: 'pend' };
  return testExecutions.every((e) => e.validatedBy) ? { label: 'Hecho', cls: 'ok' } : { label: 'Parcial', cls: 'part' };
}

function ExecutionTableRow({ tenant, projectId, execution, test, canValidate, onValidated, renderFeedback, feedbackCount = null, onOpenFeedback }) {
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
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
  const files = (execution.evidence ?? []).filter((e) => e.driveUrl);
  const longNote = (execution.note ?? '').length > 220;
  return (
    <div className="knx-pr-exec">
      <div className="knx-pr-grid knx-pr-row" style={{ '--n': test.fields.length }}>
        <div className="knx-pr-strong">{fmtDay(execution.createdAt)}</div>
        <div>{execution.contributor}</div>
        <div><span className={`knx-pr-badge knx-pr-badge--${TAG_CLS[execution.tag] ?? 'ref'}`}>{TAG_LABEL[execution.tag] ?? execution.tag}</span></div>
        {test.fields.map((f) => {
          const raw = execution.values?.[f.key];
          const has = !isMissingValue(raw);
          const ok = has ? meetsCriterion(f, raw) : null;
          return (
            <div key={f.key} className={!has ? 'knx-pr-na' : ok === true ? 'knx-pr-pass' : ok === false ? 'knx-pr-fail' : ''} title={has ? String(raw) : undefined}>
              {ok === true && <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" className="knx-pr-check"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              {has ? `${raw}${f.unit && !String(raw).includes(f.unit) ? ` ${f.unit}` : ''}` : 'Sin dato'}
            </div>
          );
        })}
        <div className="knx-pr-small">
          {execution.validatedBy ? `✓ ${execution.validatedBy}` : canValidate
            ? <button type="button" className="knx-canvas-mini" disabled={busy} onClick={validate}>{busy ? 'Validando…' : 'Validar'}</button>
            : 'Sin validar'}
        </div>
        <div className="knx-pr-right">
          {onOpenFeedback ? (
            <button type="button" className="knx-pr-fbchip" aria-label={`Feedback del aporte del ${fmtDay(execution.createdAt)}: ${feedbackCount ?? 0} ${feedbackCount === 1 ? 'comentario' : 'comentarios'}`} onClick={onOpenFeedback}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>
              {feedbackCount ?? 0}
            </button>
          ) : renderFeedback?.({ type: 'aporte', id: execution.id }, `Aporte de ${execution.contributor} — ${test.name}`)}
        </div>
      </div>
      {(execution.note || files.length > 0) && (
        <div className="knx-pr-note">
          {execution.note && <p className={expanded ? '' : 'knx-pr-clamp'}>{execution.note}</p>}
          <div className="knx-pr-note-links">
            {longNote && <button type="button" className="knx-pr-link" onClick={() => setExpanded((v) => !v)}>{expanded ? 'Ver menos' : 'Ver más'}</button>}
            {files.length > 0 && (
              <span>{plural(files.length, 'adjunto', 'adjuntos')} — {files.map((e, i) => <span key={i}><a href={e.driveUrl} target="_blank" rel="noreferrer">{e.name}</a>{i < files.length - 1 ? ', ' : ''}</span>)}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EditTestModal({ tenant, projectId, test, people, canAdmin, canManage, onClose, onSaved }) {
  const [name, setName] = useState(test.name);
  const [fields, setFields] = useState(test.fields.map((f) => ({ key: f.key, label: f.label, type: f.type, operator: f.operator ?? '', value: f.value ?? '', unit: f.unit ?? '' })));
  const [ids, setIds] = useState(test.registradorIds ?? []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const setField = (key, patch) => setFields((prev) => prev.map((f) => (f.key === key ? { ...f, ...patch } : f)));
  const toggle = (id) => setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const url = `/api/kai-next/${tenant}/projects/${projectId}/tests/${test.id}`;

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      const send = async (body) => {
        const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d.error || 'No se pudo guardar.');
      };
      if (canAdmin) await send({ edit: { name, fields: fields.filter((f) => f.type === 'number') } });
      const before = [...(test.registradorIds ?? [])].sort().join(',');
      if (canManage && [...ids].sort().join(',') !== before) await send({ registradorIds: ids });
      onSaved();
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="knx-dlg-backdrop" onClick={onClose}>
      <div className="knx-dlg knx-dlg--lg" role="dialog" aria-modal="true" aria-labelledby={`edit-${test.id}`} onClick={(e) => e.stopPropagation()}>
        <div className="knx-dlg-head">
          <div>
            <div className="knx-dlg-eyebrow">Editar prueba</div>
            <h2 id={`edit-${test.id}`} className="knx-dlg-title">{test.name}</h2>
          </div>
          <button type="button" className="knx-dlg-close" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>
        <div className="knx-dlg-body" style={{ gap: 22 }}>
          <div className="knx-dlg-field">
            <label className="knx-dlg-label" htmlFor={`name-${test.id}`}>Nombre de la prueba</label>
            <input id={`name-${test.id}`} className="knx-dlg-input" value={name} disabled={!canAdmin || busy} onChange={(e) => setName(e.target.value)} />
          </div>
          {canManage && (
            <div className="knx-dlg-field">
              <span className="knx-dlg-label">Registradores</span>
              {!people.length ? (
                <p className="knx-pr-empty-box">Todavía no hay ningún Registrador creado. Pídele al admin que lo agregue.</p>
              ) : (
                <div className="knx-canvas-meta-checklist">
                  {people.map((p) => (
                    <label key={p.id} className="knx-canvas-meta-checkbox">
                      <input type="checkbox" checked={ids.includes(p.id)} onChange={() => toggle(p.id)} disabled={busy} />
                      <span className="knx-canvas-meta-checkbox-box" />
                      {p.name || p.email}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="knx-dlg-field" style={{ gap: 8 }}>
            <span className="knx-dlg-label">Criterios de aprobación por campo</span>
            <div className="knx-pr-crit">
              <div className="knx-pr-crit-row knx-pr-crit-head"><span>Campo</span><span>Condición</span><span>Valor</span><span>Unidad</span></div>
              {fields.map((f) => (
                <div key={f.key} className="knx-pr-crit-row">
                  <span>{f.label}</span>
                  {f.type === 'number' ? (
                    <>
                      <select aria-label={`Condición de ${f.label}`} className="knx-dlg-input" value={f.operator} disabled={!canAdmin || busy} onChange={(e) => setField(f.key, { operator: e.target.value })}>
                        <option value="">Sin criterio</option>
                        {CRITERIA_OPERATORS.map((o) => <option key={o.value} value={o.value}>{OPERATOR_SYMBOLS[o.value]} {o.label.toLowerCase()}</option>)}
                      </select>
                      <input aria-label={`Valor de ${f.label}`} className="knx-dlg-input" inputMode="decimal" value={f.value} disabled={!canAdmin || busy || !f.operator} onChange={(e) => setField(f.key, { value: e.target.value })} />
                      <input aria-label={`Unidad de ${f.label}`} className="knx-dlg-input" value={f.unit} disabled={!canAdmin || busy} onChange={(e) => setField(f.key, { unit: e.target.value })} />
                    </>
                  ) : <span className="knx-pr-small" style={{ gridColumn: 'span 3' }}>Campo de texto: no lleva criterio.</span>}
                </div>
              ))}
            </div>
            <p className="knx-dlg-hint">{canAdmin
              ? 'Los ✓ de los aportes ya registrados se recalculan con el criterio nuevo; su Resultado queda como se registró.'
              : 'Solo quien creó la prueba o un Director puede cambiar el nombre y los criterios.'}</p>
          </div>
          {err && <p className="knx-dlg-error" role="alert">{err}</p>}
        </div>
        <div className="knx-dlg-foot">
          <button type="button" className="knx-dlg-btn" onClick={onClose} disabled={busy}>Cancelar</button>
          <button type="button" className="knx-dlg-btn knx-dlg-btn--primary" onClick={save} disabled={busy || !name.trim()}>{busy ? 'Guardando…' : 'Guardar cambios'}</button>
        </div>
      </div>
    </div>
  );
}

function MoveTestModal({ tenant, projectId, test, executionCount, onClose, onDone }) {
  const [targets, setTargets] = useState(null);
  const [current, setCurrent] = useState(null);
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const url = `/api/kai-next/${tenant}/projects/${projectId}/tests/${test.id}`;
  useEffect(() => {
    fetch(url).then(async (res) => {
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'No se pudieron cargar los proyectos.');
      setTargets(d.targets ?? []);
      setCurrent(d.current ?? null);
      setTo(d.targets?.[0]?.id ?? '');
    }).catch((e) => { setErr(e.message); setTargets([]); });
  }, [url]);
  const move = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ moveTo: to }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'No se pudo mover.');
      onDone();
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  };
  return (
    <div className="knx-dlg-backdrop" onClick={onClose}>
      <div className="knx-dlg" role="dialog" aria-modal="true" aria-labelledby={`move-${test.id}`} onClick={(e) => e.stopPropagation()}>
        <div className="knx-dlg-head">
          <div>
            <div className="knx-dlg-eyebrow">Mover prueba</div>
            <h2 id={`move-${test.id}`} className="knx-dlg-title">{test.name}</h2>
          </div>
          <button type="button" className="knx-dlg-close" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>
        <div className="knx-dlg-body" style={{ gap: 14 }}>
          {current && <p className="knx-dlg-sub" style={{ margin: 0 }}>Proyecto actual: <strong style={{ color: '#1A2B25', fontWeight: 600 }}>{current.name}</strong></p>}
          {!targets ? <p className="knx-dlg-hint">Cargando proyectos…</p> : !targets.length ? (
            !err && <p className="knx-dlg-hint">No hay otro proyecto experimental activo de esta empresa que supervises.</p>
          ) : (
            <fieldset className="knx-pr-move-set">
              <legend>Mover a</legend>
              {targets.map((t) => (
                <label key={t.id} className={`knx-pr-move-opt${to === t.id ? ' knx-pr-move-opt--on' : ''}`}>
                  <input type="radio" name={`to-${test.id}`} checked={to === t.id} onChange={() => setTo(t.id)} disabled={busy} />
                  <span>
                    <span className="knx-pr-move-name">{t.name}</span>
                    {(t.empresaName || t.type) && <span className="knx-pr-small">{[t.empresaName, t.type].filter(Boolean).join(' · ')}</span>}
                  </span>
                </label>
              ))}
            </fieldset>
          )}
          {targets?.length > 0 && <p className="knx-dlg-hint">{executionCount ? `Se mueve con ${plural(executionCount, 'aporte', 'aportes')} y su feedback. ` : ''}La evidencia en Drive queda donde está.</p>}
          {err && <p className="knx-dlg-error" role="alert">{err}</p>}
        </div>
        <div className="knx-dlg-foot">
          <button type="button" className="knx-dlg-btn" onClick={onClose} disabled={busy}>Cancelar</button>
          {targets?.length > 0 && <button type="button" className="knx-dlg-btn knx-dlg-btn--primary" onClick={move} disabled={busy || !to}>{busy ? 'Moviendo…' : 'Mover prueba'}</button>}
        </div>
      </div>
    </div>
  );
}

function TestMenu({ canAdmin, canManage, hasExecutions, onEdit, onMove, onDelete }) {
  const [open, setOpen] = useState(false);
  if (!canAdmin && !canManage) return null;
  const pick = (fn) => () => { setOpen(false); fn(); };
  return (
    <div className="knx-pr-menu-wrap">
      <button type="button" className={`knx-pr-dots${open ? ' knx-pr-dots--on' : ''}`} aria-label="Más acciones" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>⋯</button>
      {open && (
        <>
          <div className="knx-pr-menu-scrim" onClick={() => setOpen(false)} />
          <div role="menu" className="knx-pr-menu">
            <button type="button" role="menuitem" onClick={pick(onEdit)}>{canAdmin ? 'Editar prueba' : 'Registradores'}</button>
            {canAdmin && <button type="button" role="menuitem" onClick={pick(onMove)}>Mover a otro proyecto</button>}
            {canAdmin && (
              <>
                <div className="knx-pr-menu-sep" />
                <button type="button" role="menuitem" disabled={hasExecutions} onClick={pick(onDelete)} className="knx-pr-menu-danger">
                  Eliminar
                  {hasExecutions && <span>No disponible: la prueba tiene aportes</span>}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function TestCard({ tenant, projectId, test, executions, people, canManage, canAdmin, onReload, renderFeedback, feedbackCtx }) {
  const [modal, setModal] = useState(null); // 'edit' | 'move'
  const [fbScope, setFbScope] = useState(undefined); // undefined = cerrado; null = la prueba; {…} = un aporte
  const [showOlder, setShowOlder] = useState(false);
  const [err, setErr] = useState(null);
  const testExecutions = executions.filter((e) => e.testId === test.id)
    .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
  const st = testStatus(testExecutions);
  const [latest, ...older] = testExecutions;
  const reg = test.registradorIds?.length ?? 0;

  const remove = async () => {
    if (!confirm(`¿Eliminar la prueba «${test.name}»? No se puede deshacer.`)) return;
    setErr(null);
    const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/tests/${test.id}`, { method: 'DELETE' });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) setErr(d.error || 'No se pudo eliminar.');
    else onReload();
  };
  // Feedback: un solo panel para la prueba y todos sus aportes.
  const fbScopes = [
    { type: 'prueba', id: test.id, tag: 'Toda la prueba' },
    ...testExecutions.map((e) => ({ type: 'aporte', id: e.id, tag: `Aporte del ${fmtDay(e.createdAt)}${testExecutions.filter((x) => fmtDay(x.createdAt) === fmtDay(e.createdAt)).length > 1 ? ` · ${e.contributor}` : ''}` })),
  ];
  const fb = feedbackCtx?.feedback ?? null;
  const fbTotal = fb ? feedbackCountFor(fb, fbScopes) : 0;
  const fbFor = (e) => (fb ? feedbackCountFor(fb, [{ type: 'aporte', id: e.id }]) : null);
  const rowProps = { tenant, projectId, test, canValidate: canManage, onValidated: onReload, renderFeedback };
  const rowFb = (e) => (fb ? { feedbackCount: fbFor(e), onOpenFeedback: () => setFbScope(fbScopes.find((s) => s.id === e.id)) } : {});

  return (
    <article className="knx-pr-card">
      <div className="knx-pr-head">
        <div className="knx-pr-head-main">
          <div className="knx-pr-title-row">
            <h3>{test.icon && test.icon !== '🧪' ? `${test.icon} ` : ''}{test.name}</h3>
            <span className={`knx-test-status knx-test-status--${st.cls}`}>{st.label}</span>
          </div>
          <div className="knx-pr-meta">
            <span>Creada <strong>{fmtDay(test.createdAt)}</strong>{test.createdByName ? ` por ${test.createdByName}` : ''}</span>
            <span>Último aporte <strong>{latest ? fmtDay(latest.createdAt) : '—'}</strong></span>
            <span>{testExecutions.length ? plural(testExecutions.length, 'aporte', 'aportes') : 'Sin aportes'}</span>
            <span>{reg ? plural(reg, 'registrador', 'registradores') : 'Sin registradores'}</span>
          </div>
        </div>
        <div className="knx-pr-head-actions">
          {fb ? (
            (feedbackCtx.canWrite || fbTotal > 0) && (
              <button type="button" className={`knx-fb-btn${fbScope !== undefined ? ' knx-fb-btn--on' : ''}`} onClick={() => setFbScope(null)}>
                Feedback{fbTotal ? ` · ${fbTotal}` : ''}
              </button>
            )
          ) : renderFeedback?.({ type: 'prueba', id: test.id }, test.name)}
          <TestMenu canAdmin={canAdmin} canManage={canManage} hasExecutions={testExecutions.length > 0}
            onEdit={() => setModal('edit')} onMove={() => setModal('move')} onDelete={remove} />
        </div>
      </div>
      {err && <p className="knx-canvas-error" style={{ margin: '0 20px 10px' }}>{err}</p>}

      <div className="knx-pr-table-wrap">
        <div className="knx-pr-table" style={{ '--n': test.fields.length }}>
          <div className="knx-pr-grid knx-pr-thead" style={{ '--n': test.fields.length }}>
            <div>Fecha</div><div>Registrador</div><div>Resultado</div>
            {test.fields.map((f) => <div key={f.key}><div className="knx-pr-crit-name">{f.label}</div><div>{criterionTarget(f)}</div></div>)}
            <div>Validación</div><div />
          </div>
          {!latest ? <p className="knx-pr-empty">Sin aportes todavía.</p> : (
            <>
              <ExecutionTableRow key={latest.id} execution={latest} {...rowProps} {...rowFb(latest)} />
              {showOlder && older.map((e) => <ExecutionTableRow key={e.id} execution={e} {...rowProps} {...rowFb(e)} />)}
              {older.length > 0 && (
                <div className="knx-pr-older">
                  <button type="button" className="knx-pr-link knx-pr-strong" onClick={() => setShowOlder((v) => !v)}>
                    {showOlder ? 'Ocultar aportes anteriores ▴' : `Ver ${older.length === 1 ? '1 aporte anterior' : `${older.length} aportes anteriores`} ▾`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {fbScope !== undefined && fb && (
        <FeedbackPanel tenant={tenant} projectId={projectId} feedback={fb} scopes={fbScopes} initialScope={fbScope}
          title={test.name} canWrite={feedbackCtx.canWrite} onChanged={onReload} onClose={() => setFbScope(undefined)} />
      )}
      {modal === 'edit' && (
        <EditTestModal tenant={tenant} projectId={projectId} test={test} people={people} canAdmin={canAdmin} canManage={canManage}
          onClose={() => setModal(null)} onSaved={() => { setModal(null); onReload(); }} />
      )}
      {modal === 'move' && (
        <MoveTestModal tenant={tenant} projectId={projectId} test={test} executionCount={testExecutions.length}
          onClose={() => setModal(null)} onDone={() => { setModal(null); onReload(); }} />
      )}
    </article>
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
      if (!testId) { setErr('Elige una prueba antes de adjuntar un video.'); return; }
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
              <span>{recording ? 'Grabando… toca para terminar.' : transcribing ? 'Transcribiendo…' : 'Toca para grabar por voz, o escribe abajo.'}</span>
            </button>
            <div className="knx-ficha-review-field">
              <label>Qué pasó en "{test.name}"</label>
              <textarea rows={5} value={freeText} onChange={(e) => setFreeText(e.target.value)} placeholder="Cuenta los resultados, condiciones, y cualquier cosa que valga la pena registrar… (puedes adjuntar una foto o documento con los resultados y la IA completa los campos sola)" />
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
                    placeholder="Sin especificar — completa a mano"
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

export function PruebasSection({ tenant, projectId, tests, executions, people, canManage, isDirector = false, personId, onReload, renderFeedback, feedbackCtx = null }) {
  // Mismo criterio que canManageTest (lib/kaiNext/projects.js): Director, o quien la creó.
  const canAdmin = (t) => isDirector || (canManage && !!personId && t.createdBy === personId);
  const [creatingTest, setCreatingTest] = useState(false);
  const [aportando, setAportando] = useState(false);

  return (
    <div style={{ marginBottom: 16 }}>
      <div className="knx-pr-top">
        <h2 className="knx-pr-top-title">Pruebas</h2>
        <div className="knx-pr-top-actions">
          {tests.length > 0 && <button type="button" className="knx-dlg-btn" onClick={() => setAportando(true)}>+ Aportar</button>}
          {canManage && <button type="button" className="knx-dlg-btn knx-dlg-btn--primary" onClick={() => setCreatingTest(true)}>+ Nueva prueba</button>}
        </div>
      </div>

      {!tests.length ? (
        <div className="knx-analisis-empty"><p>Sin pruebas todavía.</p></div>
      ) : (
        <div className="knx-pr-list">
          {tests.map((t) => (
            <TestCard key={t.id} tenant={tenant} projectId={projectId} test={t} executions={executions} people={people} canManage={canManage} canAdmin={canAdmin(t)} onReload={onReload} renderFeedback={renderFeedback} feedbackCtx={feedbackCtx} />
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
