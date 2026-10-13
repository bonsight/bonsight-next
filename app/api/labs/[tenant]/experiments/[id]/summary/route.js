import { isAuthorizedForTenant } from '@/lib/labs/auth';
import { getExperiment } from '@/lib/labs/experiments';
import { generateSupervisorSummary, generateDirectorBrief, getCachedSummary, saveCachedSummary } from '@/lib/labs/summary';

// El resumen se genera con IA solo si todavía no existe uno guardado, o si viene `force: true`
// (botón "Actualizar" en el cliente) — así no se dispara una llamada a Claude en cada visita a
// la pestaña Resumen, y el resultado queda con su fecha hasta que alguien pida refrescarlo.
export async function POST(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const { role, force } = await req.json();
  const roleKey = role === 'Director' ? 'director' : 'supervisor';

  if (!force) {
    const cached = await getCachedSummary(tenant, id, roleKey);
    if (cached) return Response.json(roleKey === 'director' ? { ok: true, brief: cached } : { ok: true, summary: cached });
  }

  const experiment = await getExperiment(tenant, id);
  if (!experiment) return Response.json({ error: 'Experimento no encontrado.' }, { status: 404 });

  try {
    if (roleKey === 'director') {
      const brief = await saveCachedSummary(tenant, id, roleKey, await generateDirectorBrief(tenant, experiment));
      return Response.json({ ok: true, brief });
    }
    const summary = await saveCachedSummary(tenant, id, roleKey, await generateSupervisorSummary(tenant, experiment));
    return Response.json({ ok: true, summary });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo generar el resumen.' }, { status: 400 });
  }
}
