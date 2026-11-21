import { getKaiNextAdminScope, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { updateEmpresa, deleteEmpresa, getEmpresa } from '@/lib/kaiNext/empresas';
import { listProjects, updateProjectDetails } from '@/lib/kaiNext/projects';
import { logProjectAction } from '@/lib/kaiNext/audit';
import { listTenantUsers } from '@/lib/kai/tenantUsers';

export async function PATCH(req, { params }) {
  const { tenant, empresaId } = await params;
  if (!(await getKaiNextAdminScope(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 403 });
  }
  try {
    const { name, color, description, visible } = await req.json();
    const empresa = await updateEmpresa(tenant, empresaId, { name, color, description, visible });
    return Response.json({ empresa });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo guardar.' }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  const { tenant, empresaId } = await params;
  if (!(await getKaiNextAdminScope(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 403 });
  }
  const [projects, users] = await Promise.all([listProjects(tenant), listTenantUsers(tenant)]);
  try {
    await deleteEmpresa(tenant, empresaId, {
      projectCount: projects.filter((p) => p.empresaId === empresaId).length,
      peopleCount: users.filter((u) => u.empresaIds?.includes(empresaId)).length,
    });
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}

// Asignar de una vez a esta empresa proyectos que todavía no tienen ninguna (al activar la capa
// de empresas en un tenant que ya tenía proyectos). Nunca mueve un proyecto que ya tiene empresa:
// eso se hace uno por uno desde el detalle del proyecto.
export async function POST(req, { params }) {
  const { tenant, empresaId } = await params;
  if (!(await getKaiNextAdminScope(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 403 });
  }
  const empresa = await getEmpresa(tenant, empresaId);
  if (!empresa) return Response.json({ error: 'Empresa no encontrada.' }, { status: 404 });
  const { projectIds } = await req.json().catch(() => ({}));
  if (!Array.isArray(projectIds) || !projectIds.length) {
    return Response.json({ error: 'Elige al menos un proyecto.' }, { status: 400 });
  }
  const identity = await getCurrentKaiNextIdentity(tenant);
  const targets = (await listProjects(tenant)).filter((p) => projectIds.includes(p.id) && !p.empresaId);
  for (const p of targets) {
    await updateProjectDetails(tenant, p.id, { empresaId: empresa.id });
    await logProjectAction(tenant, identity, { project: p, action: 'Cambió la empresa', detail: `Sin empresa → ${empresa.name}` });
  }
  return Response.json({ ok: true, assigned: targets.length });
}
