import { isAuthorizedForTenant } from '@/lib/kaiNext/auth';
import { addSource, listSources, getKnowledgeDigest } from '@/lib/kai/knowledgeSources';

// Mismo backend que app/api/kai/[tenant]/knowledge-sources/route.js (lib/kai/knowledgeSources.js,
// cero storage nuevo) — la única diferencia real es el gate de auth: acá usa access.kaiNext,
// no access.kai, para que una persona con acceso SOLO a Kai Next (no a Kai legacy) pueda
// gestionar su propio conocimiento.
export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const [sources, digest] = await Promise.all([
    listSources(tenant),
    getKnowledgeDigest(tenant),
  ]);
  return Response.json({ sources, digest });
}

export async function POST(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const body = await req.json();
  const { sourceType, name, url, text } = body;
  if (!sourceType || !name) {
    return Response.json({ error: 'sourceType y name son requeridos.' }, { status: 400 });
  }
  if (sourceType === 'url' && !url) {
    return Response.json({ error: 'url es requerida para sourceType url.' }, { status: 400 });
  }
  if (sourceType === 'text' && !text) {
    return Response.json({ error: 'text es requerido para sourceType text.' }, { status: 400 });
  }
  if (sourceType === 'drive' && !body.driveFileId) {
    return Response.json({ error: 'driveFileId es requerido para sourceType drive.' }, { status: 400 });
  }

  // Mismo branch que app/api/kai/[tenant]/knowledge-sources/route.js — el procesamiento
  // (extractFromDriveFile) ya está wireado en [id]/process/route.js para ambos productos.
  const extraMeta = sourceType === 'drive'
    ? { driveFileId: body.driveFileId, driveMimeType: body.driveMimeType ?? null, driveModifiedTime: body.driveModifiedTime ?? null }
    : {};

  const source = await addSource(tenant, {
    sourceType,
    name,
    url: url ?? null,
    rawText: sourceType === 'drive' ? body.driveFileId : (text ?? null),
    extraMeta,
  });
  return Response.json({ source });
}
