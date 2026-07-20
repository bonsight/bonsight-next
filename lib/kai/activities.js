import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const CODE_TTL_SECONDS = 60 * 60 * 48; // 48h desde el lock
const DEFAULT_QUESTION_DURATION_SECONDS = 120;
const MIN_QUESTION_DURATION_SECONDS = 10;
const MAX_QUESTION_DURATION_SECONDS = 1800;

const activitiesKey = (t) => `kai:${t}:activities`;
const metaKey = (t, id) => `kai:${t}:activity:${id}:meta`;
const templateKey = (t, id) => `kai:${t}:activity:${id}:template`;
const codeKey = (code) => `kai:activity_code:${code}`;

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function generateActivityCode(tenant) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const suffix = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const prefix = tenant.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) || 'ACTIVITY';
  return `${prefix}-${suffix}`;
}

export async function createActivityDraft(tenant, { name, objective = '', type = '', description = '', conversationId = null }) {
  const id = generateId();
  const now = new Date().toISOString();
  const meta = {
    id,
    tenant,
    name,
    objective,
    type,
    description,
    status: 'draft',
    code: null,
    currentQuestionIndex: 0,
    createdAt: now,
    startedAt: null,
    finishedAt: null,
    createdInConversationId: conversationId,
  };
  await Promise.all([
    kv.set(metaKey(tenant, id), meta),
    kv.zadd(activitiesKey(tenant), { score: Date.now(), member: id }),
  ]);
  return meta;
}

export async function updateActivityDraft(tenant, id, updates) {
  const current = await kv.get(metaKey(tenant, id));
  if (!current || current.status !== 'draft') return current ?? null;
  const updated = { ...current, ...updates };
  await kv.set(metaKey(tenant, id), updated);
  return updated;
}

export async function getLatestDraft(tenant, conversationId) {
  const ids = await kv.zrange(activitiesKey(tenant), 0, 4, { rev: true });
  if (!ids.length) return null;
  const metas = await Promise.all(ids.map((id) => kv.get(metaKey(tenant, id))));
  return metas.find((m) => m && m.status === 'draft' && m.createdInConversationId === conversationId) ?? null;
}

export async function lockActivity(tenant, id, questions) {
  const current = await kv.get(metaKey(tenant, id));
  if (!current) throw new Error(`Activity '${id}' no encontrada`);
  if (current.status !== 'draft') return current; // ya bloqueada — idempotente

  let code;
  for (let attempt = 0; attempt < 5; attempt++) {
    code = generateActivityCode(tenant);
    const exists = await kv.get(codeKey(code));
    if (!exists) break;
  }

  const template = questions
    .map((q, i) => ({ id: `q${i + 1}`, order: i, text: typeof q === 'string' ? q : q.text }))
    .filter((q) => q.text);

  if (!template.length) throw new Error('No se puede bloquear una Activity sin preguntas');

  const updated = {
    ...current,
    status: 'ready',
    code,
    currentQuestionIndex: 0,
    startedAt: null,
    currentQuestionStartedAt: null,
    questionDurationSeconds: current.questionDurationSeconds ?? DEFAULT_QUESTION_DURATION_SECONDS,
  };

  await Promise.all([
    kv.set(metaKey(tenant, id), updated),
    kv.set(templateKey(tenant, id), template),
    kv.set(codeKey(code), { tenant, activityId: id }, { ex: CODE_TTL_SECONDS }),
  ]);

  return updated;
}

export async function startActivity(tenant, id) {
  const current = await kv.get(metaKey(tenant, id));
  if (!current || current.status !== 'ready') return current ?? null;
  const updated = { ...current, status: 'active', startedAt: new Date().toISOString() };
  await kv.set(metaKey(tenant, id), updated);
  return updated;
}

export async function startCurrentQuestion(tenant, id) {
  const current = await kv.get(metaKey(tenant, id));
  if (!current || current.status !== 'active' || current.currentQuestionStartedAt) return current ?? null;
  const updated = { ...current, currentQuestionStartedAt: new Date().toISOString() };
  await kv.set(metaKey(tenant, id), updated);
  return updated;
}

export async function getActivityMeta(tenant, id) {
  return kv.get(metaKey(tenant, id));
}

export async function getActivityTemplate(tenant, id) {
  return (await kv.get(templateKey(tenant, id))) ?? [];
}

export async function getActivityByCode(code) {
  const ref = await kv.get(codeKey(code));
  if (!ref) return null;
  const meta = await kv.get(metaKey(ref.tenant, ref.activityId));
  if (!meta) return null;
  return { tenant: ref.tenant, activityId: ref.activityId, meta };
}

export async function listActivitiesForTenant(tenant) {
  const ids = await kv.zrange(activitiesKey(tenant), 0, -1, { rev: true });
  if (!ids.length) return [];
  const metas = await Promise.all(ids.map((id) => kv.get(metaKey(tenant, id))));
  return metas.filter(Boolean);
}

// ── Control-plane (organizador) ──────────────────────────────────────────

export async function finishActivity(tenant, id) {
  const current = await kv.get(metaKey(tenant, id));
  if (!current) return null;
  if (current.status === 'finished') return current;
  const updated = { ...current, status: 'finished', finishedAt: new Date().toISOString() };
  await kv.set(metaKey(tenant, id), updated);
  return updated;
}

export async function advanceQuestion(tenant, id) {
  const current = await kv.get(metaKey(tenant, id));
  if (!current || current.status !== 'active') return current ?? null;

  const template = await getActivityTemplate(tenant, id);
  const nextIndex = current.currentQuestionIndex + 1;

  if (nextIndex >= template.length) {
    return finishActivity(tenant, id);
  }

  // Avanza el índice pero NO arranca el timer todavía — el organizador debe
  // confirmar explícitamente con "Iniciar Pregunta N →" (mismo patrón que la 1ra).
  const updated = { ...current, currentQuestionIndex: nextIndex, currentQuestionStartedAt: null };
  await kv.set(metaKey(tenant, id), updated);
  return updated;
}

export async function updateQuestionDuration(tenant, id, seconds) {
  const current = await kv.get(metaKey(tenant, id));
  if (!current) return null;
  const clamped = Math.min(MAX_QUESTION_DURATION_SECONDS, Math.max(MIN_QUESTION_DURATION_SECONDS, Math.round(Number(seconds) || DEFAULT_QUESTION_DURATION_SECONDS)));
  const updated = { ...current, questionDurationSeconds: clamped };
  await kv.set(metaKey(tenant, id), updated);
  return updated;
}

// ── Participantes ─────────────────────────────────────────────────────────

const MAX_PARTICIPANTS = 20;

const participantsKey = (t, id) => `kai:${t}:activity:${id}:participants`;
const participantMetaKey = (t, id, pid) => `kai:${t}:activity:${id}:participant:${pid}:meta`;
const participantAnswersKey = (t, id, pid) => `kai:${t}:activity:${id}:participant:${pid}:answers`;

export async function listParticipants(tenant, id) {
  const pids = await kv.zrange(participantsKey(tenant, id), 0, -1);
  if (!pids.length) return [];
  const metas = await Promise.all(pids.map((pid) => kv.get(participantMetaKey(tenant, id, pid))));
  return metas.filter(Boolean);
}

export async function addParticipant(tenant, id, name) {
  const activity = await getActivityMeta(tenant, id);
  if (!activity || !['ready', 'active'].includes(activity.status)) {
    throw new Error('Esta actividad no está aceptando participantes en este momento');
  }

  const count = await kv.zcard(participantsKey(tenant, id));
  if (count >= MAX_PARTICIPANTS) {
    throw new Error(`Esta actividad ya alcanzó el máximo de ${MAX_PARTICIPANTS} participantes`);
  }

  const pid = crypto.randomUUID();
  const now = new Date().toISOString();
  const meta = { id: pid, name: String(name).trim().slice(0, 80), joinedAt: now, lastSeenAt: now, status: 'waiting' };

  await Promise.all([
    kv.set(participantMetaKey(tenant, id, pid), meta),
    kv.set(participantAnswersKey(tenant, id, pid), {}),
    kv.zadd(participantsKey(tenant, id), { score: Date.now(), member: pid }),
  ]);

  return meta;
}

export async function getParticipant(tenant, id, pid) {
  return kv.get(participantMetaKey(tenant, id, pid));
}

export async function touchParticipant(tenant, id, pid) {
  const current = await getParticipant(tenant, id, pid);
  if (!current) return null;
  const updated = { ...current, lastSeenAt: new Date().toISOString() };
  await kv.set(participantMetaKey(tenant, id, pid), updated);
  return updated;
}

export async function recordAnswer(tenant, id, pid, questionId, text) {
  const answers = (await kv.get(participantAnswersKey(tenant, id, pid))) ?? {};
  answers[questionId] = { text, answeredAt: new Date().toISOString() };

  const participant = await getParticipant(tenant, id, pid);
  const updates = [kv.set(participantAnswersKey(tenant, id, pid), answers)];
  if (participant) {
    updates.push(kv.set(participantMetaKey(tenant, id, pid), { ...participant, status: 'answered', lastSeenAt: new Date().toISOString() }));
  }
  await Promise.all(updates);
  return answers;
}

export async function getParticipantAnswers(tenant, id, pid) {
  return (await kv.get(participantAnswersKey(tenant, id, pid))) ?? {};
}

// ── Status (organizador + participante) ──────────────────────────────────

export async function getActivityStatus(tenant, id) {
  const [meta, template, participants] = await Promise.all([
    getActivityMeta(tenant, id),
    getActivityTemplate(tenant, id),
    listParticipants(tenant, id),
  ]);
  if (!meta) return null;

  const answeredCount = participants.filter((p) => p.status === 'answered').length;

  return {
    meta,
    questionCount: template.length,
    currentQuestion: template[meta.currentQuestionIndex] ?? null,
    connectedCount: participants.length,
    answeredCount,
    participants: participants.map((p) => ({ id: p.id, name: p.name, status: p.status })),
  };
}

// Payload recortado para el participante: sin nombres de otros participantes.
export async function getPublicActivityStatus(tenant, id) {
  const [meta, template] = await Promise.all([
    getActivityMeta(tenant, id),
    getActivityTemplate(tenant, id),
  ]);
  if (!meta) return null;
  return {
    status: meta.status,
    currentQuestionIndex: meta.currentQuestionIndex,
    questionCount: template.length,
    currentQuestionStartedAt: meta.currentQuestionStartedAt ?? null,
    questionDurationSeconds: meta.questionDurationSeconds ?? DEFAULT_QUESTION_DURATION_SECONDS,
  };
}

// ── Resultados (Aria) ────────────────────────────────────────────────────

export async function getFinishedActivitiesSummary(tenant) {
  const activities = await listActivitiesForTenant(tenant);
  const finished = activities.filter((a) => a.status === 'finished');
  const results = await Promise.all(
    finished.map(async (a) => ({
      id: a.id,
      name: a.name,
      objective: a.objective,
      type: a.type,
      finishedAt: a.finishedAt,
      participantCount: await kv.zcard(participantsKey(tenant, a.id)),
    }))
  );
  return results;
}

export async function getActivityResults(tenant, id) {
  const [meta, template, participants] = await Promise.all([
    getActivityMeta(tenant, id),
    getActivityTemplate(tenant, id),
    listParticipants(tenant, id),
  ]);
  if (!meta) return null;

  const answersByParticipant = await Promise.all(
    participants.map((p) => getParticipantAnswers(tenant, id, p.id))
  );

  const responses = participants.map((p, i) => ({
    participant: p.name,
    answers: template.map((q) => ({
      question: q.text,
      answer: answersByParticipant[i]?.[q.id]?.text ?? null,
    })),
  }));

  return { meta, template, participantCount: participants.length, responses };
}
