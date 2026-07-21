import Anthropic from '@anthropic-ai/sdk';
import { after } from 'next/server';
import { getActivityByCode, getParticipant, getActivityTemplate, recordAnswer, recordQuestionViewed, getParticipantAnswers } from '@/lib/kai/activities';
import { buildActivityScriptPrompt } from '@/lib/kai/activityPrompt';
import { trackUsage } from '@/lib/kai/usage';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 200;

export async function POST(req, { params }) {
  const { code } = await params;
  const { participantId, message } = await req.json();

  if (!participantId || !message?.content) {
    return Response.json({ error: 'Solicitud inválida' }, { status: 400 });
  }

  const ref = await getActivityByCode(code);
  if (!ref) return Response.json({ error: 'Actividad no encontrada' }, { status: 404 });

  const { tenant, activityId, meta } = ref;
  const participant = await getParticipant(tenant, activityId, participantId);
  if (!participant) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  if (meta.status === 'finished') {
    return Response.json({
      reply: 'Esta actividad ya finalizó. ¡Gracias por participar!',
      finished: true,
      questionIndex: meta.currentQuestionIndex,
    });
  }

  const template = await getActivityTemplate(tenant, activityId);
  const currentQuestion = template[meta.currentQuestionIndex];
  if (!currentQuestion) {
    return Response.json({ error: 'Esta actividad no tiene preguntas configuradas.' }, { status: 409 });
  }

  const content = String(message.content);
  const isPresentSentinel = content === '__activity_greeting__' || content === '__next_question__';
  const isSubmittedMultiple = content === '__submitted_multiple__';

  let systemPrompt;
  if (isPresentSentinel) {
    await recordQuestionViewed(tenant, activityId, participantId, currentQuestion.id).catch(() => null);
    systemPrompt = buildActivityScriptPrompt({
      mode: 'present',
      activityName: meta.name,
      questionText: currentQuestion.text,
      isFirstQuestion: meta.currentQuestionIndex === 0,
    });
  } else if (isSubmittedMultiple) {
    const answers = await getParticipantAnswers(tenant, activityId, participantId);
    const itemCount = answers[currentQuestion.id]?.items?.length ?? 0;
    systemPrompt = buildActivityScriptPrompt({
      mode: 'ack_multiple',
      activityName: meta.name,
      questionText: currentQuestion.text,
      itemCount,
    });
  } else {
    await recordAnswer(tenant, activityId, participantId, currentQuestion.id, content).catch(() => null);
    systemPrompt = buildActivityScriptPrompt({
      mode: 'ack',
      activityName: meta.name,
      questionText: currentQuestion.text,
    });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const userTurn = isPresentSentinel
    ? 'Presentá la pregunta.'
    : isSubmittedMultiple
      ? 'Confirmá que se registraron las iniciativas.'
      : content;
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: 'user', content: userTurn }],
  });

  after(() => trackUsage({
    tenant, product: 'kai', feature: 'activity_chat', model: MODEL,
    inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens,
  }));

  const reply = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();

  return Response.json({ reply, questionIndex: meta.currentQuestionIndex, questionCount: template.length, finished: false });
}
