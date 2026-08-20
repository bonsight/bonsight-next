import { isAuthorizedForTenant } from '@/lib/labs/auth';
import { getExperiment, addReportDraft, approveReport } from '@/lib/labs/experiments';
import { generateReportDraft } from '@/lib/labs/reports';

export async function POST(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const experiment = await getExperiment(tenant, id);
  if (!experiment) return Response.json({ error: 'Experimento no encontrado.' }, { status: 404 });

  try {
    const doc = await generateReportDraft(experiment);
    const periodFrom = experiment.meta.createdAt;
    const periodTo = new Date().toISOString();
    const report = await addReportDraft(tenant, id, { doc, periodFrom, periodTo });
    return Response.json({ ok: true, report });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo generar el reporte.' }, { status: 400 });
  }
}

export async function PATCH(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const { reportId } = await req.json();
  try {
    const report = await approveReport(tenant, id, reportId);
    return Response.json({ ok: true, report });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo aprobar.' }, { status: 400 });
  }
}
