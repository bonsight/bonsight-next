import { redirect, notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getTenantMeta } from '@/lib/kai/tenants';
import { getCurrentTeamUser } from '@/lib/team/auth';
import { getCurrentTenantUser } from '@/lib/kai/tenantAuth';
import { getIntelligenceSources } from '@/lib/kai/intelligenceSources';
import { getDbSources } from '@/lib/aria/databases';
import { listAreas, getAreaSnapshot } from '@/lib/kaiNext/analysisAreas';
import { isSectionAllowed, accessFromUsers } from '@/lib/kaiNext/capabilities';
import { kaiNextBasePath } from '@/lib/kaiNext/paths';
import KaiNextAnalisis from '../KaiNextAnalisis';

export async function generateMetadata({ params }) {
  const { tenant } = await params;
  const meta = await getTenantMeta(tenant);
  return {
    title: meta ? `Análisis · ${meta.name}` : 'Análisis',
    robots: { index: false, follow: false },
  };
}

export default async function KaiNextAnalisisPage({ params }) {
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
  if (!isSectionAllowed(accessFromUsers(teamUser, tenantUser), 'analisis')) {
    redirect(`${basePath}/${tenant}`);
  }

  const [areas, intelligenceSources, dbSources] = await Promise.all([
    listAreas(tenant),
    getIntelligenceSources(tenant),
    getDbSources(tenant),
  ]);
  const snapshots = {};
  await Promise.all(areas.map(async (a) => {
    snapshots[a.id] = await getAreaSnapshot(tenant, a.id);
  }));

  const connectedSources = {
    ga4: intelligenceSources.find((s) => s.id === 'ga4')?.status === 'active',
    search_console: intelligenceSources.find((s) => s.id === 'search_console')?.status === 'active',
    google_ads: intelligenceSources.find((s) => s.id === 'google_ads')?.status === 'active',
    database: (dbSources?.length ?? 0) > 0,
  };

  const userName = teamUser?.name ?? teamUser?.username ?? tenantUser?.name ?? 'Equipo Bonsight';
  const userHandle = teamUser?.username ?? tenantUser?.email ?? '';

  return (
    <KaiNextAnalisis
      tenant={tenant}
      tenantName={meta.name}
      basePath={basePath}
      userName={userName}
      userHandle={userHandle}
      isTeamUser={!!teamUser}
      initialAreas={areas}
      initialSnapshots={snapshots}
      connectedSources={connectedSources}
    />
  );
}
