import { getFreeBusy } from '@/lib/kai/calendar';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

// Disponibilidad pública para el booking embebido del Advisor (ver BookingPanel.jsx) — el evento
// siempre lo agenda kai@bonsight.co (ver createCalendarEvent), así que la disponibilidad real a
// chequear es la de ESE calendario, no la de ningún humano puntual (Rafa va como invitado).
const HOST_EMAIL = 'kai@bonsight.co';
const HOST_TZ = 'America/New_York';
// Mismos bloques que ya traía el mockup: 9-11:30 y 14-16:30, cada 30 min.
const BUSINESS_HOURS = [9, 9.5, 10, 10.5, 11, 14, 14.5, 15, 15.5, 16];
const DAYS_AHEAD = 14;
const MIN_LEAD_HOURS = 2;

// Offset (en minutos) de `zone` en el instante `date` — necesario para construir instantes
// reales a partir de "las H en HOST_TZ" sin asumir un offset fijo (cambia con horario de verano).
function tzOffsetMinutes(date, zone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date);
  const o = {};
  parts.forEach((p) => { o[p.type] = p.value; });
  const asUTC = Date.UTC(+o.year, +o.month - 1, +o.day, +o.hour, +o.minute, +o.second);
  return (asUTC - date.getTime()) / 60000;
}

function hostInstant(y, m, d, h) {
  const guess = new Date(Date.UTC(y, m, d, Math.floor(h), (h % 1) * 60));
  const off = tzOffsetMinutes(guess, HOST_TZ);
  return new Date(guess.getTime() - off * 60000);
}

export async function GET(req) {
  try {
    // Endpoint público sin auth — sin esto, alguien puede scriptear requests sin límite.
    if (!(await checkRateLimit(`advisor-availability:${getClientIp(req)}`, 30, 600))) {
      return Response.json({ error: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.' }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    // Duración del bloque a reservar — default 30 (llamada de discovery del Advisor), pero
    // también se usa con 15 (agendar conexión de fuente desde Kai Next, ver
    // KaiNextSourceConnectModal). Acotada a [5, 120] — es un endpoint público sin auth, no hay
    // que confiar en que el valor venga del UI.
    const rawDuration = Number(searchParams.get('duration'));
    const duration = Number.isFinite(rawDuration) && rawDuration >= 5 && rawDuration <= 120 ? rawDuration : 30;

    const now = new Date();
    const minLead = new Date(now.getTime() + MIN_LEAD_HOURS * 3600000);

    const candidates = [];
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + i);
      const dow = d.getDay(); // 0 dom, 6 sáb
      if (dow === 0 || dow === 6) continue;
      for (const h of BUSINESS_HOURS) {
        const start = hostInstant(d.getFullYear(), d.getMonth(), d.getDate(), h);
        if (start > minLead) candidates.push(start);
      }
    }
    if (!candidates.length) return Response.json({ slots: [], timezone: HOST_TZ });

    const timeMin = candidates[0].toISOString();
    const timeMax = new Date(candidates[candidates.length - 1].getTime() + duration * 60000).toISOString();
    const busy = await getFreeBusy([HOST_EMAIL], timeMin, timeMax);
    const busyRanges = (busy[HOST_EMAIL]?.busy ?? []).map((b) => ({ start: new Date(b.start), end: new Date(b.end) }));

    const free = candidates.filter((start) => {
      const end = new Date(start.getTime() + duration * 60000);
      return !busyRanges.some((b) => start < b.end && end > b.start);
    });

    return Response.json({ slots: free.map((d) => d.toISOString()), timezone: HOST_TZ });
  } catch (err) {
    console.error('[advisor availability]', err.message);
    return Response.json({ error: 'No se pudo cargar la disponibilidad.' }, { status: 500 });
  }
}
