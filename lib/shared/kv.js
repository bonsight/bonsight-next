import { Redis } from '@upstash/redis';

// Único punto de instanciación del cliente de Redis — antes cada uno de los ~40 archivos que
// tocan Redis hacía su propio `new Redis({...})` con las mismas dos env vars. Mismo cliente
// subyacente (Upstash ya lo maneja como HTTP sin estado, no hay pool que compartir), esto solo
// evita repetir la construcción. Migración de los call sites existentes: pendiente, a propósito
// — no se tocó en este pase por no verificar 40+ archivos uno por uno sin poder probarlos todos
// en vivo; usar esto en código nuevo de acá en más.
export const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});
