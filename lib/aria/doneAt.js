import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// Un solo hash por tenant (pageId → ISO timestamp) — se pisa cada vez que la tarea vuelve a
// pasar por "Hecho", y es independiente de cualquier otra edición de la página en Notion
// (a diferencia de last_edited_time, que se bumpea con cualquier cambio, incluida la carga
// de horas reales días después de terminada).
const key = (tenant) => `aria:${tenant}:board:done_at`;

export async function markDoneAt(tenant, pageId) {
  await kv.hset(key(tenant), { [pageId]: new Date().toISOString() });
}

export async function getDoneAtMap(tenant) {
  return (await kv.hgetall(key(tenant))) ?? {};
}
