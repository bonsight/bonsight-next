import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getProjectMeta, deleteGasto, projectInactiveMessage, resolveProjectAccessLevel } from '@/lib/kaiNext/projects';

export async function DELETE(req, { params }) {
  const { tenant, id, gastoId } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) {
    return Response.json({ error: 'Proyectos no está habilitado para tu usuario.' }, { status: 403 });
  }
  const { isSupervisorLevel } = resolveProjectAccessLevel(identity);
  if (!isSupervisorLevel) {
    return Response.json({ error: 'No tenés permiso para gestionar gastos de este proyecto.' }, { status: 403 });
  }

  const meta = await getProjectMeta(tenant, id);
  if (!meta) return Response.json({ error: 'Proyecto no encontrado.' }, { status: 404 });
  const inactive = projectInactiveMessage(meta);
  if (inactive) return Response.json({ error: inactive }, { status: 400 });

  try {
    await deleteGasto(tenant, id, gastoId);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
