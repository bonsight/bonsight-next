import {
  listProjectsForPerson, resolveProjectAccessLevel, supervisesProject, getProject, summarizeProjectForList, TASK_TRACKING_KINDS,
} from '@/lib/kaiNext/projects';
import { listEmpresas, empresaAllows } from '@/lib/kaiNext/empresas';
import { listEmpresaTasks } from '@/lib/kaiNext/empresaTasks';
import { listTasks as listDevProjectTasks } from '@/lib/kaiNext/devStore';

// Lo que ven las pantallas Empresas y Resumen de empresa de una persona, en una sola pasada:
// sus proyectos con novedades sin ver, lo vencido y lo que espera su respuesta. Todo sale de los
// mismos datos que el detalle de cada proyecto (no hay nada guardado aparte que se desincronice).
const today = () => new Date().toISOString().slice(0, 10);
const isOverdue = (t) => t.status !== 'done' && t.status !== 'review' && t.fechaFin && String(t.fechaFin).slice(0, 10) < today();
const respOf = (t) => (Array.isArray(t.responsables) ? t.responsables : []);

// Feedback dirigido a la persona sin responder: de primer nivel, sobre algo suyo, de otra persona,
// y sin una respuesta suya en el hilo.
function unansweredFeedback(project, personId) {
  if (!personId) return [];
  const mine = new Set([
    ...project.tasks.filter((t) => respOf(t).includes(personId)).map((t) => `tarea:${t.id}`),
    ...project.executions.filter((e) => e.contributorId === personId).map((e) => `aporte:${e.id}`),
    ...project.tests.filter((t) => t.registradorIds?.includes(personId)).map((t) => `prueba:${t.id}`),
  ]);
  return project.feedback.filter((f) => !f.replyTo && f.whoId !== personId && mine.has(`${f.targetType}:${f.targetId}`)
    && !project.feedback.some((r) => r.replyTo === f.id && r.whoId === personId));
}

export async function buildOverview(tenant, identity, { empresaId = null } = {}) {
  const level = resolveProjectAccessLevel(identity);
  const personId = identity.personId;
  const viewerKey = personId ?? identity.chatOwnerId;
  const [metas, allEmpresas] = await Promise.all([
    listProjectsForPerson(tenant, { ...level, personId, empresaIds: identity.empresaIds }),
    listEmpresas(tenant),
  ]);
  const empresas = allEmpresas.filter((e) => empresaAllows(identity.empresaIds, { empresaId: e.id }));
  const scoped = metas.filter((m) => (!empresaId || m.empresaId === empresaId));

  const projects = [];
  const pending = [];
  const overdue = [];
  await Promise.all(scoped.map(async (meta) => {
    const [p, summary] = await Promise.all([getProject(tenant, meta.id), summarizeProjectForList(tenant, meta)]);
    if (!p) return;
    const supervises = supervisesProject(identity, meta);
    if (meta.projectKind === 'desarrollo') {
      // Desarrollo guarda su trabajo aparte (sprints/épicas/tareas en devStore): avance por tareas
      // de primer nivel fuera del Backlog; vencida = fecha de fin pasada y sin terminar ni en revisión.
      const devTasks = (await listDevProjectTasks(tenant, meta.id).catch(() => [])).filter((t) => !t.parentId && t.status !== 'Backlog');
      const odDev = devTasks.filter((t) => t.status !== 'Done' && t.status !== 'In Review' && t.endDate && String(t.endDate).slice(0, 10) < today());
      const unseenDev = viewerKey ? (p.events ?? []).filter((e) => !e.seenBy?.includes(viewerKey)) : [];
      projects.push({
        id: meta.id, name: meta.name, empresaId: meta.empresaId ?? null, projectKind: meta.projectKind, status: meta.status,
        code: meta.code ?? '', summary,
        progress: { done: devTasks.filter((t) => t.status === 'Done').length, total: devTasks.length },
        next: (devTasks.find((t) => t.status === 'In progress') ?? devTasks.find((t) => t.status === 'Not started'))?.title ?? null,
        overdueCount: odDev.length,
        unseenCount: unseenDev.length,
        news: unseenDev.slice(0, 3).map((e) => ({ id: e.id, type: e.type, title: e.title, date: e.date })),
        updatedAt: meta.updatedAt,
      });
      for (const t of odDev) {
        overdue.push({ kind: 'dev', id: t.id, name: t.title, fechaFin: t.endDate, responsables: t.responsableId ? [t.responsableId] : [], projectId: meta.id, projectName: meta.name, empresaId: meta.empresaId ?? null });
      }
      return;
    }
    const unseen = viewerKey ? p.events.filter((e) => !e.seenBy?.includes(viewerKey)) : [];
    const items = TASK_TRACKING_KINDS.includes(meta.projectKind) ? p.tasks : p.tests;
    const done = TASK_TRACKING_KINDS.includes(meta.projectKind)
      ? p.tasks.filter((t) => t.status === 'done').length
      : p.tests.filter((t) => { const ex = p.executions.filter((e) => e.testId === t.id); return ex.length && ex.every((e) => e.validatedBy); }).length;
    const next = TASK_TRACKING_KINDS.includes(meta.projectKind) ? p.tasks.find((t) => t.status !== 'done') : null;
    const od = p.tasks.filter(isOverdue);
    projects.push({
      id: meta.id, name: meta.name, empresaId: meta.empresaId ?? null, projectKind: meta.projectKind, status: meta.status,
      code: meta.code ?? '', summary,
      progress: { done, total: items.length },
      next: next?.nombre ?? null,
      overdueCount: od.length,
      unseenCount: unseen.length,
      news: unseen.slice(0, 3).map((e) => ({ id: e.id, type: e.type, title: e.title, date: e.date })),
      updatedAt: meta.updatedAt,
    });
    for (const t of od) {
      overdue.push({ kind: 'tarea', id: t.id, name: t.nombre, fechaFin: t.fechaFin, responsables: respOf(t), projectId: meta.id, projectName: meta.name, empresaId: meta.empresaId ?? null });
    }

    // Lo que espera a esta persona en este proyecto.
    const base = { projectId: meta.id, projectName: meta.name, empresaId: meta.empresaId ?? null };
    if (supervises) {
      for (const t of p.tasks.filter((x) => x.status === 'review' && !respOf(x).includes(personId))) {
        pending.push({ ...base, kind: 'revision', tab: 'trabajo', title: `«${t.nombre}» espera tu validación`, date: t.updatedAt });
      }
      for (const e of p.executions.filter((x) => !x.validatedBy)) {
        const test = p.tests.find((t) => t.id === e.testId);
        pending.push({ ...base, kind: 'ejecucion', tab: 'pruebas', title: `Aporte de ${e.contributor} sin validar${test ? ` — ${test.name}` : ''}`, date: e.createdAt });
      }
      if (level.isDirectorLevel) {
        for (const r of p.reports.filter((x) => x.status === 'enviado')) {
          pending.push({ ...base, kind: 'reporte', tab: 'reportes', title: 'Reporte sin aprobar', date: r.submittedAt ?? r.createdAt });
        }
      }
    }
    for (const f of unansweredFeedback(p, personId)) {
      pending.push({ ...base, kind: 'feedback', tab: 'feedback', title: `${f.who} te dejó feedback sobre «${f.targetLabel}»`, date: f.createdAt });
    }
  }));

  // Tareas sueltas de las empresas en alcance.
  const looseEmpresas = empresas.filter((e) => !empresaId || e.id === empresaId);
  const loose = {};
  await Promise.all(looseEmpresas.map(async (e) => {
    const tasks = await listEmpresaTasks(tenant, e.id);
    loose[e.id] = tasks;
    for (const t of tasks.filter(isOverdue)) {
      overdue.push({ kind: 'suelta', id: t.id, name: t.nombre, fechaFin: t.fechaFin, responsables: respOf(t), projectId: null, projectName: null, empresaId: e.id });
    }
    // Validar tareas sueltas: Director con la empresa o Supervisor, sin ser responsable.
    if (level.isSupervisorLevel) {
      for (const t of tasks.filter((x) => x.status === 'review' && !respOf(x).includes(personId))) {
        pending.push({ kind: 'revision-suelta', empresaId: e.id, projectId: null, projectName: null, taskId: t.id, title: `«${t.nombre}» espera tu validación`, date: t.updatedAt });
      }
    }
  }));

  projects.sort((a, b) => b.unseenCount - a.unseenCount || String(b.updatedAt).localeCompare(String(a.updatedAt)));
  pending.sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
  overdue.sort((a, b) => String(a.fechaFin).localeCompare(String(b.fechaFin)));
  return { empresas, projects, pending, overdue, loose, level };
}
