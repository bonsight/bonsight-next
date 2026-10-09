import Anthropic from '@anthropic-ai/sdk';
import { getActivityCanvas } from '@/lib/kai/activities';
import { getBusinessProfile } from '@/lib/kai/tenants';

const MODEL = 'claude-sonnet-4-6';

// Claude a veces agrega texto después del JSON pese a la instrucción de responder
// "únicamente JSON" — recortamos el primer objeto balanceado en vez de confiar en eso.
function extractFirstJsonObject(text) {
  const start = text.indexOf('{');
  if (start === -1) throw new Error('La respuesta no contiene JSON.');
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  throw new Error('JSON incompleto en la respuesta.');
}

// Todos los grupos de todas las preguntas, con su pregunta de origen — la fusión solo
// tiene sentido ANTES de que exista cualquier ficha (después, cada grupo ya arrastra
// respuestas consolidadas propias).
function collectAllGroups(canvas) {
  const out = [];
  for (const q of canvas.questions ?? []) {
    for (const g of q.groups ?? []) {
      if (g.ficha || g.fichaActivityId) continue;
      out.push({ questionId: q.questionId, questionText: q.questionText, group: g });
    }
  }
  return out;
}

function buildFusionPrompt(entries) {
  const block = entries
    .map(
      (e, i) =>
        `${i}. id:${e.group.id} (pregunta "${e.questionText}", questionId:${e.questionId}) — "${e.group.name}"\nConsolidado: ${e.group.consolidatedText || '(sin texto)'}\nIniciativas: ${e.group.itemIndexes?.length ?? 0} · Involucrados: ${(e.group.involucrados ?? []).length}`
    )
    .join('\n\n');

  return `Sos el asistente de Kai que detecta cuando dos agrupaciones de una activity, generadas para preguntas DISTINTAS, en realidad hablan del mismo tema de fondo — para sugerir fusionarlas antes de que se generen fichas por separado.

Solo comparás grupos que vienen de preguntas DIFERENTES entre sí (nunca sugieras fusionar dos grupos de la misma pregunta — para eso existe una fusión manual dentro de la pregunta). Sé selectivo: la mayoría de los grupos NO va a tener una coincidencia real, y está bien no sugerir nada para ellos.

GRUPOS (de todas las preguntas, sin ficha todavía):
${block}

Para cada par que valga la pena sugerir fusionar, evaluá qué tan fuerte es la coincidencia:
- "fuerte": ambos apuntan claramente al mismo problema/tema de fondo, aunque estén redactados distinto.
- "débil": hay alguna superficie en común (una palabra, un concepto tangencial) pero en el fondo son cosas distintas — sugerilo igual pero marcalo como débil y explicá la duda en el motivo, para que el humano lo revise con más cuidado.

Respondé ÚNICAMENTE con JSON válido, sin texto antes ni después, sin markdown:
{
  "suggestions": [
    {
      "groupIdA": "string",
      "groupIdB": "string",
      "strength": "fuerte|débil",
      "reason": "string, concreto, citando de qué habla cada uno"
    }
  ]
}`;
}

export async function suggestGroupFusions(tenant, activityId) {
  const canvas = await getActivityCanvas(tenant, activityId);
  if (!canvas) throw new Error('Esta actividad no tiene un canvas todavía.');

  const entries = collectAllGroups(canvas);
  const byId = new Map(entries.map((e) => [e.group.id, e]));
  const questionIds = new Set(entries.map((e) => e.questionId));

  if (questionIds.size < 2) {
    return { activityId, suggestions: [], skippedCount: entries.length };
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3072,
    messages: [{ role: 'user', content: buildFusionPrompt(entries) }],
  });
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const parsed = JSON.parse(extractFirstJsonObject(text));

  const itemsByQuestion = canvas.itemsByQuestion ?? {};
  const suggestedIds = new Set();

  const suggestions = (parsed.suggestions ?? [])
    .map((s) => {
      const a = byId.get(s.groupIdA);
      const b = byId.get(s.groupIdB);
      if (!a || !b || a.questionId === b.questionId) return null;

      const itemsA = (a.group.itemIndexes ?? []).map((idx) => itemsByQuestion[a.questionId]?.[idx]).filter(Boolean);
      const itemsB = (b.group.itemIndexes ?? []).map((idx) => itemsByQuestion[b.questionId]?.[idx]).filter(Boolean);
      const seenText = new Set(itemsA.map((it) => it.text.trim().toLowerCase()));
      const uniqueFromB = itemsB.filter((it) => !seenText.has(it.text.trim().toLowerCase()));
      const combinedIniciativas = itemsA.length + uniqueFromB.length;
      const combinedInvolucrados = new Set([...(a.group.involucrados ?? []), ...(b.group.involucrados ?? [])]).size;

      suggestedIds.add(a.group.id);
      suggestedIds.add(b.group.id);

      return {
        groupA: {
          questionId: a.questionId, questionText: a.questionText, groupId: a.group.id, name: a.group.name,
          itemCount: itemsA.length, involucradosCount: (a.group.involucrados ?? []).length,
          area: a.group.area ?? null, responsable: a.group.responsable ?? null,
        },
        groupB: {
          questionId: b.questionId, questionText: b.questionText, groupId: b.group.id, name: b.group.name,
          itemCount: itemsB.length, involucradosCount: (b.group.involucrados ?? []).length,
          area: b.group.area ?? null, responsable: b.group.responsable ?? null,
        },
        strength: s.strength === 'fuerte' ? 'fuerte' : 'débil',
        reason: s.reason ?? '',
        preview: { combinedIniciativas, combinedInvolucrados },
      };
    })
    .filter(Boolean);

  return { activityId, suggestions, skippedCount: entries.length - suggestedIds.size };
}

function buildKnowledgeBlock(profile) {
  const lines = [];
  if (profile?.pains?.length) lines.push(`Dolores documentados:\n${profile.pains.map((p) => `- ${p}`).join('\n')}`);
  if (profile?.objectives?.shortTerm?.length) lines.push(`Objetivos de corto plazo:\n${profile.objectives.shortTerm.map((o) => `- ${o}`).join('\n')}`);
  if (profile?.objectives?.mediumTerm?.length) lines.push(`Objetivos de mediano plazo:\n${profile.objectives.mediumTerm.map((o) => `- ${o}`).join('\n')}`);
  if (profile?.opportunities?.length) lines.push(`Oportunidades identificadas:\n${profile.opportunities.map((o) => `- ${o}`).join('\n')}`);
  return lines.length ? lines.join('\n\n') : '(Kai todavía no documentó dolores, objetivos ni oportunidades para esta empresa.)';
}

function buildFichaOrderPrompt({ groups, knowledgeBlock }) {
  const groupsBlock = groups
    .map(
      (g) => `### Grupo id:${g.id} — "${g.name}"
Consolidado: ${g.consolidatedText || '(sin texto)'}
Categoría: ${g.area || 'Sin definir'} · Responsable: ${g.responsable || 'Sin definir'}
Iniciativas cargadas: ${g.itemCount} · Involucrados: ${g.involucradosCount}`
    )
    .join('\n\n');

  return `Sos el asistente de Kai que sugiere en qué orden lanzar las fichas de objetivos de los grupos de una activity, ANTES de que existan respuestas — todavía no hay fichas, solo los grupos con sus iniciativas cargadas.

CONOCIMIENTO YA DOCUMENTADO POR KAI SOBRE ESTA EMPRESA:
${knowledgeBlock}

GRUPOS DE ESTA PREGUNTA (a ordenar entre sí):
${groupsBlock}

Para cada grupo:
1. Evaluá si el tema del grupo (consolidado + iniciativas) se conecta con algo que Kai ya documentó arriba (un dolor, objetivo u oportunidad). Si la conexión es real y concreta, marcá hasSignal: true y citá específicamente con qué dolor/objetivo se conecta en el motivo (ej. "se conecta con 'reducir tiempo de onboarding', dolor marcado como prioritario por Kai"). Cuanto más fuerte y prioritaria esa conexión, más arriba en el orden.
2. Si no hay conexión clara con el conocimiento documentado, marcá hasSignal: false y resolvé el orden por desempate estructural, usando en este orden de peso: (a) más iniciativas cargadas, (b) más involucrados, (c) grupo más completo (Categoría y Responsable ya definidos). El motivo debe decir explícitamente "Sin señal clara" y qué criterio de desempate se usó.
3. Asigná un número de orden (order) del 1 en adelante, sin repetir, a todos los grupos.

Respondé ÚNICAMENTE con JSON válido, sin texto antes ni después, sin markdown:
{ "groups": [ { "groupId": "string", "order": 1, "hasSignal": true, "reason": "string" } ] }`;
}

export async function suggestFichaOrder(tenant, activityId, questionId) {
  const canvas = await getActivityCanvas(tenant, activityId);
  if (!canvas) throw new Error('Esta actividad no tiene un canvas todavía.');

  const question = (canvas.questions ?? []).find((q) => q.questionId === questionId);
  if (!question) throw new Error('Pregunta no encontrada en el canvas.');

  const groups = (question.groups ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    consolidatedText: g.consolidatedText,
    area: g.area,
    responsable: g.responsable,
    itemCount: g.itemIndexes?.length ?? 0,
    involucradosCount: g.involucrados?.length ?? 0,
  }));
  if (groups.length < 2) throw new Error('Hace falta al menos 2 grupos para sugerir un orden.');

  const profile = await getBusinessProfile(tenant);
  const knowledgeBlock = buildKnowledgeBlock(profile);

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: buildFichaOrderPrompt({ groups, knowledgeBlock }) }],
  });
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const parsed = JSON.parse(extractFirstJsonObject(text));

  const groupIds = new Set(groups.map((g) => g.id));
  return parsed.groups
    .filter((g) => groupIds.has(g.groupId))
    .map((g) => ({
      groupId: g.groupId,
      order: Number(g.order) || 0,
      hasSignal: !!g.hasSignal,
      reason: g.reason ?? '',
    }))
    .sort((a, b) => a.order - b.order);
}
