import { isAuthorizedForTenant, getCurrentLabsUser } from '@/lib/labs/auth';
import { getExperimentMeta, deleteGasto, projectInactiveMessage } from '@/lib/labs/experiments';

// Borrar un gasto — sin edición a propósito (ver deleteGasto), si el monto está mal se borra
// y se agrega de nuevo. Mismo criterio de permisos que agregar uno.
export async function DELETE(req, { params }) {
  const { tenant, id, gastoId } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const user = await getCurrentLabsUser(tenant);
  if (!user) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  const meta = await getExperimentMeta(tenant, id);
  if (!meta) return Response.json({ error: 'Experimento no encontrado.' }, { status: 404 });

  const isSupervisorOnProject = user.role === 'Supervisor' && meta.supervisorIds?.includes(user.id);
  if (user.role !== 'Director' && !isSupervisorOnProject) {
    return Response.json({ error: 'Solo el Director o un Supervisor asignado a este proyecto puede borrar gastos.' }, { status: 403 });
  }
  const inactiveMsg = projectInactiveMessage(meta);
  if (inactiveMsg) return Response.json({ error: inactiveMsg }, { status: 409 });

  await deleteGasto(tenant, id, gastoId);
  return Response.json({ ok: true });
}
