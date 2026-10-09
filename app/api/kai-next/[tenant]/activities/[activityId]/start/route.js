import { isAuthorizedForTenant, getCurrentKaiNextAccess } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { startActivity, getActivityStatus } from '@/lib/kai/activities';

export async function POST(req, { params }) {
  const { tenant, activityId } = await params;
  if (!(await isAuthorizedForTenant(tenant))) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  if (!isSectionAllowed(await getCurrentKaiNextAccess(tenant), 'activities')) {
    return Response.json({ error: 'Activities no está habilitado para tu usuario.' }, { status: 403 });
  }

  await startActivity(tenant, activityId);
  const status = await getActivityStatus(tenant, activityId);
  if (!status) return Response.json({ error: 'Activity no encontrada' }, { status: 404 });

  return Response.json(status);
}
