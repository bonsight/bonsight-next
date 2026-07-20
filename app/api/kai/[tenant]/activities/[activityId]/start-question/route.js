import { isAuthorizedForTenant } from '@/lib/kai/auth';
import { startCurrentQuestion, getActivityStatus } from '@/lib/kai/activities';

export async function POST(req, { params }) {
  const { tenant, activityId } = await params;
  if (!(await isAuthorizedForTenant(tenant))) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  await startCurrentQuestion(tenant, activityId);
  const status = await getActivityStatus(tenant, activityId);
  if (!status) return Response.json({ error: 'Activity no encontrada' }, { status: 404 });

  return Response.json(status);
}
