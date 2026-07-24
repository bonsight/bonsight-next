import { isAuthorizedForTenant } from '@/lib/aria/auth';
import { updateCanvasInMessage } from '@/lib/aria/memory';
import { startFichaForGroup, consolidateFicha } from '@/lib/kai/ficha';
import { getActivityStatus } from '@/lib/kai/activities';

// Arranca la Activity self_paced de una épica y la vincula al grupo del canvas.
export async function POST(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { messageIndex, questionId, groupId, groupName } = await req.json();
  if (typeof messageIndex !== 'number' || !questionId || !groupId) {
    return Response.json({ error: 'messageIndex, questionId y groupId son requeridos.' }, { status: 400 });
  }

  try {
    const activity = await startFichaForGroup(tenant, {
      name: `Ficha — ${groupName || 'Épica'}`,
      investigationId: id,
      questionId,
      groupId,
    });
    const canvas = await updateCanvasInMessage(tenant, id, messageIndex, 'link_ficha_activity', {
      questionId,
      groupId,
      activityId: activity.id,
      code: activity.code,
    });
    return Response.json({ canvas, activityId: activity.id, code: activity.code });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo iniciar la ficha.' }, { status: 400 });
  }
}

// Estado en vivo de la ficha (conectados / respondidas por persona) para el organizador.
export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const activityId = new URL(req.url).searchParams.get('activityId');
  if (!activityId) return Response.json({ error: 'activityId es requerido.' }, { status: 400 });

  const status = await getActivityStatus(tenant, activityId);
  if (!status) return Response.json({ error: 'No se encontró esa ficha.' }, { status: 404 });
  return Response.json(status);
}

// Consolida las respuestas con Claude — devuelve un borrador, todavía no lo guarda
// en el canvas (eso lo hace el action "save_ficha" del PATCH de /canvas).
export async function PATCH(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { activityId } = await req.json();
  if (!activityId) return Response.json({ error: 'activityId es requerido.' }, { status: 400 });

  try {
    const ficha = await consolidateFicha(tenant, activityId);
    return Response.json({ ficha });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo consolidar la ficha.' }, { status: 400 });
  }
}
