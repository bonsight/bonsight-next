import { redirect, notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getTenantMeta } from '@/lib/kai/tenants';
import { getCurrentTeamUser } from '@/lib/team/auth';
import { getCurrentTenantUser } from '@/lib/kai/tenantAuth';
import { listActivitiesForTenant } from '@/lib/kai/activities';
import { isSectionAllowed, accessFromUsers } from '@/lib/kaiNext/capabilities';
import { kaiNextBasePath } from '@/lib/kaiNext/paths';
import KaiNextActivities from '../KaiNextActivities';

export async function generateMetadata({ params }) {
  const { tenant } = await params;
  const meta = await getTenantMeta(tenant);
  return {
    title: meta ? `Activities · ${meta.name}` : 'Activities',
    robots: { index: false, follow: false },
  };
}

export default async function KaiNextActivitiesPage({ params }) {
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
  if (!isSectionAllowed(accessFromUsers(teamUser, tenantUser), 'activities')) {
    redirect(`${basePath}/${tenant}`);
  }

  const activities = await listActivitiesForTenant(tenant);

  const userName = teamUser?.name ?? teamUser?.username ?? tenantUser?.name ?? 'Equipo Bonsight';
  const userHandle = teamUser?.username ?? tenantUser?.email ?? '';

  return (
    <KaiNextActivities
      tenant={tenant}
      tenantName={meta.name}
      basePath={basePath}
      userName={userName}
      userHandle={userHandle}
      isTeamUser={!!teamUser}
      initialActivities={activities}
    />
  );
}
