import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createHash } from 'crypto';
import { getTenantMeta } from '@/lib/labs/tenants';
import LabsTenantGate from './LabsTenantGate';

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
        <div className="labs-entry-card">
          <h1 className="labs-entry-title">Labs <span className="living-word">· vivo</span></h1>
          <p className="labs-entry-subtitle">{meta.name}</p>
          {hasError && <p className="labs-login-error">Código incorrecto.</p>}
          <form action={doEnter}>
            <input type="password" name="code" placeholder="Código de acceso" className="labs-entry-input" autoFocus required />
            <button type="submit" className="labs-entry-button">Entrar</button>
          </form>
        </div>
      </div>
    );
  }

  return <LabsTenantGate tenant={tenant} tenantMeta={meta} />;
}
