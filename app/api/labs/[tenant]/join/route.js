import { isAuthorizedForTenant } from '@/lib/labs/auth';
import { joinTenant } from '@/lib/labs/experiments';

export async function POST(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const { name, role } = await req.json();
  try {
    const participant = await joinTenant(tenant, { name, role });
    return Response.json({ ok: true, participant });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo unir.' }, { status: 400 });
  }
}
