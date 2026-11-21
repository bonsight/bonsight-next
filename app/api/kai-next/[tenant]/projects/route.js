import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { listEmpresas, empresaAllows } from '@/lib/kaiNext/empresas';
import { listProjectsForPerson, createProject, createDevProjectPointer, resolveProjectAccessLevel, PROJECT_KINDS, summarizeProjectForList } from '@/lib/kaiNext/projects';

export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) {
    return Response.json({ error: 'Proyectos no está habilitado para tu usuario.' }, { status: 403 });
  }
  const level = resolveProjectAccessLevel(identity);
  const metas = await listProjectsForPerson(tenant, { ...level, personId: identity.personId, empresaIds: identity.empresaIds });
  const projects = await Promise.all(metas.map(async (m) => ({ ...m, summary: await summarizeProjectForList(tenant, m) })));
  return Response.json({ projects, level });
}

export async function POST(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) {
    return Response.json({ error: 'Proyectos no está habilitado para tu usuario.' }, { status: 403 });
  }
  const { isSupervisorLevel } = resolveProjectAccessLevel(identity);
  if (!isSupervisorLevel) {
    return Response.json({ error: 'No tienes permiso para crear proyectos.' }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }
  const {
    name, code, type, supervisorIds, fechaInicioProyecto, fechaFinProyecto, projectKind, tasks, partidas, purpose, hypothesis,
  } = body;
  if (!name?.trim()) {
    return Response.json({ error: 'El nombre es requerido.' }, { status: 400 });
  }
  const kind = PROJECT_KINDS.includes(projectKind) ? projectKind : 'seguimiento';

  // Con empresas, todo proyecto nace dentro de una que la persona tenga asignada. Si solo tiene
  // una, va ahí sin preguntar. Sin empresas en el tenant, no cambia nada.
  const empresas = await listEmpresas(tenant);
  let empresaId = null;
  if (empresas.length) {
    const mine = empresas.filter((e) => empresaAllows(identity.empresaIds, { empresaId: e.id }));
    empresaId = typeof body.empresaId === 'string' && body.empresaId ? body.empresaId : (mine.length === 1 ? mine[0].id : null);
    if (!empresaId) return Response.json({ error: 'Elige la empresa del proyecto.' }, { status: 400 });
    if (!mine.some((e) => e.id === empresaId)) {
      return Response.json({ error: 'No puedes crear proyectos en una empresa que no tienes asignada.' }, { status: 403 });
    }
  }

  // Quien crea queda supervisor del proyecto (si no, no volvería a verlo) — mismo criterio que
  // createExperiment de Labs cuando lo crea un Supervisor.
  const nextSupervisorIds = Array.isArray(supervisorIds) ? [...supervisorIds] : [];
  if (identity.personId && !nextSupervisorIds.includes(identity.personId)) nextSupervisorIds.push(identity.personId);

  // 'desarrollo' vive en Kai (iniciativas, épicas, tareas y sprints en lib/kaiNext/devStore.js);
  // el registro de proyectos guarda solo su ficha.
  if (kind === 'desarrollo') {
    try {
      const project = await createDevProjectPointer(tenant, {
        name, clienteName: typeof body.clienteName === 'string' ? body.clienteName.trim() || null : null, supervisorIds: nextSupervisorIds, empresaId,
      });
      return Response.json({ project });
    } catch (err) {
      return Response.json({ error: err.message }, { status: 400 });
    }
  }

  const project = await createProject(tenant, {
    name, code, type,
    supervisorIds: nextSupervisorIds,
    projectKind: kind,
    fechaInicioProyecto, fechaFinProyecto,
    tasks, partidas,
    purpose, hypothesis,
    clienteName: body.clienteName,
    empresaId,
    requiresReview: body.requiresReview,
  });
  return Response.json({ project });
}
