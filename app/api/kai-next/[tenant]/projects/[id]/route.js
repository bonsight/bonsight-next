import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getProject, getProjectMeta, updateProjectDetails, setProjectSupervisors, resolveProjectAccessLevel, supervisesProject } from '@/lib/kaiNext/projects';
import { getRoadmap } from '@/lib/kaiNext/devStore';
import { listTenantUsers } from '@/lib/kai/tenantUsers';
import { logProjectAction } from '@/lib/kaiNext/audit';

// Mismo criterio que listProjectsForPerson pero para UN proyecto ya cargado.
function canSeeProject(meta, tasks, tests, { isDirectorLevel, personId }) {
  if (isDirectorLevel) return true;
  if (!personId) return false;
  if (meta.supervisorIds?.includes(personId)) return true;
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

  // El nivel que recibe la pantalla es el de ESTE proyecto: un Supervisor que no está en el equipo
  // lo ve como Team member (ver supervisesProject en lib/kaiNext/projects.js).
  const globalLevel = resolveProjectAccessLevel(identity);
  const level = { ...globalLevel, isSupervisorLevel: supervisesProject(identity, meta) };

  // 'desarrollo': lo ve el Director o quien está en el equipo.
  if (meta.projectKind === 'desarrollo') {
    if (!level.isDirectorLevel && !meta.supervisorIds?.includes(identity.personId)) {
      return Response.json({ error: 'No tienes acceso a este proyecto.' }, { status: 403 });
    }
    try {
      const roadmap = await getRoadmap(tenant, id);
      return Response.json({ meta, iniciativas: roadmap.iniciativas, level });
    } catch (err) {
      console.error(`[kaiNext/projects] no se pudo cargar el detalle del proyecto ${id}:`, err.message);
      return Response.json({ error: 'No se pudo cargar el proyecto. Intenta de nuevo en unos segundos.' }, { status: 503 });
    }
  }

  const project = await getProject(tenant, id);
  if (!canSeeProject(project.meta, project.tasks, project.tests, { ...level, personId: identity.personId })) {
    return Response.json({ error: 'No tienes acceso a este proyecto.' }, { status: 403 });
  }

  // Un Team member ve todo el trabajo del proyecto (tareas, pruebas, ejecuciones, mini proyectos y
  // los documentos adjuntos a tareas) aunque solo incida en lo suyo. El presupuesto y la
  // documentación general del proyecto siguen siendo de Supervisor.
  if (!level.isSupervisorLevel) {
    return Response.json({
      meta: project.meta,
      tasks: project.tasks,
      events: project.events,
      tests: project.tests,
      executions: project.executions,
      grupos: project.grupos ?? [],
      tipologias: project.tipologias ?? [],
      documents: (project.documents ?? []).filter((d) => d.taskId),
      level,
    });
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

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }

  // El equipo lo arma el Director o un Supervisor del proyecto; el resto de los detalles (estado,
  // nombre, fechas) es solo del Director.
  const before = await getProjectMeta(tenant, id);
  if (!before) return Response.json({ error: 'Proyecto no encontrado.' }, { status: 404 });
  const onlyTeam = Array.isArray(body.supervisorIds);
  if (!isDirectorLevel && !(onlyTeam && supervisesProject(identity, before))) {
    return Response.json({ error: onlyTeam ? 'Solo un Supervisor de este proyecto puede cambiar su equipo.' : 'Solo un Director puede editar los detalles del proyecto.' }, { status: 403 });
  }
  if (onlyTeam && !isDirectorLevel && !body.supervisorIds.includes(identity.personId)) {
    return Response.json({ error: 'No puedes quitarte a ti mismo del equipo: perderías el acceso al proyecto.' }, { status: 400 });
  }

  try {
    if (onlyTeam) {
      const meta = await setProjectSupervisors(tenant, id, body.supervisorIds.filter((x) => typeof x === 'string'));
      const nameById = new Map((await listTenantUsers(tenant)).map((u) => [u.id, u.name || u.email]));
      const names = (ids) => ids.map((x) => nameById.get(x) ?? x).join(', ');
      const added = meta.supervisorIds.filter((x) => !before?.supervisorIds?.includes(x));
      const removed = (before?.supervisorIds ?? []).filter((x) => !meta.supervisorIds.includes(x));
      await logProjectAction(tenant, identity, {
        project: meta,
        action: 'Cambió el equipo',
        detail: [added.length && `Agregó: ${names(added)}`, removed.length && `Quitó: ${names(removed)}`].filter(Boolean).join('. ') || 'Sin cambios',
      });
      return Response.json({ meta });
    }
    const meta = await updateProjectDetails(tenant, id, body);
    return Response.json({ meta });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
