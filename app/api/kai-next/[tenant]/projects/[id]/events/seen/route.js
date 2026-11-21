import { projectContext } from '@/lib/kaiNext/projectAccess';
import { markEventsSeen } from '@/lib/kaiNext/projects';

// Marca novedades como vistas por quien está mirando (todas, o las de eventIds).
export async function POST(req, { params }) {
  const { tenant, id } = await params;
  const ctx = await projectContext(tenant, id);
  if (ctx.error) return ctx.error;
  const { eventIds } = await req.json().catch(() => ({}));
  const key = ctx.identity.personId ?? ctx.identity.chatOwnerId;
  const changed = await markEventsSeen(tenant, id, key, Array.isArray(eventIds) ? eventIds : null);
  return Response.json({ ok: true, changed });
}
