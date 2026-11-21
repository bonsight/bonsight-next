import { canManageTenantTeam, getKaiNextAdminScope } from '@/lib/kaiNext/auth';
import {
  updateTenantUser, deleteTenantUser, resetTenantUserCredentials, setTenantUserCredentials, sanitizeTenantUser,
  getTenantUserById,
} from '@/lib/kai/tenantUsers';
import { getRole, accessFromRole, matchesRole } from '@/lib/kaiNext/roles';
import { listEmpresas } from '@/lib/kaiNext/empresas';

// Un admin con alcance 'team' (ej. un director de Sesuveca) maneja personas y empresas, pero no
// puede tocar a un admin completo ni dar acceso completo al Admin — si no, podría escalar sus
// propios permisos. Ver getKaiNextAdminScope en lib/kaiNext/auth.js.
async function teamScopeError(tenant, userId, scope, { access, roleAccess }) {
  if (scope === 'full') return null;
  const target = await getTenantUserById(tenant, userId);
  if (target?.access?.isAdmin && (target.access.adminScope || 'full') === 'full') {
    return 'Solo un admin con acceso completo puede modificar a esta persona.';
  }
  const wantsFull = (a) => a?.isAdmin && (a.adminScope || 'full') === 'full';
  if (wantsFull(access) || wantsFull(roleAccess)) return 'No puedes dar acceso completo al Admin.';
  return null;
}

export async function PATCH(req, { params }) {
  const { tenant, userId } = await params;
  if (!(await canManageTenantTeam(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const scope = await getKaiNextAdminScope(tenant);
  const {
    firstName, lastName, cargo, email, active, access, timezone, resetCredentials, setCredentials,
    empresaIds, roleId,
  } = await req.json();
  try {
    if (resetCredentials) {
      const denied = await teamScopeError(tenant, userId, scope, {});
      if (denied) return Response.json({ error: denied }, { status: 403 });
      const user = await resetTenantUserCredentials(tenant, userId);
      return Response.json({ ok: true, user: sanitizeTenantUser(user) });
    }
    if (setCredentials) {
      const denied = await teamScopeError(tenant, userId, scope, {});
      if (denied) return Response.json({ error: denied }, { status: 403 });
      const user = await setTenantUserCredentials(tenant, userId, setCredentials);
      return Response.json({ ok: true, user: sanitizeTenantUser(user) });
    }

    // Asignar un rol copia sus funcionalidades a la persona. Si además viene access (ajustes a
    // mano en el mismo guardado), esos mandan y la persona queda marcada como ajustada.
    let role = null;
    let roleAccess;
    if (roleId) {
      role = await getRole(tenant, roleId);
      if (!role) return Response.json({ error: 'Ese rol no existe.' }, { status: 400 });
      if (role.active === false) return Response.json({ error: 'Ese rol está desactivado.' }, { status: 400 });
      roleAccess = accessFromRole(role);
    }

    const denied = await teamScopeError(tenant, userId, scope, { access, roleAccess });
    if (denied) return Response.json({ error: denied }, { status: 403 });

    if (empresaIds !== undefined) {
      const valid = new Set((await listEmpresas(tenant)).map((e) => e.id));
      if (!Array.isArray(empresaIds) || empresaIds.some((id) => !valid.has(id))) {
        return Response.json({ error: 'Alguna de esas empresas no existe.' }, { status: 400 });
      }
    }

    const mergedAccess = roleAccess || access ? { ...(roleAccess ?? {}), ...(access ?? {}) } : undefined;
    let roleCustomized;
    if (role) {
      roleCustomized = !!access && !matchesRole({ ...roleAccess, ...access }, role);
    } else if (access && (access.kaiNextSections !== undefined || access.kaiNextCapabilities !== undefined)) {
      // Ajuste a mano sin cambiar de rol: deja de seguir al rol si ya no coincide con él.
      const current = await getTenantUserById(tenant, userId);
      const currentRole = current?.roleId ? await getRole(tenant, current.roleId) : null;
      roleCustomized = currentRole ? !matchesRole({ ...current.access, ...access }, currentRole) : undefined;
    }

    const user = await updateTenantUser(tenant, userId, {
      firstName, lastName, cargo, email, active, timezone,
      access: mergedAccess,
      empresaIds,
      roleId: role ? role.id : undefined,
      roleCustomized,
    });
    return Response.json({ ok: true, user: sanitizeTenantUser(user) });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo actualizar.' }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  const { tenant, userId } = await params;
  if (!(await canManageTenantTeam(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const denied = await teamScopeError(tenant, userId, await getKaiNextAdminScope(tenant), {});
  if (denied) return Response.json({ error: denied }, { status: 403 });
  await deleteTenantUser(tenant, userId);
  return Response.json({ ok: true });
}
