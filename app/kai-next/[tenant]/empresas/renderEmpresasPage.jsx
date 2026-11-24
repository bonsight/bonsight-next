import { redirect, notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getTenantMeta } from '@/lib/kai/tenants';
import { getCurrentTeamUser } from '@/lib/team/auth';
import { getCurrentTenantUser } from '@/lib/kai/tenantAuth';
import { listTenantUsers, sanitizeTenantUser } from '@/lib/kai/tenantUsers';
import { isSectionAllowed, accessFromUsers } from '@/lib/kaiNext/capabilities';
import { hasEmpresas } from '@/lib/kaiNext/empresas';
import { kaiNextBasePath } from '@/lib/kaiNext/paths';
import { listRoles } from '@/lib/kaiNext/roles';
import { projectRoleOf } from '@/lib/kaiNext/capabilities';
import KaiNextEmpresas from '../KaiNextEmpresas';

// Pantalla Empresas (y, con empresaId, el resumen de una empresa). Solo existe en tenants con
// empresas; en el resto redirige a Proyectos, que se ve como siempre.
export async function renderEmpresasPage({ params }) {
  const { tenant, empresaId = null } = await params;
  const meta = await getTenantMeta(tenant);
  if (!meta) notFound();
  const basePath = kaiNextBasePath((await headers()).get('host') ?? '');

  const [rawTeamUser, tenantUser] = await Promise.all([getCurrentTeamUser(), getCurrentTenantUser(tenant)]);
  const teamUser = tenantUser ? null : rawTeamUser;
  if (!teamUser && !(tenantUser?.access?.kaiNext)) redirect(`${basePath}/${tenant}`);
  if (!isSectionAllowed(accessFromUsers(teamUser, tenantUser), 'proyectos')) redirect(`${basePath}/${tenant}`);
  if (!(await hasEmpresas(tenant))) redirect(`${basePath}/${tenant}/proyectos`);

  const [people, roles] = await Promise.all([listTenantUsers(tenant), listRoles(tenant).catch(() => [])]);
  // Rol visible (para el panel de equipo de cada proyecto): el asignado, o el que se deduce de sus permisos.
  const roleOf = (u) => roles.find((r) => r.id === u.roleId)?.name ?? projectRoleOf(u.access?.kaiNextCapabilities).label;
  return (
    <KaiNextEmpresas
      tenant={tenant}
      tenantName={meta.name}
      basePath={basePath}
      userName={teamUser?.name ?? teamUser?.username ?? tenantUser?.name ?? 'Equipo Bonsight'}
      userHandle={teamUser?.username ?? tenantUser?.email ?? ''}
      isTeamUser={!!teamUser}
      empresaId={empresaId}
      people={people.filter((u) => u.active !== false).map((u) => {
        const { id, name, empresaIds } = sanitizeTenantUser(u);
        return { id, name, empresaIds: empresaIds ?? [], role: u.access?.kaiNext ? roleOf(u) : null };
      })}
    />
  );
}

