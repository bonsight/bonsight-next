import { isKaiNextAdmin } from '@/lib/kaiNext/auth';
import { isKaiAuthorized } from '@/lib/kai/auth';
import { isAuthorized as isAriaAuthorized } from '@/lib/aria/auth';
import { getIntelligenceSources, updateIntelligenceSource } from '@/lib/kai/intelligenceSources';
import { githubConnectionsFromConfig } from '@/lib/kaiNext/github';

// Equipo de Bonsight, sesión de Aria, o una persona del cliente marcada como Admin del tenant
// (la misma que entra a Admin de Kai Next).
async function isAllowed(params) {
  if ((await isKaiAuthorized()) || (await isAriaAuthorized())) return true;
  const { tenant } = await params;
  return isKaiNextAdmin(tenant);
}

export async function GET(req, { params }) {
  if (!(await isAllowed(params))) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  const { tenant } = await params;
  // Los tokens de GitHub nunca vuelven al navegador: solo se muestra que existen.
  const sources = (await getIntelligenceSources(tenant)).map((s) => {
    if (s.id !== 'github') return s;
    const { token, connections, ...rest } = s.config ?? {};
    return {
      ...s,
      config: {
        ...rest,
        connections: githubConnectionsFromConfig(s.config).map((c) => ({
          id: c.id, token: `••••${c.token.slice(-4)}`, accountLogin: c.accountLogin, owners: c.owners ?? [],
          repoCount: c.repoCount ?? 0, lastValidatedAt: c.lastValidatedAt ?? null,
        })),
      },
    };
  });
  return Response.json({ sources, saEmail: process.env.GOOGLE_SA_EMAIL ?? null });
}

export async function PATCH(req, { params }) {
  if (!(await isAllowed(params))) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  const { tenant } = await params;
  const { sourceId, enabled, config } = await req.json();
  if (!sourceId) return Response.json({ error: 'sourceId requerido' }, { status: 400 });
  // El token de GitHub solo se cambia validándolo (github/validate); acá nunca se pisa con la
  // versión enmascarada que ve el navegador.
  const safeConfig = sourceId === 'github' ? undefined : config;
  await updateIntelligenceSource(tenant, sourceId, { enabled, config: safeConfig });
  return Response.json({ ok: true });
}
