import { isKaiAuthorized } from '@/lib/kai/auth';
import { isAuthorized as isAriaAuthorized } from '@/lib/aria/auth';
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

  await updateIntelligenceSource(tenant, 'google_ads', {
    enabled: true,
    config: {
      customerId: id,
      permissionStatus: 'pending_verification',
      lastValidatedAt: now,
      lastError: null,
    },
  });

  return Response.json({ ok: true, customerId: id, lastValidatedAt: now });
}
