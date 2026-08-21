import { isAuthorizedForTenant } from '@/lib/labs/auth';
import { getFolderMetadata, extractFolderId, getDriveConfig, setDriveConfig, clearDriveConfig } from '@/lib/labs/googleDrive';

export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  const config = await getDriveConfig(tenant);
  return Response.json({ config: config ?? null });
}

export async function POST(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  const { folderId } = await req.json();
  if (!folderId) return Response.json({ error: 'folderId requerido.' }, { status: 400 });

  const id = extractFolderId(folderId);

  let folderName;
  try {
    const meta = await getFolderMetadata(id);
    folderName = meta.name;
  } catch (err) {
    const msg = err?.message ?? '';
    const hint = msg.includes('accessNotConfigured') || msg.includes('disabled')
      ? 'La API de Google Drive no está habilitada en el proyecto de Google Cloud. Habilitala en console.cloud.google.com.'
      : msg.includes('notFound') || msg.includes('404')
      ? 'Carpeta no encontrada. Verificá el ID o el link.'
      : msg.includes('forbidden') || msg.includes('403')
      ? 'Sin permiso. Compartí la carpeta con la cuenta de servicio como Editor (no solo Lector — Labs necesita crear carpetas y subir archivos ahí).'
      : `Error: ${msg}`;
    return Response.json({ error: hint }, { status: 400 });
  }

  const config = await setDriveConfig(tenant, { folderId: id, folderName, connectedAt: new Date().toISOString() });
  return Response.json({ config });
}

export async function DELETE(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  await clearDriveConfig(tenant);
  return Response.json({ ok: true });
}
