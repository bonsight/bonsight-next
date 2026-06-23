import { isKaiAuthorized } from '@/lib/kai/auth';
import { isAuthorized as isAriaAuthorized } from '@/lib/aria/auth';
import { validateGoogleAdsAccess } from '@/lib/aria/googleAds';
import { updateIntelligenceSource } from '@/lib/kai/intelligenceSources';

async function isAllowed() {
  return (await isKaiAuthorized()) || (await isAriaAuthorized());
}

export async function POST(req, { params }) {
  if (!(await isAllowed())) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  const { tenant } = await params;
  const { customerId } = await req.json();

  if (!customerId?.trim()) {
    return Response.json({ ok: false, error: 'Customer ID requerido.' }, { status: 400 });
  }

  const id = customerId.trim();
  const now = new Date().toISOString();

  const validation = await validateGoogleAdsAccess(id);

  if (!validation.ok) {
    await updateIntelligenceSource(tenant, 'google_ads', {
      enabled: false,
      config: {
        customerId: id,
        permissionStatus: 'access_error',
        lastValidatedAt: now,
        lastError: validation.error,
      },
    });
    return Response.json({ ok: false, error: validation.error });
  }

  await updateIntelligenceSource(tenant, 'google_ads', {
    enabled: true,
    config: {
      customerId: id,
      customerName: validation.customerName,
      permissionStatus: 'validated',
      lastValidatedAt: now,
      lastError: null,
    },
  });

  return Response.json({
    ok: true,
    customerId: id,
    customerName: validation.customerName,
    lastValidatedAt: now,
  });
}
