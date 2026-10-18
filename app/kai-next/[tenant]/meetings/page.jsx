import { redirect, notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getTenantMeta } from '@/lib/kai/tenants';
import { getCurrentTeamUser } from '@/lib/team/auth';
import { getCurrentTenantUser } from '@/lib/kai/tenantAuth';
import { isSectionAllowed, accessFromUsers } from '@/lib/kaiNext/capabilities';
import { kaiNextBasePath } from '@/lib/kaiNext/paths';
import KaiNextMeetings from '../KaiNextMeetings';

export async function generateMetadata({ params }) {
  const { tenant } = await params;
  const meta = await getTenantMeta(tenant);
  return {
    title: meta ? `Reuniones · ${meta.name}` : 'Reuniones',
    robots: { index: false, follow: false },
  };
}

export default async function KaiNextMeetingsPage({ params }) {
  const { tenant } = await params;
  const meta = await getTenantMeta(tenant);
  if (!meta) notFound();

  const host = (await headers()).get('host') ?? '';
  const basePath = kaiNextBasePath(host);

  // Igual que Proyecto de Desarrollo (lib/kaiNext/projects.js): solo existe bajo el tenant
  // bonsight — una visita directa a la URL de otro tenant redirige, mismo criterio que si
  // 'proyectos' estuviera apagado para ese tenant.
  if (tenant !== 'bonsight') redirect(`${basePath}/${tenant}`);

  // Si además hay una sesión de tenant activa (se logueó explícito como ese usuario — ej.
  // para probar qué ve un cliente puntual), esa identidad más específica gana sobre la sesión
  // global de equipo — antes la de equipo ganaba siempre, sin importar si también había una
  // sesión de tenant activa en el mismo navegador.
  const [rawTeamUser, tenantUser] = await Promise.all([getCurrentTeamUser(), getCurrentTenantUser(tenant)]);
  const teamUser = tenantUser ? null : rawTeamUser;
  if (!teamUser && !(tenantUser?.access?.kaiNext)) {
    redirect(`${basePath}/${tenant}`);
  }
  if (!isSectionAllowed(accessFromUsers(teamUser, tenantUser), 'reuniones')) {
    redirect(`${basePath}/${tenant}`);
  }

  const userName = teamUser?.name ?? teamUser?.username ?? tenantUser?.name ?? 'Equipo Bonsight';
  const userHandle = teamUser?.username ?? tenantUser?.email ?? '';

  return (
    <KaiNextMeetings
      tenant={tenant}
      tenantName={meta.name}
      basePath={basePath}
      userName={userName}
      userHandle={userHandle}
      isTeamUser={!!teamUser}
    />
  );
}
