import { isLabsAdminAuthorized } from '@/lib/labs/auth';
import { listTenants, createTenant } from '@/lib/labs/tenants';

export async function GET() {
  if (!(await isLabsAdminAuthorized())) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const tenants = await listTenants();
  return Response.json({ tenants });
}

export async function POST(req) {
  if (!(await isLabsAdminAuthorized())) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const { name, slug } = await req.json();
  if (!name?.trim() || !slug?.trim()) {
    return Response.json({ error: 'name y slug son requeridos' }, { status: 400 });
  }
  const clean = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!clean) return Response.json({ error: 'slug inválido' }, { status: 400 });

  try {
    const meta = await createTenant({ name: name.trim(), slug: clean });
    return Response.json({ ok: true, meta });
  } catch (err) {
    const msg = err?.message ?? 'Error creando tenant';
    return Response.json({ error: msg }, { status: msg.includes('ya existe') ? 409 : 500 });
  }
}
