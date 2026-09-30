import { notFound, redirect } from 'next/navigation';
import { getTenantMeta, getBusinessProfile } from '@/lib/kai/tenants';
import {
  getTenantUserByUsername, checkTenantUserPassword, requestTenantPasswordReset,
} from '@/lib/kai/tenantUsers';
import { loginTenantSession, logoutTenantSession, getCurrentTenantUser } from '@/lib/kai/tenantAuth';
import { isBonsightTeamAuthorized } from '@/lib/team/auth';
import { sendEmail } from '@/lib/labs/gmail';
import { forgotPasswordEmailHtml } from '@/lib/labs/emailTemplates';
import KaiClientView from './KaiClientView';
import KaiAvatar from '../components/KaiAvatar';

function maskEmail(email) {
  if (!email) return null;
  const [local, domain] = email.split('@');
  if (!domain) return null;
  return `${local[0]}***@${domain}`;
}

async function sendResetEmail(tenant, meta, email) {
  if (!email) return;
  try {
    const result = await requestTenantPasswordReset(tenant, email);
    if (result) {
      const resetUrl = `https://kai.bonsight.co/${tenant}/reset-password?token=${result.token}`;
      await sendEmail({
        to: result.user.email,
        subject: `Tu código de acceso es ${result.token}`,
        html: forgotPasswordEmailHtml({ name: result.user.name, code: result.token, resetUrl, tenantName: meta.name }),
      });
    }
  } catch (e) {
    console.error(`[kai] no se pudo enviar el email de recuperación (${tenant}):`, e.message);
  }
}

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

  const allowed = process.env.ALLOWED_TENANTS;
  if (allowed) {
    const set = new Set(allowed.split(',').map((s) => s.trim()));
    if (!set.has(tenant)) notFound();
  }

  const currentUser = await getCurrentTenantUser(tenant);
  const isTeamAdmin = await isBonsightTeamAuthorized();

  if (!currentUser && !isTeamAdmin) {
    const step = ['forgot', 'sent'].includes(sp?.step) ? sp.step : 'login';
    const errMsg = typeof sp?.err === 'string' ? sp.err : null;
    const forgotUser = step === 'forgot' && sp?.username ? await getTenantUserByUsername(tenant, sp.username) : null;
    const maskedEmail = maskEmail(forgotUser?.email);

    async function doLogin(formData) {
      'use server';
      const username = String(formData.get('username') ?? '');
      const password = String(formData.get('password') ?? '');
      const user = await getTenantUserByUsername(tenant, username);
      if (!user || !checkTenantUserPassword(user, password)) {
        redirect(`/${tenant}?username=${encodeURIComponent(username)}&err=${encodeURIComponent('Usuario o contraseña incorrectos.')}`);
      }
      await loginTenantSession(tenant, user.id);
      redirect(`/${tenant}`);
    }

    async function doForgotPasswordByUsername(formData) {
      'use server';
      const username = String(formData.get('username') ?? '').trim();
      const user = username ? await getTenantUserByUsername(tenant, username) : null;
      await sendResetEmail(tenant, meta, user?.email);
      const masked = maskEmail(user?.email);
      redirect(`/${tenant}?step=sent${masked ? `&masked=${encodeURIComponent(masked)}` : ''}`);
    }

    async function doForgotPassword(formData) {
      'use server';
      await sendResetEmail(tenant, meta, String(formData.get('email') ?? '').trim());
      redirect(`/${tenant}?step=sent`);
    }

    return (
      <div className="kai-login-wrap">
        <div className="kai-login-card">
          <div className="kai-login-avatar">
            <KaiAvatar size={56} />
          </div>
          <h1 className="kai-login-title">Kai</h1>
          <p className="kai-login-subtitle">{meta.name}</p>

          {step === 'login' && (
            <>
              {errMsg && <p className="kai-login-error">{errMsg}</p>}
              <form action={doLogin}>
                <input type="text" name="username" placeholder="Usuario" defaultValue={sp?.username ?? ''} className="kai-login-input" autoFocus required />
                <input type="password" name="password" placeholder="Contraseña" className="kai-login-input" required />
                <button type="submit" className="kai-login-button">Entrar</button>
              </form>
              <a href={`/${tenant}?step=forgot&username=${encodeURIComponent(sp?.username ?? '')}`} className="kai-login-link">¿Olvidaste tu contraseña?</a>
            </>
          )}

          {step === 'forgot' && (
            <>
              {sp?.username && maskedEmail ? (
                <>
                  <p className="kai-login-subtitle">Te mandamos el link a {maskedEmail}</p>
                  <form action={doForgotPasswordByUsername}>
                    <input type="hidden" name="username" value={sp.username} />
                    <button type="submit" className="kai-login-button">Enviar link</button>
                  </form>
                </>
              ) : sp?.username ? (
                <p className="kai-login-subtitle">Tu cuenta todavía no tiene un email cargado — pedile a Bonsight que te reasigne el acceso.</p>
              ) : (
                <>
                  <p className="kai-login-subtitle">Te mandamos un link para elegir una nueva contraseña</p>
                  <form action={doForgotPassword}>
                    <input type="email" name="email" placeholder="Tu email" className="kai-login-input" autoFocus required />
                    <button type="submit" className="kai-login-button">Enviar link</button>
                  </form>
                </>
              )}
              <a href={`/${tenant}`} className="kai-login-link">Volver</a>
            </>
          )}

          {step === 'sent' && (
            <>
              {sp?.masked ? (
                <p className="kai-login-subtitle">Te mandamos el código a {sp.masked} — vale por 15 minutos.</p>
              ) : (
                <p className="kai-login-subtitle">Si ese email está registrado con una cuenta, te va a llegar un código para elegir una nueva contraseña.</p>
              )}
              <a href={`/${tenant}`} className="kai-login-link">Volver a entrar</a>
            </>
          )}
        </div>
      </div>
    );
  }

  if (currentUser && !currentUser.access?.kai && !isTeamAdmin) {
    async function doLogout() {
      'use server';
      await logoutTenantSession(tenant);
      redirect(`/${tenant}`);
    }
    return (
      <div className="kai-login-wrap">
        <div className="kai-login-card">
          <div className="kai-login-avatar">
            <KaiAvatar size={56} />
          </div>
          <h1 className="kai-login-title">Kai</h1>
          <p className="kai-login-subtitle">Hola, {currentUser.name} — todavía no tenés acceso a Kai para {meta.name}. Pedile a Bonsight que te lo habilite.</p>
          <form action={doLogout}><button type="submit" className="kai-login-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Cerrar sesión</button></form>
        </div>
      </div>
    );
  }

  const profile = realProfile;

  return (
    <KaiClientView
      tenant={tenant}
      tenantMeta={meta}
      profile={profile}
      currentUserName={currentUser?.name}
    />
  );
}
