const KNOWLEDGE_AREAS = [
  {
    id: 'negocio',
    checks: [
      (p) => p?.general?.model,
      (p) => p?.general?.size,
      (p) => p?.general?.industry,
      (p) => p?.objectives?.shortTerm?.length,
      (p) => p?.objectives?.mediumTerm?.length,
      (p) => p?.objectives?.longTerm?.length,
    ],
  },
  {
    id: 'operaciones',
    checks: [
      (p) => p?.processes?.length,
      (p) => p?.initiatives?.length,
      (p) => p?.decisions?.length,
    ],
  },
  {
    id: 'tecnologia',
    checks: [
      (p) => p?.technology?.length,
      (p) => p?.general?.digitalMaturity,
    ],
  },
  {
    id: 'finanzas',
    checks: [
      (p) => p?.kpis?.length,
      (p) => p?.risks?.length,
    ],
  },
  {
    id: 'marketing',
    checks: [
      (p) => p?.opportunities?.length,
      (p) => p?.pains?.length,
    ],
  },
  {
    id: 'personas',
    checks: [(p) => p?.stakeholders?.length],
  },
];

const AREA_ID_MAP = {
  'tecnología': 'tecnologia', tecnologia: 'tecnologia',
  negocio: 'negocio', operaciones: 'operaciones',
  finanzas: 'finanzas', marketing: 'marketing', personas: 'personas',
};

function normalizeAreaId(area = '') {
  return AREA_ID_MAP[area.toLowerCase().trim()] ?? area.toLowerCase().trim();
}

export function calcAreaScore(area, profile, learnings = []) {
  const profileFilled = area.checks.filter((fn) => fn(profile)).length;
  const areaLearnings = learnings.filter((l) => normalizeAreaId(l.area) === area.id).length;
  const profilePts  = (profileFilled / area.checks.length) * 70;
  const learningPts = Math.min(30, areaLearnings * 15);
  return Math.round(profilePts + learningPts);
}

export function calcOverallScore(profile, learnings = []) {
  const scores = KNOWLEDGE_AREAS.map((a) => calcAreaScore(a, profile, learnings));
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}
