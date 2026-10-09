import { isAuthorizedForTenant, getCurrentKaiNextAccess } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { updateActivityCanvas } from '@/lib/kai/activities';

// Ediciones mecánicas sobre el canvas (renombrar, fusionar, eliminar, mover iniciativa,
// comentar, categoría/responsable, involucrados, deshacer, volver a original) — directas por
// UI, sin pasar por Claude. El chat scoped (chat/route.js) usa la MISMA función de
// lib/kai/activities.js para sus propias mutaciones, así que ambos caminos quedan consistentes.
export async function PATCH(req, { params }) {
  const { tenant, activityId } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  if (!isSectionAllowed(await getCurrentKaiNextAccess(tenant), 'activities')) {
    return Response.json({ error: 'Activities no está habilitado para tu usuario.' }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }
  const { action, params: actionParams } = body;
  if (!action) return Response.json({ error: 'Falta la acción.' }, { status: 400 });

  try {
    const canvas = await updateActivityCanvas(tenant, activityId, action, actionParams ?? {});
    return Response.json({ canvas });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
