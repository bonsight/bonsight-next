import { isAuthorizedForTenant } from '@/lib/aria/auth';
import { suggestFichaOrder } from '@/lib/aria/fichaOrder';

export const maxDuration = 60;

export async function POST(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { questionId } = await req.json().catch(() => ({}));
  if (!questionId) return Response.json({ error: 'questionId es requerido.' }, { status: 400 });

  try {
    const groups = await suggestFichaOrder(tenant, id, questionId);
    return Response.json({ groups });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo sugerir el orden.' }, { status: 400 });
  }
}
