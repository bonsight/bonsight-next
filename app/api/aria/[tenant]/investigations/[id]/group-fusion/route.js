import { isAuthorizedForTenant } from '@/lib/aria/auth';
import { suggestGroupFusions } from '@/lib/aria/groupFusion';

export const maxDuration = 60;

export async function POST(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  try {
    const result = await suggestGroupFusions(tenant, id);
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudieron sugerir fusiones.' }, { status: 400 });
  }
}
