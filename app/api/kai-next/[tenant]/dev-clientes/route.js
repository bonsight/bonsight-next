import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { listProjects } from '@/lib/kaiNext/projects';

// Sugerencias de cliente para "Nuevo proyecto de desarrollo": los que ya usan otros proyectos.
export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) {
    return Response.json({ error: 'Proyectos no está habilitado para tu usuario.' }, { status: 403 });
  }
  const projects = await listProjects(tenant);
  const clientes = [...new Set(projects.map((p) => p.clienteName?.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  return Response.json({ clientes });
}
