import { isAuthorizedForTenant } from '@/lib/kai/auth';
import { deleteSource, rebuildDigest } from '@/lib/kai/knowledgeSources';

export async function DELETE(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  await deleteSource(tenant, id);
  await rebuildDigest(tenant);
  return Response.json({ ok: true });
}
