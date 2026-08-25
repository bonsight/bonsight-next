import { isAuthorizedForTenant, isLabsAdminAuthorized, getCurrentLabsUser } from '@/lib/labs/auth';
import { listUsers, createUser } from '@/lib/labs/users';

// Lectura: cualquier persona ya logueada en el tenant (necesita ver el roster para
// armar los selectores de "asignar Supervisor" / "asignar Registrador").
export async function GET(req, { params }) {
  const { tenant } = await params;
  const isAdmin = await isLabsAdminAuthorized();
  if (!isAdmin) {
    if (!(await isAuthorizedForTenant(tenant))) {
      return Response.json({ error: 'No autorizado.' }, { status: 401 });
    }
    if (!(await getCurrentLabsUser(tenant))) {
      return Response.json({ error: 'No autorizado.' }, { status: 401 });
    }
  }
  const users = await listUsers(tenant);
  return Response.json({ users });
}

// Alta de usuarios: solo el admin interno de Bonsight (isLabsAdminAuthorized) —
// es quien administra el roster de cada tenant.
export async function POST(req, { params }) {
  const { tenant } = await params;
  if (!(await isLabsAdminAuthorized())) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const { name, role } = await req.json();
  try {
    const user = await createUser(tenant, { name, role });
    return Response.json({ ok: true, user });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo crear el usuario.' }, { status: 400 });
  }
}
