import Anthropic from '@anthropic-ai/sdk';
import { Redis } from '@upstash/redis';
import { listConversations, getConversationMessages } from './memory';
import { listLearnings } from './learnings';
import { getTenantMeta } from './tenants';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const AREA_IDS      = ['negocio', 'operaciones', 'tecnologia', 'finanzas', 'marketing', 'personas'];
const IMPACT_POINTS = { alto: 3, medio: 2, bajo: 1 };
const IMPACT_ORDER  = { alto: 0, medio: 1, bajo: 2 };

const participantInsightsKey    = (t) => `kai:${t}:participant_insights`;
const transversalLearningsKey   = (t) => `kai:${t}:transversal_learnings`;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Name extraction ────────────────────────────────────────────────────────

function isValidPersonName(raw) {
  if (!raw || raw.length < 2 || raw.length > 50) return false;
  if (raw.includes('?')) return false;
  if (/^(que|qué|como|cómo|cuál|cual|donde|dónde|quién|quien|cuándo|cuando|por qué|para qué|hola|hey|hi|buenas|buenos)/i.test(raw)) return false;
  if (raw.trim().split(/\s+/).length > 5) return false;
  if (!/^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]/.test(raw)) return false;
  return true;
}

function extractParticipant(messages) {
  const userMsgs = messages.filter((m) => m.role === 'user');
  for (let i = 0; i < Math.min(3, userMsgs.length); i++) {
    const raw = String(userMsgs[i]?.content ?? '').trim();
    if (!raw || raw.startsWith('__')) continue;
    // Strip intro phrases, then everything after first comma/semicolon or conjunction
    // Handles: "Soy Pedro, director comercial" → "Pedro"
    //          "Pedro y soy el CEO"            → "Pedro"
    const cleaned = raw
      .replace(/^(soy|me llamo|mi nombre es)\s+/i, '')
      .replace(/[,;]\s*.+$/, '')
      .replace(/\s+y\s+.+$/i, '')
      .trim();
    if (isValidPersonName(cleaned)) {
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
  }
  return null;
}

function extractRole(messages) {
  const userMsgs = messages.filter((m) => m.role === 'user');
  if (userMsgs.length < 2) return null;
  const raw = String(userMsgs[1]?.content ?? '').trim();
  if (!raw || raw.startsWith('__') || raw.length > 100 || raw.includes('?')) return null;
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

// ── Participant scoring ────────────────────────────────────────────────────

function computeContributionScore(learnings) {
  if (!learnings.length) return 0;
  const raw = learnings.reduce((sum, l) => {
    const pts  = IMPACT_POINTS[l.impact] ?? 2;
    const conf = typeof l.confidence === 'number' ? l.confidence : 0.7;
    return sum + conf * pts;
  }, 0);
  return Math.round((raw / (learnings.length * 3)) * 100);
}

function coveredAreas(learnings) {
  return [...new Set(
    learnings.map((l) => l.area?.toLowerCase()?.trim()).filter((a) => AREA_IDS.includes(a))
  )];
}

// ── Shared helper: builds participant → learnings map ─────────────────────

async function buildParticipantMap(tenant) {
  const [conversations, learnings] = await Promise.all([
    listConversations(tenant),
    listLearnings(tenant),
  ]);

  // Fetch conversations referenced by learnings but missing from the top-20 list.
  // Phantom/ghost conversations can flood the sorted set and push real conversations out.
  const knownIds = new Set(conversations.map((c) => c.id));
  const missingIds = [
    ...new Set(learnings.map((l) => l.conversationId).filter((id) => id && !knownIds.has(id))),
  ];
  const missingMetas = missingIds.length
    ? (await Promise.all(
        missingIds.map((id) => kv.get(`kai:${tenant}:conversation:${id}:meta`))
      )).filter(Boolean)
    : [];

  const allConversations = [...conversations, ...missingMetas];

  const conversationsWithParticipants = await Promise.all(
    allConversations.map(async (conv) => {
      const messages = await getConversationMessages(tenant, conv.id);
      return { ...conv, participant: extractParticipant(messages), role: extractRole(messages) };
    })
  );

  const validConvIds = new Set(
    conversationsWithParticipants.filter((c) => c.participant).map((c) => c.id)
  );

  const groups = {};
  for (const conv of conversationsWithParticipants) {
    const key = conv.participant ?? '__unknown__';
    if (!groups[key]) groups[key] = { name: conv.participant, role: conv.role, convIds: [] };
    groups[key].convIds.push(conv.id);
  }

  const participantLearningsMap = new Map();

  const participants = Object.values(groups)
    .filter((g) => g.name)
    .map((g) => {
      const groupLearnings = learnings.filter(
        (l) => l.conversationId && g.convIds.includes(l.conversationId)
      );
      participantLearningsMap.set(g.name, groupLearnings);
      return {
        participant:         g.name,
        role:                g.role,
        conversation_count:  g.convIds.length,
        learning_count:      groupLearnings.length,
        covered_areas:       coveredAreas(groupLearnings),
        top_learnings:       [],
        _contribution_score: computeContributionScore(groupLearnings),
      };
    })
    .sort((a, b) => b.learning_count - a.learning_count)
    .filter((p) => p.learning_count > 0 || p.conversation_count > 0);

  const orphanLearnings = learnings.filter(
    (l) => !l.conversationId || !validConvIds.has(l.conversationId)
  );

  if (orphanLearnings.length) {
    if (!participants.length) {
      participants.push({
        participant:         'Participante principal',
        role:                null,
        conversation_count:  conversations.length,
        learning_count:      0,
        covered_areas:       [],
        top_learnings:       [],
        _contribution_score: 0,
      });
      participantLearningsMap.set('Participante principal', []);
    }
    const top    = participants[0];
    const merged = [...(participantLearningsMap.get(top.participant) ?? []), ...orphanLearnings];
    participantLearningsMap.set(top.participant, merged);
    top.learning_count      += orphanLearnings.length;
    top.covered_areas        = coveredAreas(merged);
    top._contribution_score  = computeContributionScore(merged);
  }

  return {
    participants,
    participantLearningsMap,
    total_conversations: allConversations.length,
    total_learnings:     learnings.length,
  };
}

// ── Participant insight generation (Haiku) ─────────────────────────────────

function truncateLearning(content, maxWords = 12) {
  if (!content) return null;
  const sentence = content.split(/[.!?]/)[0].trim();
  const words    = sentence.split(/\s+/);
  return words.length <= maxWords ? sentence : words.slice(0, maxWords).join(' ') + '…';
}

async function generateInsights(learnings) {
  if (!learnings.length) return [];

  const top4 = [...learnings]
    .sort((a, b) => (IMPACT_ORDER[a.impact] ?? 1) - (IMPACT_ORDER[b.impact] ?? 1))
    .slice(0, 4);

  try {
    const response = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role:    'user',
        content: `Convierte estos aprendizajes en insights ejecutivos únicos en español (máximo 10 palabras cada uno).
Regla clave: si varios aprendizajes expresan la misma idea central, consolídalos en UN SOLO insight más rico. No repitas la misma idea con diferente redacción.
Usa frases nominales cortas. Sin sujeto explícito. Sin viñetas ni numeración.
Devuelve SOLO los insights únicos, uno por línea. Máximo 4, mínimo 1.

${top4.map((l, i) => `${i + 1}. ${l.content}`).join('\n')}`,
      }],
    });

    const text  = response.content[0]?.text ?? '';
    const lines = text.split('\n')
      .map((l) => l.replace(/^\d+\.\s*/, '').replace(/^[-•·]\s*/, '').trim())
      .filter((l) => l.length > 3 && l.length < 120);

    // Deduplicate output bullets — Levenshtein is fine here since lines are short (< 120 chars)
    const unique = [];
    for (const line of lines) {
      const s1  = line.toLowerCase();
      const dup = unique.some((u) => {
        const s2  = u.toLowerCase();
        const max = Math.max(s1.length, s2.length);
        if (!max) return true;
        // Quick reject: if first 8 chars differ a lot, skip full edit distance
        if (Math.abs(s1.length - s2.length) > max * 0.4) return false;
        // Levenshtein inline
        const row = Array.from({ length: s2.length + 1 }, (_, j) => j);
        for (let i = 1; i <= s1.length; i++) {
          let prev = row[0]; row[0] = i;
          for (let j = 1; j <= s2.length; j++) {
            const tmp = row[j];
            row[j] = s1[i-1] === s2[j-1] ? prev : 1 + Math.min(prev, row[j-1], row[j]);
            prev = tmp;
          }
        }
        return (max - row[s2.length]) / max >= 0.78;
      });
      if (!dup) unique.push(line);
    }

    return unique.length >= 1
      ? unique.slice(0, 4)
      : top4.map((l) => truncateLearning(l.content)).filter(Boolean);
  } catch {
    return top4.map((l) => truncateLearning(l.content)).filter(Boolean);
  }
}

// ── Transversal learning generation (Haiku) ───────────────────────────────

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function generateTransversals(tenantName, participantContext) {
  try {
    const response = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{
        role:    'user',
        content: `Eres un analista organizacional. Analiza los siguientes aprendizajes de ${tenantName}, agrupados por participante.

Detecta PATRONES que se repiten, complementan o contradicen entre al menos 2 participantes distintos.

Para cada patrón encontrado, genera un objeto con este formato exacto:
{"title":"Título conciso del patrón (máx 8 palabras)","description":"Descripción en 1-2 oraciones","impact":"alto|medio|bajo","participants":["nombre1","nombre2"],"evidence":["evidencia breve del participante 1","evidencia breve del participante 2"]}

Responde ÚNICAMENTE con un JSON array válido. Si no hay patrones transversales claros, devuelve [].

APRENDIZAJES POR PARTICIPANTE:

${participantContext}`,
      }],
    });

    const text      = response.content[0]?.text ?? '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((t) => t.title && Array.isArray(t.participants) && t.participants.length >= 2)
      .map((t) => ({
        id:           generateId(),
        type:         'transversal',
        title:        t.title,
        description:  t.description ?? '',
        impact:       t.impact ?? 'medio',
        participants: t.participants ?? [],
        evidence:     Array.isArray(t.evidence) ? t.evidence : [],
        sources_count: t.participants.length,
        created_at:   new Date().toISOString(),
      }));
  } catch {
    return [];
  }
}

// ── Public: read from cache ────────────────────────────────────────────────

export async function getCachedParticipantInsights(tenant) {
  return await kv.get(participantInsightsKey(tenant));
}

export async function getCachedTransversalLearnings(tenant) {
  return await kv.get(transversalLearningsKey(tenant));
}

// ── Public: regenerate everything (called write-time via after()) ──────────

export async function regenerateAllArtifacts(tenant) {
  const { participants, participantLearningsMap, total_conversations, total_learnings } =
    await buildParticipantMap(tenant);

  const withLearnings = participants.filter(
    (p) => (participantLearningsMap.get(p.participant) ?? []).length > 0
  );

  // Build transversal context string
  const participantContext = withLearnings
    .map((p) => {
      const ls = participantLearningsMap.get(p.participant) ?? [];
      return `${p.participant}:\n${ls.map((l) => `- [${l.area ?? 'general'}, ${l.impact}] ${l.content}`).join('\n')}`;
    })
    .join('\n\n');

  // Run insight generation (per participant) and transversal detection in parallel
  const [, transversals] = await Promise.all([
    // Participant insights
    Promise.all(
      participants.map(async (p) => {
        const pLearnings = participantLearningsMap.get(p.participant) ?? [];
        p.top_learnings  = await generateInsights(pLearnings);
      })
    ).then(async () => {
      const result = {
        participants,
        total_conversations,
        total_learnings,
        generatedAt: new Date().toISOString(),
      };
      await kv.set(participantInsightsKey(tenant), result);
      return result;
    }),

    // Transversal learnings (need ≥2 participants with learnings)
    (async () => {
      if (withLearnings.length < 2) {
        await kv.set(transversalLearningsKey(tenant), []);
        return [];
      }
      const meta        = await getTenantMeta(tenant);
      const tenantName  = meta?.name ?? tenant;
      const result      = await generateTransversals(tenantName, participantContext);
      await kv.set(transversalLearningsKey(tenant), result);
      return result;
    })(),
  ]);

  return { participants, transversals };
}

// Kept for backwards compatibility (participants endpoint cold-start)
export async function regenerateParticipantInsights(tenant) {
  const { participants, participantLearningsMap, total_conversations, total_learnings } =
    await buildParticipantMap(tenant);

  await Promise.all(
    participants.map(async (p) => {
      const pLearnings = participantLearningsMap.get(p.participant) ?? [];
      p.top_learnings  = await generateInsights(pLearnings);
    })
  );

  const result = {
    participants,
    total_conversations,
    total_learnings,
    generatedAt: new Date().toISOString(),
  };
  await kv.set(participantInsightsKey(tenant), result);
  return result;
}
