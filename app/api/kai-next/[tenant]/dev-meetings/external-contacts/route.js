import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { listExternalContacts } from '@/lib/kaiNext/devMeetings';

export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'reuniones')) {
    return Response.json({ error: 'Reuniones no está habilitado para tu usuario.' }, { status: 403 });
  }
  const contacts = await listExternalContacts(tenant);
  return Response.json({ contacts });
}
