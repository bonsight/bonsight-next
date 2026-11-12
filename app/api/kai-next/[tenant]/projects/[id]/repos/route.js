import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getProjectMeta, resolveProjectAccessLevel, setProjectRepos } from '@/lib/kaiNext/projects';
import { getGithubToken, listAccessibleRepos, getRepoInfo, isValidRepoName } from '@/lib/kaiNext/github';
import { logProjectAction } from '@/lib/kaiNext/audit';

const MAX_REPOS = 5;

// Ver: Directores y el equipo del proyecto. Cambiar: Directores y Supervisores del proyecto.
async function gate(tenant, id) {
  if (!(await isAuthorizedForTenant(tenant))) return { error: 'No autorizado.', status: 401 };
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) return { error: 'Proyectos no está habilitado para tu usuario.', status: 403 };
  const meta = await getProjectMeta(tenant, id);
  if (!meta || meta.projectKind !== 'desarrollo') return { error: 'Proyecto no encontrado.', status: 404 };
  const level = resolveProjectAccessLevel(identity);
  const inTeam = !!identity.personId && meta.supervisorIds?.includes(identity.personId);
  if (!level.isDirectorLevel && !inTeam) return { error: 'No tienes acceso a este proyecto.', status: 403 };
  return { identity, meta, canEdit: level.isDirectorLevel || (level.isSupervisorLevel && inTeam) };
}

export async function GET(req, { params }) {
  const { tenant, id } = await params;
  const g = await gate(tenant, id);
  if (g.error) return Response.json({ error: g.error }, { status: g.status });

  const token = await getGithubToken(tenant);
  const wantAvailable = new URL(req.url).searchParams.get('available') === '1';
  let available = null;
  let availableError = null;
  if (token && g.canEdit && wantAvailable) {
    try {
      available = await listAccessibleRepos(token);
    } catch (err) {
      availableError = err.message;
    }
  }
  return Response.json({ repos: g.meta.repos ?? [], githubConnected: !!token, canEdit: g.canEdit, available, availableError });
}

export async function PUT(req, { params }) {
  const { tenant, id } = await params;
  const g = await gate(tenant, id);
  if (g.error) return Response.json({ error: g.error }, { status: g.status });
  if (!g.canEdit) return Response.json({ error: 'Solo un Supervisor del proyecto o un Director puede cambiar los repositorios.' }, { status: 403 });

  const token = await getGithubToken(tenant);
  if (!token) return Response.json({ error: 'GitHub no está conectado. Configúralo en Admin → Fuentes.' }, { status: 400 });

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }
  const requested = (Array.isArray(body.repos) ? body.repos : []).slice(0, MAX_REPOS);

  // Cada repo se confirma contra GitHub con el token del tenant antes de guardarlo.
  const repos = [];
  try {
    for (const r of requested) {
      const fullName = String(r?.fullName ?? '').trim();
      if (!isValidRepoName(fullName)) return Response.json({ error: `"${fullName}" no es un repositorio válido (usa owner/nombre).` }, { status: 400 });
      if (repos.some((x) => x.fullName.toLowerCase() === fullName.toLowerCase())) continue;
      const info = await getRepoInfo(token, fullName);
      const branch = String(r?.branch ?? '').trim() || null;
      repos.push({ fullName: info.fullName, branch, defaultBranch: info.defaultBranch, url: info.url });
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
