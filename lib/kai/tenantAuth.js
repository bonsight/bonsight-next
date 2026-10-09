import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { getTenantUserById, touchTenantUserLogin } from '@/lib/kai/tenantUsers';

// Sesión de una persona del CLIENTE, no de Bonsight — separada de lib/team/auth.js (ese es
// el admin interno). Un cookie por tenant (no global) porque cada tenant es un cliente
// distinto; pero SÍ cruza entre kai. y aria. para el mismo tenant, así una persona se loguea
// una vez y entra a los dos productos que tenga habilitados.
const COOKIE_PREFIX = 'tenant_user_';

function secret() {
  return process.env.TENANT_SESSION_SECRET || '';
}

function sign(userId) {
  if (!secret()) throw new Error('TENANT_SESSION_SECRET no está configurado.');
  const sig = createHmac('sha256', secret()).update(userId).digest('hex');
  return `${userId}.${sig}`;
}

function verify(token) {
  if (!token || !secret()) return null;
  const [userId, sig] = String(token).split('.');
  if (!userId || !sig) return null;
  const expected = createHmac('sha256', secret()).update(userId).digest('hex');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return userId;
}

// .bonsight.co en prod para compartir entre kai./aria. — en local (sin domain real) cada
// subdominio queda con su propia sesión, limitación conocida del entorno de desarrollo (ver
// lib/team/auth.js para el mismo caso ya documentado con evidencia).
function cookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
    ...(isProd ? { domain: '.bonsight.co' } : {}),
  };
}

export async function loginTenantSession(tenant, userId) {
  (await cookies()).set(`${COOKIE_PREFIX}${tenant}`, sign(userId), cookieOptions());
  await touchTenantUserLogin(tenant, userId);
}

export async function logoutTenantSession(tenant) {
  const { domain, path } = cookieOptions();
  (await cookies()).delete({ name: `${COOKIE_PREFIX}${tenant}`, path, ...(domain ? { domain } : {}) });
}

export async function getCurrentTenantUser(tenant) {
  const token = (await cookies()).get(`${COOKIE_PREFIX}${tenant}`)?.value;
  const userId = verify(token);
  if (!userId) return null;
  return getTenantUserById(tenant, userId);
}
