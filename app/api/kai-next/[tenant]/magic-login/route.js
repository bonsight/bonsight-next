import { getTenantMeta } from '@/lib/kai/tenants';
import { consumeTenantLoginToken } from '@/lib/kai/tenantUsers';
import { loginTenantSession } from '@/lib/kai/tenantAuth';
import { kaiNextBasePath } from '@/lib/kaiNext/paths';

// Destino real del enlace mágico por email (ver doSendLoginLink en ../../../kai-next/[tenant]/
// KaiNextLogin.jsx) — tiene que ser un Route Handler, no la página: setear la cookie de sesión
// (loginTenantSession) está prohibido en el render de un Server Component (tira "Cookies can
// only be modified in a Server Action or Route Handler"), que es justo lo que hacía antes
// app/kai-next/[tenant]/magic-login/page.jsx — esa página ahora solo redirige para acá.
export async function GET(req, { params }) {
  const { tenant } = await params;
  const token = new URL(req.url).searchParams.get('token') ?? '';
  const host = req.headers.get('host') ?? '';
  const basePath = kaiNextBasePath(host);

  const meta = await getTenantMeta(tenant);
  if (!meta) return Response.redirect(new URL(`${basePath}/${tenant}`, req.url));

  const user = token ? await consumeTenantLoginToken(tenant, token) : null;
  if (!user) {
    return Response.redirect(new URL(`${basePath}/${tenant}?login_error=magic_expirado`, req.url));
  }

  await loginTenantSession(tenant, user.id);
  return Response.redirect(new URL(`${basePath}/${tenant}`, req.url));
}
