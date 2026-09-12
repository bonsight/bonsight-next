import { redirect, notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getTenantMeta } from '@/lib/labs/tenants';
import { getUserByValidResetToken, resetPasswordWithToken } from '@/lib/labs/users';
import { signLabsUser } from '@/lib/labs/auth';

// Destino del link que manda el email de "olvidé mi contraseña" (ver doForgotPassword en
// app/labs/[tenant]/page.jsx). Deliberadamente no exige el cookie de tenant/sesión — el token
// random de 32 bytes es la prueba de identidad acá, igual que cualquier link de reset de
// contraseña: puede abrirse desde otro dispositivo/navegador al de siempre.
export default async function ResetPasswordPage({ params, searchParams }) {
  const { tenant } = await params;
  const sp = await searchParams;
  const token = String(sp?.token ?? '');

  const meta = await getTenantMeta(tenant);
  if (!meta) notFound();

  const user = token ? await getUserByValidResetToken(tenant, token) : null;

  async function doReset(formData) {
    'use server';
    const password = String(formData.get('password') ?? '');
    const confirm = String(formData.get('confirm') ?? '');
    if (password !== confirm) {
      redirect(`/labs/${tenant}/reset-password?token=${token}&err=${encodeURIComponent('Las contraseñas no coinciden.')}`);
    }

    let saved = null;
    let errorMsg = null;
    try {
      saved = await resetPasswordWithToken(tenant, token, password);
    } catch (e) {
      errorMsg = e.message || 'No se pudo guardar.';
    }
    if (errorMsg) {
      redirect(`/labs/${tenant}/reset-password?token=${token}&err=${encodeURIComponent(errorMsg)}`);
    }

    (await cookies()).set(`labs_user_${tenant}`, signLabsUser(tenant, saved.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });
    redirect(`/labs/${tenant}`);
  }

  const errMsg = typeof sp?.err === 'string' ? sp.err : null;

  return (
    <div className="labs-entry-wrap">
      <div className="labs-entry-center">
        <div className="labs-entry-card">
          <h1 className="labs-entry-title">{meta.name}</h1>
          {!user ? (
            <>
              <p className="labs-entry-subtitle">Este link ya expiró o no es válido — pedí uno nuevo desde "¿Olvidaste tu contraseña?".</p>
              <a href={`/labs/${tenant}?step=forgot`} className="labs-login-link">Pedir un link nuevo</a>
            </>
          ) : (
            <>
              <p className="labs-entry-subtitle">Hola, {user.name} — elegí tu nueva contraseña</p>
              {errMsg && <p className="labs-login-error">{errMsg}</p>}
              <form action={doReset}>
                <input type="password" name="password" placeholder="Contraseña nueva" className="labs-entry-input" autoFocus required />
                <p className="labs-entry-hint">Al menos 8 caracteres, con letras y números.</p>
                <input type="password" name="confirm" placeholder="Repetí la contraseña" className="labs-entry-input" required />
                <button type="submit" className="labs-entry-button">Guardar y entrar</button>
              </form>
            </>
          )}
        </div>
      </div>
      <div className="labs-powered-by">
        <img src="/assets/bonsight-isotipo.png" alt="Bonsight" />
        <span>Powered by Bonsight</span>
      </div>
    </div>
  );
}
