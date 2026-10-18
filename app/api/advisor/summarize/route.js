import OpenAI from 'openai';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 4000;

// Para precargar "Lo que conversamos" en el booking (ver BookingPanel.jsx) — el main_pain del
// <advisor-capture> de app/api/advisor/route.js es una etiqueta de una línea, no alcanza para un
// resumen legible, así que esto es un llamado aparte, una sola vez, al abrir el panel de reserva.
export async function POST(req) {
  // Público sin auth y le pega a OpenAI — mismo motivo que el rate limit de app/api/advisor.
  if (!(await checkRateLimit(`advisor-summarize:${getClientIp(req)}`, 20, 600))) {
    return Response.json({ summary: '' }, { status: 429 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ summary: '' });
  }
  const { messages } = body;
  if (!Array.isArray(messages) || !messages.length) {
    return Response.json({ summary: '' });
  }
  if (messages.length > MAX_MESSAGES || messages.some((m) => typeof m?.content === 'string' && m.content.length > MAX_MESSAGE_CHARS)) {
    return Response.json({ summary: '' });
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const transcript = messages.map((m) => `${m.role === 'user' ? 'Visitante' : 'Advisor'}: ${m.content}`).join('\n');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Resumí la siguiente conversación en 2-3 líneas, en primera persona del visitante (como si él mismo lo escribiera), para que quien lo lea llegue preparado a la llamada. Sin saludos ni relleno, directo al contenido. Español latino neutro, nunca voseo.',
        },
        { role: 'user', content: transcript },
      ],
      max_tokens: 200,
      temperature: 0.5,
    });
    const summary = completion.choices[0]?.message?.content?.trim() ?? '';
    return Response.json({ summary });
  } catch (err) {
    console.error('[advisor summarize]', err.message);
    return Response.json({ summary: '' });
  }
}
