import { isLabsAdminAuthorized } from '@/lib/labs/auth';
import { updateTenant } from '@/lib/labs/tenants';

// Config a nivel tenant (no de un proyecto puntual) — hoy solo allowedProjectKinds. Admin-only:
// a diferencia de /drive, esto decide qué tipos de proyecto puede crear el cliente, no algo
// que el cliente mismo deba poder tocar.
export async function PATCH(req, { params }) {
  const { tenant } = await params;
  if (!(await isLabsAdminAuthorized())) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const { allowedProjectKinds } = await req.json();
  try {
    const meta = await updateTenant(tenant, { allowedProjectKinds });
    return Response.json({ ok: true, meta });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo actualizar.' }, { status: 400 });
  }
}
