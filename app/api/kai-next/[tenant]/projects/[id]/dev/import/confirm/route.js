import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getProjectMeta, resolveProjectAccessLevel } from '@/lib/kaiNext/projects';
import { getNotionToken, createDevEpica, updateDevEpica, updateDevIniciativaObjetivo } from '@/lib/kaiNext/projectsNotion';
import { createTask } from '@/lib/aria/board';

// Escribe en Notion lo que el usuario confirmó en la vista previa (ya editada/filtrada a mano si
// hizo falta): completa el Objetivo de la Iniciativa (solo si estaba vacío), y por cada épica —
// si trae "matchedEpicaId" (ya existía en esta iniciativa, detectado en el preview por nombre) no
// crea una nueva, solo le suma las historias y actualiza su Fase si vino una (el preview ya la
// precarga con la fase actual de la épica o, si no tenía, con la que Kai infirió del contenido —
// si el usuario no la tocó, el PATCH es un no-op); si no, crea la épica con la Fase elegida (sin
// fechas — las define el equipo cuando arranca). Cada historia se crea como Tarea real en Backlog
// (sin sprint, sin fechas/horas — createTask ya lo permite para ese status); el preview ya
// descarta las historias que detectó como duplicadas de una tarea existente en esa épica. Quedan
// visibles en la Épica y, cuando alguien las jale a un sprint con "agregar tarea existente",
// también en el tablero de Sprints.
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
    return Response.json({ error: 'No tenés permiso para importar documentos en este proyecto.' }, { status: 403 });
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
  const { iniciativaId, objetivo, epicas } = body;
  if (!iniciativaId) return Response.json({ error: 'Falta la iniciativa.' }, { status: 400 });
  if (!Array.isArray(epicas) || !epicas.length) return Response.json({ error: 'No hay épicas para importar.' }, { status: 400 });

  try {
    if (objetivo?.trim()) await updateDevIniciativaObjetivo(token, iniciativaId, objetivo);

    let epicasCreadas = 0;
    let historiasCreadas = 0;
    for (const e of epicas) {
      if (!e?.name?.trim()) continue;
      let epicaId = e.matchedEpicaId || null;
      if (!epicaId) {
        const epica = await createDevEpica(token, { name: e.name, iniciativaId, notas: e.notas || '', fase: e.fase || undefined });
        epicaId = epica.id;
        epicasCreadas += 1;
      } else if (e.fase) {
        await updateDevEpica(token, epicaId, { fase: e.fase });
      }
      // Fase "Desarrollo" de la épica == uno de los TASK_TYPES ("Desarrollo") — se hereda como
      // Tipo de Tarea de una, así no nace vacío algo que ya sabemos que es trabajo de desarrollo.
      // El resto de fases no tiene un Tipo de Tarea equivalente, así que ahí queda sin definir.
      const taskType = e.fase === 'Desarrollo' ? 'Desarrollo' : undefined;
      for (const historia of e.historias || []) {
        if (!historia?.trim()) continue;
        await createTask(token, null, {
          title: historia, status: 'Backlog', iniciativaId, epicaId, proyectoId: meta.notionProyectoId, taskType,
        });
        historiasCreadas += 1;
      }
    }

    return Response.json({ epicasCreadas, historiasCreadas });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
