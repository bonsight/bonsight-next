import { Redis } from '@upstash/redis';

// Bandeja de avisos de Kai por persona: todo lo que se avisa por correo (sendMilestone en
// lib/kaiNext/notifications.js) queda también acá, aunque la persona haya apagado los correos.
// Leído: un set de ids más una marca de "todo leído hasta tal fecha" (marcar todo no reescribe la lista).
const kv = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
const listKey = (t, pid) => `kainext:${t}:inbox:${pid}`;
const readKey = (t, pid) => `kainext:${t}:inbox:${pid}:read`;
const readAllKey = (t, pid) => `kainext:${t}:inbox:${pid}:readall`;
const MAX_ITEMS = 200;

// Tipo de aviso (ícono) a partir del título, para no tener que tocar cada llamada a sendMilestone.
function kindOf(title = '') {
  if (/venci|vence hoy/i.test(title)) return 'late';
  if (/te puso en copia/i.test(title)) return 'copy';
  if (/te asign|te agregó|tienes \d+ tarea|empezó/i.test(title)) return 'add';
  if (/coment|feedback|respondi|compartió/i.test(title)) return 'comment';
  if (/reuni/i.test(title)) return 'meeting';
  return 'move';
}

// Guarda la ruta relativa: así el aviso abre bien en kai.bonsight.co y en local.
function pathOf(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    return `${u.pathname.replace(/^\/kai-next(?=\/)/, '')}${u.search}`;
  } catch { return null; }
}

export async function pushInbox(tenant, personIds, { title, projectName, actionUrl, actorName }) {
  const ids = [...new Set((personIds ?? []).filter((x) => typeof x === 'string' && x && !x.includes('@')))];
  if (!ids.length || !title) return;
  const item = {
    id: `av_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    title: String(title).slice(0, 300),
    project: projectName ? String(projectName).slice(0, 160) : null,
    path: pathOf(actionUrl),
    actor: actorName ?? null,
    kind: kindOf(title),
  };
  const pipe = kv.pipeline();
  for (const pid of ids) {
    pipe.lpush(listKey(tenant, pid), JSON.stringify(item));
    pipe.ltrim(listKey(tenant, pid), 0, MAX_ITEMS - 1);
  }
  await pipe.exec().catch((err) => console.error(`[kai-inbox] ${tenant}:`, err.message));
}

export async function listInbox(tenant, personId, limit = 60) {
  if (!personId) return { items: [], unread: 0 };
  const [raw, read, readAll] = await Promise.all([
    kv.lrange(listKey(tenant, personId), 0, MAX_ITEMS - 1),
    kv.smembers(readKey(tenant, personId)),
    kv.get(readAllKey(tenant, personId)),
  ]);
  const readSet = new Set(read ?? []);
  const all = (raw ?? []).map((r) => { try { return typeof r === 'string' ? JSON.parse(r) : r; } catch { return null; } }).filter(Boolean)
    .map((it) => ({ ...it, unread: !readSet.has(it.id) && (!readAll || it.at > readAll) }));
  return { items: all.slice(0, limit), unread: all.filter((it) => it.unread).length };
}

export async function markInboxRead(tenant, personId, ids) {
  if (!personId) return;
  if (ids === 'all') {
    await Promise.all([kv.set(readAllKey(tenant, personId), new Date().toISOString()), kv.del(readKey(tenant, personId))]);
    return;
  }
  const clean = (Array.isArray(ids) ? ids : []).filter((x) => typeof x === 'string').slice(0, 200);
  if (clean.length) {
    await kv.sadd(readKey(tenant, personId), ...clean);
    await kv.expire(readKey(tenant, personId), 60 * 60 * 24 * 120);
  }
}

// "Venció «tarea»": las tareas vencidas de la persona (responsable o colaboradora), calculadas al
// día. Cada día vuelven a quedar sin leer a las 8:00 de Lima mientras sigan vencidas.
export async function withOverdue(tenant, identity, inbox) {
  const personId = identity?.personId;
  if (!personId) return inbox;
  try {
    const { openTasksWithDeadline } = await import('@/lib/kaiNext/overdueDigest');
    const { empresaAllows } = await import('@/lib/kaiNext/empresas');
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
    const at = `${today}T13:00:00.000Z`; // 8:00 en Lima
    const [tasks, read, readAll] = await Promise.all([
      openTasksWithDeadline(tenant),
      kv.smembers(readKey(tenant, personId)),
      kv.get(readAllKey(tenant, personId)),
    ]);
    const readSet = new Set(read ?? []);
    const late = tasks
      .filter((t) => t.owners.includes(personId) && t.due < today && empresaAllows(identity.empresaIds, t.meta))
      .sort((a, b) => b.due.localeCompare(a.due))
      .slice(0, 20)
      .map((t) => {
        const id = `od_${Buffer.from(`${t.url}|${t.name}`).toString('base64url').slice(0, 40)}_${today}`;
        return { id, at, title: `Venció «${t.name}»`, project: t.where, path: pathOf(t.url), actor: null, kind: 'late', unread: !readSet.has(id) && (!readAll || at > readAll) };
      });
    const items = [...late, ...inbox.items].sort((a, b) => String(b.at).localeCompare(String(a.at)));
    return { items, unread: inbox.unread + late.filter((x) => x.unread).length };
  } catch (err) {
    console.error(`[kai-inbox] vencidas ${tenant}:`, err.message);
    return inbox;
  }
}
