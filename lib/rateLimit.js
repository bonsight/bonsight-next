import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// Rate limit de ventana fija por IP — pensado para endpoints públicos sin auth (ej. el booking
// del Advisor) donde no hay sesión ni otra forma de limitar abuso. `limit` requests cada
// `windowSeconds`, acumulados bajo `key`. Devuelve false cuando ya se superó el límite.
export async function checkRateLimit(key, limit, windowSeconds) {
  const count = await kv.incr(`ratelimit:${key}`);
  if (count === 1) await kv.expire(`ratelimit:${key}`, windowSeconds);
  return count <= limit;
}

export function getClientIp(req) {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}
