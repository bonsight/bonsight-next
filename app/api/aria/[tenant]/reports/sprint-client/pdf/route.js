import { isAuthorizedForTenant } from '@/lib/aria/auth';
import { generateSprintClientReportPDF } from '@/lib/aria/generators/sprintClientReportPdf.jsx';

export async function POST(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.titulo || !body?.clienteName) {
    return Response.json({ error: 'Faltan datos del reporte.' }, { status: 400 });
  }

  try {
    const buffer = await generateSprintClientReportPDF({
      titulo: body.titulo,
      clienteName: body.clienteName,
      periodLabel: body.periodLabel || '',
      resumenEjecutivo: body.resumenEjecutivo || '',
      secciones: Array.isArray(body.secciones) ? body.secciones : [],
      valorEntregado: Array.isArray(body.valorEntregado) ? body.valorEntregado : [],
      metrics: body.metrics || null,
      generatedAtLabel: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
    });

    const safeFilename = `Reporte-${body.clienteName}-${new Date().toISOString().slice(0, 10)}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '-');
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (err) {
    console.error(`[aria-sprint-client-report:${tenant}] error:`, err.message);
    return Response.json({ error: 'No se pudo generar el PDF.' }, { status: 500 });
  }
}
