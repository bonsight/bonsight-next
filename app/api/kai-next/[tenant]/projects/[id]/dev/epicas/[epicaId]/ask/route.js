import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getProjectMeta } from '@/lib/kaiNext/projects';
import { getNotionToken, getDevEpica, listTareas } from '@/lib/kaiNext/projectsNotion';
import { askAboutEpica } from '@/lib/kaiNext/projectEpicaAsk';

// Q&A liviano del panel de detalle de Épica — un solo llamado a Claude sin tools, acotado al
// contexto de esta épica (ver lib/kaiNext/projectEpicaAsk.js). No persiste nada.
export async function POST(req, { params }) {
  const { tenant, id, epicaId } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) {
    return Response.json({ error: 'Proyectos no está habilitado para tu usuario.' }, { status: 403 });
  }

  const meta = await getProjectMeta(tenant, id);
  if (!meta || meta.projectKind !== 'desarrollo') return Response.json({ error: 'Proyecto no encontrado.' }, { status: 404 });

  const token = await getNotionToken(tenant);
  if (!token) return Response.json({ error: 'Notion no está conectado para este tenant.' }, { status: 400 });

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }
  const { question, history } = body;

  try {
    const [epica, historias] = await Promise.all([
      getDevEpica(token, epicaId),
      listTareas(token, epicaId),
    ]);
    if (!epica) return Response.json({ error: 'Épica no encontrada.' }, { status: 404 });

    const answer = await askAboutEpica(tenant, { epica, historias, question, history });
    return Response.json({ answer });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
