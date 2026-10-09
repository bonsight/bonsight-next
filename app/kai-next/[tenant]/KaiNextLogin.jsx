import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import {
  requestTenantLoginLink,
  requestTenantPasswordReset,
  getTenantUserByEmail,
  checkTenantUserPassword,
} from '@/lib/kai/tenantUsers';
import { loginTenantSession } from '@/lib/kai/tenantAuth';
import { sendEmail } from '@/lib/labs/gmail';
import { magicLoginEmailHtml, forgotPasswordEmailHtml } from '@/lib/labs/emailTemplates';

// Ya funciona (ver lib/kaiNext/googleOAuth.js), pero se oculta un tiempo antes de anunciarlo —
// solo UI, no se toca nada del back.
const GOOGLE_LOGIN_ENABLED = false;

const ERROR_MESSAGES = {
  google: 'No pudimos verificar tu cuenta de Google. Intenta de nuevo.',
  sin_cuenta: 'No encontramos una cuenta con ese email para este cliente — pedile acceso a tu administrador.',
  credenciales: 'Email o contraseña incorrectos.',
};

// Server component puro, sin 'use client': los tres caminos (contraseña, enlace mágico,
// recuperar contraseña) son tres botones del MISMO <form> usando formAction (cada botón
// dispara su propia server action con los mismos datos del form) — no hace falta JS de
// cliente para compartir el email entre los tres.
export default async function KaiNextLogin({ tenant, tenantName, searchParams, basePath }) {
  const sent = searchParams?.sent === '1';
  const forgotSent = searchParams?.forgot === '1';
  const errorMsg = ERROR_MESSAGES[searchParams?.login_error] ?? null;

  // Los emails necesitan una URL absoluta — basePath solo resuelve la ruta (/next o
  // /kai-next), el origin (host real de la petición) es aparte.
  const host = (await headers()).get('host') ?? 'localhost:3000';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const origin = `${proto}://${host}`;

  async function doLoginWithPassword(formData) {
    'use server';
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');
    const user = await getTenantUserByEmail(tenant, email);
    if (!user || !checkTenantUserPassword(user, password)) {
      redirect(`${basePath}/${tenant}?login_error=credenciales`);
    }
    await loginTenantSession(tenant, user.id);
    redirect(`${basePath}/${tenant}`);
  }

  async function doSendLoginLink(formData) {
    'use server';
    const email = String(formData.get('email') ?? '').trim();
    const result = await requestTenantLoginLink(tenant, email);
    // Mismo mensaje exista o no la cuenta — no confirmamos por email si alguien tiene acceso o
    // no (evita que alguien use el form para chequear qué emails están de alta).
    if (result) {
      const loginUrl = `${origin}${basePath}/${tenant}/magic-login?token=${result.token}`;
      await sendEmail({
        to: result.user.email,
        subject: `Tu enlace de acceso a Kai — ${tenantName}`,
        html: magicLoginEmailHtml({ name: result.user.name, loginUrl, tenantName }),
      }).catch((err) => console.error('[kai-next magic-link email]', err.message));
    }
    redirect(`${basePath}/${tenant}?sent=1`);
  }

  async function doForgotPassword(formData) {
    'use server';
    const email = String(formData.get('email') ?? '').trim();
    const result = await requestTenantPasswordReset(tenant, email);
    if (result) {
      const resetUrl = `${origin}${basePath}/${tenant}/reset-password?token=${result.token}`;
      await sendEmail({
        to: result.user.email,
        subject: `Recuperar tu contraseña de Kai — ${tenantName}`,
        html: forgotPasswordEmailHtml({ name: result.user.name, code: result.token, resetUrl, tenantName }),
      }).catch((err) => console.error('[kai-next forgot-password email]', err.message));
    }
    redirect(`${basePath}/${tenant}?forgot=1`);
  }

  return (
    <div className="knx-login-shell">
      <div className="knx-login-hero">
        <div className="knx-login-hero-top">
          <img src="/assets/bonsight-isotipo.svg" alt="" width="36" height="20" />
          <span className="knx-login-wordmark">Bonsight</span>
        </div>
        <div className="knx-login-hero-mid">
          <h1>La inteligencia de tu empresa.</h1>
          <p>Lo que tu organización sabe y lo que muestran tus datos, en una sola conversación.</p>
        </div>
        <div className="knx-login-hero-bottom">
          <span>Kai, por Bonsight</span>
          <span>Entender. Analizar. Decidir.</span>
        </div>
      </div>

      <div className="knx-login-panel">
        <div className="knx-login-card">
          <div className="knx-login-card-head">
            <h2>Ingresa a Kai</h2>
            <p>{tenantName}</p>
          </div>

          {errorMsg && <p className="knx-login-error">{errorMsg}</p>}
          {sent && <p className="knx-login-sent">Te enviamos un enlace de acceso — revisa tu correo (vale por 15 minutos).</p>}
          {forgotSent && <p className="knx-login-sent">Si ese email tiene cuenta, te llega un código para recuperar tu contraseña.</p>}

          {GOOGLE_LOGIN_ENABLED && (
            <>
              <a className="knx-login-google" href={`/api/kai-next/${tenant}/auth/google`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M20.5 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h4.8a4.1 4.1 0 0 1-1.8 2.7" />
                  <path d="M15 16.6A7 7 0 0 1 5.3 13" />
                  <path d="M5.3 11A7 7 0 0 1 16.6 7.4" />
                </svg>
                Continuar con Google
              </a>
              <div className="knx-login-divider"><span>o con tu correo</span></div>
            </>
          )}

          <form className="knx-login-form">
            <label htmlFor="email">Correo de trabajo</label>
            <input id="email" name="email" type="email" placeholder="nombre@empresa.com" required />

            <label htmlFor="password">Contraseña</label>
            <input id="password" name="password" type="password" />
            <div className="knx-login-forgot-row">
              <button type="submit" formAction={doForgotPassword} className="knx-login-forgot-btn">¿La olvidaste?</button>
            </div>

            <button type="submit" formAction={doLoginWithPassword} className="knx-login-primary-btn">Ingresar</button>

            <div className="knx-login-divider"><span>o sin contraseña</span></div>

            <button type="submit" formAction={doSendLoginLink} className="knx-login-secondary-btn">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-10 6L2 7" />
              </svg>
              Enviarme un enlace de acceso
            </button>
            <p className="knx-login-hint">Llega al correo que escribiste arriba.</p>
          </form>

          <div className="knx-login-footer">¿Tu organización aún no usa Kai? <a href="mailto:sales@bonsight.co">Conversemos</a></div>
        </div>
      </div>
    </div>
  );
}
