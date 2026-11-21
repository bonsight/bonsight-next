import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { buildOverview } from '@/lib/kaiNext/overview';
import { empresaAllows } from '@/lib/kaiNext/empresas';

// Pantallas Empresas y Resumen de empresa: proyectos con novedades, vencidas y lo que espera
// respuesta de quien mira. ?empresa=<id> limita a una empresa.
export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) {
    return Response.json({ error: 'Proyectos no está habilitado para tu usuario.' }, { status: 403 });
  }
  const empresaId = new URL(req.url).searchParams.get('empresa') || null;
  if (empresaId && !empresaAllows(identity.empresaIds, { empresaId })) {
    return Response.json({ error: 'No tienes acceso a esa empresa.' }, { status: 403 });
  }
  const data = await buildOverview(tenant, identity, { empresaId });
  return Response.json({ ...data, personId: identity.personId });
}
