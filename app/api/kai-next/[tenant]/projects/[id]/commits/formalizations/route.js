import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getProjectMeta, resolveProjectAccessLevel } from '@/lib/kaiNext/projects';
import { listFormalizations } from '@/lib/kaiNext/commitFormalizations';

// Commits formalizados para una tarea (y sus subtareas), para el panel de detalle. Lee solo lo
// guardado en Kai: no consulta GitHub, así que abrir una tarea no gasta llamadas a la API.
export async function GET(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) {
    return Response.json({ error: 'Proyectos no está habilitado para tu usuario.' }, { status: 403 });
  }
  const meta = await getProjectMeta(tenant, id);
  if (!meta || meta.projectKind !== 'desarrollo') return Response.json({ error: 'Proyecto no encontrado.' }, { status: 404 });
  const { isDirectorLevel } = resolveProjectAccessLevel(identity);
  if (!isDirectorLevel && !(identity.personId && meta.supervisorIds?.includes(identity.personId))) {
    return Response.json({ error: 'No tienes acceso a este proyecto.' }, { status: 403 });
  }

  const taskIds = new Set((new URL(req.url).searchParams.get('taskIds') ?? '').split(',').filter(Boolean).slice(0, 50));
  if (!taskIds.size) return Response.json({ formalizations: [] });

  const records = await listFormalizations(tenant, id);
  const formalizations = records
    .filter((r) => r.tasks?.some((t) => taskIds.has(t.id)))
    .map((r) => ({
      id: r.id,
      repo: r.repo,
      at: r.at,
      by: r.by?.name ?? null,
      summary: r.summary,
      description: r.description,
      taskIds: r.tasks.map((t) => t.id),
      commits: r.commits.map((c) => ({ sha: c.sha, shortSha: c.shortSha, message: c.message.split('\n')[0], author: c.author, date: c.date, url: c.url })),
    }));
  return Response.json({ formalizations });
}
