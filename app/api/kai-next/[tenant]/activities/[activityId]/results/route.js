import { isAuthorizedForTenant, getCurrentKaiNextAccess } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getActivityResults } from '@/lib/kai/activities';

export async function GET(req, { params }) {
  const { tenant, activityId } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  if (!isSectionAllowed(await getCurrentKaiNextAccess(tenant), 'activities')) {
    return Response.json({ error: 'Activities no está habilitado para tu usuario.' }, { status: 403 });
  }
  const results = await getActivityResults(tenant, activityId);
  if (!results) return Response.json({ error: 'Actividad no encontrada.' }, { status: 404 });
  return Response.json(results);
}
