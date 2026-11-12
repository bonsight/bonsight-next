import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getProjectMeta, resolveProjectAccessLevel, projectSupervisionError } from '@/lib/kaiNext/projects';
import { createEpica } from '@/lib/kaiNext/devStore';

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
    return Response.json({ error: 'No tienes permiso para crear épicas en este proyecto.' }, { status: 403 });
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
    const epica = await createEpica(tenant, id, {
      name: body.name, iniciativaId: body.iniciativaId, fase: body.fase, startDate: body.startDate, endDate: body.endDate,
    });
    return Response.json({ epica });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
