import { isAuthorizedForTenant, getCurrentLabsUser } from '@/lib/labs/auth';
import { getOrCreateFeedbackDriveFolder } from '@/lib/labs/experiments';
import { initiateResumableUpload } from '@/lib/labs/googleDrive';

export async function POST(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  if (!(await getCurrentLabsUser(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { name, mimeType } = await req.json();
  if (!name?.trim()) {
    return Response.json({ error: 'name es requerido.' }, { status: 400 });
  }

  try {
    const folderId = await getOrCreateFeedbackDriveFolder(tenant, id);
    if (!folderId) {
      return Response.json({ error: 'Este proyecto no tiene un repositorio de Drive conectado — no se pueden subir videos.' }, { status: 400 });
    }
    const uploadUrl = await initiateResumableUpload(folderId, { name, mimeType });
    return Response.json({ ok: true, uploadUrl });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo iniciar la subida.' }, { status: 400 });
  }
}
