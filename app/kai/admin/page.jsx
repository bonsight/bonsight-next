import Link from 'next/link';
import { getAllTenantsMeta, getBusinessProfile } from '@/lib/kai/tenants';
import { listLearnings } from '@/lib/kai/learnings';
import { listConversations, getConversationMessages, getConversationCheckpointSummary } from '@/lib/kai/memory';
import { calcOverallScore } from '@/lib/kai/scoring';

// ── Helpers ────────────────────────────────────────────────────────────────

function initials(name = '') {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

function relativeTime(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)  return 'Hace un momento';
  if (mins < 60) return `Hace ${mins} min`;
  if (hours < 24) return `Hace ${hours} h`;
  if (days === 1) return 'Ayer';
  if (days < 7)  return `Hace ${days} días`;
  return new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function activityStatus(lastActivityDate) {
  if (!lastActivityDate) return 'stagnant';
  const days = (Date.now() - new Date(lastActivityDate).getTime()) / 86400000;
  if (days < 7)  return 'active';
  if (days < 30) return 'inactive';
  return 'stagnant';
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

// ── Per-tenant data fetch ──────────────────────────────────────────────────

async function getTenantStats(slug) {
  const [learnings, profile, conversations] = await Promise.all([
    listLearnings(slug),
    getBusinessProfile(slug),
    listConversations(slug),
  ]);

  const coverageScore  = calcOverallScore(profile, learnings);
  const totalRisks     = (profile?.risks ?? []).length;
  const totalOpps      = (profile?.opportunities ?? []).length;

  const sortedLearnings = [...learnings].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  const latestLearning   = sortedLearnings[0];
  const lastActivityDate = latestLearning?.createdAt ?? null;
  const latestDiscovery  = latestLearning?.content
    ? latestLearning.content.length > 100
      ? latestLearning.content.slice(0, 97) + '…'
      : latestLearning.content
    : null;

  // Group learnings by conversationId to find most recent active session
  const learningsByConv = {};
  for (const l of learnings) {
    if (l.conversationId) {
      (learningsByConv[l.conversationId] ??= []).push(l);
    }
  }

  const recentActiveConv = [...conversations]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .find((c) => learningsByConv[c.id]?.length > 0);

  let lastParticipant      = null;
  let lastSessionLearnings = 0;
  let lastSessionRisks     = 0;
  let lastSessionOpps      = 0;

  if (recentActiveConv) {
    lastSessionLearnings = learningsByConv[recentActiveConv.id]?.length ?? 0;
    const [messages, checkpoint] = await Promise.all([
      getConversationMessages(slug, recentActiveConv.id),
      getConversationCheckpointSummary(slug, recentActiveConv.id),
    ]);
    lastParticipant  = extractParticipant(messages);
    lastSessionRisks = checkpoint?.risks?.length ?? 0;
    lastSessionOpps  = checkpoint?.opportunities?.length ?? 0;
  }

  return {
    coverageScore,
    totalLearnings: learnings.length,
    totalRisks,
    totalOpps,
    lastActivityDate,
    latestDiscovery,
    lastParticipant,
    lastSessionLearnings,
    lastSessionRisks,
    lastSessionOpps,
    status: activityStatus(lastActivityDate),
  };
}

// ── UI Components ──────────────────────────────────────────────────────────

function StatusDot({ status }) {
  const cfg = {
    active:   { color: '#1D9E75', label: 'Activo' },
    inactive: { color: '#F59E0B', label: 'Inactivo' },
    stagnant: { color: '#EF4444', label: 'Estancado' },
  };
  const { color, label } = cfg[status] ?? cfg.stagnant;
  return (
    <span className="admin-status-dot-wrap">
      <span className="admin-status-dot" style={{ background: color }} />
      <span className="admin-status-label" style={{ color }}>{label}</span>
    </span>
  );
}

function CoverageBar({ score }) {
  const color = score >= 70 ? '#1D9E75' : score >= 40 ? '#F59E0B' : '#EF4444';
  return (
    <div className="admin-coverage-row">
      <span className="admin-coverage-pct" style={{ color }}>{score}%</span>
      <div className="admin-coverage-track">
        <div className="admin-coverage-fill" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="admin-coverage-label">cobertura</span>
    </div>
  );
}

function LastActivity({ date, participant, sessionLearnings, sessionRisks, sessionOpps }) {
  if (!date) {
    return <p className="admin-card-no-activity">Sin actividad reciente</p>;
  }
  const hasDiscoveries = sessionLearnings > 0 || sessionRisks > 0 || sessionOpps > 0;
  return (
    <div className="admin-card-activity">
      <div className="admin-card-activity-meta">
        <span className="admin-card-activity-date">{relativeTime(date)}</span>
        {participant && (
          <span className="admin-card-activity-participant">{participant}</span>
        )}
      </div>
      {hasDiscoveries && (
        <div className="admin-card-activity-counts">
          {sessionLearnings > 0 && (
            <span className="admin-count-chip admin-count-chip--learning">+{sessionLearnings} aprendizaje{sessionLearnings !== 1 ? 's' : ''}</span>
          )}
          {sessionRisks > 0 && (
            <span className="admin-count-chip admin-count-chip--risk">+{sessionRisks} riesgo{sessionRisks !== 1 ? 's' : ''}</span>
          )}
          {sessionOpps > 0 && (
            <span className="admin-count-chip admin-count-chip--opp">+{sessionOpps} oportunidad{sessionOpps !== 1 ? 'es' : ''}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function AdminDashboard() {
  const tenants = await getAllTenantsMeta();

  if (tenants.length === 0) {
    return (
      <div className="admin-empty-state">
        <div className="admin-empty-icon">🗂</div>
        <div className="admin-empty-title">Sin clientes aún</div>
        <div className="admin-empty-sub">Usa el botón "+ Nuevo cliente" para agregar tu primer cliente.</div>
      </div>
    );
  }

  const stats = await Promise.all(tenants.map((t) => getTenantStats(t.slug)));

  const globalMetrics = stats.reduce(
    (acc, s) => ({
      learnings:     acc.learnings + s.totalLearnings,
      risks:         acc.risks + s.totalRisks,
      opportunities: acc.opportunities + s.totalOpps,
      coverageSum:   acc.coverageSum + s.coverageScore,
    }),
    { learnings: 0, risks: 0, opportunities: 0, coverageSum: 0 }
  );
  const avgCoverage = Math.round(globalMetrics.coverageSum / tenants.length);

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-heading">Clientes</div>

      {/* Global metrics bar */}
      <div className="admin-global-metrics">
        <div className="admin-global-metric">
          <span className="admin-global-metric-value">{tenants.length}</span>
          <span className="admin-global-metric-label">clientes</span>
        </div>
        <div className="admin-global-metric-sep" />
        <div className="admin-global-metric">
          <span className="admin-global-metric-value">{globalMetrics.learnings}</span>
          <span className="admin-global-metric-label">aprendizajes</span>
        </div>
        <div className="admin-global-metric-sep" />
        <div className="admin-global-metric">
          <span className="admin-global-metric-value">{globalMetrics.risks}</span>
          <span className="admin-global-metric-label">riesgos</span>
        </div>
        <div className="admin-global-metric-sep" />
        <div className="admin-global-metric">
          <span className="admin-global-metric-value">{globalMetrics.opportunities}</span>
          <span className="admin-global-metric-label">oportunidades</span>
        </div>
        <div className="admin-global-metric-sep" />
        <div className="admin-global-metric">
          <span className="admin-global-metric-value">{avgCoverage}%</span>
          <span className="admin-global-metric-label">cobertura promedio</span>
        </div>
      </div>

      <div className="admin-tenant-grid">
        {tenants.map((t, i) => {
          const s = stats[i];
          return (
            <Link key={t.slug} href={`/kai/admin/${t.slug}`} className="admin-tenant-card">
              {/* Header */}
              <div className="admin-tenant-card-top">
                <div className="admin-tenant-card-avatar">{initials(t.name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="admin-tenant-card-name">{t.name}</div>
                  <div className="admin-tenant-card-slug">{t.slug}</div>
                </div>
                <StatusDot status={s.status} />
              </div>

              {/* Coverage */}
              <CoverageBar score={s.coverageScore} />

              {/* Last activity */}
              <div className="admin-card-section">
                <span className="admin-card-section-label">Última actividad</span>
                <LastActivity
                  date={s.lastActivityDate}
                  participant={s.lastParticipant}
                  sessionLearnings={s.lastSessionLearnings}
                  sessionRisks={s.lastSessionRisks}
                  sessionOpps={s.lastSessionOpps}
                />
              </div>

              {/* Latest discovery */}
              {s.latestDiscovery && (
                <div className="admin-card-section">
                  <span className="admin-card-section-label">Último descubrimiento</span>
                  <p className="admin-card-discovery">"{s.latestDiscovery}"</p>
                </div>
              )}

              {/* Tags */}
              {(t.country || t.industry) && (
                <div className="admin-tenant-card-meta">
                  {t.country  && <span className="admin-badge">{t.country}</span>}
                  {t.industry && <span className="admin-badge">{t.industry}</span>}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
