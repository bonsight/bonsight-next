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
    .map((q, i) => ({
      id: `q${i + 1}`,
      order: i,
      text: typeof q === 'string' ? q : q.text,
      responseType: (typeof q === 'object' && q.responseType === 'multiple') ? 'multiple' : 'single',
    }))
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
const participantViewsKey = (t, id, pid) => `kai:${t}:activity:${id}:participant:${pid}:views`;

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
    kv.set(participantViewsKey(tenant, id, pid), {}),
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

// Marca la primera vez que este participante ve una pregunta (para medir tiempo de respuesta).
// Idempotente: no pisa la marca si ya existía (ej. reintentos de polling).
export async function recordQuestionViewed(tenant, id, pid, questionId) {
  const views = (await kv.get(participantViewsKey(tenant, id, pid))) ?? {};
  if (views[questionId]) return views;
  views[questionId] = new Date().toISOString();
  await kv.set(participantViewsKey(tenant, id, pid), views);
  return views;
}

export async function getParticipantViews(tenant, id, pid) {
  return (await kv.get(participantViewsKey(tenant, id, pid))) ?? {};
}

export async function recordAnswer(tenant, id, pid, questionId, text) {
  const [answersRaw, views] = await Promise.all([
    kv.get(participantAnswersKey(tenant, id, pid)),
    getParticipantViews(tenant, id, pid),
  ]);
  const answers = answersRaw ?? {};
  const answeredAt = new Date().toISOString();
  const viewedAt = views[questionId] ?? null;
  const timeOnQuestionMs = viewedAt ? new Date(answeredAt).getTime() - new Date(viewedAt).getTime() : null;
  answers[questionId] = { items: [{ text, addedAt: answeredAt }], viewedAt, answeredAt, timeOnQuestionMs };

  const participant = await getParticipant(tenant, id, pid);
  const updates = [kv.set(participantAnswersKey(tenant, id, pid), answers)];
  if (participant) {
    updates.push(kv.set(participantMetaKey(tenant, id, pid), { ...participant, status: 'answered', lastSeenAt: answeredAt }));
  }
  await Promise.all(updates);
  return answers;
}

export async function getParticipantAnswers(tenant, id, pid) {
  return (await kv.get(participantAnswersKey(tenant, id, pid))) ?? {};
}

// ── Borrador de respuestas múltiples (se construye antes de enviar) ──────

const draftKey = (t, id, pid) => `kai:${t}:activity:${id}:participant:${pid}:draft`;

async function getFullDraft(tenant, id, pid) {
  return (await kv.get(draftKey(tenant, id, pid))) ?? {};
}

export async function getDraft(tenant, id, pid, questionId) {
  const full = await getFullDraft(tenant, id, pid);
  return full[questionId] ?? [];
}

export async function addDraftItem(tenant, id, pid, questionId, text) {
  const full = await getFullDraft(tenant, id, pid);
  const list = full[questionId] ?? [];
  list.push({ text: String(text).trim(), addedAt: new Date().toISOString() });
  full[questionId] = list;
  await kv.set(draftKey(tenant, id, pid), full);
  return list;
}

export async function editDraftItem(tenant, id, pid, questionId, index, text) {
  const full = await getFullDraft(tenant, id, pid);
  const list = full[questionId] ?? [];
  if (!list[index]) return list;
  list[index] = { ...list[index], text: String(text).trim() };
  full[questionId] = list;
  await kv.set(draftKey(tenant, id, pid), full);
  return list;
}

export async function removeDraftItem(tenant, id, pid, questionId, index) {
  const full = await getFullDraft(tenant, id, pid);
  const list = (full[questionId] ?? []).filter((_, i) => i !== index);
  full[questionId] = list;
  await kv.set(draftKey(tenant, id, pid), full);
  return list;
}

// Mueve el borrador de una pregunta a la respuesta final y lo limpia.
export async function submitDraft(tenant, id, pid, questionId) {
  const [full, answersRaw, views] = await Promise.all([
    getFullDraft(tenant, id, pid),
    kv.get(participantAnswersKey(tenant, id, pid)),
    getParticipantViews(tenant, id, pid),
  ]);
  const items = full[questionId] ?? [];
  if (!items.length) throw new Error('No hay iniciativas para enviar.');

  const answers = answersRaw ?? {};
  const answeredAt = new Date().toISOString();
  const viewedAt = views[questionId] ?? null;
  const timeOnQuestionMs = viewedAt ? new Date(answeredAt).getTime() - new Date(viewedAt).getTime() : null;
  answers[questionId] = { items, viewedAt, answeredAt, timeOnQuestionMs };

  delete full[questionId];

  const participant = await getParticipant(tenant, id, pid);
  const updates = [
    kv.set(participantAnswersKey(tenant, id, pid), answers),
    kv.set(draftKey(tenant, id, pid), full),
  ];
  if (participant) {
    updates.push(kv.set(participantMetaKey(tenant, id, pid), { ...participant, status: 'answered', lastSeenAt: answeredAt }));
  }
  await Promise.all(updates);
  return answers[questionId];
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
    currentQuestionId: template[meta.currentQuestionIndex]?.id ?? null,
    currentQuestionResponseType: template[meta.currentQuestionIndex]?.responseType ?? 'single',
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

  const responses = participants.map((p, i) => {
    const answers = answersByParticipant[i] ?? {};
    const answeredQuestions = template.filter((q) => answers[q.id]);
    const completed = template.length > 0 && answeredQuestions.length === template.length;
    const answeredTimestamps = answeredQuestions.map((q) => answers[q.id].answeredAt).sort();
    const completedAt = completed ? answeredTimestamps[answeredTimestamps.length - 1] ?? null : null;
    const totalDurationMs = completedAt
      ? new Date(completedAt).getTime() - new Date(p.joinedAt).getTime()
      : null;
    const lastAnswered = [...answeredQuestions].pop();
    const status = completed ? 'completed' : meta.status === 'finished' ? 'abandoned' : 'in_progress';

    return {
      participant: p.name,
      status, // completed | abandoned | in_progress
      joinedAt: p.joinedAt,
      completedAt,
      totalDurationMs,
      questionsCompleted: answeredQuestions.length,
      questionsTotal: template.length,
      lastQuestionSeen: lastAnswered?.text ?? null,
      answers: template.map((q) => ({
        question: q.text,
        responseType: q.responseType ?? 'single',
        items: (answers[q.id]?.items ?? []).map((it) => it.text),
        viewedAt: answers[q.id]?.viewedAt ?? null,
        answeredAt: answers[q.id]?.answeredAt ?? null,
        timeOnQuestionMs: answers[q.id]?.timeOnQuestionMs ?? null,
      })),
    };
  });

  return { meta, template, participantCount: participants.length, responses };
}
