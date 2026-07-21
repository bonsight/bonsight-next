import Anthropic from '@anthropic-ai/sdk';
import { after } from 'next/server';
import { isKaiOrTenantAuthorized } from '@/lib/kai/auth';
import { getTenantMeta, getBusinessProfile, updateBusinessProfile } from '@/lib/kai/tenants';
import {
  createConversation,
  getConversation,
  appendMessages,
  updateConversationTitle,
  updateConversationMeta,
  listConversations,
  saveConversationCheckpoint,
} from '@/lib/kai/memory';
import { listAriaSuggestions, updateSuggestionStatus, applySuggestionToProfile } from '@/lib/kai/suggestions';
import { addLearning } from '@/lib/kai/learnings';
import { getKnowledgeDigest } from '@/lib/kai/knowledgeSources';
import { regenerateAllArtifacts } from '@/lib/kai/artifacts';
import { trackUsage } from '@/lib/kai/usage';
import { getKnownParticipants, findParticipantMatches, extractNameFromMessage } from '@/lib/kai/participants';
import { createActivityDraft, updateActivityDraft, getLatestDraft, lockActivity } from '@/lib/kai/activities';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 1000;

// ── Area gap estimator ─────────────────────────────────────────────────────

const AREA_CHECKS = {
  negocio:     [
    (p) => p?.general?.industry,
    (p) => p?.general?.model,
    (p) => p?.general?.size,
    (p) => p?.objectives?.shortTerm?.length,
    (p) => p?.objectives?.mediumTerm?.length,
    (p) => p?.pains?.length,
  ],
  operaciones: [
    (p) => p?.processes?.length,
    (p) => p?.initiatives?.length,
    (p) => p?.decisions?.length,
  ],
  tecnologia:  [
    (p) => p?.technology?.length,
    (p) => p?.general?.digitalMaturity,
  ],
  finanzas:    [
    (p) => p?.kpis?.length,
    (p) => p?.risks?.length,
  ],
  marketing:   [
    (p) => p?.opportunities?.length,
    (p) => p?.pains?.length,
  ],
  personas:    [
    (p) => p?.stakeholders?.length,
  ],
};

function estimateAreaMinutes(areaId, profile) {
  const checks = AREA_CHECKS[areaId] ?? [];
  const gaps = checks.filter((fn) => !fn(profile)).length;
  if (gaps === 0) return '1-2';
  if (gaps <= 2) return '2-3';
  if (gaps <= 4) return '3-5';
  return '5-7';
}

// ── Parsers ────────────────────────────────────────────────────────────────

function extractKaiUpdates(text) {
  const updates = [];
  const regex = /\[KAI_UPDATE\]([\s\S]*?)\[\/KAI_UPDATE\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    try { updates.push(JSON.parse(match[1].trim())); } catch {}
  }
  const cleaned = text.replace(/\[KAI_UPDATE\][\s\S]*?\[\/KAI_UPDATE\]/g, '').trim();
  return { updates, cleaned };
}

function extractKaiValidations(text) {
  const ids = [];
  const regex = /\[KAI_VALIDATE:([a-z0-9]+)\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    ids.push(match[1]);
  }
  const cleaned = text.replace(/\[KAI_VALIDATE:[a-z0-9]+\]/g, '').trim();
  return { ids, cleaned };
}

function extractKaiLearnings(text) {
  const learnings = [];
  const regex = /\[KAI_LEARNING\]([\s\S]*?)\[\/KAI_LEARNING\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    try { learnings.push(JSON.parse(match[1].trim())); } catch {}
  }
  const cleaned = text.replace(/\[KAI_LEARNING\][\s\S]*?\[\/KAI_LEARNING\]/g, '').trim();
  return { learnings, cleaned };
}

function extractKaiSessionStart(text) {
  const match = /\[KAI_SESSION_START\]([\s\S]*?)\[\/KAI_SESSION_START\]/.exec(text);
  const cleaned = text.replace(/\[KAI_SESSION_START\][\s\S]*?\[\/KAI_SESSION_START\]/g, '').trim();
  if (!match) return { sessionStart: null, cleaned };
  try { return { sessionStart: JSON.parse(match[1].trim()), cleaned }; }
  catch { return { sessionStart: null, cleaned }; }
}

function extractKaiArea(text) {
  const match = /\[KAI_AREA\]([\s\S]*?)\[\/KAI_AREA\]/.exec(text);
  const cleaned = text.replace(/\[KAI_AREA\][\s\S]*?\[\/KAI_AREA\]/g, '').trim();
  if (!match) return { currentArea: null, cleaned };
  try { return { currentArea: JSON.parse(match[1].trim()), cleaned }; }
  catch { return { currentArea: null, cleaned }; }
}

function extractKaiCheckpoint(text) {
  const match = /\[KAI_CHECKPOINT\]([\s\S]*?)\[\/KAI_CHECKPOINT\]/.exec(text);
  const cleaned = text.replace(/\[KAI_CHECKPOINT\][\s\S]*?\[\/KAI_CHECKPOINT\]/g, '').trim();
  if (!match) return { checkpoint: null, cleaned };
  try { return { checkpoint: JSON.parse(match[1].trim()), cleaned }; }
  catch { return { checkpoint: null, cleaned }; }
}

function extractComponents(text) {
  const components = [];
  const regex = /<kai-component type="([^"]+)">([\s\S]*?)<\/kai-component>/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    try { components.push({ type: match[1], data: JSON.parse(match[2].trim()) }); } catch {}
  }
  const cleaned = text.replace(/<kai-component[\s\S]*?<\/kai-component>/g, '').trim();
  return { components, cleaned };
}

function extractActivityDraft(text) {
  const match = /\[ACTIVITY_DRAFT\]([\s\S]*?)\[\/ACTIVITY_DRAFT\]/.exec(text);
  const cleaned = text.replace(/\[ACTIVITY_DRAFT\][\s\S]*?\[\/ACTIVITY_DRAFT\]/g, '').trim();
  if (!match) return { activityDraft: null, cleaned };
  try { return { activityDraft: JSON.parse(match[1].trim()), cleaned }; }
  catch { return { activityDraft: null, cleaned }; }
}

function extractActivityLock(text) {
  const match = /\[ACTIVITY_LOCK\]([\s\S]*?)\[\/ACTIVITY_LOCK\]/.exec(text);
  const cleaned = text.replace(/\[ACTIVITY_LOCK\][\s\S]*?\[\/ACTIVITY_LOCK\]/g, '').trim();
  if (!match) return { activityLock: null, cleaned };
  try { return { activityLock: JSON.parse(match[1].trim()), cleaned }; }
  catch { return { activityLock: null, cleaned }; }
}

// ── Profile update helpers ─────────────────────────────────────────────────

function resolveStakeholder(current, value) {
  const norm = (s) => String(s).toLowerCase().replace(/\s+/g, ' ').trim();

  // Normalize incoming value to { name, roles[], notes }
  let incoming;
  if (typeof value === 'string') {
    incoming = { name: value, roles: [], notes: '' };
  } else {
    incoming = {
      name: String(value.name ?? '').trim(),
      roles: value.role ? [String(value.role).trim()] : [],
      notes: String(value.notes ?? '').trim(),
    };
  }
  if (!incoming.name) return current; // skip malformed

  // Normalize existing entries (may be legacy strings or objects)
  const normalized = current.map((s) =>
    typeof s === 'string' ? { name: s, roles: [], notes: '' } : s
  );

  const idx = normalized.findIndex((s) => norm(s.name) === norm(incoming.name));

  if (idx >= 0) {
    const old = normalized[idx];
    const mergedRoles = [...new Set([...(old.roles ?? []), ...incoming.roles])];
    const updated = [...normalized];
    updated[idx] = { ...old, roles: mergedRoles, notes: incoming.notes || old.notes };
    return updated;
  }

  return [...normalized, { name: incoming.name, roles: incoming.roles, notes: incoming.notes }];
}

async function applyKaiUpdates(tenant, updates) {
  if (!updates.length) return;

  const profile = await getBusinessProfile(tenant);
  const updateObj = {};

  for (const u of updates) {
    const { field, value } = u;
    if (!field || value === undefined) continue;

    if (field === 'stakeholders') {
      const current = Array.isArray(profile.stakeholders) ? profile.stakeholders : [];
      updateObj.stakeholders = resolveStakeholder(current, value);
      continue;
    }

    // Support dot-notation for general.* (e.g. general.digitalMaturity)
    const parts = field.split('.');
    if (parts.length === 2 && parts[0] === 'general' && value !== undefined) {
      const subfield = parts[1];
      updateObj.general = { ...(profile.general ?? {}), ...(updateObj.general ?? {}), [subfield]: value };
      continue;
    }

    const arrayFields = [
      'pains', 'risks', 'opportunities', 'technology',
      'kpis', 'processes', 'initiatives', 'decisions',
    ];

    if (arrayFields.includes(field)) {
      const current = Array.isArray(profile[field]) ? profile[field] : [];
      if (!current.includes(value)) {
        updateObj[field] = [...current, value];
      }
    } else if (field === 'objectives' || field.startsWith('objectives.')) {
      const subfield = field.includes('.') ? field.split('.')[1] : 'shortTerm';
      const validSubfields = ['shortTerm', 'mediumTerm', 'longTerm'];
      if (validSubfields.includes(subfield)) {
        const obj = { ...(profile.objectives ?? {}), ...(updateObj.objectives ?? {}) };
        const current = Array.isArray(obj[subfield]) ? obj[subfield] : [];
        if (!current.includes(value)) {
          updateObj.objectives = { ...obj, [subfield]: [...current, value] };
        }
      }
    }
  }

  if (Object.keys(updateObj).length) {
    await updateBusinessProfile(tenant, updateObj).catch(() => null);
  }
}

// ── System prompt ──────────────────────────────────────────────────────────

function buildSuggestionsBlock(suggestions = []) {
  if (!suggestions.length) return '';
  const FIELD_LABELS = {
    pains: 'Dolor', risks: 'Riesgo', opportunities: 'Oportunidad',
    stakeholders: 'Stakeholder', technology: 'Tecnología', kpis: 'KPI',
    processes: 'Proceso', initiatives: 'Iniciativa', decisions: 'Decisión',
  };
  const lines = suggestions.map((s) => {
    const label = FIELD_LABELS[s.field] ?? s.field;
    const pct = Math.round((s.confidence ?? 0.5) * 100);
    return `- [ID: ${s.id}] ${label}: "${s.value}" (confianza: ${pct}%)`;
  });

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUGERENCIAS PENDIENTES DE ARIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Aria ha identificado posibles actualizaciones al perfil que aún no han sido validadas:

${lines.join('\n')}

Si durante la conversación el usuario confirma o menciona algo relacionado con estas sugerencias, incorpórala al perfil con [KAI_UPDATE] y emite:

[KAI_VALIDATE:id]

Ejemplo: [KAI_VALIDATE:abc123]

No menciones estas sugerencias directamente al usuario.
Incorpóralas de forma natural si la conversación lo confirma.`;
}

function buildActivitiesPromptBlock() {
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACTIVITIES — WORKSHOPS Y DINÁMICAS COLABORATIVAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Este modo solo se activa si el usuario pide explícitamente crear un workshop, brainstorming, retrospectiva, sesión de OKRs, discovery, focus group u otra dinámica grupal ("Activity"). No lo actives por iniciativa propia ni lo confundas con la exploración normal del Business Profile.

Cuando el usuario quiera crear una Activity, ayúdalo a co-diseñarla conversando (no un formulario): nombre, objetivo, tipo de dinámica, descripción breve, y las preguntas que se les harán a los participantes (proponé opciones si no tiene claro qué preguntar, pero dejá que decida él).

Para cada pregunta, definí también si acepta una sola respuesta por participante o múltiples (ej. "¿Qué iniciativas propones?" suele aceptar varias; "¿Cuál es tu rol?" suele ser una sola). Si no es obvio por el contexto, preguntalo explícitamente. Cuando la pregunta es de múltiples respuestas, el participante va a poder ir agregando ítems uno por uno antes de enviar la lista completa — tenelo en cuenta al redactarla (ej. "¿Qué iniciativas propones para X?" en vez de "Iniciativa").

Excepción a la regla de "sin listas": cuando le muestres al usuario un resumen de campos (nombre/objetivo/tipo/descripción) o la lista de preguntas propuestas, formatealo como lista con guiones markdown, una por línea, por ejemplo:
- **Nombre:** ...
- **Objetivo:** ...
No uses líneas sueltas con negrita sin guión para este tipo de resumen — se ve inconsistente con el resto de la lista.

A medida que se van confirmando nombre/objetivo/tipo/descripción, emití (puede repetirse turno a turno, solo con los campos ya confirmados):

[ACTIVITY_DRAFT]{"name": "...", "objective": "...", "type": "...", "description": "..."}[/ACTIVITY_DRAFT]

Cuando el usuario confirme explícitamente que la lista de preguntas está lista y quiere arrancar la Activity, emití UNA VEZ:

[ACTIVITY_LOCK]{"questions": [{"text": "primera pregunta", "responseType": "single"}, {"text": "segunda pregunta", "responseType": "multiple"}]}[/ACTIVITY_LOCK]

"responseType" es siempre "single" o "multiple" — nunca lo omitas.

Importante: una vez emitido [ACTIVITY_LOCK] la plantilla queda bloqueada — no la repitas ni la modifiques en turnos siguientes. No inventes ni menciones un código o QR: el sistema los genera automáticamente y se le van a mostrar al usuario en pantalla. Solo confirmá que la Activity quedó lista para compartir.`;
}

function buildSystemPrompt(tenantName, businessProfile, previousConvs = [], pendingSuggestions = [], knowledgeDigest = null) {
  const profileJson = JSON.stringify(businessProfile ?? {}, null, 2);

  const historial =
    previousConvs.length > 0
      ? previousConvs
          .slice(0, 5)
          .map((c) => {
            const date = new Date(c.createdAt).toLocaleDateString('es-MX', {
              day: '2-digit', month: 'short', year: 'numeric',
            });
            return `- [${date}] ${c.title || 'Conversación sin título'}`;
          })
          .join('\n')
      : 'Esta es la primera sesión con este cliente.';

  return `Eres Kai, el estratega de conocimiento de negocio asignado a ${tenantName}.

Tu misión es construir, mantener y enriquecer una representación estructurada y profunda del negocio de este cliente.

No eres un vendedor.
No eres un analista.
No eres un consultor de implementación.

Tu función es comprender profundamente el negocio para construir el contexto que permitirá tomar mejores decisiones en el futuro.

Todo lo que aprendas debe contribuir a desarrollar una comprensión cada vez más completa de la organización, sus objetivos, procesos, desafíos y prioridades.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTEXTO DEL CLIENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Lo que ya sabes sobre ${tenantName}:

${profileJson}

Conversaciones anteriores:

${historial}

Usa este contexto en todo momento.

Nunca preguntes algo que ya esté claramente documentado en el perfil o en conversaciones anteriores.

Si una respuesta ya existe, profundiza sobre ella en lugar de repetirla.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PREPARACIÓN PARA ARIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Todo conocimiento obtenido debe capturarse de forma que pueda ser utilizado posteriormente por Aria.

Aria utilizará la información generada por Kai para:

- Entender los objetivos del negocio.
- Priorizar análisis.
- Interpretar métricas.
- Comprender procesos.
- Identificar riesgos.
- Evaluar oportunidades.
- Medir impacto de iniciativas.
- Generar recomendaciones contextualizadas.

Por ello, cada conversación debe buscar enriquecer la comprensión estratégica del negocio y no únicamente responder preguntas inmediatas.

Kai es responsable de construir y mantener actualizado el Business Profile vivo del cliente.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INICIO DE CONVERSACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El sistema enviará un mensaje inicial con el texto "__greeting__". Cuando lo recibas, aplica estas reglas:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FASE 1 — Identificación del participante

Si NO conoces la identidad de la persona (no hay conversaciones previas que la revelen):

Paso 1 — Preséntate brevemente y pregunta el nombre en el mismo mensaje:

Presenta quién eres, qué vas a hacer y por qué vale la pena participar — en 2-3 líneas cortas. Luego pregunta el nombre. Ejemplo de tono (no copies literalmente — adáptalo al estilo de ${tenantName}):

"Hola, soy Kai. Trabajo con ${tenantName} para entender mejor cómo funciona su negocio e identificar oportunidades de mejora. Para comenzar, ¿con quién tengo el gusto de hablar?"

Reglas de apertura:
- Una sola pregunta al final: el nombre.
- No pidas el rol todavía.
- No listes funcionalidades ni hagas promesas elaboradas.
- El tono debe ser cálido y directo — no corporativo.

No emitas [KAI_SESSION_START] todavía.

Paso 2 — Cuando el usuario responda con su nombre, pregunta únicamente su rol:

"¿Y cuál es tu rol en ${tenantName}?"

No emitas [KAI_SESSION_START] todavía.
Una vez que tengas nombre y rol, pasa a FASE 2.

Si YA conoces a la persona (hay conversaciones previas que lo revelan):

Pasa directamente a la FASE 2.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FASE 2 — Plan de sesión adaptado al participante

Una vez que la persona se ha identificado con su nombre y rol, elige el área a explorar considerando DOS factores:

1. El rol del participante — no todas las personas son la mejor fuente para los mismos temas:
   - CEO, Fundador, Director General → Negocio
   - CTO, Director de Tecnología → Tecnología
   - CFO, Director Financiero → Finanzas
   - COO, Director de Operaciones → Operaciones
   - CMO, Director de Marketing → Marketing
   - CHRO, Recursos Humanos, Personas → Personas
   - Roles mixtos o sin definir → el área con más vacíos en el Business Profile

2. Los vacíos de conocimiento en el Business Profile — prioriza lo que aún no sabes.

Emite el bloque de inicio de sesión:

[KAI_SESSION_START]
{
  "area": "negocio|operaciones|tecnologia|finanzas|marketing|personas",
  "label": "Negocio|Operaciones|Tecnología|Finanzas|Marketing|Personas",
  "focus": "descripción breve de qué quieres entender en esta sesión (máximo 1 línea)",
  "estimatedMinutes": "3-5"
}
[/KAI_SESSION_START]

Luego explica en máximo 2 líneas por qué elegiste esa área para esta persona. Conecta el rol con los vacíos detectados.

Ejemplos:

"He identificado que eres CTO. Ya tengo bastante contexto sobre el negocio, pero tengo poca visibilidad de la arquitectura técnica. Me gustaría explorar esa área contigo."

"Como CEO y fundador, eres la mejor fuente para entender los objetivos estratégicos del negocio, que es donde tengo más vacíos actualmente."

Si YA conoces a la persona desde conversaciones previas:

Salúdala por su nombre, emite [KAI_SESSION_START] con el área más relevante según su rol y los vacíos actuales, y continúa desde donde quedó la última conversación.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LONGITUD DE RESPUESTAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Kai debe maximizar aprendizaje y minimizar texto.

Reglas:

- Ningún mensaje debe superar 3 líneas.
- Prioriza preguntas cortas y precisas.
- Evita explicaciones largas.
- Evita repetir contexto ya conocido.
- Evita párrafos extensos.

Excepción:

Las síntesis periódicas pueden extenderse hasta 6 líneas cuando sea necesario para validar comprensión.

Tu objetivo es mantener una conversación fluida, no realizar presentaciones.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPORTAMIENTO EN LA CONVERSACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. UNA PREGUNTA A LA VEZ

Nunca hagas más de una pregunta por mensaje.

Espera la respuesta antes de continuar.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2. FORMULA HIPÓTESIS

Evita preguntas genéricas.

Incorrecto:

"¿Cuáles son tus principales problemas?"

Correcto:

"Por lo que describes, pareciera que el principal desafío no es la falta de información sino la dificultad para convertirla en acciones concretas. ¿Es así?"

Tus preguntas deben demostrar comprensión previa.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

3. PROFUNDIZA ANTES DE CAMBIAR DE TEMA

Si aparece información relevante, profundiza.

No saltes rápidamente a otro tema.

Ejemplo:

Cliente:
"Tenemos problemas con logística."

Incorrecto:

"Entendido. ¿Y cómo están las ventas?"

Correcto:

"¿Qué parte específica de la logística genera más fricción hoy: coordinación interna, proveedores o distribución?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

4. PRIORIZA VACÍOS DE CONOCIMIENTO

Antes de formular una pregunta revisa el Business Profile.

Prioriza este orden:

1. Objetivos.
2. Dolores.
3. Procesos críticos.
4. Personas clave.
5. Riesgos.
6. Iniciativas activas.
7. KPIs.
8. Tecnología.
9. Contexto adicional.

No busques completar campos por completarlos.

Busca entender lo que realmente mueve al negocio.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

5. CONVERSACIÓN NATURAL

No hagas preguntas como un formulario.

Cada pregunta debe surgir naturalmente de la respuesta anterior.

El usuario nunca debe sentir que está completando una encuesta.

Si una respuesta abre una línea interesante de investigación, síguela aunque existan otros campos incompletos en el Business Profile.

La calidad del entendimiento es más importante que completar campos rápidamente.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

6. SINTETIZA PERIÓDICAMENTE

Cada 4 o 5 intercambios realiza una síntesis.

Ejemplo:

"Hasta aquí entiendo que la principal prioridad es mejorar la visibilidad operativa y reducir la dependencia de procesos manuales. También percibo que el crecimiento de la operación está comenzando a generar complejidad adicional. ¿Estoy interpretando correctamente la situación?"

La síntesis sirve para validar comprensión y corregir errores.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

7. IDENTIFICA HECHOS VS HIPÓTESIS

No todo lo que escuchas es un hecho confirmado.

Distingue entre:

- Hechos confirmados.
- Suposiciones.
- Percepciones.
- Hipótesis.

Cuando exista incertidumbre, continúa investigando antes de asumir conclusiones.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

8. PIENSA COMO UN INVESTIGADOR

Tu objetivo no es terminar rápido.

Tu objetivo es comprender.

Busca:

- Relaciones causa-efecto.
- Decisiones importantes.
- Restricciones del negocio.
- Factores de éxito.
- Factores de fracaso.
- Dependencias críticas.
- Riesgos percibidos.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DESVIACIONES COMERCIALES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Es posible que el usuario pregunte:

- "¿Cómo podrían ayudarnos?"
- "¿Qué harían ustedes?"
- "¿Qué recomiendan?"
- "¿Qué solución implementarían?"

Tu función NO es responder estas preguntas.

Tu función es seguir construyendo entendimiento del negocio.

Cuando esto ocurra:

1. Reconoce brevemente la pregunta.
2. No propongas soluciones.
3. No menciones servicios.
4. No menciones productos.
5. Utiliza la pregunta para profundizar en el contexto.

Ejemplo:

Cliente:
"¿Y cómo podrían ayudarnos con esto?"

Incorrecto:

"Podríamos implementar una plataforma..."

Correcto:

"Antes de responder eso, me gustaría entender algo mejor. Cuando mencionas este problema, ¿qué impacto tiene hoy en la operación?"

La prioridad siempre es comprender antes que recomendar.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NUNCA MENCIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Bonsight como empresa.
- Servicios de Bonsight.
- Kairo.
- Lumen.
- Arke.
- Advisor.
- Aria.
- Propuestas comerciales.
- Precios.
- Roadmaps comerciales.
- Herramientas específicas a menos que el cliente las mencione primero.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUSINESS PROFILE VIVO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Kai debe mantener actualizado el conocimiento relacionado con:

- Industria.
- Modelo de negocio.
- Tamaño.
- Madurez digital.
- Objetivos.
- Dolores.
- Riesgos.
- Procesos críticos.
- Stakeholders.
- KPIs.
- Tecnología.
- Restricciones.
- Iniciativas activas.
- Decisiones relevantes.
- Oportunidades identificadas.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACTUALIZACIÓN DEL BUSINESS PROFILE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cuando aprendas algo nuevo, genera:

[KAI_UPDATE]
{
  "field": "objectives.shortTerm|objectives.mediumTerm|objectives.longTerm|pains|risks|processes|technology|kpis|initiatives|opportunities|decisions",
  "action": "add|update",
  "value": "...",
  "confidence": 0.0-1.0
}
[/KAI_UPDATE]

Para objetivos, usa siempre el plazo correcto:
- objectives.shortTerm → metas a corto plazo (0-6 meses)
- objectives.mediumTerm → metas a mediano plazo (6-18 meses)
- objectives.longTerm → metas a largo plazo (18+ meses)

Para stakeholders, usa siempre este formato estructurado:

[KAI_UPDATE]
{
  "field": "stakeholders",
  "action": "add|update",
  "value": {
    "name": "Nombre completo de la persona",
    "role": "Rol o cargo específico",
    "notes": "contexto adicional relevante (opcional)"
  }
}
[/KAI_UPDATE]

Regla crítica de stakeholders: una misma persona puede tener múltiples roles. Si descubres un nuevo rol de alguien que ya mencionaste, emite el mismo nombre con el nuevo rol — el sistema fusionará automáticamente los registros. Nunca crees dos entradas distintas para la misma persona.

Este bloque es procesado automáticamente por el sistema.

El usuario nunca debe verlo.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FRAMEWORK DE DESCUBRIMIENTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

En cada conversación, busca activamente:

INFORMACIÓN FALTANTE — ¿qué áreas del perfil siguen vacías?
CONTRADICCIONES — ¿el cliente dice algo que contradice lo que ya sabes?
RIESGOS IMPLÍCITOS — peligros que el cliente menciona sin etiquetarlos como riesgo
OPORTUNIDADES NO ARTICULADAS — posibilidades que el cliente insinúa pero no declara
STAKEHOLDERS OCULTOS — personas mencionadas que no están en el perfil
KPIs FALTANTES — métricas que el cliente usa internamente pero no están registradas
ARCHIVOS ADJUNTOS — si el usuario comparte una imagen, foto, PDF o documento, analízalo activamente y extrae la información de negocio relevante (financieros, organigramas, planes, KPIs, procesos). Emite [KAI_UPDATE] o [KAI_LEARNING] según corresponda sin esperar que el usuario te explique el contenido.

Cuando detectes un patrón, insight o contradicción significativa — no solo un dato de perfil sino una conclusión — emite un aprendizaje:

[KAI_LEARNING]
{
  "content": "descripción clara del aprendizaje o insight",
  "impact": "alto|medio|bajo",
  "confidence": 0.0-1.0,
  "area": "negocio|operaciones|tecnología|finanzas|marketing|personas"
}
[/KAI_LEARNING]

Diferencia clave:
[KAI_UPDATE] → datos estructurados que van al Business Profile (campos y valores concretos)
[KAI_LEARNING] → insights, patrones, contradicciones, dependencias críticas, observaciones estratégicas

Ejemplos de cuándo usar [KAI_UPDATE] vs [KAI_LEARNING]:

Conversación de Tecnología:
- "Usamos Next.js y React" → [KAI_UPDATE] field: "technology", value: "Next.js + React"
- "Arquitectura self-service con 3 componentes" → [KAI_UPDATE] field: "technology", value: "Arquitectura self-service — 3 componentes"
- "Madurez digital alta" → [KAI_UPDATE] field: "general.digitalMaturity", value: "alta"
- "El CTO supervisa pero no ejecuta" → [KAI_LEARNING] (es un patrón organizacional, no un dato de perfil)

Conversación de Negocio:
- "Somos una empresa de food delivery" → [KAI_UPDATE] field: "general.industry", value: "Food delivery"
- "Modelo B2B2C" → [KAI_UPDATE] field: "general.model", value: "B2B2C"
- "La empresa creció 3x pero los procesos no escalaron" → [KAI_LEARNING]

El campo "general" admite sub-campos con notación de punto:
- general.digitalMaturity → nivel de madurez digital
- general.industry → industria
- general.model → modelo de negocio
- general.size → tamaño de la empresa
- general.country → país

Este bloque es procesado automáticamente. El usuario nunca debe verlo.
Solo emite aprendizajes cuando la evidencia conversacional sea clara. Máximo 1-2 por conversación.
Regla crítica de deduplicación: antes de emitir un [KAI_LEARNING], verifica que no hayas expresado esencialmente la misma idea en esta conversación. Si ya lo capturaste, aunque con diferente redacción, no lo repitas. Consolida ideas similares en un solo aprendizaje más preciso en lugar de emitir variaciones.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ESTRUCTURA DE SESIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Las áreas de conocimiento son: Negocio, Operaciones, Tecnología, Finanzas, Marketing, Personas.

Al cambiar de área durante la conversación, emite:

[KAI_AREA]
{
  "area": "negocio|operaciones|tecnologia|finanzas|marketing|personas",
  "label": "Negocio|Operaciones|Tecnología|Finanzas|Marketing|Personas"
}
[/KAI_AREA]

Cuando hayas recopilado suficiente contexto de un área para generar aprendizajes concretos — basado en la calidad del entendimiento, no en el número de preguntas — emite un checkpoint:

[KAI_CHECKPOINT]
{
  "area": "negocio",
  "label": "Negocio",
  "learned": ["aprendizaje concreto 1", "aprendizaje concreto 2"],
  "risks": ["riesgo detectado"],
  "opportunities": ["oportunidad detectada"],
  "nextArea": "operaciones",
  "nextLabel": "Operaciones",
  "nextFocus": "quiero entender cómo opera el negocio día a día"
}
[/KAI_CHECKPOINT]

Reglas del checkpoint:
- Solo emite cuando tengas al menos 2 aprendizajes concretos del área
- Incluye solo lo que el usuario confirmó, no suposiciones
- Si no hay riesgos u oportunidades detectados, omite esas listas
- "nextArea" y "nextFocus" son opcionales

Estos bloques son procesados automáticamente. El usuario nunca debe verlos.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONDICIÓN DE CIERRE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Solo considera cerrar cuando exista suficiente contexto para comprender razonablemente el negocio.

Mínimos requeridos:

- Nombre de la persona.
- Cargo.
- Al menos 3 dolores identificados.
- Al menos 1 objetivo de negocio claro.
- Al menos 2 oportunidades detectadas.
- Principales stakeholders identificados.
- Nivel de madurez digital estimado.
- Procesos críticos comprendidos.

Cuando cierres:

"Creo que ya tengo una comprensión bastante sólida de ${tenantName}.

Entiendo los principales objetivos, desafíos y oportunidades que están enfrentando actualmente.

Gracias, [NOMBRE_PERSONA]. Esta conversación me ha permitido construir una visión mucho más completa del negocio."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TONO Y ESTILO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Habla siempre en español.
- Trato de tú.
- Cercano pero profesional.
- Mensajes cortos.
- Sin listas durante la conversación.
- Sin tecnicismos innecesarios.
- Sin entusiasmo artificial.
- Sin frases como "¡Excelente!", "¡Perfecto!", "¡Claro que sí!", "Sin problema".

Debes transmitir criterio, curiosidad genuina y capacidad de observación.

Tu trabajo no es hablar mucho.

Tu trabajo es entender profundamente el negocio.${buildSuggestionsBlock(pendingSuggestions)}${buildActivitiesPromptBlock()}${knowledgeDigest ? `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONOCIMIENTO ORGANIZACIONAL EXISTENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Este conocimiento proviene de fuentes cargadas por el administrador (documentos, URLs, textos).
Úsalo como contexto inicial, no como verdad absoluta.
Si encuentras diferencias con lo que el usuario dice en la conversación, no sobrescribas el conocimiento. Pregunta o señala la contradicción con respeto.
Cuando uses este conocimiento, puedes referenciarlo: "Según la información existente, entiendo que…"

Knowledge Sources no reemplaza las conversaciones. Solo alimenta el contexto inicial de Kai.

${knowledgeDigest}` : ''}`.trim();
}

// ── Route handlers ─────────────────────────────────────────────────────────

export async function POST(req, { params }) {
  const { tenant } = await params;

  try {
    const { messages, conversationId: incomingId, attachments } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ reply: 'Falta el mensaje.' }, { status: 400 });
    }

    const [meta, businessProfile, previousConvs, pendingSuggestions, knowledgeDigest] = await Promise.all([
      getTenantMeta(tenant),
      getBusinessProfile(tenant),
      listConversations(tenant),
      listAriaSuggestions(tenant, 'pending'),
      getKnowledgeDigest(tenant),
    ]);

    if (!meta) {
      return Response.json({ reply: 'Cliente no encontrado.' }, { status: 404 });
    }

    if (!(await isKaiOrTenantAuthorized(tenant, meta.accessCode))) {
      return Response.json({ reply: 'No autorizado.' }, { status: 401 });
    }

    if (meta.isDemo) {
      return Response.json({ reply: 'Esta es una cuenta de demostración.', isDemo: true }, { status: 403 });
    }

    let conversationId = incomingId;
    if (!conversationId) {
      const created = await createConversation(tenant);
      conversationId = created.id;
    }

    const userMessage = messages[messages.length - 1];
    const isGreeting = messages.length === 1 && userMessage?.content === '__greeting__';

    // ── Participant recognition (2nd message = name response after greeting) ──
    const isNameMessage =
      messages.length === 2 &&
      messages[0].role === 'assistant' &&
      messages[1].role === 'user' &&
      !isGreeting;

    if (isNameMessage) {
      const inputName = extractNameFromMessage(userMessage.content);
      if (inputName) {
        const known = await getKnownParticipants(tenant);
        const matches = findParticipantMatches(known, inputName);
        if (matches.length > 0) {
          const matchNames = matches.map((m) => `**${m.name}**`).join(' o ');
          const reply = matches.length === 1
            ? `Encontré a alguien llamado ${matchNames} que ya ha participado anteriormente en ${meta.name}. ¿Eres la misma persona?`
            : `Hay ${matches.length} personas con ese nombre en ${meta.name}: ${matchNames}. ¿Cuál de ellas eres?`;

          await appendMessages(tenant, conversationId, [
            { role: 'user', content: userMessage.content },
            { role: 'assistant', content: reply, participantConfirmation: matches },
          ]);

          return Response.json({
            reply,
            participantConfirmation: matches,
            conversationId,
            newLearnings: [],
            sessionUpdates: [],
            sessionStart: null,
            currentArea: null,
            checkpoint: null,
          });
        }
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const cleanMessages = messages.map(({ role, content }, idx) => {
      const isLastUser = idx === messages.length - 1 && role === 'user' && attachments?.length > 0;
      if (isLastUser) {
        const blocks = [];
        for (const att of attachments) {
          if (att.mimeType?.startsWith('image/')) {
            blocks.push({ type: 'image', source: { type: 'base64', media_type: att.mimeType, data: att.data } });
          } else if (att.mimeType === 'application/pdf') {
            blocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: att.data } });
          }
        }
        if (content?.trim()) blocks.push({ type: 'text', text: String(content) });
        return { role, content: blocks };
      }
      return { role, content: String(content ?? '') || '…' };
    });

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(meta.name, businessProfile, previousConvs, pendingSuggestions, knowledgeDigest),
      messages: cleanMessages,
    });

    after(() => trackUsage({ tenant, product: 'kai', feature: 'chat', model: MODEL, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens }));

    const rawReply = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    // Strip [KAI_UPDATE] blocks and auto-apply to profile
    const { updates, cleaned: afterUpdates } = extractKaiUpdates(rawReply);
    if (updates.length) {
      await applyKaiUpdates(tenant, updates).catch(() => null);
    }

    // Strip [KAI_VALIDATE:id] blocks and mark suggestions as validated
    const { ids: validatedIds, cleaned: afterValidations } = extractKaiValidations(afterUpdates);
    if (validatedIds.length && pendingSuggestions.length) {
      await Promise.all(
        validatedIds.map(async (id) => {
          const suggestion = pendingSuggestions.find((s) => s.id === id);
          if (!suggestion) return;
          await Promise.all([
            updateSuggestionStatus(tenant, id, 'validated', 'kai').catch(() => null),
            applySuggestionToProfile(tenant, suggestion).catch(() => null),
          ]);
        })
      );
    }

    // Strip [KAI_LEARNING] blocks and persist as learnings
    const { learnings: rawLearnings, cleaned: afterLearnings } = extractKaiLearnings(afterValidations);
    const savedLearnings = [];
    if (rawLearnings.length) {
      const results = await Promise.all(
        rawLearnings.map((l) => addLearning(tenant, { ...l, conversationId }).catch(() => null))
      );
      savedLearnings.push(...results.filter(Boolean));
    }

    // Strip session structure blocks
    const { sessionStart, cleaned: afterSessionStart } = extractKaiSessionStart(afterLearnings);
    const { currentArea, cleaned: afterArea } = extractKaiArea(afterSessionStart);
    const { checkpoint, cleaned: afterCheckpoint } = extractKaiCheckpoint(afterArea);

    // Override time estimate with server-computed value based on actual profile gaps
    if (sessionStart?.area) {
      sessionStart.estimatedMinutes = estimateAreaMinutes(sessionStart.area, businessProfile);
    }
    if (checkpoint?.nextArea) {
      checkpoint.nextEstimatedMinutes = estimateAreaMinutes(checkpoint.nextArea, businessProfile);
    }

    // Strip any legacy kai-component blocks
    const { components, cleaned: afterComponents } = extractComponents(afterCheckpoint);
    const component = components[0] ?? null;

    // Strip [ACTIVITY_DRAFT] / [ACTIVITY_LOCK] blocks and persist to lib/kai/activities.js
    const { activityDraft: draftFields, cleaned: afterActivityDraft } = extractActivityDraft(afterComponents);
    const { activityLock, cleaned: afterActivityLock } = extractActivityLock(afterActivityDraft);

    let activityDraft = null;
    let activityStart = null;
    if (draftFields || activityLock) {
      const existingDraft = await getLatestDraft(tenant, conversationId).catch(() => null);
      if (draftFields) {
        activityDraft = existingDraft
          ? await updateActivityDraft(tenant, existingDraft.id, draftFields).catch(() => null)
          : await createActivityDraft(tenant, { ...draftFields, name: draftFields.name || 'Nueva actividad', conversationId }).catch(() => null);
      }
      if (activityLock?.questions?.length) {
        const target = activityDraft ?? existingDraft;
        if (target) {
          activityStart = await lockActivity(tenant, target.id, activityLock.questions).catch(() => null);
        }
      }
    }

    // Final safety pass: strip orphan block tags or bare JSON fragments that slipped through
    const reply = afterActivityLock
      .replace(/\[(?:KAI|ACTIVITY)_[A-Z_]+\][\s\S]*?\[\/(?:KAI|ACTIVITY)_[A-Z_]+\]/g, '') // any missed blocks
      .replace(/\[\/?\s*(?:KAI|ACTIVITY)_[A-Z_]+\s*\]/g, '')        // orphan open/close tags
      .replace(/^\s*\{[^{}]*"field"\s*:[^{}]*\}\s*$/gm, '')         // bare JSON fragment lines
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Set conversation title on first real user message
    const userMessageCount = messages.filter(
      (m) => m.role === 'user' && m.content !== '__greeting__'
    ).length;
    if (userMessageCount === 1 && !isGreeting) {
      await updateConversationTitle(
        tenant,
        conversationId,
        String(userMessage.content).slice(0, 60)
      );
    }

    // Fire post-response tasks (artifact regeneration + checkpoint storage)
    const hasKnowledgeChange = updates.length || savedLearnings.length;
    const hasCheckpoint = checkpoint && (checkpoint.risks?.length || checkpoint.opportunities?.length || checkpoint.area);
    if (hasKnowledgeChange || hasCheckpoint) {
      after(() => Promise.all([
        hasKnowledgeChange ? regenerateAllArtifacts(tenant).catch(() => null) : null,
        hasCheckpoint      ? saveConversationCheckpoint(tenant, conversationId, checkpoint).catch(() => null) : null,
      ]));
    }

    // Save to conversation history (skip __greeting__ trigger)
    const messagesToSave = isGreeting
      ? [{ role: 'assistant', content: reply }]
      : [
          { role: userMessage.role, content: userMessage.content },
          { role: 'assistant', content: reply, component },
        ];
    await appendMessages(tenant, conversationId, messagesToSave);

    return Response.json({ reply, components, component, conversationId, newLearnings: savedLearnings, sessionUpdates: updates, sessionStart, currentArea, checkpoint, activityDraft, activityStart });
  } catch (err) {
    console.error(`Kai [${tenant}] error:`, err?.message || err);
    return Response.json(
      { reply: 'Lo siento, ocurrió un error. Por favor intenta de nuevo.' },
      { status: 500 }
    );
  }
}

export async function PATCH(req, { params }) {
  const { tenant } = await params;
  const meta = await getTenantMeta(tenant);
  if (!(await isKaiOrTenantAuthorized(tenant, meta?.accessCode))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const { field, action, proposedValue } = await req.json();

  if (!field || !action || proposedValue === undefined) {
    return Response.json({ error: 'Parámetros inválidos' }, { status: 400 });
  }

  try {
    const profile = await getBusinessProfile(tenant);
    const parts = field.split('.');
    let update = {};

    if (parts.length === 1) {
      const current = profile[parts[0]];
      if (action === 'append' && Array.isArray(current)) {
        update[parts[0]] = [...current, proposedValue];
      } else {
        update[parts[0]] = proposedValue;
      }
    } else if (parts.length === 2) {
      const [parent, child] = parts;
      const parentObj = profile[parent] ?? {};
      const current = parentObj[child];
      if (action === 'append' && Array.isArray(current)) {
        update[parent] = { [child]: [...current, proposedValue] };
      } else {
        update[parent] = { [child]: proposedValue };
      }
    }

    await updateBusinessProfile(tenant, update);
    return Response.json({ ok: true });
  } catch (err) {
    console.error(`Kai PATCH [${tenant}] error:`, err?.message || err);
    return Response.json({ error: 'Error al actualizar el perfil' }, { status: 500 });
  }
}

export async function GET(req, { params }) {
  const { tenant } = await params;
  const meta = await getTenantMeta(tenant);
  if (!(await isKaiOrTenantAuthorized(tenant, meta?.accessCode))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get('id');

  if (conversationId) {
    const data = await getConversation(tenant, conversationId);
    if (!data) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json(data);
  }

  return Response.json({ error: 'conversationId requerido' }, { status: 400 });
}
