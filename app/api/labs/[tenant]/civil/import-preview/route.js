import { isAuthorizedForTenant, getCurrentLabsUser } from '@/lib/labs/auth';
import { listUsers } from '@/lib/labs/users';
import { parseCivilExcel } from '@/lib/labs/civilImport';

// Solo Director — parsea el Excel (cronograma+presupuesto) y devuelve la interpretación para
// revisar/corregir en la vista previa. No persiste nada; la creación real pasa por
// POST /experiments con lo que el Director confirmó.
export async function POST(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const user = await getCurrentLabsUser(tenant);
  if (!user || user.role !== 'Director') {
    return Response.json({ error: 'Solo un Director puede importar un proyecto civil.' }, { status: 403 });
  }

  const { data } = await req.json();
  if (!data) return Response.json({ error: 'El archivo es requerido.' }, { status: 400 });

  try {
    const roster = await listUsers(tenant);
    const buffer = Buffer.from(data, 'base64');
    const result = parseCivilExcel(buffer, roster);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo leer el archivo.' }, { status: 400 });
  }
}
