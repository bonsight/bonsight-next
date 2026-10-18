import { redirect, notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getTenantMeta } from '@/lib/kai/tenants';
import { getCurrentTeamUser } from '@/lib/team/auth';
import { getCurrentTenantUser } from '@/lib/kai/tenantAuth';
import { listTenantUsers, sanitizeTenantUser } from '@/lib/kai/tenantUsers';
import { isSectionAllowed, accessFromUsers } from '@/lib/kaiNext/capabilities';
import { listProjectsForPerson, resolveProjectAccessLevel, summarizeProjectForList } from '@/lib/kaiNext/projects';
import { kaiNextBasePath } from '@/lib/kaiNext/paths';
import KaiNextProjects from '../KaiNextProjects';

export async function generateMetadata({ params }) {
  const { tenant } = await params;
  const meta = await getTenantMeta(tenant);
  return {
    title: meta ? `Proyectos · ${meta.name}` : 'Proyectos',
    robots: { index: false, follow: false },
  };
}

export default async function KaiNextProjectsPage({ params }) {
  const { tenant } = await params;
  const meta = await getTenantMeta(tenant);
  if (!meta) notFound();

  const host = (await headers()).get('host') ?? '';
  const basePath = kaiNextBasePath(host);

  // Si además hay una sesión de tenant activa (se logueó explícito como ese usuario — ej.
  // para probar qué ve un cliente puntual), esa identidad más específica gana sobre la sesión
  // global de equipo — antes la de equipo ganaba siempre, sin importar si también había una
  // sesión de tenant activa en el mismo navegador.
  const [rawTeamUser, tenantUser] = await Promise.all([getCurrentTeamUser(), getCurrentTenantUser(tenant)]);
  const teamUser = tenantUser ? null : rawTeamUser;
  if (!teamUser && !(tenantUser?.access?.kaiNext)) {
    redirect(`${basePath}/${tenant}`);
  }
  const access = accessFromUsers(teamUser, tenantUser);
  if (!isSectionAllowed(access, 'proyectos')) {
    redirect(`${basePath}/${tenant}`);
  }

  const level = resolveProjectAccessLevel({ isTeamUser: !!teamUser, access });
  const [metas, people] = await Promise.all([
    listProjectsForPerson(tenant, { ...level, personId: tenantUser?.id ?? null }),
    listTenantUsers(tenant),
  ]);
  const projects = await Promise.all(metas.map(async (m) => ({ ...m, summary: await summarizeProjectForList(tenant, m) })));

  const userName = teamUser?.name ?? teamUser?.username ?? tenantUser?.name ?? 'Equipo Bonsight';
  const userHandle = teamUser?.username ?? tenantUser?.email ?? '';

  return (
    <KaiNextProjects
      tenant={tenant}
      tenantName={meta.name}
      basePath={basePath}
      userName={userName}
      userHandle={userHandle}
      isTeamUser={!!teamUser}
      personId={tenantUser?.id ?? null}
      level={level}
      initialProjects={projects}
      people={people.map((u) => sanitizeTenantUser(u))}
    />
  );
}
