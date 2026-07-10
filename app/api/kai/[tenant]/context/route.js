import { isAuthorizedForTenant } from '@/lib/kai/auth';
import { buildBIC } from '@/lib/kai/bic';

export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const domain = searchParams.get('domain') ?? null;

  try {
    const context = await buildBIC(tenant, { domain });
    return Response.json({ tenant, ...context });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
