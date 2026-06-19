import { isKaiAuthorized } from '@/lib/kai/auth';
import { listConversations, getConversationMessages } from '@/lib/kai/memory';
import { listLearnings } from '@/lib/kai/learnings';

export async function GET(req, { params }) {
  if (!(await isKaiAuthorized())) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  const { tenant } = await params;

  const [conversations, learnings] = await Promise.all([
    listConversations(tenant),
    listLearnings(tenant),
  ]);

  const convDebug = await Promise.all(
    conversations.map(async (conv) => {
      const messages = await getConversationMessages(tenant, conv.id);
      const userMsgs = messages.filter((m) => m.role === 'user');
      return {
        id:        conv.id,
        title:     conv.title,
        createdAt: conv.createdAt,
        userMsgs:  userMsgs.slice(0, 4).map((m) => String(m.content).slice(0, 80)),
      };
    })
  );

  const learningsSummary = learnings.map((l) => ({
    id:             l.id,
    conversationId: l.conversationId,
    area:           l.area,
    impact:         l.impact,
    content:        String(l.content).slice(0, 60),
  }));

  return Response.json({ conversations: convDebug, learnings: learningsSummary });
}
