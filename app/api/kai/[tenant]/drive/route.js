import { Redis } from '@upstash/redis';
import { isAuthorizedForTenant } from '@/lib/kai/auth';
import { getFolderMetadata, extractFolderId } from '@/lib/kai/googleDrive';

const kv = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
const configKey = (t) => `kai:${t}:drive:config`;

export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  const config = await kv.get(configKey(tenant));
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
      ? 'Carpeta no encontrada. Verificá el ID.'
      : msg.includes('forbidden') || msg.includes('403')
      ? 'Sin permiso. Asegurate de compartir la carpeta con la cuenta de servicio como Lector.'
      : `Error: ${msg}`;
    return Response.json({ error: hint }, { status: 400 });
  }

  const config = { folderId: id, folderName, connectedAt: new Date().toISOString() };
  await kv.set(configKey(tenant), config);
  return Response.json({ config });
}

export async function DELETE(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  await kv.del(configKey(tenant));
  return Response.json({ ok: true });
}
