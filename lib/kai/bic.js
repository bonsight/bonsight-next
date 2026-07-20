import { getBusinessProfile } from './tenants';
import { listLearnings } from './learnings';
import { getKnowledgeDigest } from './knowledgeSources';
import { getActivePriorities } from './activePriorities';
import { getFinishedActivitiesSummary } from './activities';
import { KNOWLEDGE_AREAS, calcAreaScore, calcOverallScore } from './scoring';

const DOMAIN_FIELDS = {
  negocio:     { profile: ['general', 'objectives'], learningArea: 'negocio' },
  operaciones: { profile: ['processes', 'initiatives', 'decisions'], learningArea: 'operaciones' },
  tecnologia:  { profile: ['technology'], learningArea: 'tecnologia' },
  finanzas:    { profile: ['kpis', 'risks'], learningArea: 'finanzas' },
  marketing:   { profile: ['opportunities', 'pains'], learningArea: 'marketing' },
  personas:    { profile: ['stakeholders'], learningArea: 'personas' },
};

function pct(score) { return Math.round(score) / 100; }

export async function buildBIC(tenant, { domain = null } = {}) {
  const [profile, learnings, digest, priorities, finishedActivities] = await Promise.all([
    getBusinessProfile(tenant),
    listLearnings(tenant),
    getKnowledgeDigest(tenant),
    getActivePriorities(tenant),
    getFinishedActivitiesSummary(tenant),
  ]);

  const p = profile ?? {};
  const areaScores = {};
  for (const area of KNOWLEDGE_AREAS) {
    areaScores[area.id] = pct(calcAreaScore(area, p, learnings));
  }
  const overall = pct(calcOverallScore(p, learnings));

  const gaps = KNOWLEDGE_AREAS
    .filter((a) => areaScores[a.id] < 0.5)
    .sort((a, b) => areaScores[a.id] - areaScores[b.id])
    .map((a) => ({ area: a.id, score: areaScores[a.id] }));

  const recentLearnings = learnings.slice(0, 10).map((l) => ({
    content: l.content,
    area: l.area,
    impact: l.impact,
    confidence: l.confidence,
    createdAt: l.createdAt,
  }));

  const fullContext = {
    generatedAt: new Date().toISOString(),
    confidence: { overall, ...areaScores },
    active_priorities: priorities,
    business: p.general ?? {},
    objectives: p.objectives ?? {},
    risks: p.risks ?? [],
    opportunities: p.opportunities ?? [],
    pains: p.pains ?? [],
    technology: p.technology ?? [],
    processes: p.processes ?? [],
    initiatives: p.initiatives ?? [],
    decisions: p.decisions ?? [],
    kpis: p.kpis ?? [],
    stakeholders: p.stakeholders ?? [],
    recent_learnings: recentLearnings,
    knowledge_digest: digest ?? null,
    knowledge_gaps: gaps,
    finished_activities: finishedActivities,
  };

  if (!domain) return fullContext;

  // Domain filter: return only relevant fields
  const domainDef = DOMAIN_FIELDS[domain];
  if (!domainDef) return fullContext;

  const filtered = {
    generatedAt: fullContext.generatedAt,
    confidence: {
      overall: fullContext.confidence.overall,
      [domain]: fullContext.confidence[domain] ?? null,
    },
    active_priorities: priorities,
    knowledge_gaps: gaps.filter((g) => g.area === domain),
  };

  for (const field of domainDef.profile) {
    filtered[field] = fullContext[field];
  }

  filtered.recent_learnings = recentLearnings.filter(
    (l) => l.area?.toLowerCase().includes(domainDef.learningArea)
  );

  return filtered;
}

// Format BIC JSON into a readable text block for LLM system prompts
export function formatBICForPrompt(bic) {
  if (!bic) return '';

  const confPct = (v) => `${Math.round((v ?? 0) * 100)}%`;
  const list = (arr) => (arr?.length ? arr.map((x) => `  · ${typeof x === 'string' ? x : x?.label ?? x?.name ?? JSON.stringify(x)}`).join('\n') : '  Sin datos');
  const objList = (arr, keyFn) => (arr?.length ? arr.map((x) => `  · ${keyFn(x)}`).join('\n') : '  Sin datos');

  const c = bic.confidence ?? {};
  const confidenceLine = [
    `General: ${confPct(c.overall)}`,
    c.negocio     != null ? `Negocio: ${confPct(c.negocio)}`       : null,
    c.operaciones != null ? `Ops: ${confPct(c.operaciones)}`        : null,
    c.tecnologia  != null ? `Tech: ${confPct(c.tecnologia)}`        : null,
    c.finanzas    != null ? `Finanzas: ${confPct(c.finanzas)}`      : null,
    c.marketing   != null ? `Marketing: ${confPct(c.marketing)}`    : null,
    c.personas    != null ? `Personas: ${confPct(c.personas)}`      : null,
  ].filter(Boolean).join(' · ');

  const sections = [`[COBERTURA DEL CONOCIMIENTO]\n${confidenceLine}`];

  if (bic.active_priorities?.length) {
    const priorityLines = bic.active_priorities.map((p, i) => `  ${i + 1}. ${p}`).join('\n');
    sections.push(`[PRIORIDADES ACTIVAS — LO QUE IMPORTA ESTA SEMANA]\nCuando el usuario pregunte en qué enfocarse, qué priorizar o qué hacer esta semana, estas son las prioridades explícitas del negocio. Úsalas como eje central de la respuesta:\n${priorityLines}`);
  }

  const b = bic.business ?? {};
  const businessLines = [b.model, b.size, b.industry, b.country, b.digitalMaturity ? `Madurez digital: ${b.digitalMaturity}` : null].filter(Boolean);
  if (businessLines.length) sections.push(`[MODELO DE NEGOCIO]\n${businessLines.map((l) => `  ${l}`).join('\n')}`);

  const obj = bic.objectives ?? {};
  const objLines = [];
  if (obj.shortTerm?.length)  objLines.push(`  Corto plazo: ${obj.shortTerm.join(', ')}`);
  if (obj.mediumTerm?.length) objLines.push(`  Mediano plazo: ${obj.mediumTerm.join(', ')}`);
  if (obj.longTerm?.length)   objLines.push(`  Largo plazo: ${obj.longTerm.join(', ')}`);
  if (objLines.length) sections.push(`[OBJETIVOS ESTRATÉGICOS]\n${objLines.join('\n')}`);

  if (bic.risks?.length)         sections.push(`[RIESGOS IDENTIFICADOS]\n${list(bic.risks)}`);
  if (bic.opportunities?.length)  sections.push(`[OPORTUNIDADES]\n${list(bic.opportunities)}`);
  if (bic.pains?.length)          sections.push(`[DOLORES DEL NEGOCIO]\n${list(bic.pains)}`);
  if (bic.technology?.length)     sections.push(`[TECNOLOGÍA ACTUAL]\n${list(bic.technology)}`);
  if (bic.kpis?.length)           sections.push(`[KPIS CLAVE]\n${list(bic.kpis)}`);

  const processes = [...(bic.processes ?? []), ...(bic.initiatives ?? [])];
  if (processes.length) sections.push(`[PROCESOS E INICIATIVAS]\n${list(processes)}`);

  if (bic.stakeholders?.length) {
    sections.push(`[STAKEHOLDERS]\n${objList(bic.stakeholders, (s) => typeof s === 'string' ? s : `${s.name}${s.roles?.length ? ` (${s.roles.join(', ')})` : ''}`)}`);
  }

  if (bic.recent_learnings?.length) {
    const lLines = bic.recent_learnings.slice(0, 8).map((l) => {
      const area = l.area ? ` [${l.area}]` : '';
      const imp  = l.impact ? ` · impacto ${l.impact}` : '';
      return `  · ${l.content}${area}${imp}`;
    }).join('\n');
    sections.push(`[APRENDIZAJES RECIENTES]\n${lLines}`);
  }

  if (bic.knowledge_digest) {
    const digest = bic.knowledge_digest.length > 8000
      ? bic.knowledge_digest.slice(0, 8000) + '\n[…digest truncado]'
      : bic.knowledge_digest;
    sections.push(`[CONOCIMIENTO DOCUMENTAL]\n${digest}`);
  }

  if (bic.knowledge_gaps?.length) {
    const gapLines = bic.knowledge_gaps.map((g) => `  · ${g.area} (${confPct(g.score)} cobertura)`).join('\n');
    sections.push(`[VACÍOS DE CONOCIMIENTO]\nÁreas con información insuficiente — las conclusiones en estas áreas tienen menor confianza:\n${gapLines}`);
  }

  if (bic.finished_activities?.length) {
    const actLines = bic.finished_activities.map((a) => {
      const date = a.finishedAt ? new Date(a.finishedAt).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
      return `  · [ID: ${a.id}] "${a.name}" (${a.type || 'workshop'}) · ${a.participantCount} participantes · ${date}${a.objective ? ` · objetivo: ${a.objective}` : ''}`;
    }).join('\n');
    sections.push(`[ACTIVITIES FINALIZADAS]\nWorkshops/dinámicas colaborativas ya cerradas, con resultados disponibles. Si el usuario pregunta por alguna, o pide analizarla/priorizarla, usá la tool get_activity_results con su ID:\n${actLines}`);
  }

  return sections.join('\n\n');
}
