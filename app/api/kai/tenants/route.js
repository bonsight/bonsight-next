import { getAllTenantsMeta, createTenant } from '@/lib/kai/tenants';

export async function GET() {
  try {
    const tenants = await getAllTenantsMeta();
    return Response.json({ tenants });
  } catch (err) {
    console.error('GET /api/kai/tenants:', err?.message);
    return Response.json({ error: 'Error fetching tenants' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { name, slug, country, industry, status } = await req.json();

    if (!name?.trim() || !slug?.trim()) {
      return Response.json({ error: 'name y slug son requeridos' }, { status: 400 });
    }

    const clean = slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (!clean) return Response.json({ error: 'slug inválido' }, { status: 400 });

    const meta = await createTenant({ name: name.trim(), slug: clean, country, industry, status });
    return Response.json({ ok: true, meta });
  } catch (err) {
    const msg = err?.message ?? 'Error creando tenant';
    const status = msg.includes('ya existe') ? 409 : 500;
    return Response.json({ error: msg }, { status });
  }
}
