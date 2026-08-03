import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const KEY_PREFIX = 'aria';
export const BUSINESS_ID = 'bonsight';

function investigationsIndexKey(businessId) {
  return `${KEY_PREFIX}:${businessId}:investigations`;
}

function investigationMetaKey(businessId, id) {
  return `${KEY_PREFIX}:${businessId}:investigation:${id}:meta`;
}

function investigationMessagesKey(businessId, id) {
  return `${KEY_PREFIX}:${businessId}:investigation:${id}:messages`;
}

function metricsKey(businessId) {
  return `${KEY_PREFIX}:${businessId}:metrics`;
}

const METRICS_HISTORY_LIMIT = 2000;

function defaultMeta(id, owner) {
  const now = new Date().toISOString();
  return {
    id,
    titulo: 'Nueva investigación',
    emoji: '🔍',
    area: 'General',
    topic: '',
    estado: 'abierta',
    resumen_sesion: '',
    nuevos_insights: [],
    decisiones_confirmadas: [],
    preguntas_abiertas: [],
    objetivos_actualizados: [],
    sugerencia_proxima_sesion: '',
    tags: [],
    owner: owner || null,
    createdAt: now,
    updatedAt: now,
  };
}

// owner es un identificador de vista opcional (?usr=... en la URL) — separa qué
// investigaciones ve cada persona dentro del mismo tenant, sin ser un mecanismo de
// auth real. Sin owner, solo se listan las investigaciones sin dueño (las de siempre).
export async function listInvestigations(businessId, owner) {
  const ids = await kv.zrange(investigationsIndexKey(businessId), 0, -1, { rev: true });
  if (!ids.length) return [];
  const metas = await Promise.all(ids.map((id) => kv.get(investigationMetaKey(businessId, id))));
  return metas.filter(Boolean).filter((meta) => (owner ? meta.owner === owner : !meta.owner));
}

export async function createInvestigation(businessId, owner) {
  const id = crypto.randomUUID();
  const meta = defaultMeta(id, owner);

  await Promise.all([
    kv.set(investigationMetaKey(businessId, id), meta),
    kv.set(investigationMessagesKey(businessId, id), []),
    kv.zadd(investigationsIndexKey(businessId), { score: Date.now(), member: id }),
  ]);

  return { id, meta };
}

export async function getInvestigation(businessId, id) {
  const [meta, messages] = await Promise.all([
    kv.get(investigationMetaKey(businessId, id)),
    kv.get(investigationMessagesKey(businessId, id)),
  ]);
  if (!meta) return null;
  return { meta, messages: messages ?? [] };
}

export async function getInvestigationMeta(businessId, id) {
  if (!id) return null;
  return (await kv.get(investigationMetaKey(businessId, id))) ?? null;
}

export async function updateInvestigationMeta(businessId, id, updates) {
  if (!id) return { ok: false, error: 'Missing investigation id' };

  const current = (await kv.get(investigationMetaKey(businessId, id))) ?? defaultMeta(id);
  const meta = { ...current, ...updates, id, updatedAt: new Date().toISOString() };

  await Promise.all([
    kv.set(investigationMetaKey(businessId, id), meta),
    kv.zadd(investigationsIndexKey(businessId), { score: Date.now(), member: id }),
  ]);

  return { ok: true, meta };
}

export async function appendInvestigationMessages(businessId, id, newMessages) {
  if (!id || !newMessages?.length) return;

  const [existing, meta] = await Promise.all([
    kv.get(investigationMessagesKey(businessId, id)),
    kv.get(investigationMetaKey(businessId, id)),
  ]);

  const updatedMessages = [...(existing ?? []), ...newMessages];
  const now = Date.now();

  await Promise.all([
    kv.set(investigationMessagesKey(businessId, id), updatedMessages),
    kv.zadd(investigationsIndexKey(businessId), { score: now, member: id }),
    meta ? kv.set(investigationMetaKey(businessId, id), { ...meta, updatedAt: new Date(now).toISOString() }) : Promise.resolve(),
  ]);
}

const UNSORTED_GROUP_ID = '__sin_agrupar__';

// Mutaciones puras sobre el canvas persistido de un mensaje — nunca pasan por Claude.
export async function updateCanvasInMessage(businessId, id, messageIndex, action, params = {}) {
  if (!id) throw new Error('Falta investigationId.');
  const messages = (await kv.get(investigationMessagesKey(businessId, id))) ?? [];
  const msg = messages[messageIndex];
  if (!msg || !msg.canvas) throw new Error('Canvas no encontrado en ese mensaje.');

  const canvas = {
    ...msg.canvas,
    questions: msg.canvas.questions.map((q) => ({ ...q, groups: q.groups.map((g) => ({ ...g, itemIndexes: [...g.itemIndexes] })) })),
    itemsByQuestion: Object.fromEntries(
      Object.entries(msg.canvas.itemsByQuestion ?? {}).map(([qid, items]) => [qid, items.map((it) => ({ ...it }))])
    ),
    historyByQuestion: { ...(msg.canvas.historyByQuestion ?? {}) },
  };
  // Fusión entre grupos de preguntas DISTINTAS (sugerida antes de que exista cualquier
  // ficha) — no encaja en el flujo de abajo porque itemIndexes está acotado a una sola
  // pregunta. En vez de migrar el modelo de datos, copiamos el texto de las iniciativas
  // del grupo origen como ítems nuevos dentro de itemsByQuestion del destino — así el
  // grupo fusionado queda idéntico a cualquier otro grupo normal para el resto del sistema
  // (ficha, sprint-draft, orden sugerido no necesitan saber que esto pasó).
  if (action === 'merge_groups_cross_question') {
    const sourceQuestion = canvas.questions.find((q) => q.questionId === params.sourceQuestionId);
    const targetQuestion = canvas.questions.find((q) => q.questionId === params.targetQuestionId);
    if (!sourceQuestion || !targetQuestion) throw new Error('Pregunta no encontrada en el canvas.');
    const sourceGroup = sourceQuestion.groups.find((g) => g.id === params.sourceGroupId);
    const targetGroup = targetQuestion.groups.find((g) => g.id === params.targetGroupId);
    if (!sourceGroup || !targetGroup) throw new Error('Grupos no encontrados.');

    const sourceItems = canvas.itemsByQuestion[params.sourceQuestionId] ?? [];
    const targetItems = canvas.itemsByQuestion[params.targetQuestionId] ?? (canvas.itemsByQuestion[params.targetQuestionId] = []);

    for (const idx of sourceGroup.itemIndexes) {
      const item = sourceItems[idx];
      if (!item) continue;
      targetGroup.itemIndexes.push(targetItems.length);
      targetItems.push({ ...item });
    }

    targetGroup.involucrados = [...new Set([...(targetGroup.involucrados ?? []), ...(sourceGroup.involucrados ?? [])])];
    if (params.area !== undefined) targetGroup.area = params.area || null;
    if (params.responsable !== undefined) targetGroup.responsable = params.responsable?.trim() || null;

    sourceQuestion.groups = sourceQuestion.groups.filter((g) => g.id !== params.sourceGroupId);

    canvas.summary = {
      ...canvas.summary,
      groupCount: canvas.questions.reduce((sum, q) => sum + q.groups.length, 0),
      totalItems: Object.values(canvas.itemsByQuestion).reduce((sum, arr) => sum + arr.length, 0),
    };
    canvas.updatedAt = new Date().toISOString();
    messages[messageIndex] = { ...msg, canvas };
    await kv.set(investigationMessagesKey(businessId, id), messages);
    return canvas;
  }

  const question = canvas.questions.find((q) => q.questionId === params.questionId);
  if (!question) throw new Error('Pregunta no encontrada en el canvas.');

  const findGroup = (groupId) => question.groups.find((g) => g.id === groupId);
  const items = canvas.itemsByQuestion[params.questionId] ?? (canvas.itemsByQuestion[params.questionId] = []);

  const MAX_HISTORY = 5;
  if (action !== 'undo') {
    const stack = [...(canvas.historyByQuestion[params.questionId] ?? [])];
    stack.push({ groups: JSON.parse(JSON.stringify(question.groups)), items: JSON.parse(JSON.stringify(items)) });
    if (stack.length > MAX_HISTORY) stack.shift();
    canvas.historyByQuestion[params.questionId] = stack;
  }

  if (action === 'rename_group') {
    const group = findGroup(params.groupId);
    if (!group) throw new Error('Grupo no encontrado.');
    group.name = String(params.name ?? '').trim() || group.name;
  } else if (action === 'move_item') {
    const from = findGroup(params.fromGroupId);
    const to = findGroup(params.toGroupId);
    if (!from || !to) throw new Error('Grupo origen/destino no encontrado.');
    from.itemIndexes = from.itemIndexes.filter((i) => i !== params.itemIndex);
    if (!to.itemIndexes.includes(params.itemIndex)) to.itemIndexes.push(params.itemIndex);
  } else if (action === 'merge_groups') {
    const source = findGroup(params.sourceGroupId);
    const target = findGroup(params.targetGroupId);
    if (!source || !target) throw new Error('Grupos no encontrados.');
    target.itemIndexes = [...new Set([...target.itemIndexes, ...source.itemIndexes])];
    question.groups = question.groups.filter((g) => g.id !== params.sourceGroupId);
  } else if (action === 'delete_group') {
    const group = findGroup(params.groupId);
    if (!group) throw new Error('Grupo no encontrado.');
    let unsorted = findGroup(UNSORTED_GROUP_ID);
    if (!unsorted) {
      unsorted = { id: UNSORTED_GROUP_ID, name: 'Sin agrupar', consolidatedText: 'Respuestas sin un grupo asignado.', itemIndexes: [] };
      question.groups.push(unsorted);
    }
    unsorted.itemIndexes = [...new Set([...unsorted.itemIndexes, ...group.itemIndexes])];
    question.groups = question.groups.filter((g) => g.id !== params.groupId);
  } else if (action === 'create_group') {
    if (!params.id || !params.name) throw new Error('id y name son requeridos.');
    if (findGroup(params.id)) throw new Error('Ya existe un grupo con ese id.');
    question.groups.push({ id: params.id, name: params.name, consolidatedText: params.consolidatedText ?? '', itemIndexes: [] });
  } else if (action === 'revert_groups') {
    const original = canvas.originalGroupsByQuestion?.[params.questionId];
    if (!original) throw new Error('No hay una versión original guardada para esta pregunta.');
    question.groups = JSON.parse(JSON.stringify(original));
  } else if (action === 'comment_item') {
    if (!items[params.itemIndex]) throw new Error('Iniciativa no encontrada.');
    items[params.itemIndex] = { ...items[params.itemIndex], comment: String(params.comment ?? '').trim() };
  } else if (action === 'create_item') {
    const group = findGroup(params.groupId);
    if (!group) throw new Error('Grupo no encontrado.');
    const text = String(params.text ?? '').trim();
    if (!text) throw new Error('El texto de la iniciativa es requerido.');
    const newIndex = items.length;
    items.push({ participant: params.participant?.trim() || 'Agregada en sesión', text });
    group.itemIndexes.push(newIndex);
  } else if (action === 'update_group_meta') {
    const group = findGroup(params.groupId);
    if (!group) throw new Error('Grupo no encontrado.');
    if (params.area !== undefined) group.area = params.area || null;
    if (params.responsable !== undefined) group.responsable = params.responsable?.trim() || null;
    if (params.involucrados !== undefined) {
      group.involucrados = Array.isArray(params.involucrados) ? params.involucrados.filter(Boolean) : [];
    }
  } else if (action === 'link_ficha_activity') {
    const group = findGroup(params.groupId);
    if (!group) throw new Error('Grupo no encontrado.');
    group.fichaActivityId = params.activityId ?? null;
    group.fichaCode = params.code ?? null;
  } else if (action === 'save_ficha') {
    const group = findGroup(params.groupId);
    if (!group) throw new Error('Grupo no encontrado.');
    group.ficha = params.ficha ?? null;
  } else if (action === 'undo') {
    const stack = canvas.historyByQuestion[params.questionId] ?? [];
    if (!stack.length) throw new Error('No hay más pasos para deshacer.');
    const prev = stack[stack.length - 1];
    question.groups = prev.groups;
    canvas.itemsByQuestion[params.questionId] = prev.items;
    canvas.historyByQuestion[params.questionId] = stack.slice(0, -1);
  } else {
    throw new Error(`Acción desconocida: ${action}`);
  }

  canvas.summary = {
    ...canvas.summary,
    groupCount: canvas.questions.reduce((sum, q) => sum + q.groups.length, 0),
    totalItems: Object.values(canvas.itemsByQuestion).reduce((sum, arr) => sum + arr.length, 0),
  };
  canvas.updatedAt = new Date().toISOString();

  messages[messageIndex] = { ...msg, canvas };
  await kv.set(investigationMessagesKey(businessId, id), messages);
  return canvas;
}

export async function deleteInvestigation(businessId, id) {
  await Promise.all([
    kv.del(investigationMetaKey(businessId, id)),
    kv.del(investigationMessagesKey(businessId, id)),
    kv.zrem(investigationsIndexKey(businessId), id),
  ]);
  return { ok: true };
}

export async function searchArchivedInvestigations(businessId, query) {
  const all = await listInvestigations(businessId);
  const archived = all.filter((inv) => inv.estado === 'archivada');
  if (!archived.length) return [];

  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (!words.length) return [];

  const scored = archived
    .map((inv) => {
      const haystack = [
        inv.titulo,
        inv.area,
        inv.resumen_sesion,
        ...(inv.entities ?? []),
        ...(inv.tags ?? []),
        ...(inv.nuevos_insights ?? []),
        ...(inv.decisiones_confirmadas ?? []),
        ...(inv.preguntas_abiertas ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const score = words.reduce((acc, w) => acc + (haystack.includes(w) ? 1 : 0), 0);
      return { inv, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return scored.map(({ inv, score }) => ({
    id: inv.id,
    title: inv.titulo,
    emoji: inv.emoji ?? '🔍',
    date: new Date(inv.updatedAt || inv.createdAt).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
    }),
    tags: inv.tags ?? [],
    entities: inv.entities ?? [],
    summary: inv.resumen_sesion || '',
    area: inv.area ?? 'General',
    insights: inv.nuevos_insights ?? [],
    decisions: inv.decisiones_confirmadas ?? [],
    relevance: score >= 3 ? 'high' : score >= 2 ? 'medium' : 'low',
  }));
}

export async function recordAriaMetrics(businessId, metric) {
  try {
    const key = metricsKey(businessId);
    const entry = { ...metric, timestamp: new Date().toISOString() };
    await kv.lpush(key, entry);
    await kv.ltrim(key, 0, METRICS_HISTORY_LIMIT - 1);
    return { ok: true };
  } catch (err) {
    console.error('Aria metrics record error:', err);
    return { ok: false, error: err.message };
  }
}
