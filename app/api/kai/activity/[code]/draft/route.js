import { getActivityByCode, getParticipant, getActivityTemplate, addDraftItem, editDraftItem, removeDraftItem, getDraft } from '@/lib/kai/activities';

export async function GET(req, { params }) {
  const { code } = await params;
  const participantId = req.nextUrl.searchParams.get('participantId');
  const questionId = req.nextUrl.searchParams.get('questionId');
  if (!participantId || !questionId) return Response.json({ error: 'Solicitud inválida' }, { status: 400 });

  const ref = await getActivityByCode(code);
  if (!ref) return Response.json({ error: 'Actividad no encontrada' }, { status: 404 });

  const { tenant, activityId } = ref;
  const participant = await getParticipant(tenant, activityId, participantId);
  if (!participant) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  const items = await getDraft(tenant, activityId, participantId, questionId);
  return Response.json({ items });
}

export async function POST(req, { params }) {
  const { code } = await params;
  const { participantId, questionId, action, text, index } = await req.json();

  if (!participantId || !questionId || !action) {
    return Response.json({ error: 'Solicitud inválida' }, { status: 400 });
  }

  const ref = await getActivityByCode(code);
  if (!ref) return Response.json({ error: 'Actividad no encontrada' }, { status: 404 });

  const { tenant, activityId, meta } = ref;
  const participant = await getParticipant(tenant, activityId, participantId);
  if (!participant) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  if (meta.status === 'finished') return Response.json({ error: 'Esta actividad ya finalizó.' }, { status: 409 });

  const template = await getActivityTemplate(tenant, activityId);
  const question = template.find((q) => q.id === questionId);
  if (!question || question.responseType !== 'multiple') {
    return Response.json({ error: 'Esta pregunta no acepta múltiples respuestas.' }, { status: 409 });
  }

  let items;
  try {
    if (action === 'add') {
      if (!text?.trim()) return Response.json({ error: 'Texto requerido.' }, { status: 400 });
      items = await addDraftItem(tenant, activityId, participantId, questionId, text);
    } else if (action === 'edit') {
      if (typeof index !== 'number' || !text?.trim()) return Response.json({ error: 'index y text requeridos.' }, { status: 400 });
      items = await editDraftItem(tenant, activityId, participantId, questionId, index, text);
    } else if (action === 'remove') {
      if (typeof index !== 'number') return Response.json({ error: 'index requerido.' }, { status: 400 });
      items = await removeDraftItem(tenant, activityId, participantId, questionId, index);
    } else {
      return Response.json({ error: `Acción desconocida: ${action}` }, { status: 400 });
    }
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo actualizar la lista.' }, { status: 500 });
  }

  return Response.json({ items });
}
