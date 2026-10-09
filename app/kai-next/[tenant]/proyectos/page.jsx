import { redirect, notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getTenantMeta } from '@/lib/kai/tenants';
import { getCurrentTeamUser } from '@/lib/team/auth';
import { getCurrentTenantUser } from '@/lib/kai/tenantAuth';
import { listTenantUsers, sanitizeTenantUser } from '@/lib/kai/tenantUsers';
import { isSectionAllowed, accessFromUsers } from '@/lib/kaiNext/capabilities';
import { listProjectsForPerson, resolveProjectAccessLevel } from '@/lib/kaiNext/projects';
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

  const teamUser = await getCurrentTeamUser();
  const tenantUser = teamUser ? null : await getCurrentTenantUser(tenant);
  if (!teamUser && !(tenantUser?.access?.kaiNext)) {
    redirect(`${basePath}/${tenant}`);
  }
  const access = accessFromUsers(teamUser, tenantUser);
  if (!isSectionAllowed(access, 'proyectos')) {
    redirect(`${basePath}/${tenant}`);
  }

  const level = resolveProjectAccessLevel({ isTeamUser: !!teamUser, access });
  const [projects, people] = await Promise.all([
    listProjectsForPerson(tenant, { ...level, personId: tenantUser?.id ?? null }),
    listTenantUsers(tenant),
  ]);

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
