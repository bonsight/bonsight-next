import { Redis } from '@upstash/redis';
import { randomBytes, randomInt, scryptSync, timingSafeEqual } from 'crypto';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// Roster de personas del CLIENTE por tenant — compartido entre Kai y Aria (mismo tenant, mismo
// registro, ver lib/kai/tenants.js) en vez de un roster separado por producto. `access` decide
// a cuál de los dos puede entrar cada persona; el admin lo asigna, no es autoservicio.
// Mismo patrón de hashing/reset que lib/labs/users.js — reemplaza el código compartido por
// tenant (kai_auth_{tenant}/aria_auth_{tenant}) por cuentas individuales reales.
const usersKey = (tenant) => `kai:${tenant}:tenant_users`;

export function sanitizeTenantUser(user, { includeCredentials = false } = {}) {
  if (!user) return user;
  const { passwordHash, resetToken, resetTokenExpires, ...rest } = user;
  return includeCredentials ? { ...rest, passwordHash } : rest;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored) return false;
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const hashBuffer = Buffer.from(hash, 'hex');
  const suppliedBuffer = scryptSync(password, salt, 64);
  return hashBuffer.length === suppliedBuffer.length && timingSafeEqual(hashBuffer, suppliedBuffer);
}

const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_POLICY_MSG = `La contraseña tiene que tener al menos ${PASSWORD_MIN_LENGTH} caracteres, con letras y números.`;

function isStrongPassword(password) {
  return typeof password === 'string'
    && password.length >= PASSWORD_MIN_LENGTH
    && /[a-zA-Z]/.test(password)
    && /[0-9]/.test(password);
}

export async function listTenantUsers(tenant) {
  return (await kv.get(usersKey(tenant))) ?? [];
}

export async function getTenantUserById(tenant, id) {
  const users = await listTenantUsers(tenant);
  return users.find((u) => u.id === id && u.active !== false) ?? null;
}

export async function getTenantUserByUsername(tenant, username) {
  const clean = String(username || '').trim().toLowerCase();
  if (!clean) return null;
  const users = await listTenantUsers(tenant);
  return users.find((u) => u.active !== false && u.username && u.username.toLowerCase() === clean) ?? null;
}

export async function getTenantUserByEmail(tenant, email) {
  const clean = String(email || '').trim().toLowerCase();
  if (!clean) return null;
  const users = await listTenantUsers(tenant);
  return users.find((u) => u.active !== false && u.email && u.email.toLowerCase() === clean) ?? null;
}

// Se crea solo con nombre + a qué productos accede — sin usuario/contraseña todavía (el admin
// se los asigna después con setTenantUserCredentials, mismo flujo de dos pasos que Labs).
export async function createTenantUser(tenant, { name, email, access }) {
  if (!name?.trim()) throw new Error('El nombre es requerido.');
  const users = await listTenantUsers(tenant);
  const user = {
    id: generateId(),
    name: String(name).trim().slice(0, 60),
    email: email?.trim() || null,
    access: { kai: !!access?.kai, aria: !!access?.aria },
    username: null,
    passwordHash: null,
    resetToken: null,
    resetTokenExpires: null,
    active: true,
    createdAt: new Date().toISOString(),
  };
  await kv.set(usersKey(tenant), [...users, user]);
  return user;
}

export async function setTenantUserCredentials(tenant, id, { username, password }) {
  const clean = String(username || '').trim();
  if (clean.length < 3) throw new Error('El usuario tiene que tener al menos 3 caracteres.');
  if (!isStrongPassword(password)) throw new Error(PASSWORD_POLICY_MSG);
  const users = await listTenantUsers(tenant);
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) throw new Error('Usuario no encontrado.');
  const taken = users.some((u) => u.id !== id && u.username && u.username.toLowerCase() === clean.toLowerCase());
  if (taken) throw new Error('Ese usuario ya está en uso — elegí otro.');
  const next = { ...users[idx], username: clean, passwordHash: hashPassword(password) };
  users[idx] = next;
  await kv.set(usersKey(tenant), users);
  return next;
}

export async function resetTenantUserCredentials(tenant, id) {
  const users = await listTenantUsers(tenant);
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) throw new Error('Usuario no encontrado.');
  const next = { ...users[idx], username: null, passwordHash: null, resetToken: null, resetTokenExpires: null };
  users[idx] = next;
  await kv.set(usersKey(tenant), users);
  return next;
}

export function checkTenantUserPassword(user, password) {
  return verifyPassword(password, user?.passwordHash);
}

export async function updateTenantUser(tenant, id, { name, email, active, access }) {
  const users = await listTenantUsers(tenant);
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) throw new Error('Usuario no encontrado.');
  const next = { ...users[idx] };
  if (name !== undefined) next.name = String(name).trim().slice(0, 60);
  if (active !== undefined) next.active = Boolean(active);
  if (access !== undefined) next.access = { kai: !!access.kai, aria: !!access.aria };
  if (email !== undefined) {
    const clean = String(email || '').trim().toLowerCase();
    if (clean) {
      const taken = users.some((u) => u.id !== id && u.email && u.email.toLowerCase() === clean);
      if (taken) throw new Error('Ese email ya está en uso por otra persona.');
    }
    next.email = clean || null;
  }
  users[idx] = next;
  await kv.set(usersKey(tenant), users);
  return next;
}

export async function deleteTenantUser(tenant, id) {
  const users = await listTenantUsers(tenant);
  await kv.set(usersKey(tenant), users.filter((u) => u.id !== id));
}

// ── Recuperación de contraseña por email — igual a lib/labs/users.js ───────
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

export async function requestTenantPasswordReset(tenant, email) {
  const user = await getTenantUserByEmail(tenant, email);
  if (!user || !user.username) return null;
  const users = await listTenantUsers(tenant);
  const idx = users.findIndex((u) => u.id === user.id);
  const token = String(randomInt(100000, 1000000));
  users[idx] = { ...users[idx], resetToken: token, resetTokenExpires: Date.now() + RESET_TOKEN_TTL_MS };
  await kv.set(usersKey(tenant), users);
  return { user: users[idx], token };
}

export async function getTenantUserByValidResetToken(tenant, token) {
  const clean = String(token || '').trim();
  if (!clean) return null;
  const users = await listTenantUsers(tenant);
  return users.find((u) => u.active !== false && u.resetToken === clean && u.resetTokenExpires > Date.now()) ?? null;
}

export async function resetTenantPasswordWithToken(tenant, token, newPassword) {
  const user = await getTenantUserByValidResetToken(tenant, token);
  if (!user) throw new Error('Este link ya expiró o no es válido — pedí uno nuevo.');
  if (!isStrongPassword(newPassword)) throw new Error(PASSWORD_POLICY_MSG);
  const users = await listTenantUsers(tenant);
  const idx = users.findIndex((u) => u.id === user.id);
  const next = { ...users[idx], passwordHash: hashPassword(newPassword), resetToken: null, resetTokenExpires: null };
  users[idx] = next;
  await kv.set(usersKey(tenant), users);
  return next;
}
