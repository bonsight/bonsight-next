// Twilio pega directo acá (no manda cookies) — sin auth de tenant, solo instrucciones de la llamada.
function buildTwiml(baseUrl, tenant) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Record playBeep="false" recordingStatusCallback="${baseUrl}/api/kai/${tenant}/meetings/recording-callback" recordingStatusCallbackEvent="completed" maxLength="7200" trim="do-not-trim" />
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
