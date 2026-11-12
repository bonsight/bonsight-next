import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getProjectMeta, getTasksList, addProjectDocument, projectInactiveMessage, supervisesProject, isOwnTask } from '@/lib/kaiNext/projects';

export async function POST(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) {
    return Response.json({ error: 'Proyectos no está habilitado para tu usuario.' }, { status: 403 });
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

  // La documentación general es del Supervisor del proyecto; adjuntar a una tarea lo puede hacer
  // también quien la tiene a cargo.
  if (!supervisesProject(identity, meta)) {
    const task = body?.taskId ? (await getTasksList(tenant, id)).find((t) => t.id === body.taskId) : null;
    if (!task || !isOwnTask(task, identity.personId)) {
      return Response.json({ error: 'Solo puedes adjuntar documentos a tus propias tareas.' }, { status: 403 });
    }
  }

  try {
    const document = await addProjectDocument(tenant, id, { ...body, uploadedBy: identity.personName ?? 'Alguien' });
    return Response.json({ document });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
