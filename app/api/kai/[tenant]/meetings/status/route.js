import { isAuthorizedForTenant } from '@/lib/kai/auth';
import { getCallMeta } from '@/lib/kai/meetingCapture';

export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const callSid = new URL(req.url).searchParams.get('callSid');
  if (!callSid) return Response.json({ error: 'callSid es requerido.' }, { status: 400 });

  const meta = await getCallMeta(callSid);
  if (!meta) return Response.json({ error: 'No se encontró esa llamada.' }, { status: 404 });

  return Response.json(meta);
}
