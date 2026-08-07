import { isAuthorizedForTenant } from '@/lib/kai/auth';
import { reprocessCall } from '@/lib/kai/meetingCapture';

// Descargar + transcribir + analizar puede tardar más que el timeout por default.
export const maxDuration = 300;

export async function POST(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { callSid } = await req.json();
  if (!callSid) return Response.json({ error: 'callSid es requerido.' }, { status: 400 });

  try {
    const analysis = await reprocessCall(tenant, callSid);
    return Response.json({ ok: true, analysis });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo procesar la grabación.' }, { status: 400 });
  }
}
