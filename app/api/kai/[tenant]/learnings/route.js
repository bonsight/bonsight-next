import { isKaiAuthorized } from '@/lib/kai/auth';
import { listLearnings, deleteLearning } from '@/lib/kai/learnings';

export async function GET(req, { params }) {
  if (!(await isKaiAuthorized())) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  const { tenant } = await params;
  const learnings = await listLearnings(tenant);
  return Response.json({ learnings });
}

export async function DELETE(req, { params }) {
  if (!(await isKaiAuthorized())) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  const { tenant } = await params;
  const { id } = await req.json();
  if (!id) return Response.json({ error: 'id requerido' }, { status: 400 });
  await deleteLearning(tenant, id);
  return Response.json({ ok: true });
}
