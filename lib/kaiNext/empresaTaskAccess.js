import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getEmpresa, empresaAllows } from '@/lib/kaiNext/empresas';
import { resolveProjectAccessLevel } from '@/lib/kaiNext/projects';

// Tareas sueltas de una empresa (ver lib/kaiNext/empresaTasks.js). Las ve quien tiene la
// empresa asignada; las crea y gestiona un Director o Supervisor; el responsable actualiza las
// suyas. Validar (pasar de En revisión a Hecho) lo hace un Director o Supervisor no responsable.
export async function empresaTaskContext(tenant, empresaId) {
  if (!(await isAuthorizedForTenant(tenant))) return { error: Response.json({ error: 'No autorizado.' }, { status: 401 }) };
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) {
    return { error: Response.json({ error: 'Proyectos no está habilitado para tu usuario.' }, { status: 403 }) };
  }
  const empresa = await getEmpresa(tenant, empresaId);
  if (!empresa) return { error: Response.json({ error: 'Empresa no encontrada.' }, { status: 404 }) };
  if (!empresaAllows(identity.empresaIds, { empresaId })) {
    return { error: Response.json({ error: 'No tienes acceso a esa empresa.' }, { status: 403 }) };
  }
  const { isSupervisorLevel } = resolveProjectAccessLevel(identity);
  return { identity, empresa, canManage: isSupervisorLevel, canValidate: isSupervisorLevel, actor: identity.personName ?? 'Alguien' };
}

