import { isAuthorizedForTenant } from '@/lib/kaiNext/auth';
import { removeArea, updateAreaSources, updateAreaKpis } from '@/lib/kaiNext/analysisAreas';

export async function PATCH(req, { params }) {
  const { tenant, areaId } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const areas = 'kpis' in body
    ? await updateAreaKpis(tenant, areaId, body.kpis)
    : await updateAreaSources(tenant, areaId, body.sources);
  return Response.json({ areas });
}

export async function DELETE(req, { params }) {
  const { tenant, areaId } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const areas = await removeArea(tenant, areaId);
  return Response.json({ areas });
}
