import { empresaTaskContext } from '@/lib/kaiNext/empresaTaskAccess';
import { listEmpresaTasks, createEmpresaTask } from '@/lib/kaiNext/empresaTasks';
import { notifyEmpresaTask } from '@/lib/kaiNext/notifications';

export async function GET(req, { params }) {
  const { tenant, empresaId } = await params;
  const ctx = await empresaTaskContext(tenant, empresaId);
  if (ctx.error) return ctx.error;
  return Response.json({ tasks: await listEmpresaTasks(tenant, empresaId), canManage: ctx.canManage, personId: ctx.identity.personId });
}

export async function POST(req, { params }) {
  const { tenant, empresaId } = await params;
  const ctx = await empresaTaskContext(tenant, empresaId);
  if (ctx.error) return ctx.error;
  if (!ctx.canManage) return Response.json({ error: 'Solo un Director o Supervisor puede crear tareas de la empresa.' }, { status: 403 });
  try {
    const task = await createEmpresaTask(tenant, empresaId, await req.json(), {
      createdBy: ctx.identity.personId, canValidate: ctx.canValidate, personId: ctx.identity.personId,
    });
    const notify = { actorId: ctx.identity.personId, actorName: ctx.actor };
    await notifyEmpresaTask(tenant, ctx.empresa, task, 'asignada', { ...notify, newResponsables: task.responsables });
    if (task.status === 'review') await notifyEmpresaTask(tenant, ctx.empresa, task, 'revision', notify);
    return Response.json({ task });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
