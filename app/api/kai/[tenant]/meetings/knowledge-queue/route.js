import { isKaiAuthorized } from '@/lib/kai/auth';
import { listMeetingIndex } from '@/lib/kai/meetings';
import { getConversationMessages } from '@/lib/kai/memory';

// Agrega el conocimiento pendiente de revisión de TODAS las reuniones analizadas, para
// que el admin lo revise en un solo lugar en vez de tener que abrir cada reunión.
export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isKaiAuthorized())) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const index = await listMeetingIndex(tenant);
  const withPending = index.filter((e) => (e.counts?.knowledge ?? 0) > 0);

  const groups = await Promise.all(withPending.map(async (entry) => {
    const messages = await getConversationMessages(tenant, entry.conversationId);
    const analysis = messages[entry.messageIndex]?.meetingAnalysis;
    if (!analysis) return null;
    const pending = (analysis.knowledge ?? [])
      .map((item, itemIndex) => ({ item, itemIndex }))
      .filter(({ item }) => item.status === 'pending');
    if (!pending.length) return null;
    return {
      conversationId: entry.conversationId,
      messageIndex: entry.messageIndex,
      meetingTitle: entry.title,
      analyzedAt: entry.analyzedAt,
      contradictions: analysis.contradictions ?? [],
      items: pending,
    };
  }));

  return Response.json({ groups: groups.filter(Boolean) });
}
