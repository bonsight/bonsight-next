import { isAuthorizedForTenant, getCurrentKaiNextIdentity, isKaiNextAdmin } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getProjectMeta, resolveProjectAccessLevel, setProjectRepos } from '@/lib/kaiNext/projects';
import { getGithubConnections, githubConnectionLabel, listAccessibleRepos, getRepoInfo, isValidRepoName } from '@/lib/kaiNext/github';
import { logProjectAction } from '@/lib/kaiNext/audit';

const MAX_REPOS = 5;

// Ver: Directores y el equipo del proyecto. Conectar o cambiar repositorios: solo admins (los
// tokens de GitHub son configuración del tenant, igual que Admin › Fuentes).
async function gate(tenant, id) {
  if (!(await isAuthorizedForTenant(tenant))) return { error: 'No autorizado.', status: 401 };
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) return { error: 'Proyectos no está habilitado para tu usuario.', status: 403 };
  const meta = await getProjectMeta(tenant, id);
  if (!meta || meta.projectKind !== 'desarrollo') return { error: 'Proyecto no encontrado.', status: 404 };
  const level = resolveProjectAccessLevel(identity);
  const inTeam = !!identity.personId && meta.supervisorIds?.includes(identity.personId);
  if (!level.isDirectorLevel && !inTeam) return { error: 'No tienes acceso a este proyecto.', status: 403 };
  return { identity, meta, canEdit: await isKaiNextAdmin(tenant) };
}

export async function GET(req, { params }) {
  const { tenant, id } = await params;
  const g = await gate(tenant, id);
  if (g.error) return Response.json({ error: g.error }, { status: g.status });

  const conns = await getGithubConnections(tenant);
  const url = new URL(req.url);
  const wantAvailable = url.searchParams.get('available') === '1';
  // Solo se lista una conexión a la vez (la que el usuario eligió en el modal), para no gastar
  // el tiempo de la función consultando todas las cuentas.
  const conn = conns.find((c) => c.id === url.searchParams.get('connectionId')) ?? conns[0] ?? null;
  let available = null;
  let availableError = null;
  if (conn && g.canEdit && wantAvailable) {
    try {
      available = await listAccessibleRepos(conn.token);
    } catch (err) {
      availableError = err.message;
    }
  }
  return Response.json({
    repos: g.meta.repos ?? [],
    githubConnected: conns.length > 0,
    connections: conns.map((c) => ({ id: c.id, label: githubConnectionLabel(c), accountLogin: c.accountLogin, repoCount: c.repoCount ?? 0 })),
    connectionId: conn?.id ?? null,
    canEdit: g.canEdit,
    available,
    availableError,
  });
}

export async function PUT(req, { params }) {
  const { tenant, id } = await params;
  const g = await gate(tenant, id);
  if (g.error) return Response.json({ error: g.error }, { status: g.status });
  if (!g.canEdit) return Response.json({ error: 'Solo un admin puede conectar o cambiar los repositorios.' }, { status: 403 });

  const conns = await getGithubConnections(tenant);
  if (!conns.length) return Response.json({ error: 'GitHub no está conectado. Configúralo en Admin → Fuentes.' }, { status: 400 });

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }
  const requested = (Array.isArray(body.repos) ? body.repos : []).slice(0, MAX_REPOS);

  // Cada repo se confirma contra GitHub con el token de la conexión elegida antes de guardarlo.
  // Si no viene conexión (o ya no existe), se prueba con la que tenga acceso al dueño y, si no,
  // con cada una hasta que alguna lo vea.
  const repos = [];
  try {
    for (const r of requested) {
      const fullName = String(r?.fullName ?? '').trim();
      if (!isValidRepoName(fullName)) return Response.json({ error: `"${fullName}" no es un repositorio válido (usa owner/nombre).` }, { status: 400 });
      if (repos.some((x) => x.fullName.toLowerCase() === fullName.toLowerCase())) continue;
      const owner = fullName.split('/')[0].toLowerCase();
      const chosen = conns.find((c) => c.id === r?.connectionId);
      const ordered = [
        ...(chosen ? [chosen] : []),
        ...conns.filter((c) => c !== chosen && (c.owners ?? []).some((o) => o.toLowerCase() === owner)),
        ...conns.filter((c) => c !== chosen && !(c.owners ?? []).some((o) => o.toLowerCase() === owner)),
      ];
      let info = null;
      let used = null;
      let lastErr = null;
      for (const c of ordered) {
        try {
          info = await getRepoInfo(c.token, fullName);
          used = c;
          break;
        } catch (err) {
          lastErr = err;
        }
      }
      if (!info) throw new Error(`${fullName}: ${lastErr?.message ?? 'ninguna cuenta de GitHub conectada tiene acceso.'}`);
      const branch = String(r?.branch ?? '').trim() || null;
      repos.push({ fullName: info.fullName, branch, defaultBranch: info.defaultBranch, url: info.url, connectionId: used.id });
    }
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }

  const meta = await setProjectRepos(tenant, id, repos);
  const before = (g.meta.repos ?? []).map((r) => r.fullName);
  const after = repos.map((r) => r.fullName);
  const added = after.filter((x) => !before.includes(x));
  const removed = before.filter((x) => !after.includes(x));
  if (added.length || removed.length) {
    await logProjectAction(tenant, g.identity, {
      project: meta,
      action: 'Cambió los repositorios',
      detail: [added.length && `Conectó: ${added.join(', ')}`, removed.length && `Desconectó: ${removed.join(', ')}`].filter(Boolean).join('. '),
    });
  }
  return Response.json({ repos: meta.repos });
}
