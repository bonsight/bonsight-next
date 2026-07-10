import Anthropic from '@anthropic-ai/sdk';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { isAuthorizedForTenant } from '@/lib/kai/auth';
import { addSource } from '@/lib/kai/knowledgeSources';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function extractPdf(buffer) {
  const base64 = Buffer.from(buffer).toString('base64');
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: base64 },
        },
        {
          type: 'text',
          text: 'Extrae todo el contenido textual de este documento de forma limpia y estructurada. Preserva títulos, secciones y listas. No agregues explicaciones ni comentarios — solo el contenido extraído.',
        },
      ],
    }],
  });
  return response.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
}

async function extractDocx(buffer) {
  const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
  return result.value?.trim() ?? '';
}

function extractXlsx(buffer) {
  const workbook = XLSX.read(Buffer.from(buffer), { type: 'buffer' });
  const parts = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
    return `## Hoja: ${name}\n${csv}`;
  });
  return parts.join('\n\n').trim();
}

export async function POST(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file');
  const name = formData.get('name') || file?.name || 'Documento';

  if (!file) return Response.json({ error: 'Archivo requerido.' }, { status: 400 });

  const fileName = file.name?.toLowerCase() ?? '';
  const buffer = await file.arrayBuffer();

  let rawText = '';
  try {
    if (fileName.endsWith('.pdf')) {
      rawText = await extractPdf(buffer);
    } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      rawText = await extractDocx(buffer);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
      rawText = extractXlsx(buffer);
    } else {
      return Response.json({ error: 'Formato no soportado. Usa PDF, DOCX o XLSX.' }, { status: 400 });
    }
  } catch (err) {
    return Response.json({ error: `Error al leer el archivo: ${err.message}` }, { status: 500 });
  }

  if (!rawText) return Response.json({ error: 'El archivo no contiene texto extraíble.' }, { status: 400 });

  const source = await addSource(tenant, {
    sourceType: 'file',
    name,
    url: null,
    rawText,
  });

  return Response.json({ source });
}
