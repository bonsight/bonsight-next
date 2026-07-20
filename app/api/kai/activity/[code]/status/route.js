import { getActivityByCode, getParticipant, touchParticipant, getPublicActivityStatus } from '@/lib/kai/activities';

export async function GET(req, { params }) {
  const { code } = await params;
  const participantId = req.nextUrl.searchParams.get('participantId');
  if (!participantId) return Response.json({ error: 'participantId requerido' }, { status: 400 });

  const ref = await getActivityByCode(code);
  if (!ref) return Response.json({ error: 'Actividad no encontrada' }, { status: 404 });

  const participant = await getParticipant(ref.tenant, ref.activityId, participantId);
  if (!participant) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  touchParticipant(ref.tenant, ref.activityId, participantId).catch(() => null);

  const status = await getPublicActivityStatus(ref.tenant, ref.activityId);
  return Response.json(status);
}
