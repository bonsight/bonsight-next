import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getTenantMeta } from '@/lib/labs/tenants';
import { getUserByUsername, checkUserPassword, requestPasswordReset } from '@/lib/labs/users';
import { signLabsUser, getCurrentLabsUser } from '@/lib/labs/auth';
import { sendEmail } from '@/lib/labs/gmail';
import { forgotPasswordEmailHtml } from '@/lib/labs/emailTemplates';
import LabsClientTenant from './LabsClientTenant';

// "r***@bonsight.co" — solo la primera letra + el dominio, para que la persona reconozca cuál
// es su email sin que quede legible completo en el HTML de la página.
function maskEmail(email) {
  if (!email) return null;
  const [local, domain] = email.split('@');
  if (!domain) return null;
  return `${local[0]}***@${domain}`;
}

// Función de módulo, no anidada en el componente — cuando estaba adentro, compartida por
// doForgotPassword/doForgotPasswordByUsername (dos Server Actions distintas), el compilador
// de Next.js tiraba "Functions cannot be passed directly to Client Components" porque no
// sabía a cuál de las dos "pertenecía" el closure. Acá afuera no hay ambigüedad. Deliberadamente
// nunca informa si el email/usuario existía o no (eso lo decide el llamador, que siempre
// redirige a "sent" igual) — si distinguiera el caso "no encontrado", cualquiera podría usar
// el form para averiguar qué emails están registrados en el equipo.
async function sendResetEmail(tenant, meta, email) {
  if (!email) return;
  try {
    const result = await requestPasswordReset(tenant, email);
    if (result) {
      const resetUrl = `https://labs.bonsight.co/${tenant}/reset-password?token=${result.token}`;
      await sendEmail({
        to: result.user.email,
        // El código en el asunto (no un texto genérico) es lo que se ve de una vez en la
        // bandeja de entrada, sin tener que abrir el correo.
        subject: `Tu código de acceso es ${result.token}`,
        html: forgotPasswordEmailHtml({ name: result.user.name, code: result.token, resetUrl, tenantName: meta.name }),
      });
    }
  } catch (e) {
    console.error(`[labs] no se pudo enviar el email de recuperación (${tenant}):`, e.message);
  }
}

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

  // Sin gate de tenant ni código personal — el admin crea usuario+contraseña directo desde
  // el panel (ver TeamPanel) y se los pasa a cada persona. Login directo de una sola pantalla;
  // "olvidé mi contraseña" (por email) es el único mecanismo de recuperación que queda.
  const currentUser = await getCurrentLabsUser(tenant);

  if (!currentUser) {
    const step = ['forgot', 'sent'].includes(sp?.step) ? sp.step : 'login';
    const errMsg = typeof sp?.err === 'string' ? sp.err : null;
    const cookieOpts = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 365, path: '/' };

    // Se resuelve acá (server) para que el email completo nunca viaje al cliente — el HTML
    // servido ya trae la versión enmascarada, no el dato crudo.
    const forgotUser = step === 'forgot' && sp?.username ? await getUserByUsername(tenant, sp.username) : null;
    const maskedEmail = maskEmail(forgotUser?.email);

    async function doLogin(formData) {
      'use server';
      const username = String(formData.get('username') ?? '');
      const password = String(formData.get('password') ?? '');

      const user = await getUserByUsername(tenant, username);
      if (!user || !checkUserPassword(user, password)) {
        redirect(`/labs/${tenant}?username=${encodeURIComponent(username)}&err=${encodeURIComponent('Usuario o contraseña incorrectos.')}`);
      }

      (await cookies()).set(`labs_user_${tenant}`, signLabsUser(tenant, user.id), cookieOpts);
      redirect(`/labs/${tenant}`);
    }

    // Cuando ya sabemos el usuario (vino del paso de contraseña) no hace falta volver a
    // pedirle el email — se manda directo al que ya tiene cargado, sin mostrarlo (mostrarlo
    // acá sí sería un problema: cualquiera podría escribir un usuario ajeno para verlo).
    async function doForgotPasswordByUsername(formData) {
      'use server';
      const username = String(formData.get('username') ?? '').trim();
      const user = username ? await getUserByUsername(tenant, username) : null;
      await sendResetEmail(tenant, meta, user?.email);
      // Acá sí podemos ser específicos: ya mostramos el email enmascarado en el paso
      // anterior (ver render de step=forgot), así que no hay nada que "proteger" ocultándolo
      // de nuevo — al contrario, el mensaje genérico solo generaba dudas de si funcionó.
      const masked = maskEmail(user?.email);
      redirect(`/labs/${tenant}?step=sent${masked ? `&masked=${encodeURIComponent(masked)}` : ''}`);
    }

    async function doForgotPassword(formData) {
      'use server';
      await sendResetEmail(tenant, meta, String(formData.get('email') ?? '').trim());
      redirect(`/labs/${tenant}?step=sent`);
    }

    return (
      <div className="labs-entry-wrap">
        <div className="labs-entry-center">
          <div className="labs-entry-card">
            <h1 className="labs-entry-title">{meta.name}</h1>

            {step === 'login' && (
              <>
                <p className="labs-entry-subtitle">Usuario y contraseña</p>
                {errMsg && <p className="labs-login-error">{errMsg}</p>}
                <form action={doLogin}>
                  <input type="text" name="username" placeholder="Usuario" defaultValue={sp?.username ?? ''} className="labs-entry-input" autoFocus required />
                  <input type="password" name="password" placeholder="Contraseña" className="labs-entry-input" required />
                  <button type="submit" className="labs-entry-button">Entrar</button>
                </form>
                <a href={`/labs/${tenant}?step=forgot&username=${encodeURIComponent(sp?.username ?? '')}`} className="labs-login-link">¿Olvidaste tu contraseña?</a>
              </>
            )}

            {step === 'forgot' && (
              <>
                {sp?.username && maskedEmail ? (
                  <>
                    <p className="labs-entry-subtitle">Te mandamos el link a {maskedEmail}</p>
                    {errMsg && <p className="labs-login-error">{errMsg}</p>}
                    <form action={doForgotPasswordByUsername}>
                      <input type="hidden" name="username" value={sp.username} />
                      <button type="submit" className="labs-entry-button">Enviar link</button>
                    </form>
                  </>
                ) : sp?.username ? (
                  <>
                    <p className="labs-entry-subtitle">Tu cuenta todavía no tiene un email cargado — pedile al admin que te resetee el acceso.</p>
                  </>
                ) : (
                  <>
                    <p className="labs-entry-subtitle">Te mandamos un link para elegir una nueva contraseña</p>
                    {errMsg && <p className="labs-login-error">{errMsg}</p>}
                    <form action={doForgotPassword}>
                      <input type="email" name="email" placeholder="Tu email" className="labs-entry-input" autoFocus required />
                      <button type="submit" className="labs-entry-button">Enviar link</button>
                    </form>
                  </>
                )}
                <a href={`/labs/${tenant}`} className="labs-login-link">Volver</a>
              </>
            )}

            {step === 'sent' && (
              <>
                {sp?.masked ? (
                  <p className="labs-entry-subtitle">Te mandamos el código a {sp.masked} — vale por 15 minutos.</p>
                ) : (
                  <p className="labs-entry-subtitle">Si ese email está registrado con una cuenta, te va a llegar un código para elegir una nueva contraseña — vale por 15 minutos.</p>
                )}
                <a href={`/labs/${tenant}`} className="labs-login-link">Volver a entrar</a>
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

  // currentUser es el registro crudo de Redis (getCurrentLabsUser) — incluye passwordHash,
  // resetToken/resetTokenExpires y accessCode. Pasarlo tal cual a un Client Component los
  // serializa en el HTML/payload de la página, exponiendo el hash de la contraseña a offline
  // cracking sin rate-limit. El cliente (LabsClientTenant.jsx, KaiOnboarding.jsx) solo lee
  // id/name/role/kaiOnboarding — se manda únicamente eso.
  const clientIdentity = {
    id: currentUser.id,
    name: currentUser.name,
    role: currentUser.role,
    kaiOnboarding: currentUser.kaiOnboarding,
  };

  return <LabsClientTenant tenant={tenant} tenantMeta={meta} identity={clientIdentity} />;
}
