import Anthropic from '@anthropic-ai/sdk';
import { Redis } from '@upstash/redis';
import { isKaiAuthorized } from '@/lib/kai/auth';
import { getTenantMeta, getBusinessProfile } from '@/lib/kai/tenants';
import { listLearnings } from '@/lib/kai/learnings';
import { getCachedParticipantInsights, getCachedTransversalLearnings } from '@/lib/kai/artifacts';

const kv = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const cacheKey = (t) => `kai:${t}:executive_summary`;

const IMPACT_ORDER = { alto: 0, medio: 1, bajo: 2 };
const ALL_AREAS = ['negocio', 'operaciones', 'tecnologia', 'finanzas', 'marketing', 'personas'];

export async function GET(req, { params }) {
  const { tenant } = await params;
  const cached = await kv.get(cacheKey(tenant));
  return Response.json(cached ?? { sections: null });
}

export async function POST(req, { params }) {
  if (!(await isKaiAuthorized())) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  const { tenant } = await params;

  const [meta, profile, learnings, participantData, transversals] = await Promise.all([
    getTenantMeta(tenant),
    getBusinessProfile(tenant),
    listLearnings(tenant),
    getCachedParticipantInsights(tenant),
    getCachedTransversalLearnings(tenant),
  ]);

  if (!meta) return Response.json({ error: 'Cliente no encontrado.' }, { status: 404 });

  const topLearnings = [...learnings]
    .sort((a, b) => (IMPACT_ORDER[a.impact] ?? 1) - (IMPACT_ORDER[b.impact] ?? 1))
    .slice(0, 15)
    .map((l) => `- [${(l.impact ?? 'medio').toUpperCase()}][${l.area ?? 'general'}] ${l.content}`)
    .join('\n');

  const transversalText = Array.isArray(transversals) && transversals.length
    ? transversals
        .map((t) => `- ${t.title}: ${t.description}${t.participants?.length ? ` (${t.participants.join(', ')})` : ''}`)
        .join('\n')
    : 'Sin patrones transversales detectados aún.';

  const coveredAreas = new Set(
    learnings.map((l) => l.area?.toLowerCase()?.trim()).filter(Boolean)
  );
  const gapAreas = ALL_AREAS.filter((a) => !coveredAreas.has(a));

  const participantNames = participantData?.participants?.length
    ? participantData.participants.map((p) => `${p.participant}${p.role ? ` (${p.role})` : ''}`).join(', ')
    : 'Sin participantes registrados';

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2500,
    messages: [{
      role: 'user',
      content: `Eres un consultor estratégico senior. Genera un resumen ejecutivo estructurado para ${meta.name} basado en el conocimiento acumulado por Kai.

PERFIL EMPRESARIAL:
${JSON.stringify(profile, null, 2)}

PARTICIPANTES QUE HAN CONVERSADO CON KAI:
${participantNames}

APRENDIZAJES DETECTADOS (ordenados por impacto):
${topLearnings || 'Sin aprendizajes registrados aún.'}

PATRONES TRANSVERSALES:
${transversalText}

ÁREAS SIN COBERTURA SUFICIENTE: ${gapAreas.join(', ') || 'Ninguna — cobertura completa'}

PROPORCIONALIDAD: Este resumen está basado en ${learnings.length} aprendizajes y ${coveredAreas.size}/6 áreas con cobertura. La profundidad del diagnóstico debe ser proporcional al conocimiento disponible. No infles secciones cuando la evidencia sea insuficiente — es mejor omitir un elemento que inventarlo.

Responde ÚNICAMENTE con un objeto JSON válido con esta estructura exacta:
{
  "estado_actual": "Párrafo de 1-2 oraciones sobre el estado actual basado estrictamente en los datos disponibles",
  "hallazgos_clave": ["máximo 3 hallazgos concretos basados en evidencia real"],
  "transversales_destacados": ["solo si hay patrones transversales reales, máximo 3"],
  "riesgos": ["máximo 3 riesgos con evidencia directa en los aprendizajes"],
  "oportunidades": ["máximo 3 oportunidades con evidencia directa"],
  "aprendizajes_relevantes": ["máximo 3 aprendizajes más significativos, en 12 palabras c/u"],
  "vacios_conocimiento": ["áreas que aún no tienen cobertura suficiente, máximo 3"],
  "proxima_sesion": "1 oración recomendando el área prioritaria para la próxima sesión",
  "proximos_pasos": ["máximo 3 acciones concretas basadas en los hallazgos"]
}

Reglas:
- Español profesional y directo
- Basado ÚNICAMENTE en los datos proporcionados — no inventes ni extrapoles
- Si una sección no tiene evidencia suficiente, devuelve un array vacío []
- Cada ítem de lista: máximo 15 palabras
- Si no hay patrones transversales, devuelve transversales_destacados: []`,
    }],
  });

  const text = response.content[0]?.text ?? '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return Response.json({ error: 'Error al generar resumen.' }, { status: 500 });

  let sections;
  try {
    sections = JSON.parse(jsonMatch[0]);
  } catch {
    return Response.json({ error: 'Error al procesar respuesta.' }, { status: 500 });
  }

  const result = { sections, generatedAt: new Date().toISOString() };
  await kv.set(cacheKey(tenant), result);

  return Response.json(result);
}
