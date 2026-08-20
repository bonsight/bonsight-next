import { createHash } from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

async function loginAction(formData) {
  'use server';
  const code = formData.get('code');
  const expected = process.env.LABS_ACCESS_CODE || '';

  if (!code || code !== expected) {
    redirect('/labs/login?error=1');
  }

  const hash = createHash('sha256').update(expected).digest('hex');
  (await cookies()).set('labs_auth', hash, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });

  redirect('/labs');
}

export default async function LabsLoginPage({ searchParams }) {
  const params = await searchParams;
  const hasError = params?.error === '1';

  return (
    <div className="labs-login-wrap">
      <div className="labs-login-card">
        <h1 className="labs-login-title">Labs <span className="living-word">· vivo</span></h1>
        <p className="labs-login-subtitle">Admin de Bonsight</p>
        {hasError && <p className="labs-login-error">Código incorrecto.</p>}
        <form action={loginAction}>
          <input
            type="password"
            name="code"
            placeholder="Código de acceso"
            className="labs-login-input"
            autoFocus
            required
          />
          <button type="submit" className="labs-login-button">Entrar</button>
        </form>
      </div>
    </div>
  );
}
