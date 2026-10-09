import Anthropic from '@anthropic-ai/sdk';
import { isAuthorizedForTenant } from '@/lib/kaiNext/auth';
import { getBusinessProfile, updateBusinessProfile } from '@/lib/kai/tenants';
import { trackUsage } from '@/lib/kai/usage';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Mismo fetch+strip que ya usan app/api/kai/[tenant]/knowledge-sources/[id]/process/route.js y
// su espejo en kai-next (no se extrae a un lib compartido para no tocar esos dos archivos
// existentes — ver nota de la sesión sobre no modificar Kai Legacy salvo aditivo).
async function fetchUrl(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KaiBot/1.0)' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Autocompletar el Business Profile desde el sitio web de una empresa recién creada (estado 0,
// sin aprendizajes todavía). Es deliberadamente conservador: solo llena campos de `general` que
// hoy están vacíos (no pisa algo que alguien ya haya escrito a mano) y agrega objetivos nuevos
// sin duplicar los existentes — nunca reemplaza lo que ya hay.
export async function POST(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { url } = await req.json();
  const clean = String(url ?? '').trim();
  if (!clean) return Response.json({ error: 'Falta la URL.' }, { status: 400 });
  const normalized = /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;

  let text;
  try {
    text = await fetchUrl(normalized);
  } catch (err) {
    return Response.json({ error: `No se pudo leer ese sitio (${err.message}).` }, { status: 422 });
  }
  if (!text || text.length < 100) {
    return Response.json({ error: 'El sitio no trajo suficiente contenido para analizar.' }, { status: 422 });
  }

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `Analiza este contenido extraído del sitio web de una empresa y extrae SOLO lo que puedas inferir con confianza razonable. No inventes ni extrapoles — si algo no está claro, omite ese campo.

CONTENIDO DEL SITIO:
${text.slice(0, 6000)}

Responde ÚNICAMENTE con este JSON (usa null o array vacío para lo que no puedas inferir):
{
  "industry": "industria o rubro, 2-5 palabras, o null",
  "model": "modelo de negocio (ej: SaaS B2B, ecommerce, consultoría, marketplace), o null",
  "country": "país principal de operación, o null",
  "objectives": ["objetivo o propuesta de valor concreta mencionada en el sitio", "..."]
}

Máximo 3 objetivos. Si el sitio no deja claro ningún objetivo real, deja el array vacío.`,
    }],
  });

  trackUsage({ tenant, product: 'kai-next', feature: 'profile_autofill', model: 'claude-haiku-4-5-20251001', inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens }).catch(() => null);

  const raw = response.content[0]?.text ?? '';
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return Response.json({ error: 'No se pudo interpretar el sitio.' }, { status: 500 });

  let extracted;
  try {
    extracted = JSON.parse(jsonMatch[0]);
  } catch {
    return Response.json({ error: 'No se pudo interpretar el sitio.' }, { status: 500 });
  }

  const profile = await getBusinessProfile(tenant);
  const general = { ...(profile.general ?? {}) };
  if (!general.industry && extracted.industry) general.industry = extracted.industry;
  if (!general.model && extracted.model) general.model = extracted.model;
  if (!general.country && extracted.country) general.country = extracted.country;

  const currentShortTerm = profile.objectives?.shortTerm ?? [];
  const newObjectives = Array.isArray(extracted.objectives)
    ? extracted.objectives.filter((o) => typeof o === 'string' && o.trim() && !currentShortTerm.includes(o))
    : [];

  const update = { general };
  if (newObjectives.length > 0) {
    update.objectives = { ...(profile.objectives ?? {}), shortTerm: [...currentShortTerm, ...newObjectives] };
  }

  const updated = await updateBusinessProfile(tenant, update);
  return Response.json({ ok: true, profile: updated });
}
