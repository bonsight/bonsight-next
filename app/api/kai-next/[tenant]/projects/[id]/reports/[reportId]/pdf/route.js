import { projectContext } from '@/lib/kaiNext/projectAccess';
import { getReportsList } from '@/lib/kaiNext/projects';
import { generateLabsReportPDF } from '@/lib/labs/generators/reportPdf';

export const runtime = 'nodejs';

// PDF de un reporte, bajo demanda (no se guarda en ningún lado). Mismo generador que Labs.
export async function GET(req, { params }) {
  const { tenant, id, reportId } = await params;
  const ctx = await projectContext(tenant, id);
  if (ctx.error) return ctx.error;
  if (!ctx.supervises) return Response.json({ error: 'No tienes acceso a los reportes de este proyecto.' }, { status: 403 });
  const report = (await getReportsList(tenant, id)).find((r) => r.id === reportId);
  if (!report) return Response.json({ error: 'Reporte no encontrado.' }, { status: 404 });
  try {
    const buffer = await generateLabsReportPDF({ projectName: ctx.meta.name, report, author: 'Kai · Bonsight' });
    const safeName = ctx.meta.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const dateStr = (report.approvedAt || report.createdAt).slice(0, 10);
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}_Reporte_${dateStr}.pdf"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (err) {
    console.error(`[kai-next/report-pdf:${tenant}/${id}/${reportId}]`, err.message);
    return Response.json({ error: 'No se pudo generar el PDF.' }, { status: 500 });
  }
}
