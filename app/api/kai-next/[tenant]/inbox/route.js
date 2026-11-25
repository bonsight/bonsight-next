import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { listInbox, markInboxRead, withOverdue } from '@/lib/kaiNext/inbox';

// Avisos de Kai de quien está mirando (menú de usuario). El equipo Bonsight sin tenant user no tiene bandeja.
export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  const identity = await getCurrentKaiNextIdentity(tenant);
  return Response.json(await withOverdue(tenant, identity, await listInbox(tenant, identity.personId)));
}

export async function POST(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  const identity = await getCurrentKaiNextIdentity(tenant);
  const { read } = await req.json().catch(() => ({}));
  await markInboxRead(tenant, identity.personId, read === 'all' ? 'all' : read);
  return Response.json(await withOverdue(tenant, identity, await listInbox(tenant, identity.personId)));
}
