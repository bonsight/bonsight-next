import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getProject, getProjectMeta, updateProjectDetails, resolveProjectAccessLevel } from '@/lib/kaiNext/projects';
import { getNotionToken, getProyecto, getRoadmap } from '@/lib/kaiNext/projectsNotion';

// Quién puede ver este proyecto puntual — Director todos, Supervisor si está en supervisorIds,
// Registrador si tiene al menos una tarea (civil/seguimiento) o una prueba (experimental)
// asignada ahí. Igual que listProjectsForPerson pero para UN proyecto ya cargado.
function canSeeProject(meta, tasks, tests, { isDirectorLevel, isSupervisorLevel, personId }) {
  if (isDirectorLevel) return true;
  if (isSupervisorLevel) return meta.supervisorIds?.includes(personId);
  if (!personId) return false;
  if (meta.projectKind === 'experimental') return tests.some((t) => t.registradorIds?.includes(personId));
  return tasks.some((t) => (t.responsables ?? []).includes(personId));
}

export async function GET(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) {
    return Response.json({ error: 'Proyectos no está habilitado para tu usuario.' }, { status: 403 });
  }

  const meta = await getProjectMeta(tenant, id);
  if (!meta) return Response.json({ error: 'Proyecto no encontrado.' }, { status: 404 });

  const level = resolveProjectAccessLevel(identity);

  // 'desarrollo' no tiene el nivel de detalle "acceso recortado por tarea/prueba" que sí tienen
  // los otros kinds (ver canSeeProject más abajo) — alcanza con Director, o Supervisor asignado.
  if (meta.projectKind === 'desarrollo') {
    if (!level.isDirectorLevel && !(level.isSupervisorLevel && meta.supervisorIds?.includes(identity.personId))) {
      return Response.json({ error: 'No tenés acceso a este proyecto.' }, { status: 403 });
    }
    const token = await getNotionToken(tenant);
    if (!token) return Response.json({ error: 'Notion no está conectado para este tenant.' }, { status: 400 });
    const [notionProyecto, roadmap] = await Promise.all([
      getProyecto(token, meta.notionProyectoId),
      getRoadmap(token, meta.notionProyectoId),
    ]);
    return Response.json({ meta, notionProyecto, iniciativas: roadmap.iniciativas, level });
  }

  const project = await getProject(tenant, id);
  if (!canSeeProject(project.meta, project.tasks, project.tests, { ...level, personId: identity.personId })) {
    return Response.json({ error: 'No tenés acceso a este proyecto.' }, { status: 403 });
  }

  // Un Registrador solo ve SUS tareas/pruebas, nunca las del resto del equipo ni el presupuesto
  // ni la documentación — mismo recorte que Labs.
  if (!level.isSupervisorLevel) {
    const tasks = project.tasks.filter((t) => (t.responsables ?? []).includes(identity.personId));
    const tests = project.tests.filter((t) => t.registradorIds?.includes(identity.personId));
    const testIds = new Set(tests.map((t) => t.id));
    const executions = project.executions.filter((e) => testIds.has(e.testId));
    return Response.json({ meta: project.meta, tasks, events: project.events, tests, executions, level });
  }

  return Response.json({ ...project, level });
}

export async function PATCH(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) {
    return Response.json({ error: 'Proyectos no está habilitado para tu usuario.' }, { status: 403 });
  }
  const { isDirectorLevel } = resolveProjectAccessLevel(identity);
  if (!isDirectorLevel) {
    return Response.json({ error: 'Solo un Director puede editar los detalles del proyecto.' }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }

  try {
    const meta = await updateProjectDetails(tenant, id, body);
    return Response.json({ meta });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
