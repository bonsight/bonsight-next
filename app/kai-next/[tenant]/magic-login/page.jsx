import { redirect, notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getTenantMeta } from '@/lib/kai/tenants';
import { consumeTenantLoginToken } from '@/lib/kai/tenantUsers';
import { loginTenantSession } from '@/lib/kai/tenantAuth';
import { kaiNextBasePath } from '@/lib/kaiNext/paths';

// Destino del enlace mágico por email (ver doSendLoginLink en ../KaiNextLogin.jsx) — a
// diferencia de app/kai/[tenant]/reset-password/page.jsx, acá no hay ningún paso más: el
// token de un solo uso ES la prueba de identidad, no hay contraseña que setear.
export default async function KaiNextMagicLoginPage({ params, searchParams }) {
  const { tenant } = await params;
  const sp = await searchParams;
  const token = String(sp?.token ?? '');

  const meta = await getTenantMeta(tenant);
  if (!meta) notFound();

  const host = (await headers()).get('host') ?? '';
  const basePath = kaiNextBasePath(host);

  const user = token ? await consumeTenantLoginToken(tenant, token) : null;
  if (user) {
    await loginTenantSession(tenant, user.id);
    redirect(`${basePath}/${tenant}`);
  }

  return (
    <div className="knx-login-shell knx-login-shell--centered">
      <div className="knx-login-panel">
        <div className="knx-login-error-card">
          <h1>{meta.name}</h1>
          <p>Este enlace ya expiró o no es válido — pide uno nuevo desde la pantalla de inicio.</p>
          <a href={`${basePath}/${tenant}`}>Volver al login</a>
        </div>
      </div>
    </div>
  );
}
