import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { listProjectsForPerson, createProject, createDevProjectPointer, resolveProjectAccessLevel, PROJECT_KINDS } from '@/lib/kaiNext/projects';
import { getNotionToken, createDevProyecto } from '@/lib/kaiNext/projectsNotion';

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
  const projects = await listProjectsForPerson(tenant, { ...level, personId: identity.personId });
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
    return Response.json({ error: 'No tenés permiso para crear proyectos.' }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }
  const {
    name, code, type, supervisorIds, fechaInicioProyecto, fechaFinProyecto, projectKind, tasks, partidas, purpose, hypothesis, clienteId,
    notionProyectoId, notionClienteId,
  } = body;
  if (!name?.trim()) {
    return Response.json({ error: 'El nombre es requerido.' }, { status: 400 });
  }
  const kind = PROJECT_KINDS.includes(projectKind) ? projectKind : 'seguimiento';

  // Quien crea queda supervisor del proyecto (si no, no volvería a verlo) — mismo criterio que
  // createExperiment de Labs cuando lo crea un Supervisor.
  const nextSupervisorIds = Array.isArray(supervisorIds) ? [...supervisorIds] : [];
  if (identity.personId && !nextSupervisorIds.includes(identity.personId)) nextSupervisorIds.push(identity.personId);

  // 'desarrollo' reusa el Notion interno de Bonsight (el mismo que ya usa Sprints) — no tiene
  // sentido para ningún otro tenant, ver hallazgo en el plan (Sprints tampoco filtra por cliente).
  if (kind === 'desarrollo') {
    if (tenant !== 'bonsight') {
      return Response.json({ error: 'Proyecto de desarrollo solo está disponible para Bonsight.' }, { status: 403 });
    }
    // Importar un Proyecto que ya existe en Notion (de antes de Kai Next): se salta createDevProyecto
    // por completo, solo se crea el pointer apuntando al id que ya mandó /dev-proyectos-existentes.
    if (notionProyectoId) {
      try {
        const project = await createDevProjectPointer(tenant, {
          name, notionProyectoId, notionClienteId: notionClienteId || null, supervisorIds: nextSupervisorIds,
        });
        return Response.json({ project });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 400 });
      }
    }
    const token = await getNotionToken(tenant);
    if (!token) return Response.json({ error: 'Notion no está conectado para este tenant.' }, { status: 400 });
    try {
      const notionProyecto = await createDevProyecto(token, { name, clienteId });
      const project = await createDevProjectPointer(tenant, {
        name, notionProyectoId: notionProyecto.id, notionClienteId: clienteId, supervisorIds: nextSupervisorIds,
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
  });
  return Response.json({ project });
}
