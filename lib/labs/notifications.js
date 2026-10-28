import { getExperiment, taskResponsables } from './experiments';
import { listUsers } from './users';
import { sendEmail } from './gmail';
import { labsEventEmailHtml } from './emailTemplates';

// Quién recibe un hito sin destinatario explícito ("todos los participantes del proyecto"):
// Director(es) + Supervisor(es) asignados (meta.supervisorIds) + Registrador(es) con acceso al
// target puntual, si ese tipo de evento les aplica (Presupuesto/Documentación/Reportes no son
// visibles para Registrador — ver NAV en LabsClientTenant.jsx — así que esos tipos nunca pasan
// ids ahí).
function broadcastRecipients(users, meta, registradorIds = []) {
  const directors = users.filter((u) => u.role === 'Director');
  const supervisors = users.filter((u) => u.role === 'Supervisor' && meta.supervisorIds?.includes(u.id));
  const registradores = users.filter((u) => u.role === 'Registrador' && registradorIds.includes(u.id));
  return [...directors, ...supervisors, ...registradores];
}

function dedupeByEmail(users) {
  const seen = new Set();
  return users.filter((u) => {
    const email = u.email?.toLowerCase();
    if (!email || seen.has(email)) return false;
    seen.add(email);
    return true;
  });
}

// Feedback de primer nivel (sin replyTo): según visibility, igual que el resto de hitos.
// Una respuesta (replyTo) es conversación dirigida — solo a quienes ya participan de ESE
// hilo puntual (autor original + todos los que ya respondieron a esa misma raíz), nunca al
// resto del equipo.
function feedbackRecipients(entry, feedbackList, experiment, users) {
  if (entry.replyTo) {
    const root = feedbackList.find((f) => f.id === entry.replyTo);
    const names = new Set([root?.who, ...feedbackList.filter((f) => f.replyTo === entry.replyTo).map((f) => f.who)].filter(Boolean));
    return users.filter((u) => names.has(u.name));
  }
  let registradorIds = [];
  if (entry.visibility !== 'Privado a Supervisor') {
    if (entry.targetType === 'tarea') {
      const task = experiment.tasks.find((t) => t.id === entry.targetId);
      registradorIds = task ? taskResponsables(task) : [];
    } else if (entry.targetType === 'prueba') {
      registradorIds = experiment.tests.find((t) => t.id === entry.targetId)?.registradorIds || [];
    } else if (entry.targetType === 'aporte') {
      const execution = experiment.executions.find((e) => e.id === entry.targetId);
      registradorIds = experiment.tests.find((t) => t.id === execution?.testId)?.registradorIds || [];
    }
  }
  return broadcastRecipients(users, experiment.meta, registradorIds);
}

function eventUrl(tenant, experimentId, eventId) {
  return `https://labs.bonsight.co/${tenant}?exp=${experimentId}&event=${eventId}`;
}

// Único punto de llamada: addEvent (lib/labs/experiments.js), para cualquier tipo de hito —
// best-effort, nunca tira ni bloquea el guardado del evento que lo originó.
export async function notifyEvent(tenant, experimentId, event) {
  try {
    const experiment = await getExperiment(tenant, experimentId);
    if (!experiment) return;
    const users = (await listUsers(tenant)).filter((u) => u.active !== false);

    let recipients;
    if (event.type === 'feedback') {
      const entry = experiment.feedback.find((f) => f.id === event.feedbackId);
      if (!entry) return;
      recipients = feedbackRecipients(entry, experiment.feedback, experiment, users);
    } else if (event.type === 'reporte') {
      // submitReport/approveReport no traen actor (lo decide el rol que hizo cada paso) — el
      // destinatario natural es siempre "el otro lado": Director cuando se envía, Supervisor
      // cuando se aprueba.
      recipients = event.title?.includes('enviado a Director')
        ? users.filter((u) => u.role === 'Director')
        : users.filter((u) => u.role === 'Supervisor' && experiment.meta.supervisorIds?.includes(u.id));
    } else if (event.type === 'tarea') {
      const task = experiment.tasks.find((t) => t.id === event.taskId);
      recipients = broadcastRecipients(users, experiment.meta, task ? taskResponsables(task) : []);
    } else if (event.type === 'aporte' || event.type === 'validacion') {
      const test = experiment.tests.find((t) => t.id === event.testId);
      recipients = broadcastRecipients(users, experiment.meta, test?.registradorIds || []);
    } else {
      // documento, gasto: sin Registrador — esas secciones no son parte de su vista.
      recipients = broadcastRecipients(users, experiment.meta, []);
    }

    recipients = dedupeByEmail(recipients).filter((u) => u.email && u.name !== event.actor);
    if (!recipients.length) return;

    const { getTenantMeta } = await import('./tenants');
    const tenantMeta = await getTenantMeta(tenant);
    const actionUrl = eventUrl(tenant, experimentId, event.id);
    const actionLabel = event.type === 'feedback' ? 'Ver y responder →' : 'Ver en Labs →';

    await Promise.all(recipients.map((u) => sendEmail({
      to: u.email,
      subject: event.title,
      html: labsEventEmailHtml({
        name: u.name,
        tenantName: tenantMeta?.name || tenant,
        projectName: experiment.meta.name,
        eventTitle: event.title,
        eventBody: event.body,
        actionUrl,
        actionLabel,
      }),
    }).catch((err) => console.error(`[labs-notify] ${tenant}/${experimentId} → ${u.email}:`, err.message))));
  } catch (err) {
    console.error(`[labs-notify] ${tenant}/${experimentId}:`, err.message);
  }
}
