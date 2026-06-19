import { isAuthorized } from '@/lib/aria/auth';
import { getInvestigation, updateInvestigationMeta, deleteInvestigation } from '@/lib/aria/memory';

export async function GET(req, { params }) {
  if (!(await isAuthorized())) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { tenant, id } = await params;
  const investigation = await getInvestigation(tenant, id);
  if (!investigation) {
    return Response.json({ error: 'No encontrada.' }, { status: 404 });
  }

  return Response.json(investigation);
}

export async function PATCH(req, { params }) {
  if (!(await isAuthorized())) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { tenant, id } = await params;
  const updates = await req.json();
  const result = await updateInvestigationMeta(tenant, id, updates);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ meta: result.meta });
}

export async function DELETE(req, { params }) {
  if (!(await isAuthorized())) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { tenant, id } = await params;
  await deleteInvestigation(tenant, id);
  return Response.json({ ok: true });
}
