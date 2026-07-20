import { isAuthorizedForTenant } from '@/lib/kai/auth';
import { getActivityStatus } from '@/lib/kai/activities';

export async function GET(req, { params }) {
  const { tenant, activityId } = await params;
  if (!(await isAuthorizedForTenant(tenant))) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  const status = await getActivityStatus(tenant, activityId);
  if (!status) return Response.json({ error: 'Activity no encontrada' }, { status: 404 });

  return Response.json(status);
}
