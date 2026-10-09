import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { resolveProjectAccessLevel } from '@/lib/kaiNext/projects';
import { listTenantUsers } from '@/lib/kai/tenantUsers';
import { parseCivilExcel } from '@/lib/labs/civilImport';

// Reuso literal de lib/labs/civilImport.js (parseCivilExcel es pura: buffer + roster → objetos,
// sin Redis ni auth adentro) — ver decisión en el plan de Fase 2. No persiste nada, la creación
// real pasa por POST /projects con el resultado ya revisado.
export async function POST(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) {
    return Response.json({ error: 'Proyectos no está habilitado para tu usuario.' }, { status: 403 });
  }
  const { isSupervisorLevel } = resolveProjectAccessLevel(identity);
  if (!isSupervisorLevel) {
    return Response.json({ error: 'No tenés permiso para importar un proyecto civil.' }, { status: 403 });
  }

  const { data } = await req.json();
  if (!data) return Response.json({ error: 'El archivo es requerido.' }, { status: 400 });

  try {
    const roster = await listTenantUsers(tenant);
    const buffer = Buffer.from(data, 'base64');
    const result = parseCivilExcel(buffer, roster);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo leer el archivo.' }, { status: 400 });
  }
}
