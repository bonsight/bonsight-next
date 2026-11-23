import { sendAllOverdueDigests } from '@/lib/kaiNext/overdueDigest';

// Cron diario de Vercel (vercel.json): resumen de tareas vencidas y que vencen hoy, por persona.
// Vercel manda `Authorization: Bearer $CRON_SECRET` cuando esa variable existe en el proyecto;
// sin ella, solo se acepta el user-agent del cron de Vercel. Igual es inofensivo dispararlo dos
// veces: cada tenant se envía una sola vez por día (ver lib/kaiNext/overdueDigest.js).
export const maxDuration = 60;

export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  const fromVercelCron = (req.headers.get('user-agent') || '').startsWith('vercel-cron');
  if (secret ? auth !== `Bearer ${secret}` : !fromVercelCron) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const results = await sendAllOverdueDigests();
  return Response.json({ ok: true, results });
}
