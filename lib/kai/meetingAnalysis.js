import Anthropic from '@anthropic-ai/sdk';
import { getBusinessProfile, updateBusinessProfile } from '@/lib/kai/tenants';
import { addLearning, listLearnings } from '@/lib/kai/learnings';
import { getKnownParticipants } from '@/lib/kai/participants';

const MODEL = 'claude-sonnet-4-6';

export const KNOWLEDGE_AREA_IDS = ['negocio', 'operaciones', 'tecnologia', 'finanzas', 'marketing', 'personas'];

// El resto del sistema (addLearning/scoring) usa confianza 0–1. El LLM es malo calibrando
// floats con precisión falsa, así que le pedimos un nivel cualitativo y lo mapeamos acá —
// "ante la duda, subestimar" queda como instrucción explícita en el prompt.
const CONFIDENCE_MAP = { alta: 0.9, media: 0.6, baja: 0.3 };

const AREA_LABELS = {
  negocio: 'Negocio',
  operaciones: 'Operaciones',
  tecnologia: 'Tecnología',
  finanzas: 'Finanzas',
  marketing: 'Marketing',
  personas: 'Personas',
};

// Frases fijas que reproduce Google Meet por la línea telefónica — no son conversación.
// Filtro conservador (regex, no heurística difusa) para no arriesgarse a cortar contenido real.
const MEET_ANNOUNCEMENT_PATTERNS = [
  /\b\w[\w .'-]* has joined the call\.?/gi,
  /\b\w[\w .'-]* has left the call\.?/gi,
  /\byou'?ve joined the (call|meeting)\.?/gi,
  /\bthe other participants have left the call\.?[^.]*/gi,
  /\bonly you remain in this (call|meeting)\.?/gi,
  /\bplease enter your PIN followed by the (pound|hash) (sign|key)\.?/gi,
  /\bwaiting for (the meeting host|others) to join\.?/gi,
  /\bthis (call|meeting) is now being recorded\.?/gi,
];

// Se aplica ANTES de mandarle la transcripción al modelo — defensa en profundidad junto
// con la instrucción explícita del prompt de ignorar anuncios del sistema.
export function stripMeetAnnouncements(transcript) {
  let cleaned = transcript;
  for (const pattern of MEET_ANNOUNCEMENT_PATTERNS) cleaned = cleaned.replace(pattern, '');
  return cleaned.replace(/\s{2,}/g, ' ').trim();
}

// Aplana el Business Profile + aprendizajes recientes en una lista de afirmaciones
// legible, para que el LLM pueda distinguir "nuevo" de "ya sabido" y detectar
// contradicciones. Si esto crece mucho con el tiempo, recortar a los N más recientes
// por área — hoy el volumen de un solo tenant (Bonsight) no lo amerita todavía.
export function buildKnowledgeContext(profile, learnings = []) {
  const lines = [];

  const g = profile?.general ?? {};
  if (g.industry) lines.push(`[Negocio] Industria: ${g.industry}`);
  if (g.model) lines.push(`[Negocio] Modelo de negocio: ${g.model}`);
  if (g.country) lines.push(`[Negocio] País: ${g.country}`);
  if (g.size) lines.push(`[Negocio] Tamaño del equipo: ${g.size}`);
  if (g.digitalMaturity) lines.push(`[Tecnología] Madurez digital: ${g.digitalMaturity}`);

  for (const [key, label] of [['shortTerm', 'corto plazo'], ['mediumTerm', 'mediano plazo'], ['longTerm', 'largo plazo']]) {
    for (const item of profile?.objectives?.[key] ?? []) lines.push(`[Negocio] Objetivo (${label}): ${item}`);
  }
  for (const item of profile?.pains ?? []) lines.push(`[Operaciones] Dolor conocido: ${item}`);
  for (const item of profile?.risks ?? []) lines.push(`[Finanzas] Riesgo conocido: ${item}`);
  for (const item of profile?.opportunities ?? []) lines.push(`[Marketing] Oportunidad conocida: ${item}`);
  for (const item of profile?.stakeholders ?? []) lines.push(`[Personas] Stakeholder: ${typeof item === 'string' ? item : JSON.stringify(item)}`);
  for (const item of profile?.kpis ?? []) lines.push(`[Finanzas] KPI: ${typeof item === 'string' ? item : JSON.stringify(item)}`);
  for (const item of profile?.processes ?? []) lines.push(`[Operaciones] Proceso: ${typeof item === 'string' ? item : JSON.stringify(item)}`);
  for (const item of profile?.initiatives ?? []) lines.push(`[Operaciones] Iniciativa: ${typeof item === 'string' ? item : JSON.stringify(item)}`);
  for (const item of profile?.decisions ?? []) lines.push(`[Operaciones] Decisión previa: ${typeof item === 'string' ? item : JSON.stringify(item)}`);
  for (const item of profile?.technology ?? []) lines.push(`[Tecnología] ${typeof item === 'string' ? item : JSON.stringify(item)}`);

  const recentLearnings = [...learnings]
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .slice(0, 40);
  for (const l of recentLearnings) {
    const areaLabel = AREA_LABELS[l.area] ?? l.area ?? 'General';
    lines.push(`[${areaLabel}] (aprendizaje ${l.createdAt?.slice(0, 10) ?? ''}) ${l.content}`);
  }

  return lines.length ? lines.join('\n') : '(El Knowledge Base de este tenant está vacío todavía — todo lo dicho en la reunión debe tratarse como conocimiento nuevo.)';
}

// Glosario de nombres reales — el modelo lo usa para corregir transcripciones dudosas
// ("Rafael Litriago" -> "Rafa Itriago"), no para inventar quién habló si no está claro.
// Los invitados de Calendar de ESTA reunión puntual son la señal más confiable de todas —
// vienen de la invitación real, no de un aprendizaje anterior — por eso se listan aparte.
function buildPeopleGlossary(participants, profile, attendees) {
  const names = new Set();
  for (const p of participants ?? []) if (p?.name) names.add(p.role ? `${p.name} (${p.role})` : p.name);
  for (const s of profile?.stakeholders ?? []) {
    const label = typeof s === 'string' ? s : (s?.name ?? null);
    if (label) names.add(label);
  }

  const invited = new Set();
  for (const a of attendees ?? []) {
    if (a?.name) invited.add(a.email ? `${a.name} (${a.email})` : a.name);
    else if (a?.email) invited.add(a.email);
  }

  const known = names.size ? [...names].join(', ') : '(sin personas conocidas registradas todavía)';
  if (!invited.size) return known;
  return `${known}\n\nINVITADOS A ESTA REUNIÓN según Google Calendar (máxima confianza — son la lista real de invitados de este evento puntual, priorizalos sobre el resto si hay conflicto de nombre): ${[...invited].join(', ')}`;
}

function buildPrompt(knowledgeContext, peopleGlossary, transcript, meetingTitle) {
  return `Eres el motor de extracción de conocimiento de Kai, la capa de inteligencia estratégica de Bonsight. Tu única función es leer la transcripción de una reunión y devolver un JSON estructurado. No conversas, no haces preguntas, no agregas texto fuera del JSON.

## Entrada

TÍTULO DE LA REUNIÓN: ${meetingTitle || '(sin título)'}

CONOCIMIENTO_ACTUAL (afirmaciones ya conocidas por Kai sobre esta empresa):
${knowledgeContext}

PERSONAS CONOCIDAS (nombres reales — usalos para corregir nombres mal transcritos por reconocimiento de voz. Si un nombre en la transcripción se parece razonablemente a uno de esta lista, usa el nombre correcto de la lista en tu output, no la transcripción literal. Esta corrección aplica a TODO el output por igual — summary, decisions, tasks, knowledge — no uses la versión corregida en un campo y la transcrita literal en otro para la misma persona. Si no hay ninguna coincidencia razonable, dejá el nombre tal cual está — no inventes una persona nueva):
${peopleGlossary}

TRANSCRIPCIÓN (puede incluir anuncios automáticos del sistema de videoconferencia — ignoralos por completo, no son conversación real: "alguien se unió a la llamada", "los demás participantes abandonaron la llamada", indicaciones de PIN, avisos de grabación, etc.):
${transcript}

## Tarea

Analiza la transcripción y genera los siguientes bloques:

### 0. hasSubstantiveContent
Boolean. false si la transcripción completa es solo anuncios del sistema, silencio, una prueba técnica de conexión, o frases sueltas sin ningún contenido de negocio real (ej. "gracias", "¿me escuchas?", alguien probando el audio). true si hubo conversación real con algún contenido, aunque sea breve.

### 1. summary
3 a 5 líneas, en prosa simple, sin encabezados internos. Cada línea es una idea completa, no un fragmento. No repitas literalmente frases de la transcripción — parafrasea. Si hasSubstantiveContent es false, un summary de una sola línea explicando qué fue la sesión (ej. "Prueba técnica de conexión, sin contenido de reunión.") es suficiente.

### 2. decisions
Lista de decisiones explícitas que el grupo tomó durante la reunión. Solo incluye algo aquí si fue acordado, no si fue simplemente mencionado o propuesto sin resolución. Si nadie llegó a un acuerdo claro, no inventes una decisión. Cada ítem: { "title": string, "reason": string }.

### 3. tasks
Lista de compromisos mencionados en la reunión — no solo instrucciones tipo checklist. Reconocé estas formas:
- Explícito: instrucción directa con nombre y verbo de compromiso ("Hazel va a enviar la presentación").
- Primera persona: quien habla se compromete a algo sobre sí mismo ("yo separo el número", "me encargo de la parte técnica", "respondo en menos de 48 horas") — el owner es quien está hablando en ese tramo, identificalo por el contexto de la conversación, no busques su nombre pegado a la frase.
- Acuerdo de grupo: compromiso compartido sin un solo dueño ("nos vemos el jueves", "quedamos en revisar el plan la próxima semana") — usá "owner": null.
- Compromiso interno del equipo de Bonsight: tiene la misma prioridad que uno del cliente — no lo omitas por no ser de cara al cliente.

Reglas:
- Una reunión de seguimiento o cierre acordada con fecha aproximada ("nos juntamos la próxima semana", "cerramos el plan el jueves") ES un compromiso de grupo y va como tarea con "owner": null y el "deadline" con la fecha relativa mencionada. No la descartes solo porque ese mismo compromiso ya aparezca mencionado en el summary — summary y tasks son independientes, algo puede (y a menudo debe) estar en ambos. Y no la confundas con la exclusión de "coordinación logística" del bloque de knowledge más abajo: esa exclusión aplica solo a esa sección, nunca a tasks.
- Nunca uses el texto "Unknown" como owner. Si no hay un responsable claro, "owner": null y, si la transcripción sugiere una o más personas posibles sin confirmarlo, listalas en "possibleOwners" (si no hay ninguna pista, array vacío).
- No infieras plazos que no se mencionaron explícitamente, pero SÍ capturá condiciones temporales relativas dichas de forma explícita ("antes del jueves", "en menos de 48 horas", "la próxima semana").
- "confidence": "alta" si el compromiso y el dueño son inequívocos; "media"/"baja" si hay ambigüedad en cualquiera de los dos.
- "commitmentType": "explicit" (instrucción directa con nombre), "agreed" (acuerdo de grupo sin dueño único), o "inferred" (dedujiste el compromiso de lenguaje indirecto o primera persona, no de una instrucción literal).
- "evidence": la frase textual (o casi textual) de la transcripción de la que sacaste este compromiso, para poder verificarlo después sin releer todo.

Cada ítem: { "owner": string | null, "task": string, "deadline": string | null, "confidence": "alta" | "media" | "baja", "commitmentType": "explicit" | "agreed" | "inferred", "evidence": string, "possibleOwners": string[] }.

### 4. knowledge
Compara lo que se dijo contra CONOCIMIENTO_ACTUAL. Incluye una afirmación solo si:
- No existe todavía en CONOCIMIENTO_ACTUAL, o
- Actualiza un valor que sí existe (en ese caso, además va también en contradictions).

Criterio estricto — NO generes conocimiento a partir de:
- Pruebas técnicas o problemas de conexión.
- Coordinación logística (horarios, quién se conecta, links, agendar la próxima reunión).
- Saludos, despedidas o charla casual.
- Confirmaciones operativas sin contenido ("listo", "perfecto", "ok").
- Opiniones, bromas o hipótesis sin resolución ("¿y si probamos con SAP?").

SÍ generá conocimiento quando la reunión aporte:
- Procesos o flujos de trabajo.
- Decisiones permanentes o acuerdos organizacionales.
- Estrategia o restricciones del negocio.
- Roles y responsabilidades.
- Información sobre clientes o productos.
- Definiciones importantes del negocio.

Agrupa: si varias afirmaciones describen la misma idea, estructura o proceso relacionado, consolídalas en un solo ítem en vez de fragmentarlas en varias afirmaciones parecidas que se solapan. Preferí menos ítems, más completos, sobre muchos ítems atomizados — un ítem puede (y debe, cuando corresponda) combinar varios detalles relacionados en un párrafo, no un dato suelto por ítem.

Para cada ítem asigna:
- "area": uno de estos 6 valores EXACTOS (sin inventar otros): "negocio", "operaciones", "tecnologia", "finanzas", "marketing", "personas".
- "confidence": "alta" (afirmación directa y explícita, sin condicionales), "media" (con matices, dudas, o indirecta), o "baja" (mencionada de pasada, especulativa, o inferencia tuya). Si tienes dudas entre dos niveles, elige el más bajo — es preferible subestimar la confianza que sobreestimarla.

Cada ítem: { "statement": string, "area": string, "confidence": "alta" | "media" | "baja" }.

### 5. contradictions
Si algo dicho choca directamente con una afirmación existente en CONOCIMIENTO_ACTUAL, repórtalo citando AMBOS valores tal cual aparecen (textual, sin parafrasear) — no resuelvas tú la contradicción, eso lo decide una persona. Cada ítem: { "existing": string, "new": string, "reason": string }.

## Idioma

Responde siempre en el mismo idioma en que está la transcripción. Si mezcla idiomas, usa el que predomine.

## Formato de salida

Responde ÚNICAMENTE con un objeto JSON válido, sin texto antes ni después, sin markdown, sin backticks. Estructura exacta:

{
  "hasSubstantiveContent": true,
  "summary": "string",
  "decisions": [{ "title": "string", "reason": "string" }],
  "tasks": [{ "owner": "string|null", "task": "string", "deadline": "string|null", "confidence": "alta|media|baja", "commitmentType": "explicit|agreed|inferred", "evidence": "string", "possibleOwners": ["string"] }],
  "knowledge": [{ "statement": "string", "area": "string", "confidence": "alta|media|baja" }],
  "contradictions": [{ "existing": "string", "new": "string", "reason": "string" }]
}

Si un bloque no tiene ítems, devuelve una lista vacía. Nunca omitas una clave.`;
}

function parseJsonResponse(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
  const parsed = JSON.parse(cleaned);
  return {
    hasSubstantiveContent: parsed.hasSubstantiveContent !== false,
    summary: String(parsed.summary ?? ''),
    decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
    tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
    knowledge: (Array.isArray(parsed.knowledge) ? parsed.knowledge : [])
      .filter((k) => KNOWLEDGE_AREA_IDS.includes(k.area))
      .map((k) => ({ ...k, status: 'pending' })),
    contradictions: Array.isArray(parsed.contradictions) ? parsed.contradictions : [],
  };
}

export async function analyzeMeetingTranscript(tenant, { transcript, meetingTitle, attendees }) {
  if (!transcript?.trim()) throw new Error('La transcripción está vacía.');

  const [profile, learnings, participants] = await Promise.all([
    getBusinessProfile(tenant),
    listLearnings(tenant),
    getKnownParticipants(tenant),
  ]);
  const knowledgeContext = buildKnowledgeContext(profile, learnings);
  const peopleGlossary = buildPeopleGlossary(participants, profile, attendees);
  const cleanedTranscript = stripMeetAnnouncements(transcript);

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: buildPrompt(knowledgeContext, peopleGlossary, cleanedTranscript, meetingTitle) }],
  });

  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const analysis = parseJsonResponse(text);
  return { ...analysis, meetingTitle: meetingTitle || 'Reunión', analyzedAt: new Date().toISOString() };
}

export async function acceptKnowledgeItem(tenant, item, conversationId) {
  const confidence = CONFIDENCE_MAP[item.confidence] ?? 0.5;
  return addLearning(tenant, {
    content: item.statement,
    area: item.area,
    confidence,
    source: 'reunión',
    conversationId,
  });
}

export async function acceptDecision(tenant, decision) {
  const profile = await getBusinessProfile(tenant);
  const current = Array.isArray(profile.decisions) ? profile.decisions : [];
  const text = decision.reason ? `${decision.title} — ${decision.reason}` : decision.title;
  if (current.includes(text)) return profile;
  return updateBusinessProfile(tenant, { decisions: [...current, text] });
}
