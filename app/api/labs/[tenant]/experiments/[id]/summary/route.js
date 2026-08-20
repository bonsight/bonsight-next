import { isAuthorizedForTenant } from '@/lib/labs/auth';
import { getExperiment } from '@/lib/labs/experiments';
import { generateSupervisorSummary, generateDirectorBrief } from '@/lib/labs/summary';

export async function POST(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const { role } = await req.json();
  const experiment = await getExperiment(tenant, id);
  if (!experiment) return Response.json({ error: 'Experimento no encontrado.' }, { status: 404 });

  try {
    if (role === 'Director') {
      const brief = await generateDirectorBrief(experiment);
      return Response.json({ ok: true, brief });
    }
    const summary = await generateSupervisorSummary(experiment);
    return Response.json({ ok: true, summary });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo generar el resumen.' }, { status: 400 });
  }
}
