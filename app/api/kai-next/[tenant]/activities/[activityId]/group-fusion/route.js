import { isAuthorizedForTenant, getCurrentKaiNextAccess } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { suggestGroupFusions } from '@/lib/kaiNext/canvasAnalysis';

// "Revisar fusiones sugeridas" — un botón, no el chat: compara grupos de preguntas distintas
// del canvas y sugiere cuáles fusionar antes de armar fichas por separado (ver
// lib/kaiNext/canvasAnalysis.js, portado 1:1 de lib/aria/groupFusion.js).
export async function POST(req, { params }) {
  const { tenant, activityId } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  if (!isSectionAllowed(await getCurrentKaiNextAccess(tenant), 'activities')) {
    return Response.json({ error: 'Activities no está habilitado para tu usuario.' }, { status: 403 });
  }

  try {
    const data = await suggestGroupFusions(tenant, activityId);
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
