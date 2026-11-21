import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getProjectMeta, isProjectMember, supervisesProject, resolveProjectAccessLevel, getTasksList, getTests, isOwnTask } from '@/lib/kaiNext/projects';
import { empresaAllows } from '@/lib/kaiNext/empresas';

// Control de acceso común de las rutas de un proyecto (feedback, reportes, resumen…): sesión,
// sección Proyectos, empresa y equipo. Devuelve { error } (una Response lista) o el contexto.
// - member: puede ver el proyecto (empresa + equipo, o Director de su empresa).
// - supervises: Director o Supervisor del proyecto (deja feedback, genera reportes, valida).
// - isDirector: aprueba reportes.
export async function projectContext(tenant, id) {
  if (!(await isAuthorizedForTenant(tenant))) {
    return { error: Response.json({ error: 'No autorizado.' }, { status: 401 }) };
  }
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) {
    return { error: Response.json({ error: 'Proyectos no está habilitado para tu usuario.' }, { status: 403 }) };
  }
  const meta = await getProjectMeta(tenant, id);
  if (!meta) return { error: Response.json({ error: 'Proyecto no encontrado.' }, { status: 404 }) };
  const supervises = supervisesProject(identity, meta);
  // Mismo criterio que el detalle del proyecto: también entra quien tiene una tarea o prueba a
  // su nombre aunque no esté en el equipo.
  let member = supervises || isProjectMember(identity, meta);
  if (!member && identity.personId && empresaAllows(identity.empresaIds, meta)) {
    const [tasks, tests] = await Promise.all([getTasksList(tenant, id), getTests(tenant, id)]);
    member = tasks.some((t) => isOwnTask(t, identity.personId)) || tests.some((t) => t.registradorIds?.includes(identity.personId));
  }
  if (!member) return { error: Response.json({ error: 'No tienes acceso a este proyecto.' }, { status: 403 }) };
  const isDirector = supervises && resolveProjectAccessLevel(identity).isDirectorLevel;
  return { identity, meta, member, supervises, isDirector, actor: identity.personName ?? 'Alguien' };
}
