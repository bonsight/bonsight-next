import { isAuthorizedForTenant, getCurrentLabsUser } from '@/lib/labs/auth';
import { getOrCreateTestDriveFolder } from '@/lib/labs/experiments';
import { initiateResumableUpload } from '@/lib/labs/googleDrive';

export async function POST(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  if (!(await getCurrentLabsUser(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
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
    return Response.json({ ok: true, uploadUrl });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo iniciar la subida.' }, { status: 400 });
  }
}
