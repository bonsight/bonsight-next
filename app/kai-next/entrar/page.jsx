import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import {
  requestTenantLoginLink,
  requestTenantPasswordReset,
  findTenantUserByEmailAnywhere,
  checkTenantUserPassword,
} from '@/lib/kai/tenantUsers';
import { loginTenantSession } from '@/lib/kai/tenantAuth';
import { getTenantMeta } from '@/lib/kai/tenants';
import { sendEmail } from '@/lib/labs/gmail';
import { magicLoginEmailHtml, forgotPasswordEmailHtml } from '@/lib/labs/emailTemplates';
import { kaiNextBasePath } from '@/lib/kaiNext/paths';
import { mainSiteUrl } from '@/lib/shared/crossProductLinks';

const ERROR_MESSAGES = {
  credenciales: 'Email o contraseña incorrectos.',
};

// Mismo login que app/kai-next/[tenant]/KaiNextLogin.jsx (mismas 3 acciones, mismo look), pero
// sin tenant conocido de antemano — cada acción resuelve a qué tenant pertenece el email con
// findTenantUserByEmailAnywhere y de ahí en más delega en el mismo flujo de siempre.
export default async function KaiNextEntrarPage({ searchParams }) {
  const sp = await searchParams;
  const sent = sp?.sent === '1';
  const forgotSent = sp?.forgot === '1';
  const errorMsg = ERROR_MESSAGES[sp?.login_error] ?? null;

  const host = (await headers()).get('host') ?? 'localhost:3000';
  const basePath = kaiNextBasePath(host);
  const proto = host.includes('localhost') ? 'http' : 'https';
  const origin = `${proto}://${host}`;

  async function doLoginWithPassword(formData) {
    'use server';
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');
    const match = await findTenantUserByEmailAnywhere(email);
    if (!match || !checkTenantUserPassword(match.user, password)) {
      redirect(`${basePath}/entrar?login_error=credenciales`);
    }
    await loginTenantSession(match.tenant, match.user.id);
    redirect(`${basePath}/${match.tenant}`);
  }

  async function doSendLoginLink(formData) {
    'use server';
    const email = String(formData.get('email') ?? '').trim();
    const match = await findTenantUserByEmailAnywhere(email);
    // Mismo mensaje exista o no la cuenta — no confirmamos por email si alguien tiene acceso o no.
    if (match) {
      const result = await requestTenantLoginLink(match.tenant, email);
      if (result) {
        const loginUrl = `${origin}${basePath}/${match.tenant}/magic-login?token=${result.token}`;
        const meta = await getTenantMeta(match.tenant);
        await sendEmail({
          to: result.user.email,
          subject: 'Tu enlace de acceso a Kai',
          html: magicLoginEmailHtml({ name: result.user.name, loginUrl, tenantName: meta?.name ?? '' }),
        }).catch((err) => console.error('[kai-next entrar magic-link email]', err.message));
      }
    }
    redirect(`${basePath}/entrar?sent=1`);
  }

  async function doForgotPassword(formData) {
    'use server';
    const email = String(formData.get('email') ?? '').trim();
    const match = await findTenantUserByEmailAnywhere(email);
    if (match) {
      const result = await requestTenantPasswordReset(match.tenant, email);
      if (result) {
        const resetUrl = `${origin}${basePath}/${match.tenant}/reset-password?token=${result.token}`;
        const meta = await getTenantMeta(match.tenant);
        await sendEmail({
          to: result.user.email,
          subject: 'Recuperar tu contraseña de Kai',
          html: forgotPasswordEmailHtml({ name: result.user.name, code: result.token, resetUrl, tenantName: meta?.name ?? '' }),
        }).catch((err) => console.error('[kai-next entrar forgot-password email]', err.message));
      }
    }
    redirect(`${basePath}/entrar?forgot=1`);
  }

  return (
    <div className="knx-login-shell">
      <div className="knx-login-hero">
        <a className="knx-login-hero-top" href={mainSiteUrl(host)}>
          <img src="/assets/bonsight-isotipo.svg" alt="" width="36" height="20" />
          <span className="knx-login-wordmark">Bonsight</span>
        </a>
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
          </div>

          {errorMsg && <p className="knx-login-error">{errorMsg}</p>}
          {sent && <p className="knx-login-sent">Te enviamos un enlace de acceso — revisa tu correo (vale por 15 minutos).</p>}
          {forgotSent && <p className="knx-login-sent">Si ese email tiene cuenta, te llega un código para recuperar tu contraseña.</p>}

          <form className="knx-login-form">
            <label htmlFor="email">Correo de trabajo</label>
            <input id="email" name="email" type="email" placeholder="nombre@empresa.com" required />

            <label htmlFor="password">Contraseña</label>
            <input id="password" name="password" type="password" />
            {/* "Ingresar" va antes que "¿La olvidaste?" a propósito — con varios
                <button type="submit"> en el mismo form, tocar Enter dispara el PRIMERO del DOM,
                no el botón principal. Antes "¿La olvidaste?" quedaba primero, así que loguearse
                con Enter mandaba un mail de recuperar contraseña en vez de entrar. */}
            <button type="submit" formAction={doLoginWithPassword} className="knx-login-primary-btn">Ingresar</button>

            <div className="knx-login-forgot-row">
              <button type="submit" formAction={doForgotPassword} className="knx-login-forgot-btn">¿La olvidaste?</button>
            </div>

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
