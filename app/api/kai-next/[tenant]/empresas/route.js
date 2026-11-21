import { isAuthorizedForTenant, getCurrentKaiNextIdentity, getKaiNextAdminScope } from '@/lib/kaiNext/auth';
import { listEmpresas, createEmpresa, empresaAllows } from '@/lib/kaiNext/empresas';
import { listProjects, listProjectsForPerson, resolveProjectAccessLevel } from '@/lib/kaiNext/projects';
import { listTenantUsers } from '@/lib/kai/tenantUsers';
import { listEmpresaTasks } from '@/lib/kaiNext/empresaTasks';

// GET: dos usos.
// - Selector de empresa en Kai: devuelve solo las empresas que la persona tiene asignadas, con
//   cuántos proyectos y tareas sueltas activas tiene cada una (el selector oculta las vacías u ocultas).
// - Admin (?admin=1): todas, con conteo de proyectos y personas.
export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const wantsAdmin = new URL(req.url).searchParams.get('admin') === '1';
  const [empresas, projects] = await Promise.all([listEmpresas(tenant), listProjects(tenant)]);
  const projectCount = (id) => projects.filter((p) => p.empresaId === id).length;

  if (wantsAdmin) {
    if (!(await getKaiNextAdminScope(tenant))) return Response.json({ error: 'No autorizado.' }, { status: 403 });
    const users = await listTenantUsers(tenant);
    return Response.json({
      empresas: empresas.map((e) => ({
        ...e,
        projectCount: projectCount(e.id),
        people: users.filter((u) => u.active !== false && u.empresaIds?.includes(e.id)).map((u) => ({ id: u.id, name: u.name })),
      })),
      unassignedProjects: projects.filter((p) => !p.empresaId).map((p) => ({ id: p.id, name: p.name })),
    });
  }

  // Para el selector: cuántos proyectos de cada empresa puede ver ESTA persona (una empresa sin
  // proyectos visibles para ella no aparece en su selector).
  const identity = await getCurrentKaiNextIdentity(tenant);
  const mine = empresas.filter((e) => empresaAllows(identity.empresaIds, { empresaId: e.id }));
  const visible = await listProjectsForPerson(tenant, { ...resolveProjectAccessLevel(identity), personId: identity.personId, empresaIds: identity.empresaIds });
  // También cuántas tareas sueltas activas tiene: una empresa sin proyectos pero con tareas
  // sueltas (ej. el holding) igual tiene que poder elegirse.
  const loose = await Promise.all(mine.map((e) => listEmpresaTasks(tenant, e.id).catch(() => [])));
  return Response.json({
    empresas: mine.map((e, i) => ({
      ...e,
      projectCount: visible.filter((p) => p.empresaId === e.id).length,
      looseCount: loose[i].filter((t) => t.status !== 'done').length,
    })),
  });
}

export async function POST(req, { params }) {
  const { tenant } = await params;
  if (!(await getKaiNextAdminScope(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 403 });
  }
  try {
    const empresa = await createEmpresa(tenant, await req.json());
    return Response.json({ empresa });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo crear.' }, { status: 400 });
  }
}
