import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getProjectMeta, getTasksList, getDocumentsList, deleteProjectDocument, supervisesProject, isOwnTask } from '@/lib/kaiNext/projects';

export async function DELETE(req, { params }) {
  const { tenant, id, documentId } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) {
    return Response.json({ error: 'Proyectos no está habilitado para tu usuario.' }, { status: 403 });
  }
  const meta = await getProjectMeta(tenant, id);
  if (!meta) return Response.json({ error: 'Proyecto no encontrado.' }, { status: 404 });
  // Mismo criterio que al subir: el Supervisor del proyecto, o quien tiene a cargo la tarea del
  // documento.
  if (!supervisesProject(identity, meta)) {
    const doc = (await getDocumentsList(tenant, id)).find((d) => d.id === documentId);
    const task = doc?.taskId ? (await getTasksList(tenant, id)).find((t) => t.id === doc.taskId) : null;
    if (!task || !isOwnTask(task, identity.personId)) {
      return Response.json({ error: 'Solo puedes quitar documentos de tus propias tareas.' }, { status: 403 });
    }
  }

  try {
    await deleteProjectDocument(tenant, id, documentId);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
