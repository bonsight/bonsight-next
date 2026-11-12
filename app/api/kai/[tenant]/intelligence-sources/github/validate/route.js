import { isKaiAuthorized } from '@/lib/kai/auth';
import { isAuthorized as isAriaAuthorized } from '@/lib/aria/auth';
import { getIntelligenceSources, updateIntelligenceSource } from '@/lib/kai/intelligenceSources';
import { validateGithubToken, githubConnectionsFromConfig } from '@/lib/kaiNext/github';

async function isAllowed() {
  return (await isKaiAuthorized()) || (await isAriaAuthorized());
}

// El token nunca vuelve al navegador: solo los últimos 4 caracteres.
const publicConnection = (c) => ({
  id: c.id, token: `••••${c.token.slice(-4)}`, accountLogin: c.accountLogin, owners: c.owners ?? [],
  repoCount: c.repoCount ?? 0, lastValidatedAt: c.lastValidatedAt ?? null,
});

async function loadConnections(tenant) {
  const sources = await getIntelligenceSources(tenant);
  const gh = sources.find((s) => s.id === 'github');
  return { connections: githubConnectionsFromConfig(gh?.config), enabled: gh?.status === 'active' };
}

async function saveConnections(tenant, connections, enabled) {
  const latest = connections.reduce((acc, c) => (!acc || (c.lastValidatedAt ?? '') > acc ? c.lastValidatedAt : acc), null);
  await updateIntelligenceSource(tenant, 'github', {
    enabled: connections.length ? enabled : false,
    config: {
      connections,
      repoCount: connections.reduce((n, c) => n + (c.repoCount ?? 0), 0),
      lastValidatedAt: latest,
      lastError: null,
    },
  });
}

// Agrega una cuenta u organización, o renueva el token de una que ya estaba (por id, o porque
// el token nuevo ve exactamente los mismos dueños).
export async function POST(req, { params }) {
  if (!(await isAllowed())) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  const { tenant } = await params;
  const { token: rawToken, id: replaceId } = await req.json();
  const token = String(rawToken ?? '').trim();
  if (!token || token.startsWith('••••')) {
    return Response.json({ ok: false, error: 'Pega el token de GitHub.' }, { status: 400 });
  }

  let account;
  try {
    account = await validateGithubToken(token);
  } catch (err) {
    return Response.json({ ok: false, error: `No se pudo conectar con GitHub: ${err.message}` });
  }

  const { connections } = await loadConnections(tenant);
  const sameOwners = (c) => {
    const a = [...(c.owners ?? [])].map((o) => o.toLowerCase()).sort().join(',');
    const b = [...account.owners].map((o) => o.toLowerCase()).sort().join(',');
    return c.accountLogin === account.accountLogin && a === b;
  };
  const existing = connections.find((c) => (replaceId && c.id === replaceId)) ?? connections.find(sameOwners);

  const now = new Date().toISOString();
  const conn = {
    id: existing?.id ?? `gh_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    token,
    accountLogin: account.accountLogin,
    owners: account.owners,
    repoCount: account.repoCount,
    lastValidatedAt: now,
  };
  const next = existing ? connections.map((c) => (c.id === existing.id ? conn : c)) : [...connections, conn];
  await saveConnections(tenant, next, true);

  return Response.json({ ok: true, replaced: !!existing, connections: next.map(publicConnection) });
}

export async function DELETE(req, { params }) {
  if (!(await isAllowed())) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  const { tenant } = await params;
  const { id } = await req.json().catch(() => ({}));
  if (!id) return Response.json({ error: 'Falta la conexión.' }, { status: 400 });

  const { connections, enabled } = await loadConnections(tenant);
  const next = connections.filter((c) => c.id !== id);
  await saveConnections(tenant, next, enabled);
  return Response.json({ ok: true, connections: next.map(publicConnection) });
}
