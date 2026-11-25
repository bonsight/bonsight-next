import { Redis } from '@upstash/redis';
import { listTenantSlugs, getTenantMeta } from '@/lib/kai/tenants';
import { listProjects, getProject, TASK_TRACKING_KINDS } from '@/lib/kaiNext/projects';
import { listTasks as listDevTasks } from '@/lib/kaiNext/devStore';
import { listEmpresas, empresaAllows } from '@/lib/kaiNext/empresas';
import { listEmpresaTasks } from '@/lib/kaiNext/empresaTasks';
import { loadRecipients, sendMilestone, projectUrl, empresaUrl, tenantUrl, SEND_FOR_REAL } from '@/lib/kaiNext/notifications';
import { escapeHtml } from '@/lib/labs/emailTemplates';

// Resumen diario de vencidas: a cada responsable, UN correo con sus tareas vencidas y las que
// vencen hoy (Proyectos de Seguimiento/Civil, tareas sueltas de empresa y tareas de Desarrollo).
// Lo dispara el cron de Vercel una vez al día (app/api/cron/kai-overdue-digest/route.js).
//
// Solo en tenants con meta.overdueDigest === true: en un tenant que todavía trabaja en otro
// sistema (Sesuveca mientras convive con Labs) avisaría sobre una copia desactualizada.
// Las tareas sin responsable no le llegan a nadie en lo personal; sí aparecen en el resumen del
// equipo que recibe el admin completo del tenant (el Founder en Bonsight).
const kv = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
const sentKey = (tenant, day) => `kainext:${tenant}:overdue-digest:${day}`;

const dayIn = (tz) => {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'America/Lima' }).format(new Date()); } catch { return new Date().toISOString().slice(0, 10); }
};
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fd = (d) => `${Number(d.slice(8, 10))} ${MES[Number(d.slice(5, 7)) - 1]}`;

// Todas las tareas abiertas con fecha de fin, con a quién pertenecen y dónde verlas.
export async function openTasksWithDeadline(tenant) {
  const out = [];
  const projects = (await listProjects(tenant)).filter((m) => !m.status || m.status === 'activo');
  await Promise.all(projects.map(async (meta) => {
    if (meta.projectKind === 'desarrollo') {
      const tasks = await listDevTasks(tenant, meta.id).catch(() => []);
      for (const t of tasks) {
        if (t.parentId || ['Done', 'In Review', 'Backlog'].includes(t.status) || !t.endDate) continue;
        out.push({ name: t.title, due: String(t.endDate).slice(0, 10), owners: t.responsableId ? [t.responsableId] : [], where: meta.name, url: projectUrl(tenant, meta.id), meta });
      }
    } else if (TASK_TRACKING_KINDS.includes(meta.projectKind)) {
      const p = await getProject(tenant, meta.id);
      for (const t of p?.tasks ?? []) {
        if (['done', 'review'].includes(t.status) || !t.fechaFin) continue;
        out.push({ name: t.nombre, due: String(t.fechaFin).slice(0, 10), owners: t.responsables ?? [], where: meta.name, url: projectUrl(tenant, meta.id, 'trabajo'), meta });
      }
    }
  }));
  for (const e of await listEmpresas(tenant)) {
    for (const t of await listEmpresaTasks(tenant, e.id)) {
      if (['done', 'review'].includes(t.status) || !t.fechaFin) continue;
      out.push({ name: t.nombre, due: String(t.fechaFin).slice(0, 10), owners: t.responsables ?? [], where: `${e.name} · tarea suelta`, url: empresaUrl(tenant, e.id), meta: { empresaId: e.id } });
    }
  }
  return out;
}

const listHtml = (items) => `<ul style="margin:8px 0 0;padding-left:18px;font-size:13px;line-height:1.6;color:#5c5344;">${
  items.map((t) => `<li><a href="${t.url}" style="color:#2b2318;">${escapeHtml(t.name)}</a> <span style="color:#8a7c68;">· ${escapeHtml(t.where)}${t.overdue ? ` · venció ${fd(t.due)}` : ''}</span></li>`).join('')
}</ul>`;

const section = (label, items) => (items.length
  ? `<p style="font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#8a7c68;margin:14px 0 0;">${label}</p>${listHtml(items)}`
  : '');

// Devuelve cuántas personas recibieron (o habrían recibido, fuera de producción) su resumen.
export async function sendOverdueDigest(tenant, { force = false } = {}) {
  const meta = await getTenantMeta(tenant);
  if (!meta?.overdueDigest && !force) return { tenant, skipped: 'desactivado' };
  const day = dayIn('America/Lima');
  // Una vez por día. Fuera de producción no se marca: Redis es el de producción y bloquearía el
  // envío real de ese día.
  if (SEND_FOR_REAL && !force) {
    const first = await kv.set(sentKey(tenant, day), 1, { nx: true, ex: 60 * 60 * 36 });
    if (!first) return { tenant, skipped: 'ya enviado hoy' };
  }

  const [people, tasks] = await Promise.all([loadRecipients(tenant), openTasksWithDeadline(tenant)]);
  const nameOf = new Map(people.map((p) => [p.id, p.name]));
  let sent = 0;
  for (const person of people) {
    const today = dayIn(person.timezone);
    const late = (t) => t.due <= today && empresaAllows(person.empresaIds, t.meta);
    const mine = tasks
      .filter((t) => t.owners.includes(person.id) && late(t))
      .map((t) => ({ ...t, overdue: t.due < today }))
      .sort((a, b) => a.due.localeCompare(b.due));
    // Resumen del equipo (solo admin completo): lo vencido de los demás, agrupado por persona.
    const team = person.isFullAdmin
      ? tasks.filter((t) => !t.owners.includes(person.id) && t.due < today && empresaAllows(person.empresaIds, t.meta))
      : [];
    if (!mine.length && !team.length) continue;

    const overdue = mine.filter((t) => t.overdue);
    const dueToday = mine.filter((t) => !t.overdue);
    const parts = [
      overdue.length ? `${overdue.length} ${overdue.length === 1 ? 'tarea vencida' : 'tareas vencidas'}` : null,
      dueToday.length ? `${dueToday.length} que ${dueToday.length === 1 ? 'vence' : 'vencen'} hoy` : null,
    ].filter(Boolean);
    const title = parts.length
      ? `Tienes ${parts.join(' y ')}${team.length ? ` · equipo: ${team.length} vencidas` : ''}`
      : `Equipo: ${team.length} ${team.length === 1 ? 'tarea vencida' : 'tareas vencidas'}`;

    let teamHtml = '';
    if (team.length) {
      const groups = new Map();
      for (const t of team) {
        const owners = t.owners.length ? t.owners : [null];
        for (const o of owners) {
          const key = o ? nameOf.get(o) ?? 'Otra persona' : 'Sin responsable';
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push({ ...t, overdue: true });
        }
      }
      const ordered = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
      teamHtml = `<p style="font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#8a7c68;margin:18px 0 0;">Equipo</p>${
        ordered.map(([who, list]) => {
          const sorted = list.sort((a, b) => a.due.localeCompare(b.due));
          const more = sorted.length > 6 ? `<li style="list-style:none;color:#8a7c68;">y ${sorted.length - 6} más</li>` : '';
          return `<p style="font-size:13px;font-weight:600;margin:10px 0 0;color:#2b2318;">${escapeHtml(who)} · ${sorted.length}</p>${listHtml(sorted.slice(0, 6)).replace('</ul>', `${more}</ul>`)}`;
        }).join('')
      }`;
    }

    await sendMilestone(tenant, [person], {
      subject: title,
      title,
      body: mine.length ? 'Actualiza su estado o su fecha si ya cambió el plan.' : '',
      bodyHtml: section('Tus vencidas', overdue) + section('Vencen hoy', dueToday) + teamHtml,
      projectName: 'Resumen del día',
      actionUrl: mine.length === 1 && !team.length ? mine[0].url : tenantUrl(tenant, '/proyectos'),
      actionLabel: 'Abrir Kai →',
    });
    sent++;
  }
  return { tenant, people: sent };
}

export async function sendAllOverdueDigests() {
  const results = [];
  for (const slug of await listTenantSlugs()) {
    try { results.push(await sendOverdueDigest(slug)); } catch (err) { results.push({ tenant: slug, error: err.message }); }
  }
  return results;
}
