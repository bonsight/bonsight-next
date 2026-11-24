import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import {
  setTestRegistradores, resolveProjectAccessLevel, projectSupervisionError, getProjectMeta, getTests,
  canManageTest, deleteTest, moveTest, updateTest, listProjectsForPerson, supervisesProject, projectInactiveMessage,
} from '@/lib/kaiNext/projects';
import { listEmpresas } from '@/lib/kaiNext/empresas';

// Eliminar y mover: solo quien creó la prueba o un Director (canManageTest). Cambiar registradores
// (PATCH sin moveTo) sigue abierto a cualquier Supervisor del proyecto, como antes.
async function loadForManage(tenant, id, testId) {
  if (!(await isAuthorizedForTenant(tenant))) return { error: 'No autorizado.', status: 401 };
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) return { error: 'Proyectos no está habilitado para tu usuario.', status: 403 };
  const meta = await getProjectMeta(tenant, id);
  if (!meta || meta.projectKind !== 'experimental') return { error: 'Proyecto no encontrado.', status: 404 };
  const test = (await getTests(tenant, id)).find((t) => t.id === testId);
  if (!test) return { error: 'Prueba no encontrada.', status: 404 };
  if (!canManageTest(identity, meta, test)) {
    return { error: test.createdBy ? 'Solo quien creó la prueba o un Director puede hacer esto.' : 'Esta prueba es anterior al registro de quién la creó: solo un Director puede eliminarla o moverla.', status: 403 };
  }
  return { identity, meta, test };
}

// Proyectos a los que se puede mover: experimentales, activos, de la misma empresa, que la persona supervisa.
async function moveTargets(tenant, identity, meta) {
  const level = resolveProjectAccessLevel(identity);
  const all = await listProjectsForPerson(tenant, { ...level, personId: identity.personId, empresaIds: identity.empresaIds });
  return all.filter((m) => m.id !== meta.id && m.projectKind === 'experimental' && !projectInactiveMessage(m)
    && (m.empresaId ?? null) === (meta.empresaId ?? null) && supervisesProject(identity, m));
}

export async function GET(req, { params }) {
  const { tenant, id, testId } = await params;
  const g = await loadForManage(tenant, id, testId);
  if (g.error) return Response.json({ error: g.error }, { status: g.status });
  const [targets, empresas] = await Promise.all([moveTargets(tenant, g.identity, g.meta), listEmpresas(tenant).catch(() => [])]);
  const empresaName = (id) => empresas.find((e) => e.id === id)?.name ?? null;
  return Response.json({
    current: { id: g.meta.id, name: g.meta.name },
    targets: targets.map((m) => ({ id: m.id, name: m.name, empresaName: empresaName(m.empresaId), type: m.type || null })),
  });
}

export async function DELETE(req, { params }) {
  const { tenant, id, testId } = await params;
  const g = await loadForManage(tenant, id, testId);
  if (g.error) return Response.json({ error: g.error }, { status: g.status });
  try {
    await deleteTest(tenant, id, testId, { by: g.identity.personName ?? 'Equipo Bonsight' });
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}

export async function PATCH(req, { params }) {
  const { tenant, id, testId } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) {
    return Response.json({ error: 'Proyectos no está habilitado para tu usuario.' }, { status: 403 });
  }
  const { isSupervisorLevel } = resolveProjectAccessLevel(identity);
  if (!isSupervisorLevel) {
    return Response.json({ error: 'No tienes permiso para gestionar esta prueba.' }, { status: 403 });
  }
  const notMine = await projectSupervisionError(tenant, id, identity);
  if (notMine) return Response.json({ error: notMine }, { status: 403 });

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }

  // Nombre y criterios: solo quien creó la prueba o un Director.
  if (body.edit) {
    const g = await loadForManage(tenant, id, testId);
    if (g.error) return Response.json({ error: g.error }, { status: g.status });
    try {
      const test = await updateTest(tenant, id, testId, { name: body.edit.name, fields: body.edit.fields }, { by: g.identity.personName ?? 'Equipo Bonsight' });
      return Response.json({ test });
    } catch (err) {
      return Response.json({ error: err.message }, { status: 400 });
    }
  }

  if (body.moveTo) {
    const g = await loadForManage(tenant, id, testId);
    if (g.error) return Response.json({ error: g.error }, { status: g.status });
    const targets = await moveTargets(tenant, g.identity, g.meta);
    if (!targets.some((m) => m.id === body.moveTo)) return Response.json({ error: 'No puedes mover la prueba a ese proyecto.' }, { status: 403 });
    try {
      const moved = await moveTest(tenant, id, testId, body.moveTo, { by: g.identity.personName ?? 'Equipo Bonsight' });
      return Response.json({ moved: { ...moved, to: body.moveTo } });
    } catch (err) {
      return Response.json({ error: err.message }, { status: 400 });
    }
  }

  try {
    const test = await setTestRegistradores(tenant, id, testId, body.registradorIds);
    return Response.json({ test });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
