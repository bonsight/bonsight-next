import { getActivityByCode, addParticipant } from '@/lib/kai/activities';

export async function POST(req, { params }) {
  const { code } = await params;
  const { name } = await req.json();

  if (!name || !String(name).trim()) {
    return Response.json({ error: 'Necesitamos tu nombre para continuar.' }, { status: 400 });
  }

  const ref = await getActivityByCode(code);
  if (!ref) {
    return Response.json({ error: 'No encontramos esta actividad. Verificá el código o el link.' }, { status: 404 });
  }

  try {
    const participant = await addParticipant(ref.tenant, ref.activityId, name);
    return Response.json({
      participantId: participant.id,
      participantName: participant.name,
      tenant: ref.tenant,
      activityId: ref.activityId,
      activityName: ref.meta.name,
    });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo unir a la actividad.' }, { status: 409 });
  }
}
