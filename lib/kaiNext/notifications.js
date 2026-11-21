import { listTenantUsers } from '@/lib/kai/tenantUsers';
import { getTenantMeta } from '@/lib/kai/tenants';
import { sendEmail } from '@/lib/labs/gmail';
import { labsEventEmailHtml, escapeHtml } from '@/lib/labs/emailTemplates';
import { isCapabilityAllowed } from '@/lib/kaiNext/capabilities';
import { listEmpresas, empresaScopeFor, empresaAllows } from '@/lib/kaiNext/empresas';

// Correos de hitos de Kai Next — el mismo criterio que Labs (lib/labs/notifications.js), con
// los roles de Kai Next: Director = capacidad proyectos_director, Supervisor = proyectos_supervisor
// y estar en el equipo del proyecto (meta.supervisorIds), Team member = responsable de la tarea o
// prueba puntual. Antes que el rol manda la empresa: nadie recibe un correo de un proyecto de una
// empresa que no tiene asignada.
//
// Solo tenant users activos con acceso a Kai Next y email. El equipo interno de Bonsight (sin
// tenant user) no recibe correos de hitos.
//
// Todo es best-effort: nunca tira ni bloquea lo que originó el hito.
//
// En localhost Redis es el de producción: sin este corte, probar en dev le mandaría correos
// reales a los clientes. Fuera de producción solo se loguea, salvo KAI_NEXT_EMAILS_IN_DEV=1.
const SEND_FOR_REAL = process.env.NODE_ENV === 'production' || process.env.KAI_NEXT_EMAILS_IN_DEV === '1';

const appBase = () => (process.env.NODE_ENV === 'production' ? 'https://kai.bonsight.co' : 'http://localhost:3000/kai-next');
export const projectUrl = (tenant, projectId, tab) => `${appBase()}/${tenant}/proyectos?p=${projectId}${tab ? `&tab=${tab}` : ''}`;
export const empresaUrl = (tenant, empresaId) => `${appBase()}/${tenant}/empresas/${empresaId}`;

const personAccess = (u) => ({ sections: u.access?.kaiNextSections ?? [], capabilities: u.access?.kaiNextCapabilities ?? [] });
const fullName = (u) => [u.firstName, u.lastName].filter(Boolean).join(' ') || u.name || u.email;

// Personas que pueden recibir correos en este tenant, con su nivel y empresas ya resueltos.
export async function loadRecipients(tenant) {
  const [users, empresas] = await Promise.all([listTenantUsers(tenant), listEmpresas(tenant)]);
  return users
    .filter((u) => u.active !== false && u.access?.kaiNext && u.email)
    .map((u) => {
      const access = personAccess(u);
      const isDirector = isCapabilityAllowed(access, 'proyectos_director');
      return {
        id: u.id, name: fullName(u), firstName: u.firstName || fullName(u), email: u.email,
        isDirector,
        isSupervisor: isDirector || isCapabilityAllowed(access, 'proyectos_supervisor'),
        empresaIds: empresaScopeFor(empresas, u),
      };
    });
}

// Directores (con la empresa) + Supervisores del proyecto + las personas puntuales indicadas.
export function broadcast(people, meta, memberIds = [], { withMembers = true } = {}) {
  const inEmpresa = people.filter((p) => empresaAllows(p.empresaIds, meta));
  return inEmpresa.filter((p) => p.isDirector
    || (p.isSupervisor && meta.supervisorIds?.includes(p.id))
    || (withMembers && memberIds.includes(p.id)));
}

function dedupe(list, { actorId, actorName } = {}) {
  const seen = new Set();
  const actor = String(actorName || '').trim().toLowerCase();
  return list.filter((p) => {
    const email = p.email.toLowerCase();
    if (seen.has(email)) return false;
    seen.add(email);
    if (actorId && p.id === actorId) return false;
    if (actor && p.name.trim().toLowerCase() === actor) return false;
    return true;
  });
}

// Envía un mismo hito a varias personas. bodyHtml: bloque extra ya escapado (listas de tareas).
export async function sendMilestone(tenant, recipients, { subject, title, body, bodyHtml, projectName, actionUrl, actionLabel = 'Ver en Kai →', actorId, actorName }) {
  const to = dedupe(recipients, { actorId, actorName });
  if (!to.length) return 0;
  if (!SEND_FOR_REAL) {
    console.log(`[kai-notify] (dev, no enviado) "${subject}" → ${to.map((p) => p.email).join(', ')}`);
    return 0;
  }
  const tenantMeta = await getTenantMeta(tenant).catch(() => null);
  await Promise.all(to.map((p) => sendEmail({
    to: p.email,
    subject,
    fromName: 'Kai',
    html: labsEventEmailHtml({
      name: p.firstName,
      tenantName: tenantMeta?.name || tenant,
      projectName: projectName || '',
      eventTitle: title || subject,
      eventBody: body,
      bodyHtml,
      actionUrl,
      actionLabel,
    }),
  }).catch((err) => console.error(`[kai-notify] ${tenant} → ${p.email}:`, err.message))));
  return to.length;
}

// ── Hitos de proyecto (un único punto de llamada: addEvent en lib/kaiNext/projects.js) ──────
const EVENT_TAB = { tarea: 'trabajo', aporte: 'pruebas', validacion: 'pruebas', feedback: 'feedback', reporte: 'reportes', documento: 'doc', gasto: 'partidas' };

function feedbackRecipients(entry, project, devTasks, people) {
  if (entry.replyTo) {
    // Respuesta: solo a quienes ya están en ese hilo (autor de la raíz + quienes respondieron).
    const thread = project.feedback.filter((f) => f.id === entry.replyTo || f.replyTo === entry.replyTo);
    const ids = new Set(thread.map((f) => f.whoId).filter(Boolean));
    const names = new Set(thread.map((f) => String(f.who || '').trim().toLowerCase()));
    return people.filter((p) => empresaAllows(p.empresaIds, project.meta) && (ids.has(p.id) || names.has(p.name.trim().toLowerCase())));
  }
  let memberIds = [];
  if (entry.visibility !== 'Privado a Supervisor') {
    if (entry.targetType === 'tarea') {
      const t = project.tasks.find((x) => x.id === entry.targetId);
      memberIds = Array.isArray(t?.responsables) ? t.responsables : [];
    } else if (entry.targetType === 'prueba') {
      memberIds = project.tests.find((x) => x.id === entry.targetId)?.registradorIds ?? [];
    } else if (entry.targetType === 'aporte') {
      const ex = project.executions.find((x) => x.id === entry.targetId);
      memberIds = [...(project.tests.find((x) => x.id === ex?.testId)?.registradorIds ?? []), ex?.contributorId].filter(Boolean);
    } else if (entry.targetType === 'dev_tarea') {
      const t = devTasks.find((x) => x.id === entry.targetId);
      memberIds = [t?.responsableId, ...(t?.colaboradorIds ?? [])].filter(Boolean);
    }
  }
  return broadcast(people, project.meta, memberIds);
}

export async function notifyProjectEvent(tenant, projectId, event) {
  try {
    // Import diferido: projects.js importa este módulo de la misma forma (evita el ciclo).
    const { getProject } = await import('@/lib/kaiNext/projects');
    const project = await getProject(tenant, projectId);
    if (!project) return;
    const { meta } = project;
    const people = await loadRecipients(tenant);
    if (!people.length) return;

    let recipients;
    if (event.type === 'feedback') {
      const entry = project.feedback.find((f) => f.id === event.feedbackId);
      if (!entry) return;
      let devTasks = [];
      if (entry.targetType === 'dev_tarea') {
        const { listTasks } = await import('@/lib/kaiNext/devStore');
        devTasks = await listTasks(tenant, projectId).catch(() => []);
      }
      recipients = feedbackRecipients(entry, project, devTasks, people);
    } else if (event.type === 'reporte') {
      // Borrador: nadie. Enviado: Dirección. Aprobado: los Supervisores del proyecto.
      if (event.status === 'enviado') recipients = people.filter((p) => p.isDirector && empresaAllows(p.empresaIds, meta));
      else if (event.status === 'aprobado') recipients = people.filter((p) => p.isSupervisor && meta.supervisorIds?.includes(p.id) && empresaAllows(p.empresaIds, meta));
      else return;
    } else if (event.type === 'tarea') {
      const t = project.tasks.find((x) => x.id === event.taskId);
      recipients = broadcast(people, meta, Array.isArray(t?.responsables) ? t.responsables : []);
    } else if (event.type === 'aporte' || event.type === 'validacion') {
      const test = project.tests.find((x) => x.id === event.testId);
      const ex = project.executions.find((x) => x.id === event.executionId);
      recipients = broadcast(people, meta, [...(test?.registradorIds ?? []), ex?.contributorId].filter(Boolean));
    } else {
      // documento, gasto, detalle: Directores y Supervisores del proyecto.
      recipients = broadcast(people, meta, [], { withMembers: false });
    }

    await sendMilestone(tenant, recipients, {
      subject: event.title,
      title: event.title,
      body: event.body,
      projectName: meta.name,
      actionUrl: projectUrl(tenant, projectId, EVENT_TAB[event.type] ?? 'historia'),
      actionLabel: event.type === 'feedback' ? 'Ver y responder →' : 'Ver en Kai →',
      actorName: event.actor,
    });
  } catch (err) {
    console.error(`[kai-notify] ${tenant}/${projectId}:`, err.message);
  }
}

// ── Tareas sueltas de empresa ───────────────────────────────────────────────────────────────
// Asignada → los responsables nuevos. Enviada a revisión → quienes pueden validarla (Directores
// y Supervisores con la empresa, que no sean responsables). Validada → sus responsables.
export async function notifyEmpresaTask(tenant, empresa, task, kind, { actorId, actorName, newResponsables = [] } = {}) {
  try {
    const people = (await loadRecipients(tenant)).filter((p) => empresaAllows(p.empresaIds, { empresaId: empresa.id }));
    const responsables = task.responsables ?? [];
    let recipients;
    let title;
    if (kind === 'asignada') {
      recipients = people.filter((p) => newResponsables.includes(p.id));
      title = `${actorName || 'Alguien'} te asignó «${task.nombre}»`;
    } else if (kind === 'revision') {
      recipients = people.filter((p) => p.isSupervisor && !responsables.includes(p.id));
      title = `«${task.nombre}» espera tu validación`;
    } else if (kind === 'validada') {
      recipients = people.filter((p) => responsables.includes(p.id));
      title = `${actorName || 'Alguien'} validó «${task.nombre}»`;
    } else return;
    await sendMilestone(tenant, recipients, {
      subject: title,
      title,
      body: [task.fechaFin ? `Vence: ${task.fechaFin}` : '', task.descripcion].filter(Boolean).join('\n'),
      projectName: `${empresa.name} · Tarea suelta`,
      actionUrl: empresaUrl(tenant, empresa.id),
      actorId,
      actorName,
    });
  } catch (err) {
    console.error(`[kai-notify] ${tenant}/empresa ${empresa?.id}:`, err.message);
  }
}

// ── Desarrollo: tareas y sprints (lib/kaiNext/devStore.js no pasa por addEvent) ─────────────
// Asignada → responsable/colaboradores nuevos. En revisión → Supervisores del proyecto (o
// Directores si el proyecto no tiene). Hecha → responsable, si la cerró otra persona.
export async function notifyDevTask(tenant, meta, task, kind, { actorId, actorName, newIds = [] } = {}) {
  try {
    const people = (await loadRecipients(tenant)).filter((p) => empresaAllows(p.empresaIds, meta));
    let recipients;
    let title;
    if (kind === 'asignada') {
      recipients = people.filter((p) => newIds.includes(p.id));
      title = `${actorName || 'Alguien'} te asignó «${task.title}»`;
    } else if (kind === 'revision') {
      const sup = people.filter((p) => p.isSupervisor && meta.supervisorIds?.includes(p.id));
      recipients = sup.length ? sup : people.filter((p) => p.isDirector);
      title = `«${task.title}» pasó a revisión`;
    } else if (kind === 'hecha') {
      recipients = people.filter((p) => p.id === task.responsableId);
      title = `${actorName || 'Alguien'} cerró «${task.title}»`;
    } else return;
    await sendMilestone(tenant, recipients, {
      subject: `${title} — ${meta.name}`,
      title,
      body: [task.endDate ? `Fin: ${task.endDate}` : '', task.description].filter(Boolean).join('\n').slice(0, 800),
      projectName: meta.name,
      actionUrl: projectUrl(tenant, meta.id),
      actorId,
      actorName,
    });
  } catch (err) {
    console.error(`[kai-notify] ${tenant}/${meta?.id} dev:`, err.message);
  }
}

const taskListHtml = (tasks) => `<ul style="margin:10px 0 0;padding-left:18px;font-size:13px;line-height:1.6;color:#5c5344;">${
  tasks.map((t) => `<li>${escapeHtml(t.title)}${t.endDate ? ` <span style="color:#8a7c68;">· fin ${escapeHtml(t.endDate)}</span>` : ''}</li>`).join('')
}</ul>`;

// Sprint iniciado (se cerró la planificación): a cada persona con tareas, sus tareas.
// Sprint cerrado: al equipo (Supervisores + quienes tuvieron tareas) el resultado.
export async function notifySprint(tenant, meta, sprint, tasks, kind, { actorId, actorName, metrics } = {}) {
  try {
    const people = (await loadRecipients(tenant)).filter((p) => empresaAllows(p.empresaIds, meta));
    const top = tasks.filter((t) => !t.parentId);
    const ownerIds = (t) => [t.responsableId, ...(t.colaboradorIds ?? [])].filter(Boolean);
    if (kind === 'iniciado') {
      const range = `${sprint.startDate} – ${sprint.endDate}`;
      await Promise.all(people.map((p) => {
        const mine = top.filter((t) => ownerIds(t).includes(p.id));
        if (!mine.length) return null;
        const title = `Empezó ${sprint.title}: tienes ${mine.length === 1 ? '1 tarea' : `${mine.length} tareas`}`;
        return sendMilestone(tenant, [p], {
          subject: `${title} — ${meta.name}`,
          title,
          body: [range, sprint.objetivo ? `Objetivo: ${sprint.objetivo}` : ''].filter(Boolean).join('\n'),
          bodyHtml: taskListHtml(mine),
          projectName: meta.name,
          actionUrl: projectUrl(tenant, meta.id),
          actorId,
          actorName,
        });
      }));
    } else if (kind === 'cerrado') {
      const involved = new Set(top.flatMap(ownerIds));
      const recipients = people.filter((p) => (p.isSupervisor && meta.supervisorIds?.includes(p.id)) || involved.has(p.id));
      const done = top.filter((t) => t.status === 'Done').length;
      const pending = top.filter((t) => t.status !== 'Done');
      const lines = [
        `${done} de ${top.length} tareas terminadas.`,
        metrics?.committed ? `Comprometidas: ${metrics.committed.completadas}/${metrics.committed.total} · Fuera de plan: ${metrics.scopeCreep?.completadas ?? 0}/${metrics.scopeCreep?.total ?? 0}` : '',
        metrics?.loggedHours != null ? `Horas: ${metrics.loggedHours} registradas de ${metrics.committedHours ?? '—'} comprometidas` : '',
        pending.length ? 'Quedaron pendientes:' : '',
      ].filter(Boolean);
      await sendMilestone(tenant, recipients, {
        subject: `Se cerró ${sprint.title} — ${meta.name}`,
        title: `${actorName || 'Alguien'} cerró ${sprint.title}`,
        body: lines.join('\n'),
        bodyHtml: pending.length ? taskListHtml(pending.slice(0, 15)) : '',
        projectName: meta.name,
        actionUrl: projectUrl(tenant, meta.id),
        actorId,
        actorName,
      });
    }
  } catch (err) {
    console.error(`[kai-notify] ${tenant}/${meta?.id} sprint:`, err.message);
  }
}
