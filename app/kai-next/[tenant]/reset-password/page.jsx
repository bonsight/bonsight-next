import { redirect, notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getTenantMeta } from '@/lib/kai/tenants';
import { getTenantUserByValidResetToken, resetTenantPasswordWithToken } from '@/lib/kai/tenantUsers';
import { loginTenantSession } from '@/lib/kai/tenantAuth';
import { kaiNextBasePath } from '@/lib/kaiNext/paths';

// Destino del email de "¿la olvidaste?" (ver doForgotPassword en ../KaiNextLogin.jsx) — mismo
// patrón que app/kai/[tenant]/reset-password/page.jsx, reusando las mismas funciones de
// tenantUsers.js (el token de 6 dígitos con 15 min de vida ya existía para Kai legacy), solo
// que acá al terminar vuelve a Kai Next, no a Kai.
export default async function KaiNextResetPasswordPage({ params, searchParams }) {
  const { tenant } = await params;
  const sp = await searchParams;
  const token = String(sp?.token ?? '');

  const meta = await getTenantMeta(tenant);
  if (!meta) notFound();

  const host = (await headers()).get('host') ?? '';
  const basePath = kaiNextBasePath(host);

  const user = token ? await getTenantUserByValidResetToken(tenant, token) : null;

  async function doReset(formData) {
    'use server';
    const password = String(formData.get('password') ?? '');
    const confirm = String(formData.get('confirm') ?? '');
    if (password !== confirm) {
      redirect(`${basePath}/${tenant}/reset-password?token=${token}&err=${encodeURIComponent('Las contraseñas no coinciden.')}`);
    }
    let saved = null;
    let errorMsg = null;
    try {
      saved = await resetTenantPasswordWithToken(tenant, token, password);
    } catch (e) {
      errorMsg = e.message || 'No se pudo guardar.';
    }
    if (errorMsg) {
      redirect(`${basePath}/${tenant}/reset-password?token=${token}&err=${encodeURIComponent(errorMsg)}`);
    }
    await loginTenantSession(tenant, saved.id);
    redirect(`${basePath}/${tenant}`);
  }

  const errMsg = typeof sp?.err === 'string' ? sp.err : null;

  return (
    <div className="knx-login-shell knx-login-shell--centered">
      <div className="knx-login-panel">
        <div className="knx-login-card">
          <div className="knx-login-card-head">
            <h2>{meta.name}</h2>
          </div>
          {!user ? (
            <>
              <p className="knx-login-sent">Este código ya expiró o no es válido — pide uno nuevo desde la pantalla de inicio.</p>
              <a className="knx-login-switch" href={`${basePath}/${tenant}`}>Volver al login</a>
            </>
          ) : (
            <form action={doReset} className="knx-login-form">
              <p className="knx-login-hint">Hola, {user.name} — elegí tu nueva contraseña.</p>
              {errMsg && <p className="knx-login-error">{errMsg}</p>}
              <input type="password" name="password" placeholder="Contraseña nueva" autoFocus required />
              <input type="password" name="confirm" placeholder="Repetí la contraseña" required />
              <button type="submit" className="knx-login-primary-btn">Guardar y entrar</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
