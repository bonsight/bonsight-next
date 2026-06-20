import { notFound } from 'next/navigation';
import { getTenantMeta, getBusinessProfile } from '@/lib/kai/tenants';
import { listConversations, getConversationMessages, getConversationCheckpointSummary } from '@/lib/kai/memory';
import { listLearnings } from '@/lib/kai/learnings';
import { listInvestigations } from '@/lib/aria/memory';
import { calcOverallScore } from '@/lib/kai/scoring';
import { getTenantMonthlyUsage, getRecentEvents, currentMonth } from '@/lib/kai/usage';
import TenantDetail from './TenantDetail';

export async function generateMetadata({ params }) {
  const { tenant } = await params;
  const meta = await getTenantMeta(tenant);
  return { title: meta ? `${meta.name} — Kai Admin` : 'Kai Admin' };
}

// ── Participant extraction (mirrors artifacts.js) ─────────────────────────

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
    if (
      cleaned.length >= 2 && cleaned.length <= 50 &&
      /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]/.test(cleaned) &&
      !cleaned.includes('?') &&
      cleaned.split(/\s+/).length <= 5
    ) {
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

// ─────────────────────────────────────────────────────────────────────────

export default async function TenantAdminPage({ params }) {
  const { tenant } = await params;

  const [meta, profile, conversations, ariaInvestigations, allLearnings, tenantUsage, usageEvents] = await Promise.all([
    getTenantMeta(tenant),
    getBusinessProfile(tenant),
    listConversations(tenant),
    listInvestigations(tenant),
    listLearnings(tenant),
    getTenantMonthlyUsage(tenant, currentMonth()),
    getRecentEvents(tenant, 50),
  ]);

  if (!meta) notFound();

  // Group learnings by conversationId
  const learningsByConv = {};
  for (const l of allLearnings) {
    if (l.conversationId) {
      (learningsByConv[l.conversationId] ??= []).push(l);
    }
  }

  // Fetch messages for all conversations that produced learnings (parallel)
  const convIdsWithLearnings = new Set(Object.keys(learningsByConv));
  const relevantConvs = conversations.filter((c) => convIdsWithLearnings.has(c.id));
  const convMessagesList = await Promise.all(
    relevantConvs.map((c) => getConversationMessages(tenant, c.id))
  );

  // participantMap: { [convId]: { name, role } }
  const participantMap = {};
  relevantConvs.forEach((c, idx) => {
    const msgs = convMessagesList[idx];
    participantMap[c.id] = {
      name: extractParticipant(msgs),
      role: extractRole(msgs),
    };
  });

  // Recent session (most recent conversation with learnings)
  const sortedConvs = [...conversations].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  const recentActiveConv = sortedConvs.find((c) => convIdsWithLearnings.has(c.id));

  let recentSession = null;
  if (recentActiveConv) {
    const checkpoint     = await getConversationCheckpointSummary(tenant, recentActiveConv.id);
    const sessionLearnings = learningsByConv[recentActiveConv.id] ?? [];
    const sortedSession    = [...sessionLearnings].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    const sessionIds   = new Set(sessionLearnings.map((l) => l.id));
    const beforeLearns = allLearnings.filter((l) => !sessionIds.has(l.id));

    recentSession = {
      date:          recentActiveConv.createdAt,
      participant:   participantMap[recentActiveConv.id]?.name ?? null,
      role:          participantMap[recentActiveConv.id]?.role ?? null,
      area:          sessionLearnings[0]?.area ?? null,
      learningCount: sessionLearnings.length,
      riskCount:     checkpoint?.risks?.length ?? 0,
      oppCount:      checkpoint?.opportunities?.length ?? 0,
      latestDiscovery: sortedSession[0]?.content ?? null,
      scoreBefore:   calcOverallScore(profile, beforeLearns),
      scoreAfter:    calcOverallScore(profile, allLearnings),
      scoreDelta:    calcOverallScore(profile, allLearnings) - calcOverallScore(profile, beforeLearns),
    };
  }

  // Change counts
  const now  = Date.now();
  const DAY  = 86400000;
  const WEEK = 7 * DAY;
  const changeCounts = {
    todayLearnings: allLearnings.filter((l) => now - new Date(l.createdAt) < DAY).length,
    weekLearnings:  allLearnings.filter((l) => now - new Date(l.createdAt) < WEEK).length,
    totalRisks:     (profile?.risks ?? []).length,
    totalOpps:      (profile?.opportunities ?? []).length,
  };

  // Recent learnings (top 5) enriched with participant
  const recentLearnings = [...allLearnings]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  // Knowledge quality metric (replaces completeness %)
  const AREA_NORM = { 'tecnología': 'tecnologia', tecnologia: 'tecnologia', negocio: 'negocio', operaciones: 'operaciones', finanzas: 'finanzas', marketing: 'marketing', personas: 'personas' };
  const normArea = (a) => AREA_NORM[a?.toLowerCase()?.trim()] ?? a?.toLowerCase()?.trim();

  const uniqueParticipants = [...new Set(
    Object.values(participantMap).map((v) => v.name).filter(Boolean)
  )];
  const areasCovered = new Set(allLearnings.map((l) => normArea(l.area)).filter(Boolean)).size;
  const avgConfRaw   = allLearnings.length
    ? allLearnings.reduce((s, l) => s + (l.confidence ?? 0.7), 0) / allLearnings.length
    : 0;

  const knowledgeQuality = {
    score:             calcOverallScore(profile, allLearnings),
    participantCount:  uniqueParticipants.length,
    areasCovered,
    uniqueLearnings:   allLearnings.length,
    confidenceLabel:   avgConfRaw >= 0.75 ? 'alta' : avgConfRaw >= 0.5 ? 'media' : 'baja',
    confidenceColor:   avgConfRaw >= 0.75 ? '#1D9E75' : avgConfRaw >= 0.5 ? '#F59E0B' : '#EF4444',
  };

  return (
    <TenantDetail
      meta={meta}
      profile={profile}
      conversations={conversations}
      allLearnings={allLearnings}
      participantMap={participantMap}
      knowledgeQuality={knowledgeQuality}
      recentSession={recentSession}
      changeCounts={changeCounts}
      recentLearnings={recentLearnings}
      ariaInvestigations={ariaInvestigations}
      tenantUsage={tenantUsage}
      usageEvents={usageEvents}
    />
  );
}
