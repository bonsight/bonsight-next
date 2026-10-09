import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getNotionToken, listClientes } from '@/lib/kaiNext/projectsNotion';

// Lista de Clientes real (Notion) para el picker de "Nuevo proyecto de desarrollo" — solo
// tiene sentido para el tenant bonsight, mismo criterio que el resto de esta rama.
export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) {
    return Response.json({ error: 'Proyectos no está habilitado para tu usuario.' }, { status: 403 });
  }
  if (tenant !== 'bonsight') {
    return Response.json({ clientes: [] });
  }

  const token = await getNotionToken(tenant);
  if (!token) return Response.json({ error: 'Notion no está conectado para este tenant.' }, { status: 400 });

  try {
    const clientes = await listClientes(token);
    return Response.json({ clientes });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
