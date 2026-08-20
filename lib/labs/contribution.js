import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-6';
const VALID_TAGS = ['éxito', 'parcial', 'fallo', 'referencia'];

// A diferencia de Ficha (5 preguntas fijas para cualquier workshop), cada Prueba acá define
// su propio esquema de campos — el prompt se arma dinámicamente contra ESOS campos, no contra
// una estructura fija.
function buildPrompt(test, freeText, hasEvidence) {
  const fieldsDesc = test.fields.map((f) => `- clave "${f.key}" — ${f.label} (tipo: ${f.type})`).join('\n');
  return `Sos el asistente de Labs de Bonsight — interpretás el aporte libre (texto o transcripción de voz) de alguien que acaba de ejecutar una prueba, y lo estructurás contra los campos que esa prueba definió.

PRUEBA: ${test.name}

CAMPOS DE ESTA PRUEBA:
${fieldsDesc}

APORTE (texto libre de la persona, tal cual lo escribió o dijo):
"""
${freeText}
"""
${hasEvidence ? '\nTambién se adjuntó evidencia (foto o documento) antes de este texto — leela también: puede tener datos legibles (una lectura de instrumento, un ticket, un reporte) que completen o confirmen campos que el texto no menciona.\n' : ''}
Extraé el valor de cada campo si está mencionado (en el texto o en la evidencia adjunta), en su tipo correspondiente (number → número, text → string tal cual). Si un campo no se menciona en ninguno de los dos, NO lo inventes — dejalo fuera de "values" y agregalo a "missingFields".

Además:
- "tag": tu mejor estimación de si este resultado fue "éxito", "parcial", "fallo", o "referencia" (una corrida de referencia/línea base, no una prueba real evaluando algo) — basate en cómo la persona describe el resultado, no solo en los números.
- "note": si el aporte incluye algo más allá de completar los campos — un aprendizaje, una decisión tomada, un problema no planeado, contexto operativo — resumilo en una oración clara. Si el aporte es solo los datos de los campos sin nada adicional, dejalo vacío ("").

Respondé ÚNICAMENTE con un objeto JSON válido, sin texto antes ni después, sin markdown, sin backticks:
{
  "values": { "clave_del_campo": "valor" },
  "missingFields": ["clave_del_campo"],
  "tag": "éxito|parcial|fallo|referencia",
  "note": "string"
}`;
}

// evidence: [{ mimeType, data }] — imágenes/PDF en base64 (mismo formato que arma el cliente
// en ViewAportar). Se le pasan a Claude como parte del mismo mensaje — puede leer datos
// directo de una foto de un instrumento, un ticket, o un reporte escaneado, no solo del texto.
function buildContentBlocks(test, freeText, evidence) {
  const blocks = [];
  for (const att of evidence ?? []) {
    if (att.mimeType?.startsWith('image/')) {
      blocks.push({ type: 'image', source: { type: 'base64', media_type: att.mimeType, data: att.data } });
    } else if (att.mimeType === 'application/pdf') {
      blocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: att.data } });
    }
  }
  blocks.push({ type: 'text', text: buildPrompt(test, freeText, blocks.length > 0) });
  return blocks;
}

export async function interpretContribution(test, freeText, evidence) {
  if (!freeText?.trim() && !evidence?.length) throw new Error('El aporte está vacío.');

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: buildContentBlocks(test, freeText || '(sin texto — ver evidencia adjunta)', evidence) }],
  });
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
  const parsed = JSON.parse(cleaned);

  const validKeys = new Set(test.fields.map((f) => f.key));
  const values = {};
  for (const [k, v] of Object.entries(parsed.values || {})) {
    if (validKeys.has(k)) values[k] = v;
  }

  return {
    values,
    missingFields: (Array.isArray(parsed.missingFields) ? parsed.missingFields : []).filter((k) => validKeys.has(k)),
    tag: VALID_TAGS.includes(parsed.tag) ? parsed.tag : 'referencia',
    note: parsed.note || '',
  };
}
