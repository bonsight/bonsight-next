import { createHash } from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AriaAvatar from '@/lib/aria/AriaAvatar';

async function loginAction(formData) {
  'use server';
  const code = formData.get('code');
  const expected = process.env.ARIA_ACCESS_CODE || '';

  if (!code || code !== expected) {
    redirect('/login?error=1');
  }

  const hash = createHash('sha256').update(expected).digest('hex');
  (await cookies()).set('aria_auth', hash, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });

  redirect('/');
}

export default async function AriaLoginPage({ searchParams }) {
  const params = await searchParams;
  const hasError = params?.error === '1';

  return (
    <div className="aria-login-wrap">
      <div className="aria-login-card">
        <div className="aria-login-avatar">
          <AriaAvatar size={56} />
        </div>
        <h1 className="aria-login-title aria-gradient-text">Aria</h1>
        <p className="aria-login-subtitle">Acceso interno — Bonsight</p>
        {hasError && <p className="aria-login-error">Código incorrecto.</p>}
        <form action={loginAction}>
          <input
            type="password"
            name="code"
            placeholder="Código de acceso"
            className="aria-login-input"
            autoFocus
            required
          />
          <button type="submit" className="aria-login-button">Entrar</button>
        </form>
      </div>
    </div>
  );
}
