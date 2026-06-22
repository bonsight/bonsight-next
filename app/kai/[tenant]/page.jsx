import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createHash } from 'crypto';
import { getTenantMeta, getBusinessProfile } from '@/lib/kai/tenants';
import { getDemoProfile } from '@/lib/kai/demoScripts';
import KaiClientView from './KaiClientView';
import KaiAvatar from '../components/KaiAvatar';

export async function generateMetadata({ params }) {
  const { tenant } = await params;
  const meta = await getTenantMeta(tenant);
  return {
    title: meta ? `Kai · ${meta.name}` : 'Kai',
    robots: { index: false, follow: false },
  };
}

export default async function KaiTenantPage({ params, searchParams }) {
  const { tenant } = await params;
  const sp = await searchParams;

  const [meta, realProfile] = await Promise.all([
    getTenantMeta(tenant),
    getBusinessProfile(tenant),
  ]);

  if (!meta) notFound();

  const profile = realProfile;

  const allowed = process.env.ALLOWED_TENANTS;
  if (allowed) {
    const set = new Set(allowed.split(',').map((s) => s.trim()));
    if (!set.has(tenant)) notFound();
  }

  // Per-tenant auth guard — only active if tenant has an accessCode
  if (meta.accessCode) {
    const cookieStore = await cookies();
    const expectedHash = createHash('sha256').update(meta.accessCode).digest('hex');
    const isAuthed = cookieStore.get(`kai_auth_${tenant}`)?.value === expectedHash;

    if (!isAuthed) {
      async function doLogin(formData) {
        'use server';
        const code = String(formData.get('code') ?? '').trim().toUpperCase().replace(/-/g, '');
        const tenantMeta = await getTenantMeta(tenant);
        const expected = (tenantMeta?.accessCode ?? '').replace(/-/g, '');
        if (!expected || code !== expected) {
          redirect(`/kai/${tenant}?error=1`);
        }
        const hash = createHash('sha256').update(tenantMeta.accessCode).digest('hex');
        (await cookies()).set(`kai_auth_${tenant}`, hash, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30,
          path: '/',
        });
        redirect(`/kai/${tenant}`);
      }

      const hasError = sp?.error === '1';

      return (
        <div className="kai-login-wrap">
          <div className="kai-login-card">
            <div className="kai-login-avatar">
              <KaiAvatar size={56} />
            </div>
            <h1 className="kai-login-title">Kai</h1>
            <p className="kai-login-subtitle">{meta.name}</p>
            {hasError && <p className="kai-login-error">Código incorrecto.</p>}
            <form action={doLogin}>
              <input
                type="password"
                name="code"
                placeholder="Código de acceso"
                className="kai-login-input"
                autoFocus
                required
              />
              <button type="submit" className="kai-login-button">Entrar</button>
            </form>
          </div>
        </div>
      );
    }
  }

  return (
    <KaiClientView
      tenant={tenant}
      tenantMeta={meta}
      profile={profile}
    />
  );
}
