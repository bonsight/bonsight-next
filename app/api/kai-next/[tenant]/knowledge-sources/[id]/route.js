import { isAuthorizedForTenant, getKaiNextAdminScope } from '@/lib/kaiNext/auth';
import { deleteSource, rebuildDigest, getSource, updateSourceMeta } from '@/lib/kai/knowledgeSources';
import { getEmpresa } from '@/lib/kaiNext/empresas';

export async function DELETE(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  await deleteSource(tenant, id);
  await rebuildDigest(tenant);
  return Response.json({ ok: true });
}

// Asignar la empresa de una fuente (null = común, la ve todo el equipo). Solo admins.
export async function PATCH(req, { params }) {
  const { tenant, id } = await params;
  if (!(await getKaiNextAdminScope(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 403 });
  }
  const { empresaId } = await req.json().catch(() => ({}));
  if (empresaId && !(await getEmpresa(tenant, empresaId))) {
    return Response.json({ error: 'Esa empresa no existe.' }, { status: 400 });
  }
  if (!(await getSource(tenant, id))) return Response.json({ error: 'Fuente no encontrada.' }, { status: 404 });
  await updateSourceMeta(tenant, id, { empresaId: empresaId || null });
  return Response.json({ ok: true });
}
