import { isAuthorizedForTenant, getCurrentKaiNextAccess } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getActivityCanvas, getActivityStatus, updateActivityCanvas } from '@/lib/kai/activities';
import { consolidateFicha, startFichaForCanvasGroup } from '@/lib/kai/ficha';

// Ciclo de vida de la ficha de un grupo del canvas — deliberadamente por fuera del chat
// (ver chat/route.js): el polling de estado y la revisión del borrador consolidado antes de
// guardar son acciones mecánicas/de UI, igual que en Aria (botón "Consolidar respuestas",
// no algo que uno le pide a Claude en lenguaje natural).

function findGroup(canvas, questionId, groupId) {
  const question = canvas?.questions?.find((q) => q.questionId === questionId);
  const group = question?.groups?.find((g) => g.id === groupId);
  return { question, group };
}

export async function GET(req, { params }) {
  const { tenant, activityId } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  if (!isSectionAllowed(await getCurrentKaiNextAccess(tenant), 'activities')) {
    return Response.json({ error: 'Activities no está habilitado para tu usuario.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const questionId = searchParams.get('questionId');
  const groupId = searchParams.get('groupId');

  const canvas = await getActivityCanvas(tenant, activityId);
  const { group } = findGroup(canvas, questionId, groupId);
  if (!group) return Response.json({ error: 'Grupo no encontrado.' }, { status: 404 });
  if (!group.fichaActivityId) return Response.json({ error: 'Este grupo no tiene una ficha en curso.' }, { status: 404 });

  const status = await getActivityStatus(tenant, group.fichaActivityId);
  return Response.json({ status, fichaCode: group.fichaCode, saved: group.ficha ?? null });
}

// Arrancar la ficha de un grupo — botón directo "Armar ficha" en el header de la tarjeta
// (ver IconClipboard en KaiNextCanvasGroup.jsx), misma lógica que la tool del chat
// start_ficha_for_group (lib/kaiNext/tools/activityCanvas.js), compartida vía
// startFichaForCanvasGroup (lib/kai/ficha.js) para no duplicarla en los dos lugares.
export async function POST(req, { params }) {
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
  const { questionId, groupId } = body;

  try {
    const canvas = await startFichaForCanvasGroup(tenant, activityId, { questionId, groupId });
    return Response.json({ canvas });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}

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
  const { questionId, groupId, action } = body;

  const canvas = await getActivityCanvas(tenant, activityId);
  const { group } = findGroup(canvas, questionId, groupId);
  if (!group) return Response.json({ error: 'Grupo no encontrado.' }, { status: 404 });

  try {
    if (action === 'consolidate') {
      if (!group.fichaActivityId) return Response.json({ error: 'Este grupo no tiene una ficha en curso.' }, { status: 400 });
      const draft = await consolidateFicha(tenant, group.fichaActivityId);
      return Response.json({ draft });
    }
    if (action === 'save') {
      const updatedCanvas = await updateActivityCanvas(tenant, activityId, 'save_ficha', { questionId, groupId, ficha: body.ficha });
      return Response.json({ canvas: updatedCanvas });
    }
    return Response.json({ error: `Acción desconocida: ${action}` }, { status: 400 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
