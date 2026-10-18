import { cookies } from 'next/headers';
import { Redis } from '@upstash/redis';
import { hashPassword, verifyPassword, signSessionToken, verifySessionToken } from '@/lib/shared/authCrypto';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// Login único para los admins de Bonsight (Labs/Kai/Aria) — reemplaza los tres códigos de
// acceso separados (LABS_ACCESS_CODE/KAI_ACCESS_CODE/ARIA_ACCESS_CODE como puerta de /admin;
// siguen existiendo como secretos de firma de otras cosas, no se tocan). Un solo roster de
// personas, no por producto — hoy es una sola cuenta, pensado para sumar más después.
const USERS_KEY = 'bonsight:team_users';
const COOKIE_NAME = 'bonsight_team';
const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_POLICY_MSG = `La contraseña tiene que tener al menos ${PASSWORD_MIN_LENGTH} caracteres, con letras y números.`;

function isStrongPassword(password) {
  return typeof password === 'string'
    && password.length >= PASSWORD_MIN_LENGTH
    && /[a-zA-Z]/.test(password)
    && /[0-9]/.test(password);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

async function listTeamUsers() {
  return (await kv.get(USERS_KEY)) ?? [];
}

export async function hasAnyTeamUser() {
  return (await listTeamUsers()).length > 0;
}

async function getTeamUserByUsername(username) {
  const clean = String(username || '').trim().toLowerCase();
  if (!clean) return null;
  const users = await listTeamUsers();
  return users.find((u) => u.username.toLowerCase() === clean) ?? null;
}

// Solo se usa una vez, cuando USERS_KEY está vacío — de ahí en más crear cuentas nuevas
// requeriría un endpoint de admin (no existe todavía, no hace falta con una sola persona).
// `email` es opcional (cuentas viejas no lo tienen) pero hace falta para cualquier cosa que
// necesite el Google real de la persona — ej. hacerla coanfitrión en Meet al crear una reunión
// desde Reuniones (ver lib/kai/meet.js) — tiene que ser el mismo correo que usa para loguearse
// en Google Workspace, no cualquier email.
export async function bootstrapTeamUser({ username, password, name, email }) {
  const users = await listTeamUsers();
  if (users.length > 0) throw new Error('Ya existe una cuenta de admin — esto solo corre una vez.');
  const clean = String(username || '').trim();
  if (clean.length < 3) throw new Error('El usuario tiene que tener al menos 3 caracteres.');
  if (!isStrongPassword(password)) throw new Error(PASSWORD_POLICY_MSG);
  const user = {
    id: generateId(),
    username: clean,
    name: String(name || clean).trim().slice(0, 60),
    email: email ? String(email).trim().toLowerCase() : null,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  await kv.set(USERS_KEY, [user]);
  return user;
}

function checkTeamPassword(user, password) {
  return verifyPassword(password, user?.passwordHash);
}

function sign(userId) {
  if (!process.env.TEAM_SESSION_SECRET) throw new Error('TEAM_SESSION_SECRET no está configurado.');
  return signSessionToken(userId, process.env.TEAM_SESSION_SECRET);
}

function verify(token) {
  return verifySessionToken(token, process.env.TEAM_SESSION_SECRET);
}

// Login único de Bonsight por producto, no cruzado entre subdominios (cada uno pide sus propias
// credenciales) — por eso sin `domain: '.bonsight.co'`, a diferencia de versiones previas.
function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  };
}

export async function loginTeamUser(username, password) {
  const user = await getTeamUserByUsername(username);
  if (!user || !checkTeamPassword(user, password)) throw new Error('Usuario o contraseña incorrectos.');
  (await cookies()).set(COOKIE_NAME, sign(user.id), cookieOptions());
  return user;
}

export async function logoutTeamUser() {
  const { path } = cookieOptions();
  (await cookies()).delete({ name: COOKIE_NAME, path });
}

export async function getCurrentTeamUser() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const userId = verify(token);
  if (!userId) return null;
  const users = await listTeamUsers();
  return users.find((u) => u.id === userId) ?? null;
}

export async function isBonsightTeamAuthorized() {
  return !!(await getCurrentTeamUser());
}

// "/team" es una ruta que el proxy reescribe internamente en cada subdominio (kai./aria./
// labs.) sin cambiar de origen — un redirect relativo alcanza, no hace falta resolver dominios
// cruzados acá (ver proxy.js).
export async function teamLoginUrl() {
  return '/team';
}
