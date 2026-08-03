import Anthropic from '@anthropic-ai/sdk';
import { getInvestigation } from '@/lib/aria/memory';

const MODEL = 'claude-sonnet-4-6';

// Claude a veces agrega texto después del JSON pese a la instrucción de responder
// "únicamente JSON" — en vez de confiar en que no lo haga, recortamos el primer objeto
// balanceado empezando en la primera "{", ignorando cualquier cosa después de que cierra.
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

function findLatestCanvas(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.canvas) return { canvas: messages[i].canvas, messageIndex: i };
  }
  return null;
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

function buildPrompt(entries) {
  const block = entries
    .map(
      (e, i) =>
        `${i}. id:${e.group.id} (pregunta "${e.questionText}", questionId:${e.questionId}) — "${e.group.name}"\nConsolidado: ${e.group.consolidatedText || '(sin texto)'}\nIniciativas: ${e.group.itemIndexes?.length ?? 0} · Involucrados: ${(e.group.involucrados ?? []).length}`
    )
    .join('\n\n');

  return `Sos el asistente de Aria que detecta cuando dos agrupaciones de un workshop, generadas para preguntas DISTINTAS, en realidad hablan del mismo tema de fondo — para sugerir fusionarlas antes de que se generen fichas por separado.

Solo comparás grupos que vienen de preguntas DIFERENTES entre sí (nunca sugieras fusionar dos grupos de la misma pregunta — para eso ya existe un botón de fusión manual dentro de la pregunta). Sé selectivo: la mayoría de los grupos NO va a tener una coincidencia real, y está bien no sugerir nada para ellos.

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

export async function suggestGroupFusions(tenant, investigationId) {
  const investigation = await getInvestigation(tenant, investigationId);
  if (!investigation) throw new Error('Investigación no encontrada.');

  const found = findLatestCanvas(investigation.messages ?? []);
  if (!found) throw new Error('Esta investigación no tiene un canvas de workshop.');

  const entries = collectAllGroups(found.canvas);
  const byId = new Map(entries.map((e) => [e.group.id, e]));
  const questionIds = new Set(entries.map((e) => e.questionId));

  if (questionIds.size < 2) {
    return { investigationId, messageIndex: found.messageIndex, suggestions: [], skippedCount: entries.length };
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3072,
    messages: [{ role: 'user', content: buildPrompt(entries) }],
  });
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const parsed = JSON.parse(extractFirstJsonObject(text));

  const itemsByQuestion = found.canvas.itemsByQuestion ?? {};
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

  return {
    investigationId,
    messageIndex: found.messageIndex,
    suggestions,
    skippedCount: entries.length - suggestedIds.size,
  };
}
