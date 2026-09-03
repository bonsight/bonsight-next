import { isAuthorizedForTenant, getCurrentLabsUser } from '@/lib/labs/auth';
import { getExperiment, addReportDraft, updateReportDraft, submitReport, approveReport, computeCivilReportBreakdown, TASK_TRACKING_KINDS } from '@/lib/labs/experiments';
import { generateReportDraft, generateCivilReportDraft } from '@/lib/labs/reports';

export async function POST(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const user = await getCurrentLabsUser(tenant);
  if (!user) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  const experiment = await getExperiment(tenant, id);
  if (!experiment) return Response.json({ error: 'Experimento no encontrado.' }, { status: 404 });

  // Solo Supervisor genera el borrador — Director lo aprueba (ver PATCH). Registrador no
  // tiene el nav item, pero igual lo bloqueamos acá por si alguien pega el request a mano.
  if (user.role !== 'Supervisor') {
    return Response.json({ error: 'Solo un Supervisor puede generar un reporte.' }, { status: 403 });
  }
  if (!experiment.meta.supervisorIds?.includes(user.id)) {
    return Response.json({ error: 'No tenés acceso a este proyecto.' }, { status: 403 });
  }

  try {
    const periodFrom = experiment.meta.createdAt;
    const periodTo = new Date().toISOString();

    if (TASK_TRACKING_KINDS.includes(experiment.meta.projectKind)) {
      const { photos } = await req.json().catch(() => ({ photos: [] }));
      // breakdown.financialByEtapa sale vacío si el proyecto no tiene partidas (seguimiento
      // nunca las tiene) — el resto del pipeline y el render ya lo manejan sin romperse.
      const breakdown = computeCivilReportBreakdown(experiment.tasks, experiment.partidas);
      const analysis = await generateCivilReportDraft(tenant, experiment, breakdown);
      const report = await addReportDraft(tenant, id, {
        kind: 'civil',
        metrics: experiment.civilMetrics,
        breakdown,
        analysis,
        photos: Array.isArray(photos) ? photos : [],
        generatedBy: user.name,
        periodFrom, periodTo,
      });
      return Response.json({ ok: true, report });
    }

    const doc = await generateReportDraft(tenant, experiment);
    const report = await addReportDraft(tenant, id, { kind: 'experimental', doc, generatedBy: user.name, periodFrom, periodTo });
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
  const user = await getCurrentLabsUser(tenant);
  if (!user) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  const { reportId, action, analysis, doc } = await req.json();

  try {
    // edit/submit son del Supervisor que todavía tiene el borrador; approve es del Director.
    if (action === 'edit') {
      if (user.role !== 'Supervisor') return Response.json({ error: 'Solo un Supervisor puede editar el borrador.' }, { status: 403 });
      const report = await updateReportDraft(tenant, id, reportId, { analysis, doc });
      return Response.json({ ok: true, report });
    }
    if (action === 'submit') {
      if (user.role !== 'Supervisor') return Response.json({ error: 'Solo un Supervisor puede enviar el reporte.' }, { status: 403 });
      const report = await submitReport(tenant, id, reportId);
      return Response.json({ ok: true, report });
    }
    if (user.role !== 'Director') {
      return Response.json({ error: 'Solo un Director puede aprobar un reporte.' }, { status: 403 });
    }
    const report = await approveReport(tenant, id, reportId);
    return Response.json({ ok: true, report });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo actualizar el reporte.' }, { status: 400 });
  }
}
