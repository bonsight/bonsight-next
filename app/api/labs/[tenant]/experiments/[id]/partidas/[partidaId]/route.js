import { isAuthorizedForTenant, getCurrentLabsUser } from '@/lib/labs/auth';
import { getExperimentMeta, updatePartida } from '@/lib/labs/experiments';

// Editar una partida (incluye `ejecutado`, a medida que se compra/ejecuta): Director, o
// Supervisor asignado a este proyecto.
export async function PATCH(req, { params }) {
  const { tenant, id, partidaId } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const user = await getCurrentLabsUser(tenant);
  if (!user) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  const meta = await getExperimentMeta(tenant, id);
  if (!meta) return Response.json({ error: 'Experimento no encontrado.' }, { status: 404 });

  const isSupervisorOnProject = user.role === 'Supervisor' && meta.supervisorIds?.includes(user.id);
  if (user.role !== 'Director' && !isSupervisorOnProject) {
    return Response.json({ error: 'Solo el Director o un Supervisor asignado a este proyecto puede editar partidas.' }, { status: 403 });
  }

  const patch = await req.json();
  try {
    const partida = await updatePartida(tenant, id, partidaId, patch);
    return Response.json({ ok: true, partida });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo actualizar la partida.' }, { status: 400 });
  }
}
