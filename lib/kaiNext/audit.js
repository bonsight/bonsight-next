import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// Registro de acciones sensibles en proyectos, para poder responder quién hizo qué. Solo guarda
// lo que no se puede reconstruir después: Notion atribuye estos cambios a la integración.
const auditKey = (tenant) => `kainext:${tenant}:audit_log`;
const MAX_EVENTS = 1000;

// Nunca debe impedir la acción que registra: si falla, queda en los logs del servidor.
export async function logProjectAction(tenant, identity, { project, action, detail = null }) {
  try {
    const event = {
      at: new Date().toISOString(),
      actorId: identity.chatOwnerId ?? null,
      actorName: identity.personName ?? 'Desconocido',
      projectId: project.id,
      projectName: project.name,
      action,
      detail,
    };
    await kv.lpush(auditKey(tenant), JSON.stringify(event));
    await kv.ltrim(auditKey(tenant), 0, MAX_EVENTS - 1);
  } catch (err) {
    console.error('[kaiNext/audit] no se pudo registrar la acción:', action, err.message);
  }
}

export async function listProjectActions(tenant, projectIds, limit = 30) {
  const allowed = new Set(projectIds);
  const events = await kv.lrange(auditKey(tenant), 0, MAX_EVENTS - 1);
  return events
    .map((e) => (typeof e === 'string' ? JSON.parse(e) : e))
    .filter((e) => allowed.has(e.projectId))
    .slice(0, limit);
}
