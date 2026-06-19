import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createHash } from 'crypto';
import { getTenantMeta, getBusinessProfile } from '@/lib/kai/tenants';
import AriaClientTenant from './AriaClientTenant';
import AriaAvatar from '@/lib/aria/AriaAvatar';

export async function generateMetadata({ params }) {
  const { tenant } = await params;
  const meta = await getTenantMeta(tenant);
  return {
    title: meta ? `Aria · ${meta.name}` : 'Aria',
    robots: { index: false, follow: false },
  };
}

export default async function AriaTenantPage({ params, searchParams }) {
  const { tenant } = await params;
  const sp = await searchParams;

  const [meta, profile] = await Promise.all([
    getTenantMeta(tenant),
    getBusinessProfile(tenant),
  ]);

  if (!meta) notFound();

  // Per-tenant auth guard — only active if tenant has an accessCode
  if (meta.accessCode) {
    const cookieStore = await cookies();
    const expectedHash = createHash('sha256').update(meta.accessCode).digest('hex');
    const isAuthed = cookieStore.get(`aria_auth_${tenant}`)?.value === expectedHash;

    if (!isAuthed) {
      async function doLogin(formData) {
        'use server';
        const code = String(formData.get('code') ?? '').trim().toUpperCase().replace(/-/g, '');
        const tenantMeta = await getTenantMeta(tenant);
        const expected = (tenantMeta?.accessCode ?? '').replace(/-/g, '');
        if (!expected || code !== expected) {
          redirect(`/aria/${tenant}?error=1`);
        }
        const hash = createHash('sha256').update(tenantMeta.accessCode).digest('hex');
        (await cookies()).set(`aria_auth_${tenant}`, hash, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30,
          path: '/',
        });
        redirect(`/aria/${tenant}`);
      }

      const hasError = sp?.error === '1';

      return (
        <div className="aria-login-wrap">
          <div className="aria-login-card">
            <div className="aria-login-avatar">
              <AriaAvatar size={56} />
            </div>
            <h1 className="aria-login-title aria-gradient-text">Aria</h1>
            <p className="aria-login-subtitle">{meta.name}</p>
            {hasError && <p className="aria-login-error">Código incorrecto.</p>}
            <form action={doLogin}>
              <input
                type="password"
                name="code"
                placeholder="Código de acceso"
                className="aria-login-input"
                autoFocus
                required
              />
              <button type="submit" className="aria-login-button">Entrar</button>
            </form>
          </div>
        </div>
      );
    }
  }

  return <AriaClientTenant tenant={tenant} tenantMeta={meta} profile={profile} />;
}
