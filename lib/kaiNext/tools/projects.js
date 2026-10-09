// Tool de solo lectura para que el chat general de Kai Next pueda responder sobre el módulo
// Proyectos — hasta ahora esa sección no tenía ninguna tool (ver agentShared.js), así que el
// chat no podía ver nada de lo que vive ahí (ni los Notion-backed "desarrollo" ni los
// Redis-backed "seguimiento"/"civil"/"experimental"), aunque sea el mismo tenant/sesión.
// Respeta la misma visibilidad por persona que ya usa la página de Proyectos
// (listProjectsForPerson) — no por chequeo aparte, para no divergir del criterio real de acceso.
import { STATUS_COLUMNS } from '@/lib/aria/board';
import { listProjectsForPerson, getProject, resolveProjectAccessLevel } from '@/lib/kaiNext/projects';
import { getNotionToken, listTareasDelProyecto } from '@/lib/kaiNext/projectsNotion';
import { listTenantUsers } from '@/lib/kai/tenantUsers';

export const QUERY_PROJECTS_TOOL = {
  name: 'query_projects',
  description: 'Consulta los Proyectos de Kai Next (desarrollo, seguimiento, obra civil, experimental) visibles para la persona que está chateando. Sin project_name devuelve la lista de proyectos con su estado y avance, incluyendo cuántas tareas hay por columna (Backlog, Por hacer, En curso, etc). Con project_name trae el detalle de tareas de ese proyecto puntual (responsable, fechas, desde cuándo está creada, si está vencida, prioridad), incluidas las que están en Backlog. Úsala para preguntas de status de proyectos, análisis de backlog (qué hay acumulado, desde cuándo, de quién), tareas pendientes o vencidas, carga de trabajo por responsable, etc.',
  input_schema: {
    type: 'object',
    properties: {
      project_name: { type: 'string', description: 'Nombre (o parte del nombre) de un proyecto puntual para traer el detalle de sus tareas. Si se omite, devuelve la lista de todos los proyectos visibles con su resumen.' },
    },
  },
};

const today = () => new Date().toISOString().slice(0, 10);

function statusLabel(id) {
  return STATUS_COLUMNS.find((c) => c.id === id)?.name ?? id ?? 'Sin estado';
}

function summarizeByStatus(labels) {
  const counts = {};
  for (const l of labels) counts[l] = (counts[l] ?? 0) + 1;
  return counts;
}

async function loadDesarrolloTasks(tenant, meta) {
  const token = await getNotionToken(tenant);
  if (!token || !meta.notionProyectoId) return [];
  return listTareasDelProyecto(token, meta.notionProyectoId);
}

function devTaskRow(t) {
  const vencida = t.status !== 'Done' && !!t.dueDate && t.dueDate < today();
  return {
    tarea: t.title,
    estado: statusLabel(t.status),
    responsable: t.responsableName,
    creada: t.startDate,
    vence: t.dueDate,
    vencida,
    prioridad: t.priority,
    iniciativa: t.iniciativaName,
  };
}

function trackingTaskRow(t, peopleById) {
  const done = t.status === 'done';
  const vencida = !done && !!t.fechaFin && t.fechaFin < today();
  return {
    tarea: t.nombre,
    estado: t.status,
    responsables: (t.responsables ?? []).map((id) => peopleById.get(id) ?? id),
    vence: t.fechaFin ?? null,
    vencida,
    prioridad: t.prioridad ?? null,
  };
}

async function buildProjectSummary(tenant, meta, peopleById) {
  const base = { name: meta.name, kind: meta.projectKind, status: meta.status };
  if (meta.projectKind === 'desarrollo') {
    const tasks = await loadDesarrolloTasks(tenant, meta);
    const notDone = tasks.filter((t) => t.status !== 'Done');
    return {
      ...base,
      totalTareas: tasks.length,
      porEstado: summarizeByStatus(tasks.map((t) => statusLabel(t.status))),
      vencidas: notDone.filter((t) => t.dueDate && t.dueDate < today()).length,
    };
  }
  if (meta.projectKind === 'seguimiento' || meta.projectKind === 'civil') {
    const { tasks } = await getProject(tenant, meta.id);
    const notDone = (tasks ?? []).filter((t) => t.status !== 'done');
    return {
      ...base,
      totalTareas: tasks?.length ?? 0,
      porEstado: summarizeByStatus((tasks ?? []).map((t) => t.status)),
      vencidas: notDone.filter((t) => t.fechaFin && t.fechaFin < today()).length,
    };
  }
  // experimental: no tiene tareas en el mismo sentido (usa Pruebas/Ejecuciones), queda con el resumen base.
  return base;
}

export async function executeQueryProjectsTool(input, { tenant, identity }) {
  const level = resolveProjectAccessLevel(identity);
  const projects = await listProjectsForPerson(tenant, { ...level, personId: identity.personId });
  if (!projects.length) return { error: 'No hay proyectos visibles para esta persona en Kai Next.' };

  const projectName = input?.project_name?.trim().toLowerCase();
  if (!projectName) {
    const peopleById = new Map((await listTenantUsers(tenant)).map((p) => [p.id, p.name || p.email]));
    const projectsSummary = await Promise.all(projects.map((m) => buildProjectSummary(tenant, m, peopleById)));
    return { projects: projectsSummary };
  }

  const meta = projects.find((p) => p.name?.toLowerCase().includes(projectName));
  if (!meta) return { error: `No encontré ningún proyecto visible que coincida con "${input.project_name}".` };

  if (meta.projectKind === 'desarrollo') {
    const tasks = await loadDesarrolloTasks(tenant, meta);
    return { project: meta.name, kind: meta.projectKind, tasks: tasks.map(devTaskRow) };
  }
  if (meta.projectKind === 'seguimiento' || meta.projectKind === 'civil') {
    const peopleById = new Map((await listTenantUsers(tenant)).map((p) => [p.id, p.name || p.email]));
    const { tasks } = await getProject(tenant, meta.id);
    return { project: meta.name, kind: meta.projectKind, tasks: (tasks ?? []).map((t) => trackingTaskRow(t, peopleById)) };
  }
  return { project: meta.name, kind: meta.projectKind, error: 'Este tipo de proyecto no tiene tareas en el mismo formato (es experimental: usa Pruebas/Ejecuciones).' };
}
