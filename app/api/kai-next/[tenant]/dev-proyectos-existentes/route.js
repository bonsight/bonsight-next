import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getNotionToken } from '@/lib/kaiNext/projectsNotion';
import { loadProyectosMap } from '@/lib/aria/board';
import { listProjects } from '@/lib/kaiNext/projects';

// Proyectos reales de Notion que todavía NO tienen un pointer de Proyecto de Desarrollo en este
// tenant — para poder "importarlos" a Kai Next (createDevProjectPointer) en vez de crear uno
// nuevo desde cero. Solo bonsight, mismo criterio que el resto de esta rama.
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
    return Response.json({ proyectos: [] });
  }

  const token = await getNotionToken(tenant);
  if (!token) return Response.json({ error: 'Notion no está conectado para este tenant.' }, { status: 400 });

  try {
    const [proyectosMap, existentes] = await Promise.all([
      loadProyectosMap(token),
      listProjects(tenant),
    ]);
    const yaImportados = new Set(existentes.filter((p) => p.projectKind === 'desarrollo').map((p) => p.notionProyectoId));
    const proyectos = [...proyectosMap.values()]
      .filter((p) => !yaImportados.has(p.id))
      .map((p) => ({ id: p.id, name: p.name, clienteId: p.clienteId, clienteName: p.clienteName }));
    return Response.json({ proyectos });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
