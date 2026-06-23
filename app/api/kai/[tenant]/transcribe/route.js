import OpenAI from 'openai';
import { isAuthorizedForTenant } from '@/lib/kai/auth';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const formData = await req.formData();
  const audio = formData.get('audio');

  if (!audio) {
    return Response.json({ error: 'Audio requerido.' }, { status: 400 });
  }

  const file = new File([audio], 'audio.webm', { type: audio.type || 'audio/webm' });

  let transcription;
  try {
    transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'es',
      prompt: 'Conversación de negocios en español.',
    });
  } catch (err) {
    console.error(`[kai/${tenant}/transcribe] OpenAI error:`, err?.message || err);
    return Response.json({ error: err?.message || 'Transcription failed' }, { status: 500 });
  }

  const text = transcription.text?.trim() ?? '';
  const HALLUCINATIONS = [
    'amara.org', 'suscríbete', 'suscribete', 'like y suscr',
    'gracias por ver', 'thank you for watch', 'subtítulos', 'subtitulos',
  ];
  const isHallucination = HALLUCINATIONS.some((h) => text.toLowerCase().includes(h));

  return Response.json({ text: isHallucination ? '' : text });
}
