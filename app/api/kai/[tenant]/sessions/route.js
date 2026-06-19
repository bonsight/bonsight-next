import { Redis } from '@upstash/redis';
import {
  listAllConversations,
  getConversationMessages,
  getConversationCheckpointSummary,
} from '@/lib/kai/memory';
import { listLearnings } from '@/lib/kai/learnings';

const kv = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });

const AREA_IDS = ['negocio', 'operaciones', 'tecnologia', 'finanzas', 'marketing', 'personas'];

// Normalise area labels that come in with accents or variant spellings
const AREA_NORM = {
  tecnología: 'tecnologia', tecnologia: 'tecnologia',
  negocio: 'negocio', operaciones: 'operaciones',
  finanzas: 'finanzas', marketing: 'marketing', personas: 'personas',
};

function normaliseArea(a) {
  return AREA_NORM[a?.toLowerCase()?.trim()] ?? a?.toLowerCase()?.trim() ?? null;
}

// Simple learning-based coverage score (independent of profile, so historical deltas are computable)
function learningScore(learnings) {
  const scores = AREA_IDS.map((area) => {
    const count = learnings.filter((l) => normaliseArea(l.area) === area).length;
    return Math.min(100, count * 20); // 5 learnings per area = 100%
  });
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function extractParticipant(messages) {
  const userMsgs = messages.filter((m) => m.role === 'user');
  for (let i = 0; i < Math.min(3, userMsgs.length); i++) {
    const raw = String(userMsgs[i]?.content ?? '').trim();
    if (!raw || raw.startsWith('__')) continue;
    const cleaned = raw
      .replace(/^(soy|me llamo|mi nombre es)\s+/i, '')
      .replace(/[,;]\s*.+$/, '')
      .replace(/\s+y\s+.+$/i, '')
      .trim();
    if (cleaned.length >= 2 && cleaned.length <= 50 && /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]/.test(cleaned) && !cleaned.includes('?') && cleaned.split(/\s+/).length <= 5) {
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

export async function GET(req, { params }) {
  const { tenant } = await params;
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('id');

  // Single session detail (includes full learnings content)
  if (sessionId) {
    const [learnings, checkpoint] = await Promise.all([
      listLearnings(tenant),
      getConversationCheckpointSummary(tenant, sessionId),
    ]);
    const sessionLearnings = learnings.filter((l) => l.conversationId === sessionId);
    return Response.json({
      learnings: sessionLearnings,
      risks:        checkpoint?.risks ?? [],
      opportunities: checkpoint?.opportunities ?? [],
    });
  }

  const [allConversations, allLearnings] = await Promise.all([
    listAllConversations(tenant),
    listLearnings(tenant),
  ]);

  // Fetch conversations referenced by learnings but not in the sorted set
  const knownIds = new Set(allConversations.map((c) => c.id));
  const missingIds = [...new Set(
    allLearnings.map((l) => l.conversationId).filter((id) => id && !knownIds.has(id))
  )];
  const missingMetas = missingIds.length
    ? (await Promise.all(
        missingIds.map((id) => kv.get(`kai:${tenant}:conversation:${id}:meta`))
      )).filter(Boolean)
    : [];

  const conversations = [...allConversations, ...missingMetas];

  // Fetch messages + checkpoint summaries for all conversations
  const enriched = await Promise.all(
    conversations.map(async (conv) => {
      const [messages, checkpoint] = await Promise.all([
        getConversationMessages(tenant, conv.id),
        getConversationCheckpointSummary(tenant, conv.id),
      ]);
      const participant   = extractParticipant(messages);
      const role          = extractRole(messages);
      const convLearnings = allLearnings.filter((l) => l.conversationId === conv.id);
      const areas         = [...new Set(convLearnings.map((l) => normaliseArea(l.area)).filter(Boolean))];
      const hasRealContent = participant || convLearnings.length > 0;

      return {
        id:               conv.id,
        title:            conv.title,
        createdAt:        conv.createdAt,
        participant,
        role,
        areas,
        learning_count:   convLearnings.length,
        learnings:        convLearnings,
        risk_count:       checkpoint?.risks?.length ?? null,
        opportunity_count: checkpoint?.opportunities?.length ?? null,
        risks:            checkpoint?.risks ?? [],
        opportunities:    checkpoint?.opportunities ?? [],
        hasRealContent,
      };
    })
  );

  // Compute coverage deltas per session using chronological learning order
  // Sort all learnings by createdAt to establish ordering
  const sortedLearnings = [...allLearnings].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );

  for (const session of enriched) {
    if (!session.learnings.length) {
      session.score_before = null;
      session.score_after  = null;
      continue;
    }
    const sessionLearningIds = new Set(session.learnings.map((l) => l.id));
    const beforeLearnings = sortedLearnings.filter((l) => !sessionLearningIds.has(l.id));
    const afterLearnings  = [...beforeLearnings, ...session.learnings];
    session.score_before = learningScore(beforeLearnings);
    session.score_after  = learningScore(afterLearnings);
    delete session.learnings; // don't send full learning content in list view
  }

  // Only show sessions that generated at least one discovery (learning, risk, or opportunity)
  const sessions = enriched
    .filter((s) => s.learning_count > 0 || (s.risk_count ?? 0) > 0 || (s.opportunity_count ?? 0) > 0)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return Response.json({ sessions });
}
