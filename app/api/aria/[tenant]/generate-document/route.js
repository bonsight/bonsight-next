import { isAuthorizedForTenant } from '@/lib/aria/auth';
import { generateGtmContainer } from '@/lib/aria/generators/gtm';
import { generateMeasurementExcel } from '@/lib/aria/generators/excel';
import { generateMeasurementPDF } from '@/lib/aria/generators/pdf.jsx';

const MIME = {
  gtm_json: 'application/json',
  excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};

export async function POST(req, { params }) {
  const { tenant } = await params;

  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }

  const { format, filename, ...data } = body;

  if (!['gtm_json', 'excel', 'pdf'].includes(format)) {
    return Response.json({ error: `Formato desconocido: ${format}` }, { status: 400 });
  }

  let buffer;
  try {
    if (format === 'gtm_json') {
      const json = generateGtmContainer({ ...data, filename });
      buffer = Buffer.from(JSON.stringify(json, null, 2), 'utf-8');
    } else if (format === 'excel') {
      buffer = generateMeasurementExcel(data);
    } else {
      buffer = await generateMeasurementPDF(data);
    }
  } catch (err) {
    console.error(`[aria-generate:${tenant}] format=${format} error:`, err.message);
    return Response.json({ error: 'Error generando el documento.' }, { status: 500 });
  }

  const safeFilename = (filename ?? `aria-document.${format === 'gtm_json' ? 'json' : format === 'excel' ? 'xlsx' : 'pdf'}`)
    .replace(/[^a-zA-Z0-9._-]/g, '-');

  return new Response(buffer, {
    headers: {
      'Content-Type': MIME[format],
      'Content-Disposition': `attachment; filename="${safeFilename}"`,
      'Content-Length': String(buffer.length),
    },
  });
}
