import { isKaiAuthorized } from '@/lib/kai/auth';
import { isAuthorized as isAriaAuthorized } from '@/lib/aria/auth';
import { updateIntelligenceSource } from '@/lib/kai/intelligenceSources';
import { validateGithubToken } from '@/lib/kaiNext/github';

async function isAllowed() {
  return (await isKaiAuthorized()) || (await isAriaAuthorized());
}

export async function POST(req, { params }) {
  if (!(await isAllowed())) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  const { tenant } = await params;
  const { token: rawToken } = await req.json();
  const token = String(rawToken ?? '').trim();
  if (!token || token.startsWith('••••')) {
    return Response.json({ ok: false, error: 'Pega el token de GitHub.' }, { status: 400 });
  }

  let account;
  try {
    account = await validateGithubToken(token);
  } catch (err) {
    return Response.json({ ok: false, error: `No se pudo conectar con GitHub: ${err.message}` });
  }

  const now = new Date().toISOString();
  await updateIntelligenceSource(tenant, 'github', {
    enabled: true,
    config: { token, accountLogin: account.accountLogin, repoCount: account.repoCount, lastValidatedAt: now, lastError: null },
  });

  // El token no se devuelve completo: el cliente solo necesita saber que quedó guardado.
  return Response.json({ ok: true, token: `••••${token.slice(-4)}`, accountLogin: account.accountLogin, repoCount: account.repoCount, lastValidatedAt: now });
}
