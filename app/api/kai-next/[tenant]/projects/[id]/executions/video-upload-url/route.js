import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getOrCreateTestDriveFolder } from '@/lib/kaiNext/projects';
import { initiateResumableUpload } from '@/lib/kaiNext/projectsDrive';

// El navegador sube el video DIRECTO a la URL que devuelve esto — nunca pasa por nuestro
// backend (límite de ~4.5MB en una Serverless Function de Vercel).
export async function POST(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'proyectos')) {
    return Response.json({ error: 'Proyectos no está habilitado para tu usuario.' }, { status: 403 });
  }

  const { testId, name, mimeType } = await req.json();
  if (!testId || !name?.trim()) {
    return Response.json({ error: 'testId y name son requeridos.' }, { status: 400 });
  }

  try {
    const folderId = await getOrCreateTestDriveFolder(tenant, id, testId);
    if (!folderId) {
      return Response.json({ error: 'Este proyecto no tiene un repositorio de Drive conectado — no se pueden subir videos.' }, { status: 400 });
    }
    const uploadUrl = await initiateResumableUpload(folderId, { name, mimeType });
    return Response.json({ uploadUrl });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo iniciar la subida.' }, { status: 400 });
  }
}
