import { isAuthorizedForTenant, getCurrentLabsUser } from '@/lib/labs/auth';
import { getExperimentMeta, addProjectDocument, deleteProjectDocument } from '@/lib/labs/experiments';

// Documentación del proyecto (cronogramas, presupuestos, etc.) — solo Director, o un
// Supervisor asignado a ESTE proyecto, pueden subir o borrar. Registrador no tiene acceso
// (ni siquiera ve el ítem de menú del lado del cliente).
async function requireProjectManager(tenant, id) {
  if (!(await isAuthorizedForTenant(tenant))) return { error: Response.json({ error: 'No autorizado.' }, { status: 401 }) };
  const user = await getCurrentLabsUser(tenant);
  if (!user) return { error: Response.json({ error: 'No autorizado.' }, { status: 401 }) };
  if (user.role === 'Registrador') {
    return { error: Response.json({ error: 'No tenés acceso a la documentación del proyecto.' }, { status: 403 }) };
  }
  const meta = await getExperimentMeta(tenant, id);
  if (!meta) return { error: Response.json({ error: 'Experimento no encontrado.' }, { status: 404 }) };
  if (user.role === 'Supervisor' && !meta.supervisorIds?.includes(user.id)) {
    return { error: Response.json({ error: 'No tenés acceso a este proyecto.' }, { status: 403 }) };
  }
  return { user };
}

export async function POST(req, { params }) {
  const { tenant, id } = await params;
  const { error, user } = await requireProjectManager(tenant, id);
  if (error) return error;

  const { name, mimeType, data, category } = await req.json();
  try {
    const document = await addProjectDocument(tenant, id, { name, mimeType, data, category, uploadedBy: user.name, uploadedByRole: user.role });
    return Response.json({ ok: true, document });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo subir el documento.' }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  const { tenant, id } = await params;
  const { error } = await requireProjectManager(tenant, id);
  if (error) return error;

  const { documentId } = await req.json();
  await deleteProjectDocument(tenant, id, documentId);
  return Response.json({ ok: true });
}
