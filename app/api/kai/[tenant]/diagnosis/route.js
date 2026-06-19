import Anthropic from '@anthropic-ai/sdk';
import { Redis } from '@upstash/redis';
import { isKaiAuthorized } from '@/lib/kai/auth';
import { getTenantMeta } from '@/lib/kai/tenants';
import { listLearnings } from '@/lib/kai/learnings';

const kv = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const cacheKey  = (t) => `kai:${t}:diagnosis`;
const IMPACT_ORDER = { alto: 0, medio: 1, bajo: 2 };

export async function GET(req, { params }) {
  const { tenant } = await params;
  const cached = await kv.get(cacheKey(tenant));
  return Response.json(cached ?? { diagnosis: null });
}

export async function POST(req, { params }) {
  if (!(await isKaiAuthorized())) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  const { tenant } = await params;

  const [meta, learnings] = await Promise.all([
    getTenantMeta(tenant),
    listLearnings(tenant),
  ]);

  if (!meta) return Response.json({ error: 'Cliente no encontrado.' }, { status: 404 });
  if (learnings.length < 3) {
    return Response.json({ error: 'Insuficientes aprendizajes para generar diagnóstico.' }, { status: 422 });
  }

  const topLearnings = [...learnings]
    .sort((a, b) => (IMPACT_ORDER[a.impact] ?? 1) - (IMPACT_ORDER[b.impact] ?? 1))
    .slice(0, 12)
    .map((l, i) => `${i + 1}. [${(l.impact ?? 'medio').toUpperCase()}][${l.area ?? 'general'}] ${l.content}`)
    .join('\n');

  const coveredAreas = [...new Set(learnings.map((l) => l.area).filter(Boolean))];

  const response = await anthropic.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [{
      role:    'user',
      content: `Eres un consultor estratégico. Analiza estos ${learnings.length} aprendizajes sobre ${meta.name} y genera un diagnóstico ejecutivo.

APRENDIZAJES (ordenados por impacto):
${topLearnings}

ÁREAS EXPLORADAS: ${coveredAreas.join(', ') || 'ninguna'}

Responde ÚNICAMENTE con este JSON válido:
{
  "problema_principal": "El problema estructural más relevante (1 oración directa, máx 20 palabras)",
  "oportunidad_principal": "La oportunidad más concreta identificada (1 oración directa, máx 20 palabras)",
  "confianza": "alta|media|baja",
  "impacto": "Consecuencia directa del problema principal (1 oración, máx 15 palabras)",
  "evidencias": ["evidencia concreta 1", "evidencia concreta 2", "evidencia concreta 3"]
}

Reglas:
- Basado EXCLUSIVAMENTE en los aprendizajes proporcionados — no inventes ni extrapoles
- Frases nominales directas, sin sujeto explícito
- Si no hay evidencia suficiente para confianza alta, usa media o baja
- Máximo 3 evidencias, mínimo 1`,
    }],
  });

  const text      = response.content[0]?.text ?? '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return Response.json({ error: 'Error generando diagnóstico.' }, { status: 500 });

  let diagnosis;
  try {
    diagnosis = JSON.parse(jsonMatch[0]);
  } catch {
    return Response.json({ error: 'Error procesando respuesta.' }, { status: 500 });
  }

  const result = { diagnosis, generatedAt: new Date().toISOString(), learningCount: learnings.length };
  await kv.set(cacheKey(tenant), result);
  return Response.json(result);
}
