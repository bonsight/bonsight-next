import { verifyGoogleCallback } from '@/lib/kaiNext/googleOAuth';
import { getTenantUserByEmail } from '@/lib/kai/tenantUsers';
import { loginTenantSession } from '@/lib/kai/tenantAuth';
import { kaiNextBasePath } from '@/lib/kaiNext/paths';

// Único callback (no por tenant) — Google exige redirect URIs exactas registradas de
// antemano, así que el tenant viaja firmado en `state`, no en la URL. Ver lib/kaiNext/googleOAuth.js.
export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const basePath = kaiNextBasePath(url.host);

  // Best-effort: si el state no valida, igual leemos el tenant en claro (primer segmento) solo
  // para saber a qué pantalla volver con el error — no se usa para nada que dependa de confiar
  // en el tenant, eso lo exige verifyGoogleCallback antes de tocar la sesión.
  const fallbackTenant = String(state ?? '').split('.')[0] || 'bonsight';

  let tenant, email;
  try {
    ({ tenant, email } = await verifyGoogleCallback(code, state));
  } catch (err) {
    console.error('[kai-next/auth/google/callback]', err.message);
    return Response.redirect(new URL(`${basePath}/${fallbackTenant}?login_error=google`, req.url));
  }

  const user = await getTenantUserByEmail(tenant, email);
  if (!user) {
    return Response.redirect(new URL(`${basePath}/${tenant}?login_error=sin_cuenta`, req.url));
  }

  await loginTenantSession(tenant, user.id);
  return Response.redirect(new URL(`${basePath}/${tenant}`, req.url));
}
