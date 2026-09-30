import { redirect, notFound } from 'next/navigation';
import { getTenantMeta } from '@/lib/kai/tenants';
import { getTenantUserByValidResetToken, resetTenantPasswordWithToken } from '@/lib/kai/tenantUsers';
import { loginTenantSession } from '@/lib/kai/tenantAuth';
import KaiAvatar from '../../components/KaiAvatar';

// Destino del link de "olvidé mi contraseña" (ver doForgotPassword en app/kai/[tenant]/page.jsx)
// — el token de 6 dígitos con 15 min de vida es la prueba de identidad, no hace falta sesión
// previa (mismo patrón que Labs).
export default async function KaiResetPasswordPage({ params, searchParams }) {
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
      redirect(`/${tenant}/reset-password?token=${token}&err=${encodeURIComponent('Las contraseñas no coinciden.')}`);
    }
    let saved = null;
    let errorMsg = null;
    try {
      saved = await resetTenantPasswordWithToken(tenant, token, password);
    } catch (e) {
      errorMsg = e.message || 'No se pudo guardar.';
    }
    if (errorMsg) {
      redirect(`/${tenant}/reset-password?token=${token}&err=${encodeURIComponent(errorMsg)}`);
    }
    await loginTenantSession(tenant, saved.id);
    redirect(`/${tenant}`);
  }

  const errMsg = typeof sp?.err === 'string' ? sp.err : null;

  return (
    <div className="kai-login-wrap">
      <div className="kai-login-card">
        <div className="kai-login-avatar">
          <KaiAvatar size={56} />
        </div>
        <h1 className="kai-login-title">{meta.name}</h1>
        {!user ? (
          <>
            <p className="kai-login-subtitle">Este link ya expiró o no es válido — pedí uno nuevo desde "¿Olvidaste tu contraseña?".</p>
            <a href={`/${tenant}?step=forgot`} className="kai-login-link">Pedir un link nuevo</a>
          </>
        ) : (
          <>
            <p className="kai-login-subtitle">Hola, {user.name} — elegí tu nueva contraseña</p>
            {errMsg && <p className="kai-login-error">{errMsg}</p>}
            <form action={doReset}>
              <input type="password" name="password" placeholder="Contraseña nueva" className="kai-login-input" autoFocus required />
              <input type="password" name="confirm" placeholder="Repetí la contraseña" className="kai-login-input" required />
              <button type="submit" className="kai-login-button">Guardar y entrar</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
