import { isAuthorizedForTenant, getCurrentLabsUser } from '@/lib/labs/auth';
import { getOrCreateFeedbackDriveFolder } from '@/lib/labs/experiments';
import { findFileByName } from '@/lib/labs/googleDrive';

// La subida directa del navegador a Drive (ver video-upload-url) puede terminar bien pero el
// navegador bloquear la lectura de esa respuesta por un header de CORS que falta ahí (ver el
// comentario de findFileByName) — esto confirma, server-to-server, si el archivo que el cliente
// cree que falló en realidad ya está en Drive.
export async function POST(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  if (!(await getCurrentLabsUser(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { name } = await req.json();
  if (!name?.trim()) {
    return Response.json({ error: 'name es requerido.' }, { status: 400 });
  }

  try {
    const folderId = await getOrCreateFeedbackDriveFolder(tenant, id);
    if (!folderId) return Response.json({ found: false });
    const file = await findFileByName(folderId, name);
    if (!file) return Response.json({ found: false });
    return Response.json({ found: true, id: file.id, webViewLink: file.webViewLink });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo confirmar la subida.' }, { status: 500 });
  }
}
