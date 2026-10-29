import { Redis } from '@upstash/redis';
import { randomBytes } from 'crypto';

// Reemplaza los dos configs singleton (kai:{tenant}:drive:config para lectura,
// kainext:{tenant}:projects:drive:config para escritura) por una lista — un tenant puede
// conectar más de una carpeta de lectura (cada una se explora/importa por separado en
// Documentos y notas) pero como mucho una de lectura y escritura (la usa Proyectos de Kai
// Next como raíz; no hay hoy un caso real para tener más de una).
const kv = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
const key = (tenant) => `kai:${tenant}:drive:connections`;

export async function listConnections(tenant) {
  const list = await kv.get(key(tenant));
  return Array.isArray(list) ? list : [];
}

export async function addConnection(tenant, { folderId, folderName, role }) {
  if (!['read', 'write'].includes(role)) throw new Error('Rol inválido.');
  const list = await listConnections(tenant);
  if (role === 'write' && list.some((c) => c.role === 'write')) {
    throw new Error('Ya hay una carpeta de lectura y escritura conectada — elimínala antes de conectar otra.');
  }
  const connection = { id: randomBytes(6).toString('hex'), folderId, folderName, role, connectedAt: new Date().toISOString() };
  await kv.set(key(tenant), [...list, connection]);
  return connection;
}

export async function removeConnection(tenant, id) {
  const list = await listConnections(tenant);
  await kv.set(key(tenant), list.filter((c) => c.id !== id));
}

// Migración perezosa: si el tenant todavía tiene alguno de los dos configs viejos y la lista
// nueva está vacía, los trae para acá (una sola vez; de ahí en más vive solo en la lista).
export async function migrateLegacyConnections(tenant) {
  const existing = await listConnections(tenant);
  if (existing.length > 0) return existing;

  const [legacyRead, legacyWrite] = await Promise.all([
    kv.get(`kai:${tenant}:drive:config`),
    kv.get(`kainext:${tenant}:projects:drive:config`),
  ]);
  const migrated = [];
  if (legacyRead?.folderId) migrated.push({ id: randomBytes(6).toString('hex'), role: 'read', ...legacyRead });
  if (legacyWrite?.folderId) migrated.push({ id: randomBytes(6).toString('hex'), role: 'write', ...legacyWrite });
  if (migrated.length) await kv.set(key(tenant), migrated);
  return migrated;
}
