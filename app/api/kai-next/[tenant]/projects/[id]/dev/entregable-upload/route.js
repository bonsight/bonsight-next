import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { resolveProjectAccessLevel, uploadEntregableToDrive } from '@/lib/kaiNext/projects';

// Sube un archivo nuevo a la carpeta "Entregables" del proyecto (compartida entre tareas y
// épicas, ver ensureProjectEntregablesFolder en lib/kaiNext/projects.js) y devuelve el link real
// de Drive — el frontend lo mete directo como `url` de un entregable nuevo (ver EditEpicaForm/
// DevTaskDetailPanel en KaiNextProjectDesarrollo.jsx).
export async function POST(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) {
    return Response.json({ error: 'Proyectos no está habilitado para tu usuario.' }, { status: 403 });
  }
  const { isSupervisorLevel } = resolveProjectAccessLevel(identity);
  if (!isSupervisorLevel) {
    return Response.json({ error: 'No tenés permiso para subir entregables en este proyecto.' }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }
  if (!body.name?.trim() || !body.data) {
    return Response.json({ error: 'Falta el archivo o el nombre.' }, { status: 400 });
  }

  try {
    const entregable = await uploadEntregableToDrive(tenant, id, { name: body.name, mimeType: body.mimeType, data: body.data });
    return Response.json({ entregable });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
