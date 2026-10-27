import { isAuthorizedForTenant, getCurrentLabsUser } from '@/lib/labs/auth';
import { getExperiment } from '@/lib/labs/experiments';
import { generateLabsReportPDF } from '@/lib/labs/generators/reportPdf';

export const runtime = 'nodejs';

// Descarga bajo demanda — no se persiste nada en Drive ni en ningún otro lado, se genera recién
// al hacer click en "Descargar PDF" (mismo criterio que generate-document de Kai Next/Aria).
// Mismo gate que GET .../experiments/[id]: Director ve todo, Supervisor solo si está asignado;
// Registrador no tiene acceso a Reportes (ahí se muestran métricas financieras/generales del
// proyecto que su vista ya oculta en el detalle del experimento).
export async function GET(req, { params }) {
  const { tenant, id, reportId } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const user = await getCurrentLabsUser(tenant);
  if (!user) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  const experiment = await getExperiment(tenant, id);
  if (!experiment) return Response.json({ error: 'Experimento no encontrado.' }, { status: 404 });

  if (user.role === 'Supervisor') {
    if (!experiment.meta.supervisorIds?.includes(user.id)) {
      return Response.json({ error: 'No tienes acceso a este proyecto.' }, { status: 403 });
    }
  } else if (user.role !== 'Director') {
    return Response.json({ error: 'No tienes acceso a los reportes de este proyecto.' }, { status: 403 });
  }

  const report = experiment.reports.find((r) => r.id === reportId);
  if (!report) return Response.json({ error: 'Reporte no encontrado.' }, { status: 404 });

  try {
    const buffer = await generateLabsReportPDF({ projectName: experiment.meta.name, report });
    const safeName = experiment.meta.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const dateStr = (report.approvedAt || report.createdAt).slice(0, 10);
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}_Reporte_${dateStr}.pdf"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (err) {
    console.error(`[labs-report-pdf:${tenant}/${id}/${reportId}] error:`, err.message);
    return Response.json({ error: 'No se pudo generar el PDF.' }, { status: 500 });
  }
}
