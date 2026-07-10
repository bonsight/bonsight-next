import Anthropic from '@anthropic-ai/sdk';
import { isAuthorizedForTenant } from '@/lib/kai/auth';
import {
  getSource,
  getSourceRaw,
  updateSourceMeta,
  saveSourceContent,
  rebuildDigest,
} from '@/lib/kai/knowledgeSources';
import { extractFromDriveFile } from '@/lib/kai/googleDrive';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SUMMARIZE_PROMPT = (name, raw) => `Eres un asistente que extrae conocimiento organizacional estructurado.

Se te proporciona el contenido de la fuente "${name}". Tu tarea es generar un resumen denso y útil para que un consultor estratégico (Kai) lo use como contexto inicial en sus conversaciones con el cliente.

Reglas:
- Extrae hechos, procesos, objetivos, dolores, oportunidades, stakeholders, métricas y cualquier dato relevante del negocio.
- Organiza en secciones cortas si el contenido lo amerita.
- Sé conciso pero completo. No omitas información relevante.
- No inventes información. Si algo no está claro en la fuente, omítelo.
- Responde solo con el resumen, sin encabezados de presentación ni cierre.

Contenido:
${raw.slice(0, 60000)}`;

async function summarizeWithHaiku(name, raw) {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{ role: 'user', content: SUMMARIZE_PROMPT(name, raw) }],
  });
  return response.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
}

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

async function consolidateDigest(digest) {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: `El siguiente texto es un digest de conocimiento organizacional que supera el límite de tokens. Genera un resumen ejecutivo consolidado que preserve los datos más relevantes de todas las fuentes. Responde solo con el resumen.\n\n${digest.slice(0, 80000)}`,
    }],
  });
  return response.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
}

export async function POST(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const source = await getSource(tenant, id);
  if (!source) return Response.json({ error: 'Fuente no encontrada.' }, { status: 404 });

  await updateSourceMeta(tenant, id, { status: 'processing', lastError: null });

  let body = {};
  try { body = await req.json(); } catch {}
  const { text } = body;

  try {
    let raw = '';

    if (source.sourceType === 'url') {
      raw = await fetchUrl(source.url);
    } else if (source.sourceType === 'text' || source.sourceType === 'file') {
      raw = text ?? (await getSourceRaw(tenant, id)) ?? '';
    } else if (source.sourceType === 'drive') {
      const fileId = source.driveFileId ?? (await getSourceRaw(tenant, id));
      raw = await extractFromDriveFile(fileId, source.driveMimeType);
    }

    if (!raw.trim()) throw new Error('Sin contenido para procesar.');

    const content = raw.length > 2000
      ? await summarizeWithHaiku(source.name, raw)
      : raw;

    const tokenEstimate = Math.round(content.length / 4);

    await saveSourceContent(tenant, id, content);
    await updateSourceMeta(tenant, id, {
      status: 'ready',
      processedAt: new Date().toISOString(),
      lastError: null,
      tokenEstimate,
    });
    await rebuildDigest(tenant, consolidateDigest);

    return Response.json({ ok: true, tokenEstimate });
  } catch (err) {
    await updateSourceMeta(tenant, id, {
      status: 'error',
      lastError: err.message ?? 'Error desconocido.',
    });
    return Response.json({ error: err.message }, { status: 500 });
  }
}
