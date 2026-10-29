import { isAuthorizedForTenant, isKaiAuthorized } from '@/lib/kai/auth';
import { getFolderMetadata, extractFolderId } from '@/lib/kai/googleDrive';
import { listConnections, addConnection, removeConnection, migrateLegacyConnections } from '@/lib/kai/driveConnections';

// Reemplaza /api/kai/[tenant]/drive (lectura, un solo config) y /api/kai-next/[tenant]/
// projects-drive (escritura, un solo config) por una lista — puede haber más de una carpeta de
// lectura, como mucho una de lectura y escritura. Esos dos routes viejos siguen andando (los usan
// componentes compartidos con el admin legacy de Kai) porque lib/kaiNext/projectsDrive.js ahora
// delega acá mismo (ver ese archivo) — una sola fuente de verdad.
function driveErrorHint(err) {
  const msg = err?.message ?? '';
  if (msg.includes('accessNotConfigured') || msg.includes('disabled')) {
    return 'La API de Google Drive no está habilitada en el proyecto de Google Cloud. Habilitala en console.cloud.google.com.';
  }
  if (msg.includes('notFound') || msg.includes('404')) return 'Carpeta no encontrada. Verifica el link o ID.';
  if (msg.includes('forbidden') || msg.includes('403')) {
    return 'Sin permiso. Comparte la carpeta con la cuenta de servicio — como Editor si va a ser de lectura y escritura.';
  }
  return `Error: ${msg}`;
}

export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  const connections = await migrateLegacyConnections(tenant);
  return Response.json({ connections });
}

export async function POST(req, { params }) {
  const { tenant } = await params;
  const { folderId: rawFolderId, role } = await req.json();
  if (!rawFolderId || !role) return Response.json({ error: 'folderId y role son requeridos.' }, { status: 400 });

  // Conectar una carpeta de escritura (Proyectos) queda reservado al equipo de Bonsight, mismo
  // criterio que ya tenía projects-drive — el resto (lectura) lo puede hacer cualquier persona
  // del cliente con acceso a Kai.
  const authorized = role === 'write' ? await isKaiAuthorized() : await isAuthorizedForTenant(tenant);
  if (!authorized) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  const folderId = extractFolderId(rawFolderId);
  let folderName;
  try {
    const meta = await getFolderMetadata(folderId);
    folderName = meta.name;
  } catch (err) {
    return Response.json({ error: driveErrorHint(err) }, { status: 400 });
  }

  try {
    const connection = await addConnection(tenant, { folderId, folderName, role });
    return Response.json({ connection });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  const { tenant } = await params;
  const { id } = await req.json();
  if (!id) return Response.json({ error: 'id requerido.' }, { status: 400 });

  const connections = await listConnections(tenant);
  const target = connections.find((c) => c.id === id);
  const authorized = target?.role === 'write' ? await isKaiAuthorized() : await isAuthorizedForTenant(tenant);
  if (!authorized) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  await removeConnection(tenant, id);
  return Response.json({ ok: true });
}
