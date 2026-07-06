import Anthropic from '@anthropic-ai/sdk';
import { isAuthorizedForTenant } from '@/lib/aria/auth';
import { getInvestigation, updateInvestigationMeta, deleteInvestigation } from '@/lib/aria/memory';

async function buildArchiveIndex(meta, messages) {
  if (!messages?.length || messages.length < 2) return {};

  const transcript = messages
    .slice(0, 40)
    .map((m) => `${m.role === 'user' ? 'Usuario' : 'Aria'}: ${String(m.content ?? '').slice(0, 600)}`)
    .join('\n');

  const prompt = `Analiza esta conversación y extrae metadatos para búsqueda futura.

Devuelve SOLO un objeto JSON (sin markdown, sin explicación):
{
  "titulo": "título descriptivo de 3-6 palabras que capture el tema central",
  "resumen_sesion": "1-2 oraciones describiendo qué se discutió y qué se concluyó",
  "entities": ["persona o empresa 1", "alias o apodo", "empresa 2", "proyecto X"],
  "tags": ["tema1", "tema2", "sector", "tipo-de-análisis"]
}

Reglas para entities:
- Incluye TODOS los nombres de personas mencionados (nombre completo + apodos + variantes)
- Incluye TODAS las empresas, proyectos, marcas, productos mencionados
- Incluye roles cuando sean identificadores ("la socia de Percy", "el cliente del piloto")
- Prioriza nombres propios sobre términos genéricos

Reglas para tags:
- Máximo 8 tags. Mínimo 3.
- Usa términos cortos y específicos al negocio discutido

Conversación:
${transcript}`;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });
    const raw = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
    const parsed = JSON.parse(raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim());

    const result = {};
    if (parsed.titulo && (!meta.titulo || meta.titulo === 'Nueva investigación')) {
      result.titulo = parsed.titulo;
    }
    if (parsed.resumen_sesion && !meta.resumen_sesion) {
      result.resumen_sesion = parsed.resumen_sesion;
    }
    if (Array.isArray(parsed.entities)) {
      result.entities = parsed.entities.filter(Boolean);
    }
    if (Array.isArray(parsed.tags) && parsed.tags.length) {
      const existing = meta.tags ?? [];
      result.tags = [...new Set([...existing, ...parsed.tags])];
    }
    return result;
  } catch (err) {
    console.error('[archive-index] error:', err.message);
    return {};
  }
}

export async function GET(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const investigation = await getInvestigation(tenant, id);
  if (!investigation) {
    return Response.json({ error: 'No encontrada.' }, { status: 404 });
  }

  return Response.json(investigation);
}

export async function PATCH(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const updates = await req.json();

  if (updates.estado === 'archivada') {
    const inv = await getInvestigation(tenant, id);
    if (inv) {
      const index = await buildArchiveIndex(inv.meta, inv.messages);
      Object.assign(updates, index);
    }
  }

  const result = await updateInvestigationMeta(tenant, id, updates);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ meta: result.meta });
}

export async function DELETE(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  await deleteInvestigation(tenant, id);
  return Response.json({ ok: true });
}
