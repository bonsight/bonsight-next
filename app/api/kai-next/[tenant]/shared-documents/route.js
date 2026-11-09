import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getConversation } from '@/lib/kaiNext/conversations';
import { listTenantUsers } from '@/lib/kai/tenantUsers';
import { listSharesForConversation, saveShare, removeShare } from '@/lib/kaiNext/sharedDocuments';

async function authorize(tenant) {
  if (!(await isAuthorizedForTenant(tenant))) {
    return { error: Response.json({ error: 'No autorizado.' }, { status: 401 }) };
  }
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!identity.chatOwnerId || !isSectionAllowed(identity.access, 'chat')) {
    return { error: Response.json({ error: 'No tienes permiso para compartir documentos.' }, { status: 403 }) };
  }
  return { identity };
}

// Los chats son privados: solo el dueño de la conversación puede compartir lo que hay en ella.
async function loadOwnConversation(tenant, conversationId, identity) {
  const conversation = conversationId ? await getConversation(tenant, conversationId) : null;
  return conversation?.meta.owner === identity.chatOwnerId ? conversation : null;
}

export async function GET(req, { params }) {
  const { tenant } = await params;
  const { identity, error } = await authorize(tenant);
  if (error) return error;

  const conversationId = new URL(req.url).searchParams.get('conversationId');
  if (!(await loadOwnConversation(tenant, conversationId, identity))) {
    return Response.json({ error: 'Conversación no encontrada.' }, { status: 404 });
  }
  return Response.json({ shares: await listSharesForConversation(tenant, conversationId) });
}

export async function POST(req, { params }) {
  const { tenant } = await params;
  const { identity, error } = await authorize(tenant);
  if (error) return error;

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }
  const { conversationId, title, format, audience } = body;

  const conversation = await loadOwnConversation(tenant, conversationId, identity);
  if (!conversation) return Response.json({ error: 'Conversación no encontrada.' }, { status: 404 });

  // El documento se toma de la conversación guardada, nunca del body del cliente.
  const document = conversation.messages
    .flatMap((m) => m.documents ?? [])
    .reverse()
    .find((d) => d.title === title && d.format === format && !d.sharedId);
  if (!document) return Response.json({ error: 'No se encontró ese documento en la conversación.' }, { status: 404 });

  let cleanAudience;
  if (audience?.type === 'team') {
    cleanAudience = { type: 'team', personIds: [] };
  } else {
    const activeIds = new Set((await listTenantUsers(tenant)).filter((u) => u.active !== false).map((u) => u.id));
    const personIds = (audience?.personIds ?? []).filter((id) => activeIds.has(id));
    if (!personIds.length) return Response.json({ error: 'Elige al menos una persona.' }, { status: 400 });
    cleanAudience = { type: 'people', personIds };
  }

  return Response.json({ share: await saveShare(tenant, { conversationId, document, audience: cleanAudience, identity }) });
}

export async function DELETE(req, { params }) {
  const { tenant } = await params;
  const { identity, error } = await authorize(tenant);
  if (error) return error;

  try {
    await removeShare(tenant, new URL(req.url).searchParams.get('id'), identity);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
