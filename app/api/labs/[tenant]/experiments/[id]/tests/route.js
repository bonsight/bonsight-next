import { isAuthorizedForTenant } from '@/lib/labs/auth';
import { createTest } from '@/lib/labs/experiments';

export async function POST(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const { name, icon, fields } = await req.json();
  try {
    const test = await createTest(tenant, id, { name, icon, fields });
    return Response.json({ ok: true, test });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo crear la prueba.' }, { status: 400 });
  }
}
