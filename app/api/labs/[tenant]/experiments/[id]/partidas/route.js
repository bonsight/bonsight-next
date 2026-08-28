import { isAuthorizedForTenant, getCurrentLabsUser } from '@/lib/labs/auth';
import { getExperimentMeta, addPartida } from '@/lib/labs/experiments';

// Crear una partida: Director, o Supervisor asignado a este proyecto.
export async function POST(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const user = await getCurrentLabsUser(tenant);
  if (!user) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  const meta = await getExperimentMeta(tenant, id);
  if (!meta) return Response.json({ error: 'Experimento no encontrado.' }, { status: 404 });

  const isSupervisorOnProject = user.role === 'Supervisor' && meta.supervisorIds?.includes(user.id);
  if (user.role !== 'Director' && !isSupervisorOnProject) {
    return Response.json({ error: 'Solo el Director o un Supervisor asignado a este proyecto puede crear partidas.' }, { status: 403 });
  }

  const { etapa, descripcion, cantidad, unidad, precioUnitario, proveedor, comentarios } = await req.json();
  try {
    const partida = await addPartida(tenant, id, { etapa, descripcion, cantidad, unidad, precioUnitario, proveedor, comentarios });
    return Response.json({ ok: true, partida });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo crear la partida.' }, { status: 400 });
  }
}
