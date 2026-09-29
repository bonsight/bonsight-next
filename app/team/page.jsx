import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { hasAnyTeamUser, bootstrapTeamUser, loginTeamUser, getCurrentTeamUser } from '@/lib/team/auth';

export const metadata = { title: 'Bonsight Team', robots: { index: false, follow: false } };

// bonsight.co en prod, o el mismo host sin subdominio en local (kai.localhost → localhost) —
// mismo criterio que teamLoginUrl en lib/team/auth.js, para las 3 tarjetas del picker.
async function productUrls() {
  const h = await headers();
  const host = (h.get('host') || 'bonsight.co').replace(/^(kai|aria|labs)\./, '');
  const proto = host.includes('localhost') ? 'http' : 'https';
  return {
    labs: `${proto}://labs.${host}/admin`,
    kai: `${proto}://kai.${host}/admin`,
    aria: `${proto}://aria.${host}/admin`,
  };
}

const CARD = { maxWidth: 380, width: '100%', margin: '0 auto', background: '#fff', border: '1px solid #e5e5e0', borderRadius: 14, padding: 32 };
const INPUT = { width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, marginBottom: 12, fontFamily: 'inherit' };
const BUTTON = { width: '100%', padding: '11px 14px', borderRadius: 8, border: 'none', background: '#111', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const WRAP = { minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAF8', padding: 24, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" };

export default async function TeamPage({ searchParams }) {
  const sp = await searchParams;
  const errMsg = typeof sp?.err === 'string' ? sp.err : null;

  const currentUser = await getCurrentTeamUser();
  if (currentUser) {
    const urls = await productUrls();
    return (
      <div style={WRAP}>
        <div style={{ ...CARD, maxWidth: 420 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Hola, {currentUser.name}</h1>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>¿A qué panel querés entrar?</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <a href={urls.labs} style={{ ...BUTTON, textDecoration: 'none', textAlign: 'center', boxSizing: 'border-box' }}>Labs Admin</a>
            <a href={urls.kai} style={{ ...BUTTON, textDecoration: 'none', textAlign: 'center', boxSizing: 'border-box', background: '#20C997' }}>Kai Admin</a>
            <a href={urls.aria} style={{ ...BUTTON, textDecoration: 'none', textAlign: 'center', boxSizing: 'border-box', background: '#6B4FE8' }}>Aria Admin</a>
          </div>
        </div>
      </div>
    );
  }

  const needsSetup = !(await hasAnyTeamUser());

  if (needsSetup) {
    async function doBootstrap(formData) {
      'use server';
      const username = String(formData.get('username') ?? '');
      const password = String(formData.get('password') ?? '');
      const name = String(formData.get('name') ?? '');
      try {
        await bootstrapTeamUser({ username, password, name });
      } catch (e) {
        redirect(`/team?err=${encodeURIComponent(e.message || 'No se pudo crear la cuenta.')}`);
      }
      try {
        await loginTeamUser(username, password);
      } catch {
        redirect('/team');
      }
      redirect('/team');
    }

    return (
      <div style={WRAP}>
        <div style={CARD}>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Crear cuenta de admin</h1>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>Primera vez — esta pantalla solo aparece una vez. De acá en más entrás con usuario y contraseña.</p>
          {errMsg && <p style={{ color: '#c0392b', fontSize: 13, marginBottom: 12 }}>{errMsg}</p>}
          <form action={doBootstrap}>
            <input type="text" name="name" placeholder="Tu nombre" style={INPUT} autoFocus required />
            <input type="text" name="username" placeholder="Elegí un usuario" style={INPUT} required />
            <input type="password" name="password" placeholder="Elegí una contraseña" style={INPUT} required />
            <p style={{ fontSize: 11.5, color: '#aaa', marginTop: -6, marginBottom: 12 }}>Al menos 8 caracteres, con letras y números.</p>
            <button type="submit" style={BUTTON}>Crear cuenta</button>
          </form>
        </div>
      </div>
    );
  }

  async function doLogin(formData) {
    'use server';
    const username = String(formData.get('username') ?? '');
    const password = String(formData.get('password') ?? '');
    try {
      await loginTeamUser(username, password);
    } catch (e) {
      redirect(`/team?err=${encodeURIComponent(e.message || 'No se pudo entrar.')}`);
    }
    redirect('/team');
  }

  return (
    <div style={WRAP}>
      <div style={CARD}>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Bonsight Team</h1>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>Usuario y contraseña</p>
        {errMsg && <p style={{ color: '#c0392b', fontSize: 13, marginBottom: 12 }}>{errMsg}</p>}
        <form action={doLogin}>
          <input type="text" name="username" placeholder="Usuario" style={INPUT} autoFocus required />
          <input type="password" name="password" placeholder="Contraseña" style={INPUT} required />
          <button type="submit" style={BUTTON}>Entrar</button>
        </form>
      </div>
    </div>
  );
}
