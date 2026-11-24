import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import {
  listProjectsForPerson, resolveProjectAccessLevel, getProject, getTests, getExecutions, TASK_TRACKING_KINDS,
} from '@/lib/kaiNext/projects';
import { listTasks as listDevTasks } from '@/lib/kaiNext/devStore';

// A qué se puede vincular una prioridad de la semana (Perfil): proyectos, pruebas y tareas que la
// persona ve, con su estado actual. El Perfil también lo usa para mostrar el estado al día del
// ítem vinculado (la prioridad guarda solo tipo, id y nombre).
const TASK_LABEL = { backlog: 'Backlog', todo: 'Por hacer', doing: 'Haciendo', review: 'En revisión', done: 'Hecho' };
const DEV_LABEL = { Backlog: 'Backlog', 'Not started': 'Por hacer', 'In progress': 'Haciendo', 'In Review': 'En revisión', Done: 'Hecho', Cancelada: 'Cancelada', Cancelado: 'Cancelada' };
const PROJECT_LABEL = { activo: 'Activo', pausado: 'Pausado', completado: 'Completado', cancelado: 'Cancelado' };
const tone = (label) => (['Hecho', 'Completado'].includes(label) ? 'ok' : ['Pendiente', 'Por hacer', 'Backlog', 'Pausado'].includes(label) ? 'pend' : ['Cancelada', 'Cancelado'].includes(label) ? 'off' : 'doing');
const MAX_TASKS_PER_PROJECT = 300;

export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) return Response.json({ items: [] });

  const level = resolveProjectAccessLevel(identity);
  const metas = await listProjectsForPerson(tenant, { ...level, personId: identity.personId, empresaIds: identity.empresaIds });
  const items = [];
  await Promise.all(metas.map(async (m) => {
    const pLabel = PROJECT_LABEL[m.status ?? 'activo'] ?? 'Activo';
    items.push({ type: 'proyecto', id: m.id, projectId: m.id, label: m.name, status: pLabel, tone: tone(pLabel), projectName: null });
    try {
      if (m.projectKind === 'experimental') {
        const [tests, execs] = await Promise.all([getTests(tenant, m.id), getExecutions(tenant, m.id)]);
        for (const t of tests) {
          const ex = execs.filter((e) => e.testId === t.id);
          const st = !ex.length ? 'Pendiente' : ex.every((e) => e.validatedBy) ? 'Hecho' : 'Parcial';
          items.push({ type: 'prueba', id: t.id, projectId: m.id, label: t.name, status: st, tone: tone(st), projectName: m.name });
        }
      } else if (m.projectKind === 'desarrollo') {
        const tasks = (await listDevTasks(tenant, m.id)).filter((t) => !t.parentId).slice(0, MAX_TASKS_PER_PROJECT);
        for (const t of tasks) {
          const st = DEV_LABEL[t.status] ?? t.status ?? 'Por hacer';
          items.push({ type: 'tarea', id: t.id, projectId: m.id, label: t.title, status: st, tone: tone(st), projectName: m.name });
        }
      } else if (TASK_TRACKING_KINDS.includes(m.projectKind)) {
        const p = await getProject(tenant, m.id);
        for (const t of (p?.tasks ?? []).slice(0, MAX_TASKS_PER_PROJECT)) {
          const st = TASK_LABEL[t.status] ?? 'Por hacer';
          items.push({ type: 'tarea', id: t.id, projectId: m.id, label: t.nombre, status: st, tone: tone(st), projectName: m.name });
        }
      }
    } catch { /* un proyecto que falla no tumba la lista */ }
  }));
  return Response.json({ items });
}
