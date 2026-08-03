import Anthropic from '@anthropic-ai/sdk';
import { getInvestigation } from '@/lib/aria/memory';
import { getBusinessProfile } from '@/lib/kai/tenants';

const MODEL = 'claude-sonnet-4-6';

function findLatestCanvas(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.canvas) return messages[i].canvas;
  }
  return null;
}

function buildKnowledgeBlock(profile) {
  const lines = [];
  if (profile?.pains?.length) lines.push(`Dolores documentados:\n${profile.pains.map((p) => `- ${p}`).join('\n')}`);
  if (profile?.objectives?.shortTerm?.length) lines.push(`Objetivos de corto plazo:\n${profile.objectives.shortTerm.map((o) => `- ${o}`).join('\n')}`);
  if (profile?.objectives?.mediumTerm?.length) lines.push(`Objetivos de mediano plazo:\n${profile.objectives.mediumTerm.map((o) => `- ${o}`).join('\n')}`);
  if (profile?.opportunities?.length) lines.push(`Oportunidades identificadas:\n${profile.opportunities.map((o) => `- ${o}`).join('\n')}`);
  return lines.length ? lines.join('\n\n') : '(Kai todavía no documentó dolores, objetivos ni oportunidades para esta empresa.)';
}

function buildPrompt({ groups, knowledgeBlock }) {
  const groupsBlock = groups
    .map(
      (g) => `### Grupo id:${g.id} — "${g.name}"
Consolidado: ${g.consolidatedText || '(sin texto)'}
Categoría: ${g.area || 'Sin definir'} · Responsable: ${g.responsable || 'Sin definir'}
Iniciativas cargadas: ${g.itemCount} · Involucrados: ${g.involucradosCount}`
    )
    .join('\n\n');

  return `Sos el asistente de Aria que sugiere en qué orden lanzar las fichas de objetivos de los grupos de un workshop en vivo, ANTES de que existan respuestas — todavía no hay fichas, solo los grupos con sus iniciativas cargadas.

CONOCIMIENTO YA DOCUMENTADO POR KAI SOBRE ESTA EMPRESA:
${knowledgeBlock}

GRUPOS DE ESTA PREGUNTA (a ordenar entre sí):
${groupsBlock}

Para cada grupo:
1. Evaluá si el tema del grupo (consolidado + iniciativas) se conecta con algo que Kai ya documentó arriba (un dolor, objetivo u oportunidad). Si la conexión es real y concreta, marcá hasSignal: true y citá específicamente con qué dolor/objetivo se conecta en el motivo (ej. "se conecta con 'reducir tiempo de onboarding', dolor marcado como prioritario por Kai"). Cuanto más fuerte y prioritaria esa conexión, más arriba en el orden.
2. Si no hay conexión clara con el conocimiento documentado (Kai no tiene nada relacionado con ese tema todavía), marcá hasSignal: false y resolvé el orden por desempate estructural, usando en este orden de peso: (a) más iniciativas cargadas, (b) más involucrados, (c) grupo más completo (Categoría y Responsable ya definidos, no "Sin definir"). El motivo en este caso debe decir explícitamente "Sin señal clara" y qué criterio de desempate se usó (ej. "Sin señal clara — orden resuelto por desempate: menos involucrados que los otros grupos").
3. Asigná un número de orden (order) del 1 en adelante, sin repetir, a todos los grupos.

Respondé ÚNICAMENTE con JSON válido, sin texto antes ni después, sin markdown:
{ "groups": [ { "groupId": "string", "order": 1, "hasSignal": true, "reason": "string" } ] }`;
}

export async function suggestFichaOrder(tenant, investigationId, questionId) {
  const investigation = await getInvestigation(tenant, investigationId);
  if (!investigation) throw new Error('Investigación no encontrada.');

  const canvas = findLatestCanvas(investigation.messages ?? []);
  if (!canvas) throw new Error('Esta investigación no tiene un canvas de workshop.');

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
    messages: [{ role: 'user', content: buildPrompt({ groups, knowledgeBlock }) }],
  });
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
  const parsed = JSON.parse(cleaned);

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
