import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const usersKey = (tenant) => `labs:${tenant}:users`;

const ROLES = ['Registrador', 'Supervisor', 'Director'];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Mismo formato que el código de acceso del tenant (tenants.js) — legible, sin
// caracteres ambiguos (0/O, 1/I).
function generateAccessCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part()}-${part()}`;
}

export async function listUsers(tenant) {
  return (await kv.get(usersKey(tenant))) ?? [];
}

export async function getUserById(tenant, id) {
  const users = await listUsers(tenant);
  return users.find((u) => u.id === id && u.active !== false) ?? null;
}

export async function getUserByCode(tenant, code) {
  const clean = String(code || '').trim().toUpperCase().replace(/-/g, '');
  if (!clean) return null;
  const users = await listUsers(tenant);
  return users.find((u) => u.active !== false && u.accessCode.replace(/-/g, '') === clean) ?? null;
}

export async function createUser(tenant, { name, role }) {
  if (!name?.trim()) throw new Error('El nombre es requerido.');
  if (!ROLES.includes(role)) throw new Error('Rol inválido.');
  const users = await listUsers(tenant);
  const user = {
    id: generateId(),
    name: String(name).trim().slice(0, 60),
    role,
    accessCode: generateAccessCode(),
    active: true,
    createdAt: new Date().toISOString(),
  };
  await kv.set(usersKey(tenant), [...users, user]);
  return user;
}

export async function updateUser(tenant, id, { name, role, active }) {
  const users = await listUsers(tenant);
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) throw new Error('Usuario no encontrado.');
  if (role !== undefined && !ROLES.includes(role)) throw new Error('Rol inválido.');
  const next = { ...users[idx] };
  if (name !== undefined) next.name = String(name).trim().slice(0, 60);
  if (role !== undefined) next.role = role;
  if (active !== undefined) next.active = Boolean(active);
  users[idx] = next;
  await kv.set(usersKey(tenant), users);
  return next;
}

export async function deleteUser(tenant, id) {
  const users = await listUsers(tenant);
  await kv.set(usersKey(tenant), users.filter((u) => u.id !== id));
}
