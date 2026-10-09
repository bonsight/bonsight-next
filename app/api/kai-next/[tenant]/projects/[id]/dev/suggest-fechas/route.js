import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getProjectMeta, resolveProjectAccessLevel } from '@/lib/kaiNext/projects';
import { suggestFechas } from '@/lib/kaiNext/projectSchedule';

// Solo propone fechas (IA) — no escribe nada en Notion. El frontend muestra la propuesta en un
// modal editable y, al confirmar, aplica cada fecha con el PATCH que ya existe en
// /dev/epicas/[epicaId] (mismo criterio que Carga Masiva: revisar antes de escribir).
export async function POST(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) {
    return Response.json({ error: 'Proyectos no está habilitado para tu usuario.' }, { status: 403 });
  }
  const { isSupervisorLevel } = resolveProjectAccessLevel(identity);
  if (!isSupervisorLevel) {
    return Response.json({ error: 'No tenés permiso para sugerir fechas en este proyecto.' }, { status: 403 });
  }

  const meta = await getProjectMeta(tenant, id);
  if (!meta || meta.projectKind !== 'desarrollo') return Response.json({ error: 'Proyecto no encontrado.' }, { status: 404 });

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }
  const { epicasSinFecha, epicasConFecha } = body;
  if (!Array.isArray(epicasSinFecha) || !epicasSinFecha.length) {
    return Response.json({ error: 'No hay épicas sin fecha.' }, { status: 400 });
  }

  try {
    const suggestions = await suggestFechas(tenant, { epicasSinFecha, epicasConFecha });
    return Response.json({ suggestions });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
