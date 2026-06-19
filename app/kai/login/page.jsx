import { createHash } from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import KaiAvatar from '../components/KaiAvatar';

async function loginAction(formData) {
  'use server';
  const code = formData.get('code');
  const expected = process.env.KAI_ACCESS_CODE || '';

  if (!code || code !== expected) {
    redirect('/kai/login?error=1');
  }

  const hash = createHash('sha256').update(expected).digest('hex');
  (await cookies()).set('kai_auth', hash, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });

  redirect('/kai');
}

export default async function KaiLoginPage({ searchParams }) {
  const params = await searchParams;
  const hasError = params?.error === '1';

  return (
    <div className="kai-login-wrap">
      <div className="kai-login-card">
        <div className="kai-login-avatar">
          <KaiAvatar size={56} />
        </div>
        <h1 className="kai-login-title">Kai</h1>
        <p className="kai-login-subtitle">Consultor estratégico de Bonsight</p>
        {hasError && <p className="kai-login-error">Código incorrecto.</p>}
        <form action={loginAction}>
          <input
            type="password"
            name="code"
            placeholder="Código de acceso"
            className="kai-login-input"
            autoFocus
            required
          />
          <button type="submit" className="kai-login-button">Entrar</button>
        </form>
      </div>
    </div>
  );
}
