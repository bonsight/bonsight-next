import { isAuthorizedForTenant } from '@/lib/kai/auth';
import { listCallIndex } from '@/lib/kai/meetings';
import { getCallMeta } from '@/lib/kai/meetingCapture';

// Todas las sesiones donde Kai participó, terminen o no en un análisis — a diferencia de
// /meetings (que solo lista análisis ya completos), esto incluye llamadas colgadas,
// con error, o pendientes de procesar, para poder encontrarlas y reprocesarlas.
export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const calls = await listCallIndex(tenant);
  const withStatus = await Promise.all(
    calls.map(async (c) => {
      const meta = await getCallMeta(c.callSid);
      return {
        ...c,
        status: meta?.status ?? 'desconocido',
        error: meta?.error ?? null,
        hasRecordingUrl: Boolean(meta?.recordingUrl),
      };
    })
  );

  return Response.json({ calls: withStatus });
}
