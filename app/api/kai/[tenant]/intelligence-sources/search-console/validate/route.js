import { isKaiAuthorized } from '@/lib/kai/auth';
import { isAuthorized as isAriaAuthorized } from '@/lib/aria/auth';
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

  await updateIntelligenceSource(tenant, 'search_console', {
    enabled: true,
    config: {
      siteUrl: url,
      permissionStatus: 'pending_verification',
      lastValidatedAt: now,
      lastError: null,
    },
  });

  return Response.json({ ok: true, siteUrl: url, lastValidatedAt: now });
}
