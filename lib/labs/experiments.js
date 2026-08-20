import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const experimentsIndexKey = (tenant) => `labs:${tenant}:experiments`;
const experimentMetaKey = (tenant, id) => `labs:${tenant}:experiment:${id}:meta`;
const testsKey = (tenant, id) => `labs:${tenant}:experiment:${id}:tests`;
const executionsKey = (tenant, id) => `labs:${tenant}:experiment:${id}:executions`;
const eventsKey = (tenant, id) => `labs:${tenant}:experiment:${id}:events`;
const feedbackKey = (tenant, id) => `labs:${tenant}:experiment:${id}:feedback`;
const reportsKey = (tenant, id) => `labs:${tenant}:experiment:${id}:reports`;
const participantsKey = (tenant) => `labs:${tenant}:participants`;

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Participantes (roster del tenant — join una vez, no login por persona) ──
export async function joinTenant(tenant, { name, role }) {
  if (!name?.trim()) throw new Error('El nombre es requerido.');
  if (!['Registrador', 'Supervisor', 'Director'].includes(role)) throw new Error('Rol inválido.');
  const participants = (await kv.get(participantsKey(tenant))) ?? [];
  const participant = { id: generateId(), name: String(name).trim().slice(0, 60), role, joinedAt: new Date().toISOString() };
  await kv.set(participantsKey(tenant), [...participants, participant]);
  return participant;
}

export async function getParticipant(tenant, participantId) {
  const participants = (await kv.get(participantsKey(tenant))) ?? [];
  return participants.find((p) => p.id === participantId) ?? null;
}

export async function listParticipants(tenant) {
  return (await kv.get(participantsKey(tenant))) ?? [];
}

// ── Experimentos ──────────────────────────────────────────────────────────
export async function listExperiments(tenant) {
  const ids = await kv.zrange(experimentsIndexKey(tenant), 0, -1, { rev: true });
  if (!ids.length) return [];
  const metas = await Promise.all(ids.map((id) => kv.get(experimentMetaKey(tenant, id))));
  return metas.filter(Boolean);
}

export async function createExperiment(tenant, { name, purpose, hypothesis, successCriteria, team }) {
  const id = generateId();
  const now = Date.now();
  const meta = {
    id,
    name: String(name || '').trim() || 'Proyecto sin título',
    purpose: purpose || '',
    hypothesis: hypothesis || '',
    successCriteria: Array.isArray(successCriteria) ? successCriteria : [],
    team: Array.isArray(team) ? team : [],
    status: 'activo',
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  };
  await Promise.all([
    kv.set(experimentMetaKey(tenant, id), meta),
    kv.zadd(experimentsIndexKey(tenant), { score: now, member: id }),
    kv.set(testsKey(tenant, id), []),
    kv.set(executionsKey(tenant, id), []),
    kv.set(eventsKey(tenant, id), []),
    kv.set(feedbackKey(tenant, id), []),
    kv.set(reportsKey(tenant, id), []),
  ]);
  return meta;
}

export async function getExperimentMeta(tenant, id) {
  return kv.get(experimentMetaKey(tenant, id));
}

export async function getExperiment(tenant, id) {
  const [meta, tests, executions, events, feedback, reports] = await Promise.all([
    kv.get(experimentMetaKey(tenant, id)),
    kv.get(testsKey(tenant, id)),
    kv.get(executionsKey(tenant, id)),
    kv.get(eventsKey(tenant, id)),
    kv.get(feedbackKey(tenant, id)),
    kv.get(reportsKey(tenant, id)),
  ]);
  if (!meta) return null;
  return {
    meta,
    tests: tests ?? [],
    executions: executions ?? [],
    events: events ?? [],
    feedback: feedback ?? [],
    reports: reports ?? [],
  };
}

async function touchExperiment(tenant, id) {
  const now = Date.now();
  const meta = await kv.get(experimentMetaKey(tenant, id));
  if (meta) await kv.set(experimentMetaKey(tenant, id), { ...meta, updatedAt: new Date(now).toISOString() });
  await kv.zadd(experimentsIndexKey(tenant), { score: now, member: id });
}

// Historia — se agrega desde acá, nunca se escribe a mano.
async function addEvent(tenant, id, event) {
  const events = (await kv.get(eventsKey(tenant, id))) ?? [];
  const entry = { id: generateId(), date: new Date().toISOString(), ...event };
  await kv.set(eventsKey(tenant, id), [entry, ...events]);
  return entry;
}

// ── Pruebas (cada una define su propio esquema de campos) ──────────────────
export async function createTest(tenant, experimentId, { name, icon, fields }) {
  if (!name?.trim()) throw new Error('El nombre de la prueba es requerido.');
  if (!Array.isArray(fields) || !fields.length) throw new Error('La prueba necesita al menos un campo.');
  const tests = (await kv.get(testsKey(tenant, experimentId))) ?? [];
  const test = {
    id: generateId(),
    name: name.trim(),
    icon: icon || '🧪',
    fields: fields.map((f) => ({ key: f.key, label: f.label, type: f.type || 'text' })),
    createdAt: new Date().toISOString(),
  };
  await kv.set(testsKey(tenant, experimentId), [...tests, test]);
  await touchExperiment(tenant, experimentId);
  return test;
}

export async function getTests(tenant, experimentId) {
  return (await kv.get(testsKey(tenant, experimentId))) ?? [];
}

// ── Ejecuciones (aportes contra una prueba) ─────────────────────────────────
export async function addExecution(tenant, experimentId, { testId, contributor, role, values, tag, evidence, missingFields, note }) {
  const [tests, executions] = await Promise.all([
    kv.get(testsKey(tenant, experimentId)),
    kv.get(executionsKey(tenant, experimentId)),
  ]);
  const test = (tests ?? []).find((t) => t.id === testId);
  if (!test) throw new Error('Prueba no encontrada.');

  const execution = {
    id: generateId(),
    testId,
    contributor,
    role,
    values: values || {},
    tag: tag || 'referencia',
    evidence: Array.isArray(evidence) ? evidence : [],
    missingFields: Array.isArray(missingFields) ? missingFields : [],
    note: note || '',
    createdAt: new Date().toISOString(),
  };
  await kv.set(executionsKey(tenant, experimentId), [...(executions ?? []), execution]);
  await addEvent(tenant, experimentId, {
    type: 'aporte',
    actor: contributor,
    title: `${contributor} aportó — ${test.name}`,
    body: note || Object.entries(values || {}).map(([k, v]) => `${k}: ${v}`).join(' · '),
  });
  await touchExperiment(tenant, experimentId);
  return execution;
}

export async function validateExecution(tenant, experimentId, executionId, { by, note }) {
  const [executions, tests] = await Promise.all([
    kv.get(executionsKey(tenant, experimentId)),
    kv.get(testsKey(tenant, experimentId)),
  ]);
  const list = executions ?? [];
  const idx = list.findIndex((e) => e.id === executionId);
  if (idx === -1) throw new Error('Ejecución no encontrada.');
  list[idx] = { ...list[idx], validatedBy: by, validatedAt: new Date().toISOString(), validationNote: note || '' };
  await kv.set(executionsKey(tenant, experimentId), list);

  const test = (tests ?? []).find((t) => t.id === list[idx].testId);
  await addEvent(tenant, experimentId, {
    type: 'validacion',
    actor: by,
    title: `${by} validó una ejecución${test ? ' — ' + test.name : ''}`,
    body: note || '',
  });
  await touchExperiment(tenant, experimentId);
  return list[idx];
}

// ── Feedback ─────────────────────────────────────────────────────────────
export async function addFeedback(tenant, experimentId, { who, target, text, visibility, suggestion }) {
  const feedback = (await kv.get(feedbackKey(tenant, experimentId))) ?? [];
  const entry = {
    id: generateId(),
    who,
    target: target || 'Proyecto general',
    text,
    visibility: visibility || 'Todo el equipo',
    suggestion: suggestion || null,
    createdAt: new Date().toISOString(),
  };
  await kv.set(feedbackKey(tenant, experimentId), [entry, ...feedback]);
  await addEvent(tenant, experimentId, {
    type: 'feedback',
    actor: who,
    title: `${who} dejó feedback sobre ${entry.target}`,
    body: text,
  });
  await touchExperiment(tenant, experimentId);
  return entry;
}

export async function dismissFeedbackSuggestion(tenant, experimentId, feedbackId) {
  const feedback = (await kv.get(feedbackKey(tenant, experimentId))) ?? [];
  const idx = feedback.findIndex((f) => f.id === feedbackId);
  if (idx === -1) throw new Error('Feedback no encontrado.');
  feedback[idx] = { ...feedback[idx], suggestion: null };
  await kv.set(feedbackKey(tenant, experimentId), feedback);
  return feedback[idx];
}

// ── Reportes ─────────────────────────────────────────────────────────────
export async function addReportDraft(tenant, experimentId, { doc, periodFrom, periodTo }) {
  const reports = (await kv.get(reportsKey(tenant, experimentId))) ?? [];
  const entry = { id: generateId(), periodFrom, periodTo, doc, status: 'borrador', createdAt: new Date().toISOString() };
  await kv.set(reportsKey(tenant, experimentId), [entry, ...reports]);
  return entry;
}

export async function approveReport(tenant, experimentId, reportId) {
  const reports = (await kv.get(reportsKey(tenant, experimentId))) ?? [];
  const idx = reports.findIndex((r) => r.id === reportId);
  if (idx === -1) throw new Error('Reporte no encontrado.');
  reports[idx] = { ...reports[idx], status: 'aprobado', approvedAt: new Date().toISOString() };
  await kv.set(reportsKey(tenant, experimentId), reports);
  await addEvent(tenant, experimentId, {
    type: 'reporte',
    actor: null,
    title: 'Reporte aprobado y compartido',
    body: `Período ${reports[idx].periodFrom} – ${reports[idx].periodTo}`,
  });
  await touchExperiment(tenant, experimentId);
  return reports[idx];
}
