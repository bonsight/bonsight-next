import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createHash } from 'crypto';
import { getTenantMeta } from '@/lib/labs/tenants';
import { getUserByCode, getUserByUsername, setUserCredentials, checkUserPassword, requestPasswordReset, updateUser } from '@/lib/labs/users';
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
        <div className="labs-entry-center">
          <div className="labs-entry-card">
            <h1 className="labs-entry-title">Labs</h1>
            <p className="labs-entry-subtitle">{meta.name}</p>
            {hasError && <p className="labs-login-error">Código incorrecto.</p>}
            <form action={doEnter}>
              <input type="password" name="code" placeholder="Código de acceso" className="labs-entry-input" autoFocus required />
              <button type="submit" className="labs-entry-button">Entrar</button>
            </form>
          </div>
        </div>
        <div className="labs-powered-by">
          <img src="/assets/bonsight-isotipo.png" alt="Bonsight" />
          <span>Powered by Bonsight</span>
        </div>
      </div>
    );
  }

  // Segundo paso — quién sos vos dentro del equipo del tenant. El código personal (roster del
  // admin, ver lib/labs/users.js) sirve UNA vez: la primera vez que entra, la persona elige su
  // propio usuario+contraseña, y de ahí en adelante entra con eso — el código deja de ser
  // válido para login (ver setUserCredentials). Sin email en Labs, si alguien se traba el
  // admin lo resetea desde el panel y le pasa un código nuevo.
  const currentUser = await getCurrentLabsUser(tenant);

  if (!currentUser) {
    const step = ['setup', 'password', 'forgot', 'sent'].includes(sp?.step) ? sp.step : 'identify';
    const errMsg = typeof sp?.err === 'string' ? sp.err : null;
    const cookieOpts = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 365, path: '/' };

    // Se resuelve acá (server) para que el email completo nunca viaje al cliente — el HTML
    // servido ya trae la versión enmascarada, no el dato crudo.
    const forgotUser = step === 'forgot' && sp?.username ? await getUserByUsername(tenant, sp.username) : null;
    const maskedEmail = maskEmail(forgotUser?.email);

    // Un solo campo para código (primera vez) o usuario (siguientes veces) — no hace falta
    // que la persona sepa en qué etapa está, el server decide a dónde mandarla.
    async function doIdentify(formData) {
      'use server';
      const identifier = String(formData.get('identifier') ?? '').trim();
      if (!identifier) redirect(`/labs/${tenant}?err=${encodeURIComponent('Ingresá tu usuario o tu código personal.')}`);

      const byUsername = await getUserByUsername(tenant, identifier);
      if (byUsername) redirect(`/labs/${tenant}?step=password&username=${encodeURIComponent(byUsername.username)}`);

      const byCode = await getUserByCode(tenant, identifier);
      if (byCode && !byCode.passwordHash) redirect(`/labs/${tenant}?step=setup&code=${encodeURIComponent(identifier)}`);
      if (byCode && byCode.passwordHash) redirect(`/labs/${tenant}?err=${encodeURIComponent('Ese código ya fue usado — ingresá con tu usuario y contraseña.')}`);

      redirect(`/labs/${tenant}?err=${encodeURIComponent('No lo encontramos — revisá el código o tu usuario.')}`);
    }

    async function doSetup(formData) {
      'use server';
      const code = String(formData.get('code') ?? '');
      const username = String(formData.get('username') ?? '');
      const password = String(formData.get('password') ?? '');
      const email = String(formData.get('email') ?? '').trim();

      const user = await getUserByCode(tenant, code);
      if (!user || user.passwordHash) {
        redirect(`/labs/${tenant}?err=${encodeURIComponent('Ese código ya no es válido — pedile al admin uno nuevo.')}`);
      }

      let saved = null;
      let errorMsg = null;
      try {
        saved = await setUserCredentials(tenant, user.id, { username, password });
        // Opcional a propósito — sin esto la persona igual entra, solo que "olvidé mi
        // contraseña" no le va a servir hasta que cargue un email (acá o después, desde su
        // perfil). No se bloquea el alta por esto.
        if (email) await updateUser(tenant, user.id, { email });
      } catch (e) {
        errorMsg = e.message || 'No se pudo guardar.';
      }
      if (errorMsg) {
        redirect(`/labs/${tenant}?step=setup&code=${encodeURIComponent(code)}&err=${encodeURIComponent(errorMsg)}`);
      }

      (await cookies()).set(`labs_user_${tenant}`, signLabsUser(tenant, saved.id), cookieOpts);
      redirect(`/labs/${tenant}`);
    }

    async function doLogin(formData) {
      'use server';
      const username = String(formData.get('username') ?? '');
      const password = String(formData.get('password') ?? '');

      const user = await getUserByUsername(tenant, username);
      if (!user || !checkUserPassword(user, password)) {
        redirect(`/labs/${tenant}?step=password&username=${encodeURIComponent(username)}&err=${encodeURIComponent('Usuario o contraseña incorrectos.')}`);
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

            {step === 'identify' && (
              <>
                <p className="labs-entry-subtitle">Tu usuario, o tu código personal si es tu primera vez</p>
                {errMsg && <p className="labs-login-error">{errMsg}</p>}
                <form action={doIdentify}>
                  <input type="text" name="identifier" placeholder="Usuario o código personal" className="labs-entry-input" autoFocus required />
                  <button type="submit" className="labs-entry-button">Continuar</button>
                </form>
              </>
            )}

            {step === 'setup' && (
              <>
                <p className="labs-entry-subtitle">Elegí tu usuario y contraseña</p>
                {errMsg && <p className="labs-login-error">{errMsg}</p>}
                <form action={doSetup}>
                  <input type="hidden" name="code" value={sp?.code ?? ''} />
                  <input type="text" name="username" placeholder="Elegí un usuario" className="labs-entry-input" autoFocus required />
                  <input type="password" name="password" placeholder="Elegí una contraseña" className="labs-entry-input" required />
                  <p className="labs-entry-hint">Al menos 8 caracteres, con letras y números.</p>
                  <input type="email" name="email" placeholder="Tu email (opcional, para recuperar la clave)" className="labs-entry-input" />
                  <button type="submit" className="labs-entry-button">Crear acceso</button>
                </form>
              </>
            )}

            {step === 'password' && (
              <>
                <p className="labs-entry-subtitle">Hola, {sp?.username}</p>
                {errMsg && <p className="labs-login-error">{errMsg}</p>}
                <form action={doLogin}>
                  <input type="hidden" name="username" value={sp?.username ?? ''} />
                  <input type="password" name="password" placeholder="Contraseña" className="labs-entry-input" autoFocus required />
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
