import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { resolveProjectAccessLevel } from '@/lib/kaiNext/projects';
import { getNotionToken, updateDevEpica, deleteDevEpica } from '@/lib/kaiNext/projectsNotion';

async function gate(tenant) {
  if (!(await isAuthorizedForTenant(tenant))) return { error: Response.json({ error: 'No autorizado.' }, { status: 401 }) };
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) {
    return { error: Response.json({ error: 'Proyectos no está habilitado para tu usuario.' }, { status: 403 }) };
  }
  const { isSupervisorLevel } = resolveProjectAccessLevel(identity);
  if (!isSupervisorLevel) {
    return { error: Response.json({ error: 'No tenés permiso para gestionar esta épica.' }, { status: 403 }) };
  }
  const token = await getNotionToken(tenant);
  if (!token) return { error: Response.json({ error: 'Notion no está conectado para este tenant.' }, { status: 400 }) };
  return { token };
}

export async function PATCH(req, { params }) {
  const { tenant, epicaId } = await params;
  const { error, token } = await gate(tenant);
  if (error) return error;

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }

  try {
    await updateDevEpica(token, epicaId, body);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}

// Soft delete (archiva en Notion) — bloqueado si la épica todavía tiene historias asociadas,
// ver deleteEpica en lib/aria/board.js.
export async function DELETE(req, { params }) {
  const { tenant, epicaId } = await params;
  const { error, token } = await gate(tenant);
  if (error) return error;

  try {
    await deleteDevEpica(token, epicaId);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
