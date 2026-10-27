import { redirect, notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getTenantMeta } from '@/lib/kai/tenants';
import { getCurrentTeamUser } from '@/lib/team/auth';
import { getCurrentTenantUser } from '@/lib/kai/tenantAuth';
import { getIntelligenceSources } from '@/lib/kai/intelligenceSources';
import { buildBIC } from '@/lib/kai/bic';
import { listInvestigations } from '@/lib/aria/memory';
import { getDbSources } from '@/lib/aria/databases';
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

  // Si además hay una sesión de tenant activa (se logueó explícito como ese usuario — ej.
  // para probar qué ve un cliente puntual), esa identidad más específica gana sobre la sesión
  // global de equipo — antes la de equipo ganaba siempre, sin importar si también había una
  // sesión de tenant activa en el mismo navegador.
  const [rawTeamUser, tenantUser] = await Promise.all([getCurrentTeamUser(), getCurrentTenantUser(tenant)]);
  const teamUser = tenantUser ? null : rawTeamUser;
  if (!teamUser && !(tenantUser?.access?.kaiNext)) {
    redirect(`${basePath}/${tenant}`);
  }
  if (!isSectionAllowed(accessFromUsers(teamUser, tenantUser), 'fuentes')) {
    redirect(`${basePath}/${tenant}`);
  }

  const [intelligenceSources, bic, investigations, dbSources] = await Promise.all([
    getIntelligenceSources(tenant),
    buildBIC(tenant),
    listInvestigations(tenant, 'ALL'),
    getDbSources(tenant),
  ]);
  const archivedCount = investigations.filter((inv) => inv.estado === 'archivada').length;

  const userName = teamUser?.name ?? teamUser?.username ?? tenantUser?.name ?? 'Equipo Bonsight';
  const userHandle = teamUser?.username ?? tenantUser?.email ?? '';
  const userEmail = teamUser?.email ?? tenantUser?.email ?? null;

  return (
    <KaiNextFuentes
      tenant={tenant}
      tenantName={meta.name}
      basePath={basePath}
      userName={userName}
      userHandle={userHandle}
      userEmail={userEmail}
      isTeamUser={!!teamUser}
      intelligenceSources={intelligenceSources}
      bic={bic}
      archivedCount={archivedCount}
      saEmail={process.env.GOOGLE_SA_EMAIL ?? null}
      dbSources={dbSources.map((s) => ({
        id: s.id,
        type: s.type,
        label: s.label,
        status: s.status,
        tableCount: s.schema?.tables?.length ?? null,
      }))}
    />
  );
}
