import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getProjectMeta, resolveProjectAccessLevel, projectSupervisionError } from '@/lib/kaiNext/projects';
import { updateIniciativa, deleteIniciativa } from '@/lib/kaiNext/devStore';

async function gate(tenant, id) {
  if (!(await isAuthorizedForTenant(tenant))) return { error: 'No autorizado.', status: 401 };
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) return { error: 'Proyectos no está habilitado para tu usuario.', status: 403 };
  const { isSupervisorLevel } = resolveProjectAccessLevel(identity);
  if (!isSupervisorLevel) return { error: 'No tienes permiso para editar iniciativas en este proyecto.', status: 403 };
  const notMine = await projectSupervisionError(tenant, id, identity);
  if (notMine) return { error: notMine, status: 403 };
  const meta = await getProjectMeta(tenant, id);
  if (!meta || meta.projectKind !== 'desarrollo') return { error: 'Proyecto no encontrado.', status: 404 };
  return {};
}

export async function PATCH(req, { params }) {
  const { tenant, id, iniciativaId } = await params;
  const g = await gate(tenant, id);
  if (g.error) return Response.json({ error: g.error }, { status: g.status });

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }

  try {
    await updateIniciativa(tenant, id, iniciativaId, {
      name: body.name,
      ...('startDate' in body ? { startDate: body.startDate } : {}),
      ...('endDate' in body ? { endDate: body.endDate } : {}),
    });
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  const { tenant, id, iniciativaId } = await params;
  const g = await gate(tenant, id);
  if (g.error) return Response.json({ error: g.error }, { status: g.status });

  try {
    await deleteIniciativa(tenant, id, iniciativaId);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
