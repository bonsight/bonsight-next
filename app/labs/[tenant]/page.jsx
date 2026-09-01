import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createHash } from 'crypto';
import { getTenantMeta } from '@/lib/labs/tenants';
import { getUserByCode } from '@/lib/labs/users';
import { signLabsUser, getCurrentLabsUser } from '@/lib/labs/auth';
import LabsClientTenant from './LabsClientTenant';

export async function generateMetadata({ params }) {
  const { tenant } = await params;
  const meta = await getTenantMeta(tenant);
  return {
    title: meta ? `Labs · ${meta.name}` : 'Labs',
    robots: { index: false, follow: false },
  };
}

export default async function LabsTenantPage({ params, searchParams }) {
  const { tenant } = await params;
  const sp = await searchParams;

  const meta = await getTenantMeta(tenant);
  if (!meta) notFound();

  const cookieStore = await cookies();
  const expectedHash = createHash('sha256').update(meta.accessCode).digest('hex');
  const isAuthed = cookieStore.get(`labs_auth_${tenant}`)?.value === expectedHash;

  if (!isAuthed) {
    async function doEnter(formData) {
      'use server';
      const code = String(formData.get('code') ?? '').trim().toUpperCase().replace(/-/g, '');
      const tenantMeta = await getTenantMeta(tenant);
      const expected = (tenantMeta?.accessCode ?? '').replace(/-/g, '');
      if (!expected || code !== expected) {
        redirect(`/labs/${tenant}?error=1`);
      }
      const hash = createHash('sha256').update(tenantMeta.accessCode).digest('hex');
      (await cookies()).set(`labs_auth_${tenant}`, hash, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
      });
      redirect(`/labs/${tenant}`);
    }

    const hasError = sp?.error === '1';

    return (
      <div className="labs-entry-wrap">
        <div className="labs-entry-center">
          <div className="labs-entry-card">
            <h1 className="labs-entry-title">Labs</h1>
            <p className="labs-entry-subtitle">{meta.name}</p>
            {hasError && <p className="labs-login-error">Código incorrecto.</p>}
            <form action={doEnter}>
              <input type="password" name="code" placeholder="Código de acceso" className="labs-entry-input" autoFocus required />
              <button type="submit" className="labs-entry-button">Entrar</button>
            </form>
          </div>
        </div>
        <div className="labs-powered-by">
          <img src="/assets/bonsight-isotipo.png" alt="Bonsight" />
          <span>Powered by Bonsight</span>
        </div>
      </div>
    );
  }

  // Segundo paso — quién sos vos dentro del equipo del tenant. Reemplaza el auto-declare
  // libre de antes: el código personal viene del roster que arma el admin (ver
  // lib/labs/users.js), así que el rol que se guarda en el cookie es real, no autodeclarado.
  const currentUser = await getCurrentLabsUser(tenant);

  if (!currentUser) {
    async function doUserEnter(formData) {
      'use server';
      const code = String(formData.get('userCode') ?? '').trim();
      const user = await getUserByCode(tenant, code);
      if (!user) {
        redirect(`/labs/${tenant}?userError=1`);
      }
      (await cookies()).set(`labs_user_${tenant}`, signLabsUser(tenant, user.id), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
      });
      redirect(`/labs/${tenant}`);
    }

    const hasUserError = sp?.userError === '1';

    return (
      <div className="labs-entry-wrap">
        <div className="labs-entry-center">
          <div className="labs-entry-card">
            <h1 className="labs-entry-title">{meta.name}</h1>
            <p className="labs-entry-subtitle">Tu código personal</p>
            {hasUserError && <p className="labs-login-error">Código incorrecto.</p>}
            <form action={doUserEnter}>
              <input type="password" name="userCode" placeholder="Código personal" className="labs-entry-input" autoFocus required />
              <button type="submit" className="labs-entry-button">Entrar</button>
            </form>
          </div>
        </div>
        <div className="labs-powered-by">
          <img src="/assets/bonsight-isotipo.png" alt="Bonsight" />
          <span>Powered by Bonsight</span>
        </div>
      </div>
    );
  }

  return <LabsClientTenant tenant={tenant} tenantMeta={meta} identity={currentUser} />;
}
