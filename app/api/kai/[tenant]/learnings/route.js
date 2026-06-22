import { isKaiAuthorized } from '@/lib/kai/auth';
import { listLearnings, deleteLearning } from '@/lib/kai/learnings';
import { getTenantMeta } from '@/lib/kai/tenants';
import { getDemoLearnings } from '@/lib/kai/demoScripts';

export async function GET(req, { params }) {
  if (!(await isKaiAuthorized())) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  const { tenant } = await params;
  const meta = await getTenantMeta(tenant);
  if (meta?.isDemo) return Response.json({ learnings: [] });
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
