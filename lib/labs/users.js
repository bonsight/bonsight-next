import { Redis } from '@upstash/redis';
import { randomBytes, randomInt, scryptSync, timingSafeEqual } from 'crypto';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const usersKey = (tenant) => `labs:${tenant}:users`;

// Único punto que decide qué de un registro de usuario sale de este archivo hacia una
// response HTTP — antes cada ruta reenviaba el objeto crudo (con passwordHash/resetToken/
// accessCode) a criterio propio; algunas ya lo filtraban a mano (el GET del roster), la
// mayoría no. resetToken/resetTokenExpires nunca salen, ni siquiera al admin (viajan solo por
// email, ver requestPasswordReset) — accessCode/passwordHash solo si includeCredentials (el
// admin los necesita para relayarle un código nuevo a alguien; el propio usuario nunca).
export function sanitizeUser(user, { includeCredentials = false } = {}) {
  if (!user) return user;
  const { accessCode, passwordHash, resetToken, resetTokenExpires, ...rest } = user;
  return includeCredentials ? { ...rest, accessCode, passwordHash } : rest;
}

const ROLES = ['Registrador', 'Supervisor', 'Director'];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// scrypt (nativo de Node, sin dependencia nueva) con salt random por usuario — se guarda como
// "salt:hash" en un solo campo. La comparación es timing-safe, mismo criterio que la firma de
// sesión en lib/labs/auth.js.
function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

// Política única de contraseña, compartida por las tres rutas que la fijan (primer login,
// cambio de contraseña, reset por link) — así el mensaje y el mínimo nunca se desincronizan.
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_POLICY_MSG = `La contraseña tiene que tener al menos ${PASSWORD_MIN_LENGTH} caracteres, con letras y números.`;

function isStrongPassword(password) {
  return typeof password === 'string'
    && password.length >= PASSWORD_MIN_LENGTH
    && /[a-zA-Z]/.test(password)
    && /[0-9]/.test(password);
}

function verifyPassword(password, stored) {
  if (!stored) return false;
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const hashBuffer = Buffer.from(hash, 'hex');
  const suppliedBuffer = scryptSync(password, salt, 64);
  return hashBuffer.length === suppliedBuffer.length && timingSafeEqual(hashBuffer, suppliedBuffer);
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

// Sin distinción de mayúsculas — "usuario" y "Usuario" son la misma persona, evita el error
// más común al tipear. Único por tenant (mismo alcance que accessCode).
export async function getUserByUsername(tenant, username) {
  const clean = String(username || '').trim().toLowerCase();
  if (!clean) return null;
  const users = await listUsers(tenant);
  return users.find((u) => u.active !== false && u.username && u.username.toLowerCase() === clean) ?? null;
}

export async function getUserByEmail(tenant, email) {
  const clean = String(email || '').trim().toLowerCase();
  if (!clean) return null;
  const users = await listUsers(tenant);
  return users.find((u) => u.active !== false && u.email && u.email.toLowerCase() === clean) ?? null;
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
    // username/passwordHash quedan null hasta el primer login (ver setUserCredentials) — el
    // código generado es válido para entrar solo mientras no se hayan elegido todavía. email
    // es opcional (lo carga el admin o la persona desde su perfil) — sin eso no puede pedir
    // "olvidé mi contraseña" y depende del reset manual del admin.
    username: null,
    passwordHash: null,
    email: null,
    resetToken: null,
    resetTokenExpires: null,
    active: true,
    createdAt: new Date().toISOString(),
  };
  await kv.set(usersKey(tenant), [...users, user]);
  return user;
}

// Primer login: la persona entró con su código y elige usuario+contraseña acá. De ahí en
// adelante el código deja de servir para entrar (ver app/labs/[tenant]/page.jsx) — si alguien
// se traba, el admin resetea desde el panel (resetUserCredentials) y le pasa un código nuevo.
export async function setUserCredentials(tenant, id, { username, password }) {
  const clean = String(username || '').trim();
  if (clean.length < 3) throw new Error('El usuario tiene que tener al menos 3 caracteres.');
  if (!isStrongPassword(password)) throw new Error(PASSWORD_POLICY_MSG);
  const users = await listUsers(tenant);
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) throw new Error('Usuario no encontrado.');
  const taken = users.some((u) => u.id !== id && u.username && u.username.toLowerCase() === clean.toLowerCase());
  if (taken) throw new Error('Ese usuario ya está en uso — elegí otro.');
  const next = { ...users[idx], username: clean, passwordHash: hashPassword(password) };
  users[idx] = next;
  await kv.set(usersKey(tenant), users);
  return next;
}

export function checkUserPassword(user, password) {
  return verifyPassword(password, user?.passwordHash);
}

// Autoservicio, ya logueado: pide la contraseña actual (no solo confiar en la sesión) para que
// dejar la compu desbloqueada un momento no alcance para que otro te cambie la clave y te saque.
export async function changeUserPassword(tenant, id, { currentPassword, newPassword }) {
  const users = await listUsers(tenant);
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) throw new Error('Usuario no encontrado.');
  if (!verifyPassword(currentPassword, users[idx].passwordHash)) throw new Error('La contraseña actual no es correcta.');
  if (!isStrongPassword(newPassword)) throw new Error(PASSWORD_POLICY_MSG);
  const next = { ...users[idx], passwordHash: hashPassword(newPassword) };
  users[idx] = next;
  await kv.set(usersKey(tenant), users);
  return next;
}

// Recuperación manual, sigue existiendo como respaldo (ej. alguien sin email cargado
// todavía): el admin genera un código nuevo y borra usuario/contraseña — la persona vuelve a
// pasar por el flujo de primer login con ese código.
export async function resetUserCredentials(tenant, id) {
  const users = await listUsers(tenant);
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) throw new Error('Usuario no encontrado.');
  const next = { ...users[idx], accessCode: generateAccessCode(), username: null, passwordHash: null, resetToken: null, resetTokenExpires: null };
  users[idx] = next;
  await kv.set(usersKey(tenant), users);
  return next;
}

// 15 min en vez de 1 hora — un código de 6 dígitos es mucho más chico de espacio que el token
// de 32 bytes que tenía antes (fácil de leer/tipear a cambio de menos entropía), así que la
// ventana se acorta para compensar. Sigue siendo de un solo uso (se borra en resetPasswordWithToken).
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

// "Olvidé mi contraseña" real, vía email — deliberadamente no distingue en el resultado si el
// email existe o no (evita que alguien use este form para averiguar quién está registrado);
// el llamador siempre muestra el mismo mensaje, solo cambia si de verdad se mandó el correo.
export async function requestPasswordReset(tenant, email) {
  const user = await getUserByEmail(tenant, email);
  if (!user || !user.username) return null; // sin cuenta creada todavía, no hay nada que resetear por acá
  const users = await listUsers(tenant);
  const idx = users.findIndex((u) => u.id === user.id);
  // Código de 6 dígitos, no un hash largo — va en el asunto del email y se lee de un vistazo
  // (mismo patrón que cualquier código de verificación por SMS/email que ya conocés).
  const token = String(randomInt(100000, 1000000));
  users[idx] = { ...users[idx], resetToken: token, resetTokenExpires: Date.now() + RESET_TOKEN_TTL_MS };
  await kv.set(usersKey(tenant), users);
  return { user: users[idx], token };
}

export async function getUserByValidResetToken(tenant, token) {
  const clean = String(token || '').trim();
  if (!clean) return null;
  const users = await listUsers(tenant);
  return users.find((u) => u.active !== false && u.resetToken === clean && u.resetTokenExpires > Date.now()) ?? null;
}

export async function resetPasswordWithToken(tenant, token, newPassword) {
  const user = await getUserByValidResetToken(tenant, token);
  if (!user) throw new Error('Este link ya expiró o no es válido — pedí uno nuevo.');
  if (!isStrongPassword(newPassword)) throw new Error(PASSWORD_POLICY_MSG);
  const users = await listUsers(tenant);
  const idx = users.findIndex((u) => u.id === user.id);
  const next = { ...users[idx], passwordHash: hashPassword(newPassword), resetToken: null, resetTokenExpires: null };
  users[idx] = next;
  await kv.set(usersKey(tenant), users);
  return next;
}

export async function updateUser(tenant, id, { name, role, active, email }) {
  const users = await listUsers(tenant);
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) throw new Error('Usuario no encontrado.');
  if (role !== undefined && !ROLES.includes(role)) throw new Error('Rol inválido.');
  const next = { ...users[idx] };
  if (name !== undefined) next.name = String(name).trim().slice(0, 60);
  if (role !== undefined) next.role = role;
  if (active !== undefined) next.active = Boolean(active);
  if (email !== undefined) {
    const clean = String(email || '').trim().toLowerCase();
    if (clean) {
      const taken = users.some((u) => u.id !== id && u.email && u.email.toLowerCase() === clean);
      if (taken) throw new Error('Ese email ya está en uso por otra persona del equipo.');
    }
    next.email = clean || null;
  }
  users[idx] = next;
  await kv.set(usersKey(tenant), users);
  return next;
}

// Estado del onboarding de Kai por usuario, en la clave "rol:projectKind" (ej.
// "Director:experimental") — así el tracking es por usuario+rol+módulo, no solo por usuario,
// aunque hoy el rol sea un campo único por usuario en todo el tenant. `seenWaiting` (vio el
// estado de espera) y `phase1Done` (completó la secuencia real) son flags separados a
// propósito: ver el mensaje de espera nunca debe marcar el onboarding como completado.
export async function markKaiOnboarding(tenant, id, moduleKey, patch) {
  const users = await listUsers(tenant);
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) throw new Error('Usuario no encontrado.');
  const kaiOnboarding = { ...(users[idx].kaiOnboarding || {}) };
  kaiOnboarding[moduleKey] = { ...(kaiOnboarding[moduleKey] || {}), ...patch };
  const next = { ...users[idx], kaiOnboarding };
  users[idx] = next;
  await kv.set(usersKey(tenant), users);
  return next;
}

// Preferencia global de la persona ("cuánto quiero que Kai me interrumpa"), no por rol+módulo
// como el resto de kaiOnboarding — vive como sibling de esas claves, no anidada bajo ninguna.
const KAI_AVISOS_LEVELS = ['activados', 'reducidos', 'apagados'];

export async function setKaiAvisos(tenant, id, level) {
  if (!KAI_AVISOS_LEVELS.includes(level)) throw new Error('Nivel de avisos inválido.');
  const users = await listUsers(tenant);
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) throw new Error('Usuario no encontrado.');
  const kaiOnboarding = { ...(users[idx].kaiOnboarding || {}), avisos: level };
  const next = { ...users[idx], kaiOnboarding };
  users[idx] = next;
  await kv.set(usersKey(tenant), users);
  return next;
}

export async function deleteUser(tenant, id) {
  const users = await listUsers(tenant);
  await kv.set(usersKey(tenant), users.filter((u) => u.id !== id));
}
