import { isKaiAuthorized } from '@/lib/kai/auth';
import { isAuthorized as isAriaAuthorized } from '@/lib/aria/auth';
import { updateIntelligenceSource } from '@/lib/kai/intelligenceSources';
import { validateNotionToken } from '@/lib/aria/notion';

async function isAllowed() {
  return (await isKaiAuthorized()) || (await isAriaAuthorized());
}

export async function POST(req, { params }) {
  if (!(await isAllowed())) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  const { tenant } = await params;
  const { integrationToken } = await req.json();

  if (!integrationToken?.trim()) {
    return Response.json({ ok: false, error: 'Integration Token requerido.' }, { status: 400 });
  }

  const token = integrationToken.trim();
  const now = new Date().toISOString();

  let databases = [];
  let pages = [];
  try {
    ({ databases, pages } = await validateNotionToken(token));
  } catch (err) {
    return Response.json({ ok: false, error: `No se pudo conectar con Notion: ${err.message}` });
  }

  await updateIntelligenceSource(tenant, 'notion', {
    enabled: true,
    config: {
      integrationToken: token,
      databaseCount: databases.length,
      pageCount: pages.length,
      permissionStatus: 'validated',
      lastValidatedAt: now,
      lastError: null,
    },
  });

  return Response.json({
    ok: true,
    databaseCount: databases.length,
    pageCount: pages.length,
    databases,
    pages,
    lastValidatedAt: now,
  });
}
