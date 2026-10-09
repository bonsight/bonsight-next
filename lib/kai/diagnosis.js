import { Redis } from '@upstash/redis';
import Anthropic from '@anthropic-ai/sdk';
import { getTenantMeta, getBusinessProfile } from './tenants';
import { listLearnings } from './learnings';
import { trackUsage } from './usage';
import { listResolvedRefs } from './resolutions';

const kv = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const cacheKey = (tenant) => `kai:${tenant}:diagnosis`;
const IMPACT_ORDER = { alto: 0, medio: 1, bajo: 2 };

export async function getDiagnosis(tenant) {
  return (await kv.get(cacheKey(tenant))) ?? { diagnosis: null };
}

export async function saveDiagnosis(tenant, result) {
  await kv.set(cacheKey(tenant), result);
  return result;
}

function tagText(x) {
  return typeof x === 'string' ? x : (x?.label ?? x?.name ?? '');
}

function listBlock(label, items) {
  const list = (items ?? []).map(tagText).filter(Boolean);
  if (!list.length) return `${label}:\n  Sin datos`;
  return `${label}:\n${list.map((t) => `  - ${t}`).join('\n')}`;
}

// Genera (o regenera) el diagnóstico ejecutivo de un tenant — usado tanto por el admin de Kai
// legacy (POST /api/kai/[tenant]/diagnosis) como por Kai Next (POST /api/kai-next/[tenant]/diagnosis).
// Devuelve { ok: true, result } o { ok: false, status, error } para que cada route traduzca el
// resultado a su propia respuesta HTTP sin duplicar la llamada a Claude.
export async function generateDiagnosis(tenant) {
  const [meta, learnings, profile, resolvedRefs] = await Promise.all([
    getTenantMeta(tenant),
    listLearnings(tenant),
    getBusinessProfile(tenant),
    listResolvedRefs(tenant),
  ]);
  const resolvedEjeTitles = resolvedRefs.filter((r) => r.type === 'eje').map((r) => r.ref);

  if (!meta) return { ok: false, status: 404, error: 'Cliente no encontrado.' };
  if (learnings.length < 3) {
    return { ok: false, status: 422, error: 'Insuficientes aprendizajes para generar diagnóstico.' };
  }

  const topLearnings = [...learnings]
    .sort((a, b) => (IMPACT_ORDER[a.impact] ?? 1) - (IMPACT_ORDER[b.impact] ?? 1))
    .slice(0, 12)
    .map((l, i) => `${i + 1}. [${(l.impact ?? 'medio').toUpperCase()}][${l.area ?? 'general'}] ${l.content}`)
    .join('\n');

  const coveredAreas = [...new Set(learnings.map((l) => l.area).filter(Boolean))];

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1400,
    messages: [{
      role: 'user',
      content: `Eres un consultor estratégico. Analiza el contexto de ${meta.name} y genera un diagnóstico ejecutivo ACCIONABLE.

APRENDIZAJES (ordenados por impacto):
${topLearnings}

ÁREAS EXPLORADAS: ${coveredAreas.join(', ') || 'ninguna'}

PERFIL DEL NEGOCIO:
${listBlock('Dolores', profile?.pains)}
${listBlock('Riesgos', profile?.risks)}
${listBlock('Oportunidades', profile?.opportunities)}
${resolvedEjeTitles.length ? `\nEJES YA RESUELTOS (el equipo ya los atendió — NO los repitas ni generes uno equivalente, aunque el tema siga apareciendo en los aprendizajes):\n${resolvedEjeTitles.map((t) => `  - ${t}`).join('\n')}\n` : ''}
Responde ÚNICAMENTE con este JSON válido:
{
  "problema_principal": "El problema estructural más relevante (1 oración directa, máx 20 palabras)",
  "oportunidad_principal": "La oportunidad más concreta identificada (1 oración directa, máx 20 palabras)",
  "confianza": "alta|media|baja",
  "impacto": "Consecuencia directa del problema principal (1 oración, máx 15 palabras)",
  "evidencias": ["evidencia concreta 1", "evidencia concreta 2", "evidencia concreta 3"],
  "ejes": [
    {
      "categoria": "bloqueo_critico o oportunidad_clave",
      "titulo": "Nombre corto del eje estratégico (máx 5 palabras)",
      "descripcion": "1-2 oraciones explicando el eje, máx 30 palabras",
      "acciones": [
        { "label": "Verbo + resultado concreto, máx 4 palabras", "prompt": "Mensaje en primera persona, listo para mandarle a Kai, pidiendo ayuda concreta con esta acción — con el contexto necesario para que Kai pueda responder sin preguntas previas" }
      ]
    }
  ],
  "duplicados": [
    {
      "resumen": "Texto consolidado que reemplazaría a los ítems duplicados",
      "items": [ { "categoria": "pains, risks u opportunities", "texto": "texto EXACTO tal cual aparece arriba, sin modificar ni una palabra" } ]
    }
  ]
}

Reglas:
- Basado EXCLUSIVAMENTE en la información proporcionada — no inventes ni extrapoles.
- "ejes": entre 1 y 3 ejes estratégicos, cada uno con 1 a 2 acciones. Si no hay suficiente contexto para más de uno, devuelve solo 1.
- "duplicados": grupos de 2 o más ítems (de Dolores/Riesgos/Oportunidades) que digan esencialmente lo mismo con otras palabras, aunque sean de categorías distintas. El campo "texto" debe copiar EXACTO el texto original de arriba (se usa para ubicarlo y fusionarlo). Si no hay duplicados reales, devuelve un array vacío — no los inventes.
- Si no hay evidencia suficiente para confianza alta, usa media o baja.
- Máximo 3 evidencias, mínimo 1.`,
    }],
  });

  trackUsage({ tenant, product: 'kai', feature: 'diagnosis', model: 'claude-sonnet-4-6', inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens }).catch(() => null);

  const text = response.content[0]?.text ?? '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { ok: false, status: 500, error: 'Error generando diagnóstico.' };

  let diagnosis;
  try {
    diagnosis = JSON.parse(jsonMatch[0]);
  } catch {
    return { ok: false, status: 500, error: 'Error procesando respuesta.' };
  }

  const result = { diagnosis, generatedAt: new Date().toISOString(), learningCount: learnings.length };
  await saveDiagnosis(tenant, result);
  return { ok: true, result };
}
