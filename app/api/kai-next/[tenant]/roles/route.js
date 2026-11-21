import { getKaiNextAdminScope } from '@/lib/kaiNext/auth';
import { listRoles, createRole } from '@/lib/kaiNext/roles';

// Cualquier admin del tenant ve los roles (los necesita para asignarlos en Equipo); solo el
// admin con alcance 'full' los crea o edita.
export async function GET(req, { params }) {
  const { tenant } = await params;
  const scope = await getKaiNextAdminScope(tenant);
  if (!scope) return Response.json({ error: 'No autorizado.' }, { status: 403 });
  return Response.json({ roles: await listRoles(tenant), canEdit: scope === 'full', adminScope: scope });
}

export async function POST(req, { params }) {
  const { tenant } = await params;
  if ((await getKaiNextAdminScope(tenant)) !== 'full') {
    return Response.json({ error: 'Solo un admin con acceso completo puede crear roles.' }, { status: 403 });
  }
  try {
    const role = await createRole(tenant, await req.json());
    return Response.json({ role });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo crear.' }, { status: 400 });
  }
}
