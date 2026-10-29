import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { isKaiNextAdmin } from '@/lib/kaiNext/auth';
import { getTenantMeta } from '@/lib/kai/tenants';
import { getCurrentTeamUser } from '@/lib/team/auth';
import { getCurrentTenantUser } from '@/lib/kai/tenantAuth';
import { getTenantMonthlyUsage, getRecentEvents, getTenantDailyUsage, currentMonth } from '@/lib/kai/usage';
import { kaiNextBasePath } from '@/lib/kaiNext/paths';
import KaiNextAdminShell from './KaiNextAdminShell';

export async function generateMetadata({ params }) {
  const { tenant } = await params;
  const meta = await getTenantMeta(tenant);
  return {
    title: meta ? `Kai Next Admin · ${meta.name}` : 'Kai Next Admin',
    robots: { index: false, follow: false },
  };
}

export default async function KaiNextAdminPage({ params }) {
  const { tenant } = await params;
  const meta = await getTenantMeta(tenant);
  if (!meta) notFound();

  const host = (await headers()).get('host') ?? '';
  const basePath = kaiNextBasePath(host);

  if (!(await isKaiNextAdmin(tenant))) redirect(`${basePath}/${tenant}`);

  // Mismo criterio que las otras páginas de Kai Next (ver fuentes/page.jsx): una sesión de
  // tenant activa (alguien de equipo logueado explícito como ese usuario) manda sobre la
  // sesión global de equipo.
  const [rawTeamUser, tenantUser] = await Promise.all([getCurrentTeamUser(), getCurrentTenantUser(tenant)]);
  const teamUser = tenantUser ? null : rawTeamUser;
  const userName = teamUser?.name ?? teamUser?.username ?? tenantUser?.name ?? 'Equipo Bonsight';
  const userHandle = teamUser?.username ?? tenantUser?.email ?? '';
  const isTeamUser = !!teamUser;

  const ninetyDaysAgo = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 89);
    return d.toISOString().slice(0, 10);
  })();
  const todayStr = new Date().toISOString().slice(0, 10);

  const [tenantUsage, usageEvents, dailyUsage] = await Promise.all([
    getTenantMonthlyUsage(tenant, currentMonth()),
    getRecentEvents(tenant, 1000),
    getTenantDailyUsage(tenant, ninetyDaysAgo, todayStr),
  ]);

  return (
    <KaiNextAdminShell
      tenant={tenant}
      tenantName={meta.name}
      basePath={basePath}
      userName={userName}
      userHandle={userHandle}
      isTeamUser={isTeamUser}
      tenantUsage={tenantUsage}
      usageEvents={usageEvents}
      dailyUsage={dailyUsage}
    />
  );
}
