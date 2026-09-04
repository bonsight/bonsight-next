import Anthropic from '@anthropic-ai/sdk';
import { extractTextFromBuffer, OFFICE_MIMES } from '@/lib/fileExtract';
import { trackUsage } from '@/lib/kai/usage';

const MODEL = 'claude-sonnet-4-6';
const VALID_TAGS = ['éxito', 'parcial', 'fallo', 'referencia'];
const MAX_EXTRACT_CHARS = 20000;

// A diferencia de Ficha (5 preguntas fijas para cualquier workshop), cada Prueba acá define
// su propio esquema de campos — el prompt se arma dinámicamente contra ESOS campos, no contra
// una estructura fija.
function buildPrompt(test, freeText, hasEvidence) {
  const fieldsDesc = test.fields.map((f) => {
    const threshold = f.operator && f.value != null ? ` — criterio de paso: ${f.operator} ${f.value}${f.unit ? ` ${f.unit}` : ''}` : '';
    return `- clave "${f.key}" — ${f.label} (tipo: ${f.type})${threshold}`;
  }).join('\n');
  return `Sos el asistente de Labs de Bonsight — interpretás el aporte libre (texto o transcripción de voz) de alguien que acaba de ejecutar una prueba, y lo estructurás contra los campos que esa prueba definió.

PRUEBA: ${test.name}

CAMPOS DE ESTA PRUEBA:
${fieldsDesc}

APORTE (texto libre de la persona, tal cual lo escribió o dijo):
"""
${freeText}
"""
${hasEvidence ? '\nTambién se adjuntó evidencia (foto, PDF, planilla o documento) antes de este texto — leela también: puede tener datos legibles (una lectura de instrumento, un ticket, un reporte, una tabla de resultados) que completen o confirmen campos que el texto no menciona.\n' : ''}
Extraé el valor de cada campo si está mencionado (en el texto o en la evidencia adjunta), en su tipo correspondiente (number → número, text → string tal cual). Si un campo no se menciona en ninguno de los dos, NO lo inventes — dejalo fuera de "values" y agregalo a "missingFields".

Además:
- "tag": tu mejor estimación de si este resultado fue "éxito", "parcial", "fallo", o "referencia" (una corrida de referencia/línea base, no una prueba real evaluando algo). Si algún campo tiene "criterio de paso" arriba, compará el valor extraído contra ese criterio — es la señal más confiable que tenés, más que el tono del texto. Si varios campos tienen criterio y algunos pasan y otros no, es "parcial".
- "note": si el aporte incluye algo más allá de completar los campos — un aprendizaje, una decisión tomada, un problema no planeado, contexto operativo — resumilo en una oración clara. Si el aporte es solo los datos de los campos sin nada adicional, dejalo vacío ("").

Respondé ÚNICAMENTE con un objeto JSON válido, sin texto antes ni después, sin markdown, sin backticks:
{
  "values": { "clave_del_campo": "valor" },
  "missingFields": ["clave_del_campo"],
  "tag": "éxito|parcial|fallo|referencia",
  "note": "string"
}`;
}

// Clasifica un adjunto para decidir CÓMO (o si) se analiza. Los PDF/imágenes los lee Claude
// nativo; Word/Excel se convierten a texto con lib/fileExtract.js (mismo módulo que usa el
// upload de Knowledge Sources de Kai); DXF (AutoCAD en texto plano) se lee best-effort acá
// mismo. DWG binario no se puede parsear sin una librería de pago — queda como "no analizable".
// Video nunca se analiza: es evidencia de soporte únicamente.
function classifyEvidence(att) {
  const mime = att.mimeType || '';
  const name = (att.name || '').toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('video/')) return 'video';
  if (OFFICE_MIMES.has(mime) || /\.(docx|xlsx|xls|csv)$/.test(name)) return 'office';
  if (mime === 'application/dxf' || mime === 'image/vnd.dxf' || name.endsWith('.dxf')) return 'dxf';
  return 'other';
}

// Extracción best-effort de texto de un DXF (formato ASCII de AutoCAD) — junta el contenido
// de las entidades TEXT/MTEXT (código de grupo 1, la línea siguiente al texto "TEXT"/"MTEXT").
// No interpreta geometría ni bloques — solo el texto legible que haya en el plano.
function extractDxfText(buffer) {
  const raw = buffer.toString('latin1');
  const lines = raw.split(/\r\n|\r|\n/);
  const found = [];
  for (let i = 0; i < lines.length - 1; i++) {
    if ((lines[i].trim() === 'TEXT' || lines[i].trim() === 'MTEXT') ) {
      for (let j = i + 1; j < Math.min(i + 40, lines.length - 1); j++) {
        if (lines[j].trim() === '1') {
          const value = (lines[j + 1] || '').trim();
          if (value) found.push(value);
          break;
        }
      }
    }
  }
  return found.join(' · ');
}

function truncate(text, max) {
  if (!text) return text;
  return text.length > max ? `${text.slice(0, max)}\n[...truncado]` : text;
}

// evidence: [{ name, mimeType, data }] — base64 (mismo formato que arma el cliente en
// ViewAportar). Devuelve los content blocks para Claude + la lista de adjuntos que NO se
// pudieron analizar (para avisarle al Registrador que los complete a mano).
async function buildContentBlocks(test, freeText, evidence) {
  const blocks = [];
  const unanalyzed = [];
  let hasEvidence = false;

  for (const att of evidence ?? []) {
    const kind = classifyEvidence(att);
    if (kind === 'image') {
      blocks.push({ type: 'image', source: { type: 'base64', media_type: att.mimeType, data: att.data } });
      hasEvidence = true;
    } else if (kind === 'pdf') {
      blocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: att.data } });
      hasEvidence = true;
    } else if (kind === 'office') {
      try {
        const text = await extractTextFromBuffer(Buffer.from(att.data, 'base64'), att.mimeType);
        if (text) {
          blocks.push({ type: 'text', text: `Documento adjunto (${att.name || 'sin nombre'}):\n${truncate(text, MAX_EXTRACT_CHARS)}` });
          hasEvidence = true;
        } else {
          unanalyzed.push({ name: att.name, reason: 'No se encontró texto legible en el documento.' });
        }
      } catch {
        unanalyzed.push({ name: att.name, reason: 'No se pudo leer el archivo.' });
      }
    } else if (kind === 'dxf') {
      const text = extractDxfText(Buffer.from(att.data, 'base64'));
      if (text) {
        blocks.push({ type: 'text', text: `Exportación de AutoCAD (DXF) adjunta (${att.name || 'sin nombre'}) — texto extraído del plano, sin geometría:\n${truncate(text, MAX_EXTRACT_CHARS)}` });
        hasEvidence = true;
      } else {
        unanalyzed.push({ name: att.name, reason: 'No se encontró texto legible en el DXF.' });
      }
    } else if (kind === 'video') {
      unanalyzed.push({ name: att.name, reason: 'Video: se guarda como evidencia de soporte, no se analiza.' });
    } else {
      unanalyzed.push({ name: att.name, reason: 'Formato no soportado para análisis automático (ej. DWG binario) — revisar manualmente.' });
    }
  }

  blocks.push({ type: 'text', text: buildPrompt(test, freeText, hasEvidence) });
  return { blocks, unanalyzed, hasEvidence };
}

export async function interpretContribution(tenant, test, freeText, evidence) {
  if (!freeText?.trim() && !evidence?.length) throw new Error('El aporte está vacío.');

  const { blocks, unanalyzed, hasEvidence } = await buildContentBlocks(test, freeText || '(sin texto — ver evidencia adjunta)', evidence);

  // Si todo lo adjunto era video (u otro formato no analizable) y no hay texto, no tiene
  // sentido llamar a Claude — no hay nada que leer. El Registrador completa los campos a mano.
  if (!freeText?.trim() && !hasEvidence) {
    return {
      values: {},
      missingFields: test.fields.map((f) => f.key),
      tag: 'referencia',
      note: '',
      unanalyzed,
    };
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: blocks }],
  });
  trackUsage({ tenant, product: 'labs', feature: 'contribution_interpret', model: MODEL, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens }).catch(() => null);
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
    unanalyzed,
  };
}
