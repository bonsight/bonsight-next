import { isAuthorizedForTenant } from '@/lib/kaiNext/auth';
import { listAreas, addArea, getAreaSnapshot } from '@/lib/kaiNext/analysisAreas';

export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const areas = await listAreas(tenant);
  const snapshots = {};
  await Promise.all(areas.map(async (a) => {
    snapshots[a.id] = await getAreaSnapshot(tenant, a.id);
  }));
  return Response.json({ areas, snapshots });
}

export async function POST(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const { label } = await req.json().catch(() => ({}));
  if (!label || typeof label !== 'string' || !label.trim()) {
    return Response.json({ error: 'Falta el nombre del área.' }, { status: 400 });
  }
  const areas = await addArea(tenant, label);
  return Response.json({ areas });
}
