import { redirect, notFound } from 'next/navigation';
import { getTenantMeta } from '@/lib/kai/tenants';
import { getTenantUserByValidResetToken, resetTenantPasswordWithToken } from '@/lib/kai/tenantUsers';
import { loginTenantSession } from '@/lib/kai/tenantAuth';
import AriaAvatar from '@/lib/aria/AriaAvatar';

export default async function AriaResetPasswordPage({ params, searchParams }) {
  const { tenant } = await params;
  const sp = await searchParams;
  const token = String(sp?.token ?? '');

  const meta = await getTenantMeta(tenant);
  if (!meta) notFound();

  const user = token ? await getTenantUserByValidResetToken(tenant, token) : null;

  async function doReset(formData) {
    'use server';
    const password = String(formData.get('password') ?? '');
    const confirm = String(formData.get('confirm') ?? '');
    if (password !== confirm) {
      redirect(`/aria/${tenant}/reset-password?token=${token}&err=${encodeURIComponent('Las contraseñas no coinciden.')}`);
    }
    let saved = null;
    let errorMsg = null;
    try {
      saved = await resetTenantPasswordWithToken(tenant, token, password);
    } catch (e) {
      errorMsg = e.message || 'No se pudo guardar.';
    }
    if (errorMsg) {
      redirect(`/aria/${tenant}/reset-password?token=${token}&err=${encodeURIComponent(errorMsg)}`);
    }
    await loginTenantSession(tenant, saved.id);
    redirect(`/aria/${tenant}`);
  }

  const errMsg = typeof sp?.err === 'string' ? sp.err : null;

  return (
    <div className="aria-login-wrap">
      <div className="aria-login-card">
        <div className="aria-login-avatar">
          <AriaAvatar size={56} />
        </div>
        <h1 className="aria-login-title aria-gradient-text">{meta.name}</h1>
        {!user ? (
          <>
            <p className="aria-login-subtitle">Este link ya expiró o no es válido — pedí uno nuevo desde "¿Olvidaste tu contraseña?".</p>
            <a href={`/aria/${tenant}?step=forgot`} className="aria-login-link">Pedir un link nuevo</a>
          </>
        ) : (
          <>
            <p className="aria-login-subtitle">Hola, {user.name} — elegí tu nueva contraseña</p>
            {errMsg && <p className="aria-login-error">{errMsg}</p>}
            <form action={doReset}>
              <input type="password" name="password" placeholder="Contraseña nueva" className="aria-login-input" autoFocus required />
              <input type="password" name="confirm" placeholder="Repetí la contraseña" className="aria-login-input" required />
              <button type="submit" className="aria-login-button">Guardar y entrar</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
