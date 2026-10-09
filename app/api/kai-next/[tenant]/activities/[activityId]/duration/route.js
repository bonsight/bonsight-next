import { isAuthorizedForTenant, getCurrentKaiNextAccess } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { updateQuestionDuration, getActivityStatus } from '@/lib/kai/activities';

export async function PATCH(req, { params }) {
  const { tenant, activityId } = await params;
  if (!(await isAuthorizedForTenant(tenant))) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  if (!isSectionAllowed(await getCurrentKaiNextAccess(tenant), 'activities')) {
    return Response.json({ error: 'Activities no está habilitado para tu usuario.' }, { status: 403 });
  }

  const { seconds } = await req.json();
  if (!seconds || Number.isNaN(Number(seconds))) {
    return Response.json({ error: 'seconds requerido' }, { status: 400 });
  }

  await updateQuestionDuration(tenant, activityId, seconds);
  const status = await getActivityStatus(tenant, activityId);
  if (!status) return Response.json({ error: 'Activity no encontrada' }, { status: 404 });

  return Response.json(status);
}
