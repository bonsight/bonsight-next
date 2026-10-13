import { isAuthorizedForTenant, getCurrentLabsUser } from '@/lib/labs/auth';
import { markEventSeen } from '@/lib/labs/experiments';

// Marca un evento de Historia como visto por la persona actual — PATCH sin body, el id va en
// la URL. Cualquiera con acceso al tenant puede marcarlo (no hay restricción de rol: ver un
// evento no es una acción sensible, a diferencia de dejar feedback).
export async function PATCH(req, { params }) {
  const { tenant, id, eventId } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const user = await getCurrentLabsUser(tenant);
  if (!user) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  const event = await markEventSeen(tenant, id, eventId, user.id);
  if (!event) return Response.json({ error: 'Evento no encontrado.' }, { status: 404 });
  return Response.json({ ok: true, event });
}
