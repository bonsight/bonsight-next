import { getActivityByCode, getParticipant, submitDraft } from '@/lib/kai/activities';

export async function POST(req, { params }) {
  const { code } = await params;
  const { participantId, questionId } = await req.json();

  if (!participantId || !questionId) {
    return Response.json({ error: 'Solicitud inválida' }, { status: 400 });
  }

  const ref = await getActivityByCode(code);
  if (!ref) return Response.json({ error: 'Actividad no encontrada' }, { status: 404 });

  const { tenant, activityId, meta } = ref;
  const participant = await getParticipant(tenant, activityId, participantId);
  if (!participant) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  if (meta.status === 'finished') return Response.json({ error: 'Esta actividad ya finalizó.' }, { status: 409 });

  try {
    const answer = await submitDraft(tenant, activityId, participantId, questionId);
    return Response.json({ ok: true, itemCount: answer.items.length });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo enviar la lista.' }, { status: 400 });
  }
}
