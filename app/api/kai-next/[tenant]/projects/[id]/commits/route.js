import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getProjectMeta, resolveProjectAccessLevel } from '@/lib/kaiNext/projects';
import { listTasks as listDevTasks } from '@/lib/kaiNext/devStore';
import { getGithubToken, getGithubTokenForRepo, listRepoBranches, listCommitsForFormalizing, getCommitBasic, commentOnCommit } from '@/lib/kaiNext/github';
import { listFormalizations, addFormalization } from '@/lib/kaiNext/commitFormalizations';
import { proposeFormalization } from '@/lib/kaiNext/commitProposal';
import { logProjectAction } from '@/lib/kaiNext/audit';

const MAX_COMMITS = 10;
const DONE = new Set(['Done', 'Cancelada', 'Cancelado']);

// Formalizar commits es del equipo del proyecto (cualquiera puede haber hecho el trabajo) y de
// los Directores.
async function gate(tenant, id) {
  if (!(await isAuthorizedForTenant(tenant))) return { error: 'No autorizado.', status: 401 };
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) return { error: 'Proyectos no está habilitado para tu usuario.', status: 403 };
  const meta = await getProjectMeta(tenant, id);
  if (!meta || meta.projectKind !== 'desarrollo') return { error: 'Proyecto no encontrado.', status: 404 };
  const { isDirectorLevel } = resolveProjectAccessLevel(identity);
  if (!isDirectorLevel && !(identity.personId && meta.supervisorIds?.includes(identity.personId))) {
    return { error: 'No tienes acceso a este proyecto.', status: 403 };
  }
  const githubToken = await getGithubToken(tenant);
  if (!githubToken) return { error: 'GitHub no está conectado. Se configura en Admin → Fuentes.', status: 400 };
  return { identity, meta };
}

function pickRepo(meta, repo) {
  const repos = meta.repos ?? [];
  if (!repos.length) return null;
  return repos.find((r) => r.fullName.toLowerCase() === String(repo ?? '').toLowerCase()) ?? (repo ? null : repos[0]);
}

// Si se cerró antes de su fecha de fin planificada, esa fecha está en el futuro: se usa la última edición.
function doneDate(t) {
  if (t.doneAt) return t.doneAt;
  const today = new Date().toISOString().slice(0, 10);
  if (t.endDate && t.endDate.slice(0, 10) <= today) return t.endDate;
  return t.updatedAt ?? t.endDate ?? null;
}

// Un commit se formaliza una sola vez, y una tarea queda cerrada para formalizaciones una vez que
// se asoció a un commit: ninguno de los dos vuelve a ser elegible.
function formalizedSets(formalizations) {
  const shas = new Set();
  const taskIds = new Set();
  for (const f of formalizations) {
    for (const c of f.commits ?? []) if (c.sha) shas.add(c.sha.toLowerCase());
    for (const t of f.tasks ?? []) if (t.id) taskIds.add(t.id);
  }
  return { shas, taskIds };
}
const shaTaken = (set, sha) => [...set].some((s) => s.startsWith(sha.toLowerCase()));

async function loadTasks(tenant, meta) {
  const tasks = await listDevTasks(tenant, meta.id);
  return tasks
    // doneAt existe desde que se registra; lo hecho antes usa la fecha de fin de la tarea.
    .map((t) => ({
      id: t.id, title: t.title, status: t.status, url: null, responsableName: t.responsableName ?? null,
      description: t.description ?? '', sprintIds: t.sprintIds ?? [],
      doneAt: t.status === 'Done' ? doneDate(t) : null,
    }))
    .sort((a, b) => Number(DONE.has(a.status)) - Number(DONE.has(b.status)) || a.title.localeCompare(b.title));
}

export async function GET(req, { params }) {
  const { tenant, id } = await params;
  const g = await gate(tenant, id);
  if (g.error) return Response.json({ error: g.error }, { status: g.status });

  const url = new URL(req.url);
  const repo = pickRepo(g.meta, url.searchParams.get('repo'));
  if (!repo) return Response.json({ repos: g.meta.repos ?? [], branches: [], commits: [], tasks: [], formalizations: [] });
  const branch = url.searchParams.get('branch') || repo.branch || repo.defaultBranch || null;
  const githubToken = await getGithubTokenForRepo(tenant, repo);

  try {
    const [branches, commits, tasks, formalizations] = await Promise.all([
      listRepoBranches(githubToken, repo.fullName),
      listCommitsForFormalizing(githubToken, repo.fullName, branch),
      loadTasks(tenant, g.meta),
      listFormalizations(tenant, id),
    ]);
    const taken = formalizedSets(formalizations);
    return Response.json({
      repos: g.meta.repos,
      repo: repo.fullName,
      branch: branch ?? branches[0] ?? null,
      branches,
      commits: commits.filter((c) => !taken.shas.has(c.sha.toLowerCase())),
      tasks: tasks.filter((t) => !taken.taskIds.has(t.id)),
      // Historial para el apartado "Formalizados" (de todos los repos del proyecto, más reciente primero).
      formalized: formalizations.slice(0, 300).map((f) => ({
        id: f.id, at: f.at, repo: f.repo, summary: f.summary, description: f.description,
        by: f.by?.name ?? null, tasks: f.tasks ?? [], github: f.github ?? null,
        commits: (f.commits ?? []).map((c) => ({ sha: c.sha, shortSha: c.shortSha, message: c.message, author: c.author, date: c.date, url: c.url })),
      })),
      me: g.identity.personName ?? null,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}

export async function POST(req, { params }) {
  const { tenant, id } = await params;
  const g = await gate(tenant, id);
  if (g.error) return Response.json({ error: g.error }, { status: g.status });

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }
  const repo = pickRepo(g.meta, body.repo);
  if (!repo) return Response.json({ error: 'Ese repositorio no está conectado a este proyecto.' }, { status: 400 });
  const githubToken = await getGithubTokenForRepo(tenant, repo);
  const shas = [...new Set((Array.isArray(body.shas) ? body.shas : []).filter((s) => /^[0-9a-f]{7,40}$/i.test(s)))];
  if (!shas.length) return Response.json({ error: 'Elige al menos un commit.' }, { status: 400 });
  if (shas.length > MAX_COMMITS) return Response.json({ error: `Puedes formalizar hasta ${MAX_COMMITS} commits a la vez.` }, { status: 400 });

  try {
    const [allTasks, formalizations] = await Promise.all([loadTasks(tenant, g.meta), listFormalizations(tenant, id)]);
    const taken = formalizedSets(formalizations);
    if (shas.some((s) => shaTaken(taken.shas, s))) {
      return Response.json({ error: 'Alguno de esos commits ya fue formalizado. Actualiza la lista.' }, { status: 400 });
    }
    const tasks = allTasks.filter((t) => !taken.taskIds.has(t.id));

    if (body.action === 'propose') {
      // Solo las tareas que eligió la persona: Kai ya no las elige, solo redacta.
      const ids = new Set(Array.isArray(body.taskIds) ? body.taskIds : []);
      const chosenTasks = tasks.filter((t) => ids.has(t.id));
      if (!chosenTasks.length) return Response.json({ error: 'Elige al menos una tarea.' }, { status: 400 });
      const proposal = await proposeFormalization({ token: githubToken, repo: repo.fullName, shas, tasks: chosenTasks });
      return Response.json({ proposal });
    }

    if (body.action !== 'formalize') return Response.json({ error: 'Acción desconocida.' }, { status: 400 });

    const summary = String(body.summary ?? '').trim();
    const description = String(body.description ?? '').trim();
    if (!summary) return Response.json({ error: 'El resumen es obligatorio.' }, { status: 400 });
    if (!description) return Response.json({ error: 'La descripción es obligatoria.' }, { status: 400 });
    const taskById = new Map(tasks.map((t) => [t.id, t]));
    const chosen = [...new Set(Array.isArray(body.taskIds) ? body.taskIds : [])].map((tid) => taskById.get(tid)).filter(Boolean);
    if (!chosen.length) return Response.json({ error: 'Elige al menos una tarea (que no esté ya asociada a otro commit).' }, { status: 400 });

    // Los commits se confirman contra GitHub: que existan y sean de este repo.
    const commits = [];
    for (const sha of shas) commits.push(await getCommitBasic(githubToken, repo.fullName, sha));

    const by = { personId: g.identity.personId ?? null, name: g.identity.personName ?? 'Equipo Bonsight' };
    const comment = [
      `**Formalizado en Kai** por ${by.name}`,
      '',
      `**${summary}**`,
      '',
      description,
      '',
      'Tareas:',
      ...chosen.map((t) => `- ${t.title}${t.url ? ` (${t.url})` : ''}`),
      ...(commits.length > 1 ? ['', `Commits incluidos: ${commits.map((c) => c.shortSha).join(', ')}`] : []),
    ].join('\n');

    const github = { commented: 0, urls: [], error: null };
    for (const c of commits) {
      const r = await commentOnCommit(githubToken, repo.fullName, c.sha, comment);
      if (r.ok) { github.commented += 1; github.urls.push(r.url); } else { github.error = r.error; break; }
    }

    const record = await addFormalization(tenant, id, {
      repo: repo.fullName,
      commits: commits.map((c) => ({ ...c, message: c.message.slice(0, 2000) })),
      tasks: chosen.map((t) => ({ id: t.id, title: t.title, url: t.url })),
      summary,
      description,
      by,
      github,
    });
    await logProjectAction(tenant, g.identity, {
      project: g.meta,
      action: 'Formalizó commits',
      detail: `${commits.map((c) => c.shortSha).join(', ')} → ${chosen.map((t) => t.title).join(', ')}`,
    });
    return Response.json({ formalization: record });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
