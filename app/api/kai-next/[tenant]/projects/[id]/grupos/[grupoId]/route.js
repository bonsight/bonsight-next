import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getProjectMeta, updateGrupo, deleteGrupo, projectInactiveMessage, resolveProjectAccessLevel } from '@/lib/kaiNext/projects';

async function guard(tenant) {
  if (!(await isAuthorizedForTenant(tenant))) return { error: Response.json({ error: 'No autorizado.' }, { status: 401 }) };
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) {
    return { error: Response.json({ error: 'Proyectos no está habilitado para tu usuario.' }, { status: 403 }) };
  }
  const { isSupervisorLevel } = resolveProjectAccessLevel(identity);
  if (!isSupervisorLevel) {
    return { error: Response.json({ error: 'No tenés permiso para gestionar mini proyectos acá.' }, { status: 403 }) };
  }
  return {};
}

async function checkActive(tenant, id) {
  const meta = await getProjectMeta(tenant, id);
  if (!meta) return { error: Response.json({ error: 'Proyecto no encontrado.' }, { status: 404 }) };
  const inactive = projectInactiveMessage(meta);
  if (inactive) return { error: Response.json({ error: inactive }, { status: 400 }) };
  return {};
}

export async function PATCH(req, { params }) {
  const { tenant, id, grupoId } = await params;
  const { error } = await guard(tenant);
  if (error) return error;
  const { error: activeError } = await checkActive(tenant, id);
  if (activeError) return activeError;

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }

  try {
    const grupo = await updateGrupo(tenant, id, grupoId, body);
    return Response.json({ grupo });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  const { tenant, id, grupoId } = await params;
  const { error } = await guard(tenant);
  if (error) return error;
  const { error: activeError } = await checkActive(tenant, id);
  if (activeError) return activeError;

  try {
    await deleteGrupo(tenant, id, grupoId);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
