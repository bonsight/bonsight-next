// Twilio pega directo acá (no manda cookies) — sin auth de tenant, solo instrucciones de la llamada.
//
// timeout="0" es crítico: por default <Record> corta la grabación a los 5s de silencio y,
// como no hay un "action" URL, Twilio vuelve a pedir este mismo documento y arranca OTRA
// grabación — en una reunión con pausas normales esto fragmenta una sola llamada en decenas
// de grabaciones/análisis separados. Con timeout="0" graba sin cortes hasta que cuelga la llamada.
//
// finishOnKey="" es igual de crítico: el default de <Record> es finishOnKey="#", así que
// cualquier participante de la llamada (no solo a quien Kai marcó) que toque "#" en su
// teléfono corta la grabación en seco y —por lo mismo de arriba— arranca una segunda
// grabación aparte. Pasó en una reunión real: se partió en dos (8 min + 91 min) y la
// segunda, la que tenía el contenido real, nunca se procesó a tiempo.
function buildTwiml(baseUrl, tenant) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Record playBeep="false" timeout="0" finishOnKey="" recordingStatusCallback="${baseUrl}/api/kai/${tenant}/meetings/recording-callback" recordingStatusCallbackEvent="completed" maxLength="7200" trim="do-not-trim" />
</Response>`;
}

export async function POST(req, { params }) {
  const { tenant } = await params;
  const baseUrl = process.env.PUBLIC_BASE_URL || (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) || new URL(req.url).origin;
  return new Response(buildTwiml(baseUrl, tenant), { headers: { 'Content-Type': 'text/xml' } });
}

export async function GET(req, ctx) {
  return POST(req, ctx);
}
