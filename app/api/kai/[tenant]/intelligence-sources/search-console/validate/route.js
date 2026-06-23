import { isKaiAuthorized } from '@/lib/kai/auth';
import { isAuthorized as isAriaAuthorized } from '@/lib/aria/auth';
import { validateSearchConsoleAccess } from '@/lib/aria/searchConsole';
import { updateIntelligenceSource } from '@/lib/kai/intelligenceSources';

async function isAllowed() {
  return (await isKaiAuthorized()) || (await isAriaAuthorized());
}

export async function POST(req, { params }) {
  if (!(await isAllowed())) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  const { tenant } = await params;
  const { siteUrl } = await req.json();

  if (!siteUrl?.trim()) {
    return Response.json({ ok: false, error: 'Site URL requerida.' }, { status: 400 });
  }

  const url = siteUrl.trim();
  const now = new Date().toISOString();

  const validation = await validateSearchConsoleAccess(url);

  if (!validation.ok) {
    await updateIntelligenceSource(tenant, 'search_console', {
      enabled: false,
      config: {
        siteUrl: url,
        permissionStatus: 'access_error',
        lastValidatedAt: now,
        lastError: validation.error,
      },
    });
    return Response.json({ ok: false, error: validation.error });
  }

  const resolvedUrl = validation.resolvedUrl;
  await updateIntelligenceSource(tenant, 'search_console', {
    enabled: true,
    config: {
      siteUrl: resolvedUrl,
      permissionStatus: 'validated',
      lastValidatedAt: now,
      lastError: null,
    },
  });

  return Response.json({ ok: true, siteUrl: resolvedUrl, lastValidatedAt: now });
}
