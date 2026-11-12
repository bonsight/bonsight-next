import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getProjectMeta, resolveProjectAccessLevel, projectSupervisionError } from '@/lib/kaiNext/projects';
import { createIniciativa } from '@/lib/kaiNext/devStore';

export async function POST(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) {
    return Response.json({ error: 'Proyectos no está habilitado para tu usuario.' }, { status: 403 });
  }
  const { isSupervisorLevel } = resolveProjectAccessLevel(identity);
  if (!isSupervisorLevel) {
    return Response.json({ error: 'No tienes permiso para crear iniciativas en este proyecto.' }, { status: 403 });
  }
  const notMine = await projectSupervisionError(tenant, id, identity);
  if (notMine) return Response.json({ error: notMine }, { status: 403 });

  const meta = await getProjectMeta(tenant, id);
  if (!meta || meta.projectKind !== 'desarrollo') return Response.json({ error: 'Proyecto no encontrado.' }, { status: 404 });

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }

  try {
    const iniciativa = await createIniciativa(tenant, id, { name: body.name, startDate: body.startDate, endDate: body.endDate });
    return Response.json({ iniciativa });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
