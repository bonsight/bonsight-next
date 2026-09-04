import { isAuthorizedForTenant, getCurrentLabsUser } from '@/lib/labs/auth';
import { getExperimentMeta, addGasto, projectInactiveMessage } from '@/lib/labs/experiments';

// Agregar un gasto a una partida (con factura de respaldo opcional adjunta) — mismo criterio
// que editar la partida: Director, o Supervisor asignado a este proyecto.
export async function POST(req, { params }) {
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
    return Response.json({ error: 'Solo el Director o un Supervisor asignado a este proyecto puede agregar gastos.' }, { status: 403 });
  }
  const inactiveMsg = projectInactiveMessage(meta);
  if (inactiveMsg) return Response.json({ error: inactiveMsg }, { status: 409 });

  const { monto, fecha, proveedor, nota, attachments } = await req.json();
  try {
    const gasto = await addGasto(tenant, id, { partidaId, monto, fecha, proveedor, nota, attachments, createdBy: user.name });
    return Response.json({ ok: true, gasto });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo agregar el gasto.' }, { status: 400 });
  }
}
