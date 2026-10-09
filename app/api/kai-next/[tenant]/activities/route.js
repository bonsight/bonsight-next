import { isAuthorizedForTenant, getCurrentKaiNextAccess } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { listActivitiesForTenant } from '@/lib/kai/activities';

// Mismo backend que ya usa Kai Legacy (lib/kai/activities.js, 100% Redis, cero storage nuevo) —
// acá solo se lista para mostrar un historial centralizado; crear/correr una actividad sigue
// siendo un flujo de chat (no se duplica ese control-plane acá).
export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  if (!isSectionAllowed(await getCurrentKaiNextAccess(tenant), 'activities')) {
    return Response.json({ error: 'Activities no está habilitado para tu usuario.' }, { status: 403 });
  }
  const activities = await listActivitiesForTenant(tenant);
  return Response.json({ activities });
}
