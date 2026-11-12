import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { resolveProjectAccessLevel } from '@/lib/kaiNext/projects';
import { getNotionToken } from '@/lib/kaiNext/projectsNotion';
import { runDevMigration } from '@/lib/kaiNext/devMigration';

// Migración de Proyectos de Desarrollo desde Notion a Kai (ver lib/kaiNext/devMigration.js).
// GET = informe en seco, no escribe nada. POST { projectIds?, overwrite? } = escribe en Kai.
// Solo Directores. Lee Notion entero, así que se corre desde el servidor local (en Vercel el
// límite de 10 segundos no alcanza).
async function gate(tenant) {
  if (!(await isAuthorizedForTenant(tenant))) return { error: 'No autorizado.', status: 401 };
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!resolveProjectAccessLevel(identity).isDirectorLevel) return { error: 'Solo un Director puede migrar proyectos.', status: 403 };
  const token = await getNotionToken(tenant);
  if (!token) return { error: 'Notion no está conectado para este tenant.', status: 400 };
  return { identity, token };
}

export async function GET(req, { params }) {
  const { tenant } = await params;
  const g = await gate(tenant);
  if (g.error) return Response.json({ error: g.error }, { status: g.status });
  const ids = new URL(req.url).searchParams.get('projectIds');
  try {
    return Response.json(await runDevMigration(tenant, g.token, { dryRun: true, projectIds: ids ? ids.split(',') : undefined }));
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}

export async function POST(req, { params }) {
  const { tenant } = await params;
  const g = await gate(tenant);
  if (g.error) return Response.json({ error: g.error }, { status: g.status });
  const body = await req.json().catch(() => ({}));
  try {
    return Response.json(await runDevMigration(tenant, g.token, {
      dryRun: false,
      projectIds: Array.isArray(body.projectIds) ? body.projectIds : undefined,
      overwrite: body.overwrite === true,
    }));
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
