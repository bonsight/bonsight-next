import { Redis } from '@upstash/redis';
import { isAuthorizedForTenant } from '@/lib/kai/auth';
import { listDriveFiles } from '@/lib/kai/googleDrive';

const kv = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
const configKey = (t) => `kai:${t}:drive:config`;

export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  // folderId explícito — soporta más de una carpeta de lectura conectada (ver
  // lib/kai/driveConnections.js). Sin eso, cae al config viejo (single-folder) por compatibilidad.
  const { searchParams } = new URL(req.url);
  let folderId = searchParams.get('folderId');
  if (!folderId) {
    const config = await kv.get(configKey(tenant));
    folderId = config?.folderId;
  }
  if (!folderId) return Response.json({ error: 'Carpeta de Drive no configurada.' }, { status: 400 });

  try {
    const files = await listDriveFiles(folderId);
    return Response.json({ files });
  } catch (err) {
    return Response.json({ error: `Error al listar archivos: ${err.message}` }, { status: 500 });
  }
}
