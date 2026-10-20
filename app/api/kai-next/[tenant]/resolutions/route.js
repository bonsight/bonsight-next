import { isAuthorizedForTenant } from '@/lib/kaiNext/auth';
import { markResolved, unmarkResolved } from '@/lib/kai/resolutions';

// Mismo ledger que ya usa la tool de chat `mark_resolved` (lib/kaiNext/tools/resolve.js) — esta
// ruta es el equivalente para un click directo en la UI (botón "Marcar resuelto"/"Reabrir" del
// Mapa del negocio), sin pasar por una conversación con Kai.
const VALID_TYPES = new Set(['learning', 'eje', 'pain', 'risk', 'opportunity']);

export async function POST(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const { type, ref, note } = await req.json();
  if (!VALID_TYPES.has(type) || !ref) {
    return Response.json({ error: 'type o ref inválido.' }, { status: 400 });
  }
  const resolvedRefs = await markResolved(tenant, { type, ref, note });
  return Response.json({ resolvedRefs });
}

export async function DELETE(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const ref = searchParams.get('ref');
  if (!VALID_TYPES.has(type) || !ref) {
    return Response.json({ error: 'type o ref inválido.' }, { status: 400 });
  }
  const resolvedRefs = await unmarkResolved(tenant, { type, ref });
  return Response.json({ resolvedRefs });
}
