import { Redis } from '@upstash/redis';
import { isAuthorizedForTenant } from '@/lib/kai/auth';
import { listDriveFiles } from '@/lib/kai/googleDrive';

const kv = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
const configKey = (t) => `kai:${t}:drive:config`;

export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  const config = await kv.get(configKey(tenant));
  if (!config?.folderId) return Response.json({ error: 'Carpeta de Drive no configurada.' }, { status: 400 });

  try {
    const files = await listDriveFiles(config.folderId);
    return Response.json({ files });
  } catch (err) {
    return Response.json({ error: `Error al listar archivos: ${err.message}` }, { status: 500 });
  }
}
