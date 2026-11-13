import { isKaiNextAdmin } from '@/lib/kaiNext/auth';
import { isKaiAuthorized } from '@/lib/kai/auth';
import { isAuthorized as isAriaAuthorized } from '@/lib/aria/auth';
import { updateIntelligenceSource } from '@/lib/kai/intelligenceSources';

// Equipo de Bonsight, sesión de Aria, o una persona del cliente marcada como Admin del tenant
// (la misma que entra a Admin de Kai Next).
async function isAllowed(params) {
  if ((await isKaiAuthorized()) || (await isAriaAuthorized())) return true;
  const { tenant } = await params;
  return isKaiNextAdmin(tenant);
}

export async function POST(req, { params }) {
  if (!(await isAllowed(params))) return Response.json({ error: 'No autorizado.' }, { status: 401 });

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
