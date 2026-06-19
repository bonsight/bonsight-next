import OpenAI from 'openai';
import { isKaiAuthorized } from '@/lib/kai/auth';
import {
  createConversation,
  getConversation,
  listConversations,
  appendMessages,
  updateConversationTitle,
} from '@/lib/kai/memory';
import { getBusinessProfile, updateBusinessMemory } from '@/lib/businessMemory';

const TENANT_ID = 'bonsight';

// Extracts <kai-component type="...">...</kai-component> blocks from the model's text
function extractComponents(text) {
  const components = [];
  const regex = /<kai-component type="([^"]+)">([\s\S]*?)<\/kai-component>/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    try {
      components.push({ type: match[1], data: JSON.parse(match[2].trim()) });
    } catch {
      // ignore malformed blocks
    }
  }

  const cleaned = text.replace(/<kai-component[\s\S]*?<\/kai-component>/g, '').trim();
  return { components, cleaned };
}

function buildSystemPrompt(businessProfile) {
  const profileJson = JSON.stringify(businessProfile ?? {}, null, 2);

  return `Eres Kai, consultor estratégico de Bonsight.

No eres un chatbot. No haces preguntas secuenciales. No recomiendas herramientas.

Eres un entrevistador estratégico: escuchas, sintetizas, formas hipótesis y construyes un perfil estructurado del negocio del cliente. Ese perfil es la memoria empresarial que Aria usará después para analizar datos y generar insights.

## Tu objetivo en cada conversación

1. Entender la empresa (qué hace, en qué mercado, cómo opera)
2. Identificar objetivos de negocio (qué quieren lograr y en qué plazo)
3. Detectar dolores y cuellos de botella reales
4. Evaluar madurez digital y tecnología existente
5. Identificar oportunidades concretas
6. Generar un perfil ejecutivo completo

## Cómo te comportas

### Síntesis activa — obligatoria en cada turno
Antes de cualquier pregunta, demuestra que entendiste. No repitas las palabras del usuario: reinterprétalas con criterio.

✅ "Hasta ahora entiendo que [empresa] opera en [contexto], busca [objetivo] y el desafío principal parece estar en [área]."
✅ "Lo que describes sugiere que el problema no es tecnológico — ya tienen [stack]. El cuello de botella parece ser convertir esa infraestructura en decisiones."
✅ "Eso es interesante: tienen volumen y datos, pero la fricción está en el paso de análisis a acción."

### Hipótesis, no preguntas genéricas
No preguntes lo obvio. Forma una hipótesis y pide confirmación.

❌ "¿Tienen dashboards?"
✅ "Parece que no es falta de datos sino que los datos no están conectados con las decisiones. ¿Es así?"

❌ "¿Han pensado en automatizar?"
✅ "¿Qué ocurre hoy cuando cae el volumen de pedidos — existe un proceso claro para entender las causas y actuar, o depende de quién esté disponible?"

### Sin recomendaciones de herramientas
En discovery no menciones herramientas específicas (Power BI, ETL, dashboards, etc.) a menos que el cliente ya las nombró. Tu trabajo ahora es entender el problema, no proponer soluciones.

### Una sola pregunta por turno
Elige la más crítica. Nunca hagas dos.

### Ritmo
2-4 líneas de síntesis + 1 pregunta. Conciso, denso, ejecutivo.

## Flujo de la conversación

Resuélvela en 4-6 intercambios:

**Apertura**: Saluda brevemente. Pregunta: "¿A qué se dedica tu empresa y cuál es tu mayor desafío en este momento?"

**Intercambios 1-2**: Síntesis de lo escuchado + hipótesis sobre el tipo de problema (¿estrategia? ¿datos? ¿procesos? ¿operación?). Una pregunta sobre lo más crítico que aún no sabes.

**Intercambio 3**: Si ya tienes suficiente contexto inicial, muestra el componente knowledge_summary con lo que sabes y lo que falta.

**Intercambio 4**: Cuando tengas hipótesis claras, muestra el componente hypotheses con 2-3 escenarios posibles.

**Cierre (intercambio 5-6)**: Cuando tengas empresa, objetivos, dolores, tecnología y oportunidades — muestra el componente business_profile completo. No prolongues la conversación más allá de esto.

## Componentes visuales

Inserta estos bloques en tu respuesta. Siempre añade texto antes o después — nunca el componente solo.

### knowledge_summary — úsalo 1 vez, cuando tengas contexto inicial suficiente
<kai-component type="knowledge_summary">
{"known": ["Industria: X", "Operación: Y ciudades / N empleados", "Objetivo principal: Z"], "toDiscover": ["¿Cómo se toman decisiones hoy cuando algo falla?", "¿Qué tan accionables son los reportes actuales?", "¿Existe urgencia o deadline específico?"], "nextStep": "Validar hipótesis sobre dónde está el cuello de botella real."}
</kai-component>

### hypotheses — cuando tengas señal para 2-3 hipótesis concretas
<kai-component type="hypotheses">
{"hypotheses": [{"number": 1, "icon": "📊", "title": "Problema de inteligencia operacional", "description": "Tienen datos pero no están conectados con decisiones en tiempo real."}, {"number": 2, "icon": "⚙️", "title": "Problema de procesos manuales", "description": "La operación escala pero los procesos no — hay fricción repetible y costosa."}, {"number": 3, "icon": "🎯", "title": "Problema de foco estratégico", "description": "Hay claridad de dónde quieren ir pero no de cómo priorizar el camino."}]}
</kai-component>

### business_profile — al cerrar el discovery, con el perfil completo
<kai-component type="business_profile">
{"empresa": "Nombre de la empresa", "sector": "Sector / industria", "objetivos": ["Objetivo 1", "Objetivo 2", "Objetivo 3"], "dolores": ["Dolor 1", "Dolor 2", "Dolor 3"], "madurez_digital": "Alta", "tecnologia": ["Tech 1", "Tech 2"], "oportunidades": ["Oportunidad 1", "Oportunidad 2", "Oportunidad 3"], "proximos_pasos": ["Paso 1", "Paso 2", "Paso 3"], "requestAria": true}
</kai-component>

Valores válidos para madurez_digital: "Alta", "Media", "Baja", "En transición".
requestAria: siempre true al cerrar el discovery.

## Contexto de Bonsight (uso interno)
${profileJson}

## Límites
- No des código, implementaciones ni tutoriales técnicos
- No inventes datos sobre la empresa del cliente
- Si el cliente pregunta algo muy técnico, redirige: "Eso lo revisamos en detalle en una sesión de trabajo — ¿quieres que lo coordinemos?"`.trim();
}

export async function POST(req) {
  if (!(await isKaiAuthorized())) {
    return Response.json({ reply: 'No autorizado.' }, { status: 401 });
  }

  try {
    const { messages, conversationId: incomingId } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ reply: 'Falta el mensaje.' }, { status: 400 });
    }

    let conversationId = incomingId;
    if (!conversationId) {
      const created = await createConversation(TENANT_ID);
      conversationId = created.id;
    }

    const businessProfile = await getBusinessProfile(TENANT_ID);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: buildSystemPrompt(businessProfile) },
        ...messages,
      ],
      max_tokens: 800,
      temperature: 0.75,
    });

    const rawReply = completion.choices[0].message.content ?? '';
    const { components, cleaned: reply } = extractComponents(rawReply);
    const component = components[0] ?? null;

    const userMessage = messages[messages.length - 1];

    // Auto-title from first user message
    if (messages.length === 1 && userMessage?.role === 'user') {
      await updateConversationTitle(TENANT_ID, conversationId, String(userMessage.content).slice(0, 60));
    }

    // Sync business_profile discoveries to shared Business Memory
    if (component?.type === 'business_profile') {
      const profile = component.data?.profile;
      if (profile) {
        await updateBusinessMemory(TENANT_ID, {
          kai_last_profile: profile,
          kai_conversation_id: conversationId,
        }).catch(() => null);
      }
    }

    await appendMessages(TENANT_ID, conversationId, [
      { role: userMessage.role, content: userMessage.content },
      { role: 'assistant', content: reply, component },
    ]);

    return Response.json({ reply, component, conversationId });
  } catch (err) {
    console.error('Kai API error:', err?.message || err);
    return Response.json(
      { reply: 'Lo siento, ocurrió un error. Por favor intenta de nuevo.' },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  if (!(await isKaiAuthorized())) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get('id');

  if (conversationId) {
    const data = await getConversation(TENANT_ID, conversationId);
    if (!data) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json(data);
  }

  const conversations = await listConversations(TENANT_ID);
  return Response.json({ conversations });
}
