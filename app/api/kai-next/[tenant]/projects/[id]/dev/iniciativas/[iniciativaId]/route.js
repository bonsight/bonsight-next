import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getProjectMeta, resolveProjectAccessLevel } from '@/lib/kaiNext/projects';
import { getNotionToken, renameDevIniciativa, deleteDevIniciativa } from '@/lib/kaiNext/projectsNotion';

async function gate(tenant, id) {
  if (!(await isAuthorizedForTenant(tenant))) return { error: 'No autorizado.', status: 401 };
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) return { error: 'Proyectos no está habilitado para tu usuario.', status: 403 };
  const { isSupervisorLevel } = resolveProjectAccessLevel(identity);
  if (!isSupervisorLevel) return { error: 'No tenés permiso para editar iniciativas en este proyecto.', status: 403 };
  const meta = await getProjectMeta(tenant, id);
  if (!meta || meta.projectKind !== 'desarrollo') return { error: 'Proyecto no encontrado.', status: 404 };
  const token = await getNotionToken(tenant);
  if (!token) return { error: 'Notion no está conectado para este tenant.', status: 400 };
  return { token };
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
    await renameDevIniciativa(g.token, iniciativaId, body.name);
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
    await deleteDevIniciativa(g.token, iniciativaId);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
