import { isAuthorizedForTenant } from '@/lib/kaiNext/auth';
import { getTenantMeta } from '@/lib/kai/tenants';
import { createReport } from '@/lib/kai/reports';

// El cliente arma el snapshot (WYSIWYG de lo que esa persona veía en Empresa al compartir) y
// acá solo se valida la forma y se persiste — nada de recalcular server-side, para que el
// reporte sea exactamente la vista que el usuario decidió compartir.
export async function POST(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const meta = await getTenantMeta(tenant);
  if (!meta) return Response.json({ error: 'Tenant no encontrado.' }, { status: 404 });

  const body = await req.json();
  const snapshot = {
    tenant,
    tenantName: meta.name,
    score: typeof body.score === 'number' ? body.score : null,
    confianza: typeof body.confianza === 'string' ? body.confianza : null,
    diagnosis: body.diagnosis && typeof body.diagnosis === 'object' ? {
      problema_principal: body.diagnosis.problema_principal ?? null,
      oportunidad_principal: body.diagnosis.oportunidad_principal ?? null,
      impacto: body.diagnosis.impacto ?? null,
    } : null,
    ejes: Array.isArray(body.ejes) ? body.ejes.slice(0, 10).map((e) => ({
      categoria: e.categoria ?? null, titulo: e.titulo ?? '', descripcion: e.descripcion ?? '',
    })) : [],
    priorities: Array.isArray(body.priorities) ? body.priorities.slice(0, 20).map((p) => ({
      text: String(p.text ?? ''), done: !!p.done,
    })) : [],
    objectives: body.objectives && typeof body.objectives === 'object' ? {
      shortTerm: Array.isArray(body.objectives.shortTerm) ? body.objectives.shortTerm.slice(0, 15) : [],
      mediumTerm: Array.isArray(body.objectives.mediumTerm) ? body.objectives.mediumTerm.slice(0, 15) : [],
      longTerm: Array.isArray(body.objectives.longTerm) ? body.objectives.longTerm.slice(0, 15) : [],
    } : null,
    kpis: Array.isArray(body.kpis) ? body.kpis.slice(0, 15) : [],
    learnings: Array.isArray(body.learnings) ? body.learnings.slice(0, 10).map((l) => ({
      content: String(l.content ?? ''), impact: l.impact ?? null, createdAt: l.createdAt ?? null,
    })) : [],
  };

  const report = await createReport(snapshot);
  return Response.json({ id: report.id });
}
