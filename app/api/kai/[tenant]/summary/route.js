import Anthropic from '@anthropic-ai/sdk';
import { Redis } from '@upstash/redis';
import { isAuthorizedForTenant } from '@/lib/kai/auth';
import { getTenantMeta, getBusinessProfile } from '@/lib/kai/tenants';
import { listLearnings } from '@/lib/kai/learnings';
import { trackUsage } from '@/lib/kai/usage';

const kv = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
const cacheKey = (tenant) => `kai:${tenant}:summary`;

// GET — returns cached summary (no admin auth needed)
export async function GET(req, { params }) {
  const { tenant } = await params;
  const meta = await getTenantMeta(tenant);
  if (!meta) return Response.json({ error: 'Cliente no encontrado.' }, { status: 404 });
  const cached = (await kv.get(cacheKey(tenant))) ?? null;
  return Response.json({ summary: cached?.text ?? null, generatedAt: cached?.generatedAt ?? null });
}

// POST — generates + caches summary (admin auth required)
export async function POST(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  const [meta, profile, learnings] = await Promise.all([
    getTenantMeta(tenant),
    getBusinessProfile(tenant),
    listLearnings(tenant),
  ]);

  if (!meta) return Response.json({ error: 'Cliente no encontrado.' }, { status: 404 });

  const topLearnings = learnings
    .slice(0, 10)
    .map((l) => `- [${l.impact.toUpperCase()}] ${l.content}`)
    .join('\n');

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Genera un Resumen Ejecutivo completo y profesional para ${meta.name}.

PERFIL EMPRESARIAL:
${JSON.stringify(profile, null, 2)}

APRENDIZAJES DETECTADOS POR KAI:
${topLearnings || 'Sin aprendizajes registrados aún.'}

Estructura el resumen con estas secciones, usando subtítulos en mayúsculas:

DESCRIPCIÓN DE LA EMPRESA
SITUACIÓN ACTUAL
OBJETIVOS ESTRATÉGICOS
PRINCIPALES DOLORES
RIESGOS IDENTIFICADOS
OPORTUNIDADES CLAVE
RECOMENDACIONES PRIORITARIAS

Reglas:
- Español profesional y directo.
- Máximo 700 palabras en total.
- Sin bullets. Usa párrafos cortos.
- Cada sección: 2-4 oraciones concretas.
- Las recomendaciones: máximo 3, con impacto esperado.
- Tono ejecutivo, no genérico. Refleja el contexto real del negocio.`,
    }],
  });

  trackUsage({ tenant, product: 'kai', feature: 'summary', model: 'claude-sonnet-4-6', inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens }).catch(() => null);

  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  const generatedAt = new Date().toISOString();

  await kv.set(cacheKey(tenant), { text, generatedAt });

  return Response.json({ summary: text, generatedAt });
}
