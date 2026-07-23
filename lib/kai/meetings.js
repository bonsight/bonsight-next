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
