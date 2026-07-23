import { isAuthorizedForTenant } from '@/lib/kai/auth';
import { listMeetingIndex } from '@/lib/kai/meetings';

export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const meetings = await listMeetingIndex(tenant);
  return Response.json({ meetings });
}
