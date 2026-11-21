import { projectContext } from '@/lib/kaiNext/projectAccess';
import {
  getProject, addReportDraft, updateReportDraft, submitReport, approveReport, computeCivilMetrics, computeCivilAlerts,
  computeCivilReportBreakdown, TASK_TRACKING_KINDS,
} from '@/lib/kaiNext/projects';
import { generateExperimentalReport, generateProgressReportAnalysis } from '@/lib/kaiNext/projectAI';

export const maxDuration = 60;

// Reportes: los ve, genera y envía un Director o Supervisor del proyecto; solo el Director los
// aprueba. El Team member / Registrador no los ve (traen métricas generales del proyecto).
export async function GET(req, { params }) {
  const { tenant, id } = await params;
  const ctx = await projectContext(tenant, id);
  if (ctx.error) return ctx.error;
  if (!ctx.supervises) return Response.json({ reports: [], canGenerate: false, canApprove: false });
  const project = await getProject(tenant, id);
  return Response.json({ reports: project.reports, canGenerate: true, canApprove: ctx.isDirector });
}

export async function POST(req, { params }) {
  const { tenant, id } = await params;
  const ctx = await projectContext(tenant, id);
  if (ctx.error) return ctx.error;
  if (!ctx.supervises) return Response.json({ error: 'Solo un Director o Supervisor del proyecto puede generar un reporte.' }, { status: 403 });
  const project = await getProject(tenant, id);
  if (project.meta.projectKind === 'desarrollo') return Response.json({ error: 'Los proyectos de desarrollo no usan reportes.' }, { status: 400 });

  const { photos } = await req.json().catch(() => ({}));
  const base = {
    photos: Array.isArray(photos) ? photos : [],
    generatedBy: ctx.actor,
    generatedById: ctx.identity.personId,
    periodFrom: project.meta.createdAt,
    periodTo: new Date().toISOString(),
  };
  try {
    if (TASK_TRACKING_KINDS.includes(project.meta.projectKind)) {
      // Seguimiento también se reporta como avance (sin presupuesto): las métricas se calculan
      // igual que en civil.
      const metrics = project.civilMetrics ?? computeCivilMetrics(project.tasks, project.partidas, project.meta);
      const alerts = project.civilAlerts?.length ? project.civilAlerts : computeCivilAlerts(project.tasks, project.partidas, metrics);
      const breakdown = computeCivilReportBreakdown(project.tasks, project.partidas);
      const analysis = await generateProgressReportAnalysis(tenant, { ...project, civilMetrics: metrics, civilAlerts: alerts }, breakdown);
      const report = await addReportDraft(tenant, id, { kind: 'civil', metrics, breakdown, analysis, ...base });
      return Response.json({ ok: true, report });
    }
    const doc = await generateExperimentalReport(tenant, project);
    const report = await addReportDraft(tenant, id, { kind: 'experimental', doc, ...base });
    return Response.json({ ok: true, report });
  } catch (err) {
    console.error(`[kai-next/reports:${tenant}/${id}]`, err.message);
    return Response.json({ error: 'No se pudo generar el reporte. Intenta de nuevo en unos segundos.' }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  const { tenant, id } = await params;
  const ctx = await projectContext(tenant, id);
  if (ctx.error) return ctx.error;
  const { reportId, action, analysis, doc } = await req.json().catch(() => ({}));
  try {
    if (action === 'edit' || action === 'submit') {
      if (!ctx.supervises) return Response.json({ error: 'Solo un Director o Supervisor del proyecto puede hacer esto.' }, { status: 403 });
      const report = action === 'edit'
        ? await updateReportDraft(tenant, id, reportId, { analysis, doc })
        : await submitReport(tenant, id, reportId, ctx.actor);
      return Response.json({ ok: true, report });
    }
    if (action === 'approve') {
      if (!ctx.isDirector) return Response.json({ error: 'Solo un Director puede aprobar un reporte.' }, { status: 403 });
      return Response.json({ ok: true, report: await approveReport(tenant, id, reportId, ctx.actor) });
    }
    return Response.json({ error: 'Acción inválida.' }, { status: 400 });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo actualizar el reporte.' }, { status: 400 });
  }
}
