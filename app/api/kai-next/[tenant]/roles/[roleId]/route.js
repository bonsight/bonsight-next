import { getKaiNextAdminScope } from '@/lib/kaiNext/auth';
import { updateRole, accessFromRole } from '@/lib/kaiNext/roles';
import { applyRoleAccessToUsers } from '@/lib/kai/tenantUsers';

// Renombrar, desactivar o cambiar sus funcionalidades. Lo que cambie se aplica a quienes tienen
// este rol y no fueron ajustados a mano.
export async function PATCH(req, { params }) {
  const { tenant, roleId } = await params;
  if ((await getKaiNextAdminScope(tenant)) !== 'full') {
    return Response.json({ error: 'Solo un admin con acceso completo puede editar roles.' }, { status: 403 });
  }
  try {
    const { name, description, active, sections, capabilities, admin } = await req.json();
    const role = await updateRole(tenant, roleId, { name, description, active, sections, capabilities, admin });
    const updatedPeople = await applyRoleAccessToUsers(tenant, roleId, accessFromRole(role));
    return Response.json({ role, updatedPeople });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo guardar.' }, { status: 400 });
  }
}
