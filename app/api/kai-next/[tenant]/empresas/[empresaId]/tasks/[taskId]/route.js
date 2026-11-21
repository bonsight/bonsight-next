import { empresaTaskContext } from '@/lib/kaiNext/empresaTaskAccess';
import { updateEmpresaTask, deleteEmpresaTask } from '@/lib/kaiNext/empresaTasks';
import { notifyEmpresaTask } from '@/lib/kaiNext/notifications';

export async function PATCH(req, { params }) {
  const { tenant, empresaId, taskId } = await params;
  const ctx = await empresaTaskContext(tenant, empresaId);
  if (ctx.error) return ctx.error;
  try {
    const result = await updateEmpresaTask(tenant, empresaId, taskId, await req.json(), {
      canManage: ctx.canManage, canValidate: ctx.canValidate, personId: ctx.identity.personId, actor: ctx.actor,
    });
    const notify = { actorId: ctx.identity.personId, actorName: ctx.actor };
    if (result.addedResponsables.length) await notifyEmpresaTask(tenant, ctx.empresa, result.task, 'asignada', { ...notify, newResponsables: result.addedResponsables });
    if (result.enteredReview) await notifyEmpresaTask(tenant, ctx.empresa, result.task, 'revision', notify);
    if (result.validated) await notifyEmpresaTask(tenant, ctx.empresa, result.task, 'validada', notify);
    return Response.json({ task: result.task, sentToReview: result.sentToReview });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  const { tenant, empresaId, taskId } = await params;
  const ctx = await empresaTaskContext(tenant, empresaId);
  if (ctx.error) return ctx.error;
  if (!ctx.canManage) return Response.json({ error: 'Solo un Director o Supervisor puede eliminar tareas.' }, { status: 403 });
  try {
    await deleteEmpresaTask(tenant, empresaId, taskId);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
