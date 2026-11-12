import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getProjectMeta, supervisesProject } from '@/lib/kaiNext/projects';
import { updateEpica, deleteEpica } from '@/lib/kaiNext/devStore';

// Editar o borrar una épica es del Supervisor del proyecto.
async function gate(tenant, projectId) {
  if (!(await isAuthorizedForTenant(tenant))) return { error: Response.json({ error: 'No autorizado.' }, { status: 401 }) };
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) {
    return { error: Response.json({ error: 'Proyectos no está habilitado para tu usuario.' }, { status: 403 }) };
  }
  const meta = await getProjectMeta(tenant, projectId);
  if (!meta || meta.projectKind !== 'desarrollo') return { error: Response.json({ error: 'Proyecto no encontrado.' }, { status: 404 }) };
  if (!supervisesProject(identity, meta)) {
    return { error: Response.json({ error: 'No tienes permiso para gestionar esta épica.' }, { status: 403 }) };
  }
  return {};
}

export async function PATCH(req, { params }) {
  const { tenant, id, epicaId } = await params;
  const { error } = await gate(tenant, id);
  if (error) return error;

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }

  try {
    await updateEpica(tenant, id, epicaId, body);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}

// Bloqueado si la épica todavía tiene historias asociadas (ver deleteEpica en devStore).
export async function DELETE(req, { params }) {
  const { tenant, id, epicaId } = await params;
  const { error } = await gate(tenant, id);
  if (error) return error;

  try {
    await deleteEpica(tenant, id, epicaId);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
