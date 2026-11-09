import { listProjectsForPerson, resolveProjectAccessLevel } from '@/lib/kaiNext/projects';
import { listProjectActions } from '@/lib/kaiNext/audit';

export const QUERY_PROJECT_HISTORY_TOOL = {
  name: 'query_project_history',
  description: 'Consulta quién hizo cada acción importante en los proyectos visibles para esta persona: crear o cerrar sprints, cerrar planificación, cambiar el equipo o borrar tareas. Úsala cuando pregunten quién hizo un cambio o cuándo. El historial existe solo desde que se activó este registro; si algo no aparece, dilo así y no atribuyas la acción a nadie.',
  input_schema: {
    type: 'object',
    properties: {
      project_name: { type: 'string', description: 'Nombre o parte del nombre de un proyecto. Si se omite, trae todos los visibles.' },
    },
  },
};

export async function executeProjectHistoryTool(input, { tenant, identity }) {
  const level = resolveProjectAccessLevel(identity);
  const projects = await listProjectsForPerson(tenant, { ...level, personId: identity.personId });
  const name = input?.project_name?.trim().toLowerCase();
  const scoped = name ? projects.filter((p) => p.name?.toLowerCase().includes(name)) : projects;
  if (!scoped.length) return { error: 'No hay proyectos visibles para esta persona con ese nombre.' };

  const events = await listProjectActions(tenant, scoped.map((p) => p.id));
  return {
    acciones: events.map((e) => ({ cuando: e.at, quien: e.actorName, proyecto: e.projectName, accion: e.action, detalle: e.detail })),
  };
}
