import { isAuthorizedForTenant } from '@/lib/aria/auth';
import { updateCanvasInMessage } from '@/lib/aria/memory';

export async function PATCH(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { messageIndex, action, ...actionParams } = await req.json();
  if (typeof messageIndex !== 'number' || !action) {
    return Response.json({ error: 'messageIndex y action son requeridos.' }, { status: 400 });
  }

  try {
    const canvas = await updateCanvasInMessage(tenant, id, messageIndex, action, actionParams);
    return Response.json({ canvas });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo actualizar el canvas.' }, { status: 400 });
  }
}
