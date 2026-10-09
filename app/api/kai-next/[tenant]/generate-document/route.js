import { isAuthorizedForTenant, getCurrentKaiNextAccess } from '@/lib/kaiNext/auth';
import { isCapabilityAllowed, isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { generateMeasurementExcel } from '@/lib/aria/generators/excel';
import { generateKaiReportPDF } from '@/lib/kaiNext/generators/reportPdf';
import { generateActivityCanvasPDF } from '@/lib/kaiNext/generators/workshopCanvasPdf';
import { getActivityMeta, getActivityCanvas } from '@/lib/kai/activities';

// Mismo patrón que app/api/aria/[tenant]/generate-document/route.js: el chat solo guarda el
// SPEC del documento (ver onToolUse en ../route.js) — el archivo en sí (PDF/Excel real) se
// genera acá, bajo demanda, recién cuando el usuario hace click en "Descargar" en la tarjeta.
const MIME = {
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
  if (!['excel', 'pdf', 'activity_canvas_pdf'].includes(format)) {
    return Response.json({ error: `Formato desconocido: ${format}` }, { status: 400 });
  }

  const kaiNextAccess = await getCurrentKaiNextAccess(tenant);
  if (format === 'activity_canvas_pdf') {
    if (!isSectionAllowed(kaiNextAccess, 'activities')) {
      return Response.json({ error: 'Activities no está habilitado para tu usuario.' }, { status: 403 });
    }
  } else {
    const cap = format === 'excel' ? 'excel_export' : 'pdf_export';
    if (!isCapabilityAllowed(kaiNextAccess, cap)) {
      return Response.json({ error: 'Esta capacidad no está habilitada para tu usuario.' }, { status: 403 });
    }
  }

  let buffer;
  try {
    if (format === 'excel') {
      buffer = generateMeasurementExcel(data);
    } else if (format === 'pdf') {
      buffer = await generateKaiReportPDF(data);
    } else {
      // El canvas se resuelve server-side a partir de Redis (no se confía en que el cliente
      // mande el consolidado completo) — itemIndexes se resuelven a items reales acá mismo.
      const { activityId } = data;
      const [meta, canvas] = await Promise.all([
        getActivityMeta(tenant, activityId),
        getActivityCanvas(tenant, activityId),
      ]);
      if (!meta || !canvas) {
        return Response.json({ error: 'Actividad o canvas no encontrado.' }, { status: 404 });
      }
      const payload = {
        title: canvas.workshopName || meta.name,
        date: new Date().toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' }),
        summary: canvas.summary,
        questions: (canvas.questions ?? []).map((q) => ({
          questionText: q.questionText,
          groups: (q.groups ?? []).map((g) => ({
            name: g.name,
            area: g.area,
            responsable: g.responsable,
            consolidatedText: g.consolidatedText,
            ficha: g.ficha ?? null,
            items: (g.itemIndexes ?? [])
              .map((idx) => (canvas.itemsByQuestion?.[q.questionId] ?? [])[idx])
              .filter(Boolean),
          })),
        })),
      };
      buffer = await generateActivityCanvasPDF(payload);
    }
  } catch (err) {
    console.error(`[kai-next-generate:${tenant}] format=${format} error:`, err.message);
    return Response.json({ error: 'Error generando el documento.' }, { status: 500 });
  }

  const ext = format === 'excel' ? 'xlsx' : 'pdf';
  const safeFilename = (filename ?? `kai-document.${ext}`)
    .replace(/[^a-zA-Z0-9._-]/g, '-');

  return new Response(buffer, {
    headers: {
      'Content-Type': format === 'excel' ? MIME.excel : MIME.pdf,
      'Content-Disposition': `attachment; filename="${safeFilename}"`,
      'Content-Length': String(buffer.length),
    },
  });
}
