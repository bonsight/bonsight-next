import { cookies } from 'next/headers';
import { getTenantUserById, touchTenantUserLogin } from '@/lib/kai/tenantUsers';
import { signSessionToken, verifySessionToken } from '@/lib/shared/authCrypto';

// Sesión de una persona del CLIENTE, no de Bonsight — separada de lib/team/auth.js (ese es
// el admin interno). Un cookie por tenant (no global), y por producto — ya no cruza entre
// kai./aria. para el mismo tenant (antes sí, vía Domain=.bonsight.co; se sacó a propósito).
const COOKIE_PREFIX = 'tenant_user_';

function secret() {
  return process.env.TENANT_SESSION_SECRET || '';
}

function sign(userId) {
  if (!secret()) throw new Error('TENANT_SESSION_SECRET no está configurado.');
  return signSessionToken(userId, secret());
}

function verify(token) {
  return verifySessionToken(token, secret());
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  };
}

export async function loginTenantSession(tenant, userId) {
  (await cookies()).set(`${COOKIE_PREFIX}${tenant}`, sign(userId), cookieOptions());
  await touchTenantUserLogin(tenant, userId);
}

export async function logoutTenantSession(tenant) {
  const { path } = cookieOptions();
  (await cookies()).delete({ name: `${COOKIE_PREFIX}${tenant}`, path });
}

export async function getCurrentTenantUser(tenant) {
  const token = (await cookies()).get(`${COOKIE_PREFIX}${tenant}`)?.value;
  const userId = verify(token);
  if (!userId) return null;
  return getTenantUserById(tenant, userId);
}
