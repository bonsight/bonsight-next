import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const key = (tenant) => `kai:${tenant}:meetings`;

// Índice liviano — solo lo necesario para listar. El detalle real (para poder
// Aceptar/Rechazar) siempre se lee en vivo desde la conversación vía
// conversationId+messageIndex, así nunca queda desincronizado del estado real.
export async function addMeetingIndexEntry(tenant, { conversationId, messageIndex, analysis }) {
  const entry = {
    id: `${conversationId}:${messageIndex}`,
    conversationId,
    messageIndex,
    title: analysis.meetingTitle || 'Reunión',
    analyzedAt: analysis.analyzedAt,
    hasSubstantiveContent: analysis.hasSubstantiveContent !== false,
    counts: {
      decisions: analysis.decisions?.length ?? 0,
      tasks: analysis.tasks?.length ?? 0,
      knowledge: analysis.knowledge?.length ?? 0,
      contradictions: analysis.contradictions?.length ?? 0,
    },
  };
  const current = (await kv.get(key(tenant))) ?? [];
  await kv.set(key(tenant), [entry, ...current]);
  return entry;
}

export async function listMeetingIndex(tenant) {
  return (await kv.get(key(tenant))) ?? [];
}

const callsKey = (tenant) => `kai:${tenant}:meeting_calls`;

// Registro de TODAS las llamadas que hizo Kai (terminen en análisis o no) — a diferencia
// del índice de arriba (que solo lista análisis ya completos), esto permite encontrar y
// reprocesar una sesión que quedó colgada o falló, sin depender de tener esa conversación
// puntual abierta en el chat (donde vive el botón "Obtener análisis" original).
export async function addCallIndexEntry(tenant, { callSid, conversationId, messageIndex, meetingTitle }) {
  const entry = { callSid, conversationId, messageIndex, meetingTitle: meetingTitle || 'Reunión', startedAt: new Date().toISOString() };
  const current = (await kv.get(callsKey(tenant))) ?? [];
  await kv.set(callsKey(tenant), [entry, ...current.filter((e) => e.callSid !== callSid)]);
  return entry;
}

export async function listCallIndex(tenant) {
  return (await kv.get(callsKey(tenant))) ?? [];
}
