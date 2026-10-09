import { redirect, notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getTenantMeta } from '@/lib/kai/tenants';
import { getCurrentTeamUser } from '@/lib/team/auth';
import { getCurrentTenantUser } from '@/lib/kai/tenantAuth';
import { getIntelligenceSources } from '@/lib/kai/intelligenceSources';
import { buildBIC } from '@/lib/kai/bic';
import { listInvestigations } from '@/lib/aria/memory';
import { isSectionAllowed, accessFromUsers } from '@/lib/kaiNext/capabilities';
import { kaiNextBasePath } from '@/lib/kaiNext/paths';
import KaiNextFuentes from '../KaiNextFuentes';

export async function generateMetadata({ params }) {
  const { tenant } = await params;
  const meta = await getTenantMeta(tenant);
  return {
    title: meta ? `Fuentes · ${meta.name}` : 'Fuentes',
    robots: { index: false, follow: false },
  };
}

export default async function KaiNextFuentesPage({ params }) {
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
  if (!isSectionAllowed(accessFromUsers(teamUser, tenantUser), 'fuentes')) {
    redirect(`${basePath}/${tenant}`);
  }

  const [intelligenceSources, bic, investigations] = await Promise.all([
    getIntelligenceSources(tenant),
    buildBIC(tenant),
    listInvestigations(tenant, 'ALL'),
  ]);
  const archivedCount = investigations.filter((inv) => inv.estado === 'archivada').length;

  const userName = teamUser?.name ?? teamUser?.username ?? tenantUser?.name ?? 'Equipo Bonsight';
  const userHandle = teamUser?.username ?? tenantUser?.email ?? '';

  return (
    <KaiNextFuentes
      tenant={tenant}
      tenantName={meta.name}
      basePath={basePath}
      userName={userName}
      userHandle={userHandle}
      isTeamUser={!!teamUser}
      intelligenceSources={intelligenceSources}
      bic={bic}
      archivedCount={archivedCount}
      saEmail={process.env.GOOGLE_SA_EMAIL ?? null}
    />
  );
}
