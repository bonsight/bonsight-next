import { isKaiAuthorized } from '@/lib/kai/auth';
import { isAuthorized as isAriaAuthorized } from '@/lib/aria/auth';
import { getIntelligenceSources, updateIntelligenceSource } from '@/lib/kai/intelligenceSources';

async function isAllowed() {
  return (await isKaiAuthorized()) || (await isAriaAuthorized());
}

export async function GET(req, { params }) {
  if (!(await isAllowed())) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  const { tenant } = await params;
  // El token de GitHub nunca vuelve al navegador: solo se muestra que existe.
  const sources = (await getIntelligenceSources(tenant)).map((s) => (s.id === 'github' && s.config?.token
    ? { ...s, config: { ...s.config, token: `••••${s.config.token.slice(-4)}` } }
    : s));
  return Response.json({ sources, saEmail: process.env.GOOGLE_SA_EMAIL ?? null });
}

export async function PATCH(req, { params }) {
  if (!(await isAllowed())) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  const { tenant } = await params;
  const { sourceId, enabled, config } = await req.json();
  if (!sourceId) return Response.json({ error: 'sourceId requerido' }, { status: 400 });
  // El token de GitHub solo se cambia validándolo (github/validate); acá nunca se pisa con la
  // versión enmascarada que ve el navegador.
  const safeConfig = sourceId === 'github' ? undefined : config;
  await updateIntelligenceSource(tenant, sourceId, { enabled, config: safeConfig });
  return Response.json({ ok: true });
}
