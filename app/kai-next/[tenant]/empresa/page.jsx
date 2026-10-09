import { redirect, notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getTenantMeta, getBusinessProfile } from '@/lib/kai/tenants';
import { getCurrentTeamUser } from '@/lib/team/auth';
import { getCurrentTenantUser } from '@/lib/kai/tenantAuth';
import { buildBIC } from '@/lib/kai/bic';
import { listLearnings } from '@/lib/kai/learnings';
import { getDiagnosis } from '@/lib/kai/diagnosis';
import { listResolvedRefs } from '@/lib/kai/resolutions';
import { calcOverallScore } from '@/lib/kai/scoring';
import { isSectionAllowed, accessFromUsers } from '@/lib/kaiNext/capabilities';
import { kaiNextBasePath } from '@/lib/kaiNext/paths';
import KaiNextEmpresa from '../KaiNextEmpresa';

export async function generateMetadata({ params }) {
  const { tenant } = await params;
  const meta = await getTenantMeta(tenant);
  return {
    title: meta ? `Empresa · ${meta.name}` : 'Empresa',
    robots: { index: false, follow: false },
  };
}

export default async function KaiNextEmpresaPage({ params }) {
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
  if (!isSectionAllowed(accessFromUsers(teamUser, tenantUser), 'empresa')) {
    redirect(`${basePath}/${tenant}`);
  }

  const [bic, profile, learnings, diagnosisResult, resolvedRefs] = await Promise.all([
    buildBIC(tenant),
    getBusinessProfile(tenant),
    listLearnings(tenant),
    getDiagnosis(tenant),
    listResolvedRefs(tenant),
  ]);

  const score = calcOverallScore(profile, learnings);

  const userName = teamUser?.name ?? teamUser?.username ?? tenantUser?.name ?? 'Equipo Bonsight';
  const userHandle = teamUser?.username ?? tenantUser?.email ?? '';

  return (
    <KaiNextEmpresa
      tenant={tenant}
      tenantName={meta.name}
      basePath={basePath}
      userName={userName}
      userHandle={userHandle}
      isTeamUser={!!teamUser}
      bic={bic}
      score={score}
      learnings={learnings}
      diagnosis={diagnosisResult?.diagnosis ?? null}
      resolvedRefs={resolvedRefs}
    />
  );
}
