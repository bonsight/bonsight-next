import { isAuthorizedForTenant } from '@/lib/kai/auth';
import { getActivePriorities, setActivePriorities } from '@/lib/kai/activePriorities';

export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const priorities = await getActivePriorities(tenant);
  return Response.json({ priorities });
}

export async function PUT(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const { priorities } = await req.json();
  if (!Array.isArray(priorities)) {
    return Response.json({ error: 'priorities debe ser un array.' }, { status: 400 });
  }
  const cleaned = priorities.map((p) => String(p).trim()).filter(Boolean).slice(0, 10);
  await setActivePriorities(tenant, cleaned);
  return Response.json({ priorities: cleaned });
}
