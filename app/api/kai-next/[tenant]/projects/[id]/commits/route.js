import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getProjectMeta, isProjectMember } from '@/lib/kaiNext/projects';
import { listTasks as listDevTasks } from '@/lib/kaiNext/devStore';
import { getGithubToken, getGithubTokenForRepo, listMergedPulls, getMergedPull, commentOnPull } from '@/lib/kaiNext/github';
import { listFormalizations, addFormalization } from '@/lib/kaiNext/commitFormalizations';
import { proposePullFormalization } from '@/lib/kaiNext/commitProposal';
import { logProjectAction } from '@/lib/kaiNext/audit';

const DONE = new Set(['Done', 'Cancelada', 'Cancelado']);

// Formalizar commits es del equipo del proyecto (cualquiera puede haber hecho el trabajo) y de
// los Directores.
async function gate(tenant, id) {
  if (!(await isAuthorizedForTenant(tenant))) return { error: 'No autorizado.', status: 401 };
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) return { error: 'Proyectos no está habilitado para tu usuario.', status: 403 };
  const meta = await getProjectMeta(tenant, id);
  if (!meta || meta.projectKind !== 'desarrollo') return { error: 'Proyecto no encontrado.', status: 404 };
  if (!isProjectMember(identity, meta)) {
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

// Un PR se formaliza una sola vez, y una tarea queda cerrada para formalizaciones una vez que se
// asoció a uno: ninguno de los dos vuelve a ser elegible. Las formalizaciones antiguas (por
// commits sueltos, antes de pasar a PRs) siguen bloqueando sus tareas.
const prKey = (repo, number) => `${String(repo).toLowerCase()}#${number}`;
function formalizedSets(formalizations) {
  const prs = new Set();
  const taskIds = new Set();
  for (const f of formalizations) {
    if (f.pr?.number) prs.add(prKey(f.repo, f.pr.number));
    for (const t of f.tasks ?? []) if (t.id) taskIds.add(t.id);
  }
  return { prs, taskIds };
}

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

const publicPr = (p) => ({
  number: p.number, title: p.title, author: p.author, mergedAt: p.mergedAt, base: p.base, head: p.head, url: p.url,
  body: (p.body ?? '').slice(0, 600),
});

export async function GET(req, { params }) {
  const { tenant, id } = await params;
  const g = await gate(tenant, id);
  if (g.error) return Response.json({ error: g.error }, { status: g.status });

  const url = new URL(req.url);
  const repo = pickRepo(g.meta, url.searchParams.get('repo'));
  if (!repo) return Response.json({ repos: g.meta.repos ?? [], pulls: [], tasks: [], formalized: [] });
  const githubToken = await getGithubTokenForRepo(tenant, repo);

  try {
    const [pulls, tasks, formalizations] = await Promise.all([
      listMergedPulls(githubToken, repo.fullName),
      loadTasks(tenant, g.meta),
      listFormalizations(tenant, id),
    ]);
    const taken = formalizedSets(formalizations);
    return Response.json({
      repos: g.meta.repos,
      repo: repo.fullName,
      pulls: pulls.filter((p) => !taken.prs.has(prKey(repo.fullName, p.number))).map(publicPr),
      tasks: tasks.filter((t) => !taken.taskIds.has(t.id)),
      // Historial para el apartado "Formalizados" (de todos los repos del proyecto, más reciente primero).
      formalized: formalizations.slice(0, 300).map((f) => ({
        id: f.id, at: f.at, repo: f.repo, summary: f.summary, description: f.description,
        by: f.by?.name ?? null, tasks: f.tasks ?? [], github: f.github ?? null,
        pr: f.pr ? { number: f.pr.number, title: f.pr.title, url: f.pr.url, author: f.pr.author, mergedAt: f.pr.mergedAt } : null,
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
  const number = Number(body.pr);
  if (!Number.isInteger(number) || number <= 0) return Response.json({ error: 'Elige un pull request.' }, { status: 400 });

  try {
    const [allTasks, formalizations] = await Promise.all([loadTasks(tenant, g.meta), listFormalizations(tenant, id)]);
    const taken = formalizedSets(formalizations);
    if (taken.prs.has(prKey(repo.fullName, number))) {
      return Response.json({ error: `El PR #${number} ya fue formalizado. Actualiza la lista.` }, { status: 400 });
    }
    const tasks = allTasks.filter((t) => !taken.taskIds.has(t.id));
    // El PR se confirma contra GitHub: que exista en este repo y esté mergeado.
    const pr = await getMergedPull(githubToken, repo.fullName, number);

    if (body.action === 'propose') {
      // Solo las tareas que eligió la persona: Kai no las elige, solo redacta.
      const ids = new Set(Array.isArray(body.taskIds) ? body.taskIds : []);
      const chosenTasks = tasks.filter((t) => ids.has(t.id));
      if (!chosenTasks.length) return Response.json({ error: 'Elige al menos una tarea.' }, { status: 400 });
      const proposal = await proposePullFormalization({ tenant, token: githubToken, repo: repo.fullName, pr, tasks: chosenTasks });
      return Response.json({ proposal });
    }

    if (body.action !== 'formalize') return Response.json({ error: 'Acción desconocida.' }, { status: 400 });

    const summary = String(body.summary ?? '').trim();
    const description = String(body.description ?? '').trim();
    if (!summary) return Response.json({ error: 'El resumen es obligatorio.' }, { status: 400 });
    if (!description) return Response.json({ error: 'La descripción es obligatoria.' }, { status: 400 });
    const taskById = new Map(tasks.map((t) => [t.id, t]));
    const chosen = [...new Set(Array.isArray(body.taskIds) ? body.taskIds : [])].map((tid) => taskById.get(tid)).filter(Boolean);
    if (!chosen.length) return Response.json({ error: 'Elige al menos una tarea (que no esté ya asociada a otro PR).' }, { status: 400 });

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
    ].join('\n');

    const r = await commentOnPull(githubToken, repo.fullName, pr.number, comment);
    const github = r.ok ? { commented: 1, urls: [r.url], error: null, target: 'pr' } : { commented: 0, urls: [], error: r.error, target: 'pr' };

    const record = await addFormalization(tenant, id, {
      repo: repo.fullName,
      pr: {
        number: pr.number, title: pr.title, url: pr.url, author: pr.author, mergedAt: pr.mergedAt, mergedBy: pr.mergedBy,
        base: pr.base, head: pr.head, mergeCommitSha: pr.mergeCommitSha,
        additions: pr.additions, deletions: pr.deletions, changedFiles: pr.changedFiles,
      },
      commits: pr.commits,
      tasks: chosen.map((t) => ({ id: t.id, title: t.title, url: t.url })),
      summary,
      description,
      by,
      github,
    });
    await logProjectAction(tenant, g.identity, {
      project: g.meta,
      action: 'Formalizó PR',
      detail: `#${pr.number} ${pr.title} → ${chosen.map((t) => t.title).join(', ')}`,
    });
    return Response.json({ formalization: record });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
