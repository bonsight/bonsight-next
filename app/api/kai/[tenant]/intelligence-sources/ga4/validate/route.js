import { isKaiAuthorized } from '@/lib/kai/auth';
import { isAuthorized as isAriaAuthorized } from '@/lib/aria/auth';
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

  await updateIntelligenceSource(tenant, 'ga4', {
    enabled: true,
    config: {
      propertyId: pid,
      permissionStatus: 'pending_verification',
      lastValidatedAt: now,
      lastError: null,
    },
  });

  return Response.json({ ok: true, propertyId: pid, lastValidatedAt: now });
}
