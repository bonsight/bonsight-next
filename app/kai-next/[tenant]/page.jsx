import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getTenantMeta } from '@/lib/kai/tenants';
import { getCurrentTeamUser } from '@/lib/team/auth';
import { getCurrentTenantUser, logoutTenantSession } from '@/lib/kai/tenantAuth';
import { isSectionAllowed, accessFromUsers } from '@/lib/kaiNext/capabilities';
import { kaiNextBasePath } from '@/lib/kaiNext/paths';
import KaiNextClientChat from './KaiNextClientChat';
import KaiNextLogin from './KaiNextLogin';

export async function generateMetadata({ params }) {
  const { tenant } = await params;
  const meta = await getTenantMeta(tenant);
  return {
    title: meta ? `Kai Next · ${meta.name}` : 'Kai Next',
    robots: { index: false, follow: false },
  };
}

export default async function KaiNextTenantPage({ params, searchParams }) {
  const { tenant } = await params;
  const sp = await searchParams;
  const meta = await getTenantMeta(tenant);
  if (!meta) notFound();

  const host = (await headers()).get('host') ?? '';
  const basePath = kaiNextBasePath(host);

  const teamUser = await getCurrentTeamUser();
  const tenantUser = teamUser ? null : await getCurrentTenantUser(tenant);

  // Sin sesión de ningún tipo — pantalla de login de cliente (contraseña / enlace mágico). Ya
  // no redirige a /team: eso es el picker interno de Bonsight, no un login de cara al cliente.
  if (!teamUser && !tenantUser) {
    return <KaiNextLogin tenant={tenant} tenantName={meta.name} searchParams={sp} basePath={basePath} />;
  }

  // Hay sesión de una persona del cliente, pero todavía no tiene el flag habilitado — mismo
  // patrón que app/kai/[tenant]/page.jsx para access.kai.
  if (tenantUser && !tenantUser.access?.kaiNext) {
    async function doLogout() {
      'use server';
      await logoutTenantSession(tenant);
      redirect(`${basePath}/${tenant}`);
    }
    return (
      <div className="knx-login-shell knx-login-shell--centered">
        <div className="knx-login-panel">
          <div className="knx-login-card">
            <div className="knx-login-card-head">
              <h2>Kai</h2>
              <p>{meta.name}</p>
            </div>
            <p className="knx-login-sent">Hola, {tenantUser.name} — todavía no tienes acceso a Kai Next para {meta.name}. Pídele a Bonsight que te lo habilite.</p>
            <form action={doLogout}>
              <button type="submit" className="knx-login-logout">Cerrar sesión</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Si el chat está apagado para este tenant (rollout por tiers, ver lib/kaiNext/capabilities.js)
  // no tiene sentido mostrar la pantalla de chat vacía — se manda a la primera sección que sí
  // tenga habilitada, en vez de dejarlo varado.
  const kaiNextAccess = accessFromUsers(teamUser, tenantUser);
  if (!isSectionAllowed(kaiNextAccess, 'chat')) {
    if (isSectionAllowed(kaiNextAccess, 'empresa')) redirect(`${basePath}/${tenant}/empresa`);
    if (isSectionAllowed(kaiNextAccess, 'fuentes')) redirect(`${basePath}/${tenant}/fuentes`);
    if (isSectionAllowed(kaiNextAccess, 'analisis')) redirect(`${basePath}/${tenant}/analisis`);
  }

  const userName = teamUser?.name ?? teamUser?.username ?? tenantUser?.name ?? 'Equipo Bonsight';
  const userHandle = teamUser?.username ?? tenantUser?.email ?? '';

  let initialRef = null;
  if (typeof sp?.ref === 'string') {
    try { initialRef = JSON.parse(sp.ref); } catch { initialRef = null; }
  }

  return (
    <KaiNextClientChat
      tenant={tenant}
      tenantName={meta.name}
      userName={userName}
      userHandle={userHandle}
      isTeamUser={!!teamUser}
      basePath={basePath}
      initialChatId={typeof sp?.c === 'string' ? sp.c : null}
      initialDraft={typeof sp?.draft === 'string' ? sp.draft : null}
      initialRef={initialRef}
    />
  );
}
