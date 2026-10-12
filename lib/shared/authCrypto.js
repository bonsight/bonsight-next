import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';

// Mecánica de auth compartida entre lib/team/auth.js, lib/kai/tenantAuth.js,
// lib/kai/tenantUsers.js y lib/labs/{auth,users}.js — antes este mismo patrón (hash de
// contraseña con scrypt+salt, firma/verificación de sesión con HMAC) estaba copiado casi
// verbatim en los cuatro. Cada producto sigue siendo dueño de su propio secreto, cookie y
// modelo de usuario — esto solo centraliza la criptografía en sí, no la identidad.
//
// Node-only (scryptSync/createHmac de 'crypto') — el proxy de subdominios (proxy.js) NO puede
// importar esto: corre en Edge Runtime, que no tiene el módulo 'crypto' de Node, por eso
// reimplementa su propia verificación de sesión con Web Crypto. Esa duplicación puntual es
// necesaria, no un descuido.

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored) return false;
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const hashBuffer = Buffer.from(hash, 'hex');
  const suppliedBuffer = scryptSync(password, salt, 64);
  return hashBuffer.length === suppliedBuffer.length && timingSafeEqual(hashBuffer, suppliedBuffer);
}

// `payload` es lo que cada caller decide firmar (un id solo, o "tenant:id") — esta función no
// le conoce la forma, solo firma el string tal cual con el secreto que le pasen.
export function signSessionToken(payload, secret) {
  if (!secret) throw new Error('Falta el secreto de firma de sesión.');
  const sig = createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

// Devuelve el payload si la firma es válida, null si no. Separa por el ÚLTIMO "." (no el
// primero) — así un payload que a su vez use "." como separador interno (ej. "tenant.nonce"
// en el state de Google OAuth) sigue andando igual, sin ambigüedad con el de la firma.
export function verifySessionToken(token, secret) {
  if (!token || !secret) return null;
  const i = String(token).lastIndexOf('.');
  if (i === -1) return null;
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  if (!payload || !sig) return null;
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return payload;
}
