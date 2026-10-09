import { Redis } from '@upstash/redis';

const kv = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
const reportKey = (id) => `kai:report:${id}`;

// Snapshot de solo-lectura de la página Empresa, pensado para compartir por link sin requerir
// sesión — el id (UUID) es la única llave de acceso, no vive bajo el namespace del tenant para
// que la URL no dependa de a qué tenant pertenece. El snapshot lo arma el cliente (WYSIWYG de
// lo que esa persona veía al compartir); acá solo se persiste y se lee.
export async function createReport(snapshot) {
  const id = crypto.randomUUID();
  const report = { id, createdAt: new Date().toISOString(), ...snapshot };
  await kv.set(reportKey(id), report);
  return report;
}

export async function getReport(id) {
  return kv.get(reportKey(id));
}
