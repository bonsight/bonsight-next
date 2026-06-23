import { isKaiAuthorized } from '@/lib/kai/auth';
import { isAuthorized as isAriaAuthorized } from '@/lib/aria/auth';
import { validateGA4Access, fetchGA4PropertyMeta } from '@/lib/aria/ga4';
import { updateIntelligenceSource } from '@/lib/kai/intelligenceSources';

async function isAllowed() {
  return (await isKaiAuthorized()) || (await isAriaAuthorized());
}

export async function POST(req, { params }) {
  if (!(await isAllowed())) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  const { tenant } = await params;
  const { propertyId } = await req.json();

  if (!propertyId?.trim()) {
    return Response.json({ ok: false, error: 'Property ID requerido.' }, { status: 400 });
  }

  const pid = propertyId.trim();
  const now = new Date().toISOString();

  const validation = await validateGA4Access(pid);

  if (!validation.ok) {
    await updateIntelligenceSource(tenant, 'ga4', {
      enabled: false,
      config: {
        propertyId: pid,
        permissionStatus: 'access_error',
        lastValidatedAt: now,
        lastError: validation.error,
      },
    });
    return Response.json({ ok: false, error: validation.error });
  }

  const meta = await fetchGA4PropertyMeta(pid);

  await updateIntelligenceSource(tenant, 'ga4', {
    enabled: true,
    config: {
      propertyId: pid,
      propertyName: meta.propertyName,
      accountName: meta.accountName,
      timezone: meta.timezone,
      currency: meta.currency,
      permissionStatus: 'validated',
      lastValidatedAt: now,
      lastError: null,
    },
  });

  return Response.json({
    ok: true,
    propertyId: pid,
    propertyName: meta.propertyName,
    accountName: meta.accountName,
    lastValidatedAt: now,
  });
}
