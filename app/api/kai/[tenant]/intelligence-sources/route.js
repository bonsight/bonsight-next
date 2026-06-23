import { isKaiAuthorized } from '@/lib/kai/auth';
import { isAuthorized as isAriaAuthorized } from '@/lib/aria/auth';
import { getIntelligenceSources, updateIntelligenceSource } from '@/lib/kai/intelligenceSources';

async function isAllowed() {
  return (await isKaiAuthorized()) || (await isAriaAuthorized());
}

export async function GET(req, { params }) {
  if (!(await isAllowed())) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  const { tenant } = await params;
  const sources = await getIntelligenceSources(tenant);
  return Response.json({ sources, saEmail: process.env.GOOGLE_SA_EMAIL ?? null });
}

export async function PATCH(req, { params }) {
  if (!(await isAllowed())) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  const { tenant } = await params;
  const { sourceId, enabled, config } = await req.json();
  if (!sourceId) return Response.json({ error: 'sourceId requerido' }, { status: 400 });
  await updateIntelligenceSource(tenant, sourceId, { enabled, config });
  return Response.json({ ok: true });
}
