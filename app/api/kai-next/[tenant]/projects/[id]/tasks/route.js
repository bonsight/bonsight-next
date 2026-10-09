import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getProjectMeta, addTask, projectInactiveMessage, resolveProjectAccessLevel } from '@/lib/kaiNext/projects';

// Crear/editar/eliminar tareas (cambios estructurales) es de Supervisor/Director — un
// Registrador solo puede togglear el status de SUS tareas (ver [taskId]/status/route.js).
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
    return Response.json({ error: 'No tenés permiso para gestionar tareas de este proyecto.' }, { status: 403 });
  }

  const meta = await getProjectMeta(tenant, id);
  if (!meta) return Response.json({ error: 'Proyecto no encontrado.' }, { status: 404 });
  const inactive = projectInactiveMessage(meta);
  if (inactive) return Response.json({ error: inactive }, { status: 400 });

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }

  try {
    const task = await addTask(tenant, id, body);
    return Response.json({ task });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
