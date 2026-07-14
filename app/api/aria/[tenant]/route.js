import Anthropic from '@anthropic-ai/sdk';
import { isAuthorizedForTenant } from '@/lib/aria/auth';
import {
  listInvestigations,
  getInvestigationMeta,
  updateInvestigationMeta,
  appendInvestigationMessages,
  recordAriaMetrics,
  searchArchivedInvestigations,
} from '@/lib/aria/memory';
import { getTenantMeta } from '@/lib/kai/tenants';
import { trackUsage } from '@/lib/kai/usage';
import { listConversations } from '@/lib/kai/memory';
import { summarizeIfNeeded } from '@/lib/aria/summarize';
import { addAriaSuggestion } from '@/lib/kai/suggestions';
import { getIntelligenceSources, buildSourcesContext } from '@/lib/kai/intelligenceSources';
import { buildBIC, formatBICForPrompt } from '@/lib/kai/bic';
import { runGa4Query } from '@/lib/aria/ga4';
import { runSearchConsoleQuery } from '@/lib/aria/searchConsole';
import { runGoogleAdsQuery } from '@/lib/aria/googleAds';
import { getDbSources, queryDatabase, buildDbSourcesContext } from '@/lib/aria/databases';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 8000;
const MAX_ITERATIONS = 3;

// ── Parsers ────────────────────────────────────────────────────────────────

function extractAriaSuggestions(text) {
  const suggestions = [];
  const regex = /\[ARIA_SUGGESTION\]([\s\S]*?)\[\/ARIA_SUGGESTION\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    try { suggestions.push(JSON.parse(match[1].trim())); } catch {}
  }
  const cleaned = text.replace(/\[ARIA_SUGGESTION\][\s\S]*?\[\/ARIA_SUGGESTION\]/g, '').trim();
  return { suggestions, cleaned };
}

function extractAriaIntel(text) {
  const items = [];
  const regex = /\[ARIA_INTEL\]([\s\S]*?)\[\/ARIA_INTEL\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    try {
      const item = JSON.parse(match[1].trim());
      if (item.type && item.text) items.push(item);
    } catch {}
  }
  const cleaned = text.replace(/\[ARIA_INTEL\][\s\S]*?\[\/ARIA_INTEL\]/g, '').trim();
  return { items, cleaned };
}

function extractAriaTopics(text) {
  const match = /\[ARIA_TOPICS\]([\s\S]*?)\[\/ARIA_TOPICS\]/.exec(text);
  const cleaned = text.replace(/\[ARIA_TOPICS\][\s\S]*?\[\/ARIA_TOPICS\]/g, '').trim();
  if (!match) return { topics: [], cleaned };
  try {
    const topics = JSON.parse(match[1].trim());
    return { topics: Array.isArray(topics) ? topics.slice(0, 3) : [], cleaned };
  } catch {
    return { topics: [], cleaned };
  }
}

// ── Context builders ───────────────────────────────────────────────────────

function buildKaiHistory(convs = []) {
  if (!convs.length) return 'Sin conversaciones previas con Kai.';
  return convs
    .slice(0, 8)
    .map((c) => {
      const date = new Date(c.createdAt).toLocaleDateString('es-MX', {
        day: '2-digit', month: 'short', year: 'numeric',
      });
      return `- [${date}] ${c.title || 'Conversación sin título'}`;
    })
    .join('\n');
}

function buildAriaHistory(invs = [], currentId) {
  const prev = invs.filter((i) => i.id !== currentId).slice(0, 5);
  if (!prev.length) return 'Sin análisis previos.';
  return prev
    .map((inv) => {
      const date = new Date(inv.updatedAt || inv.createdAt).toLocaleDateString('es-MX', {
        day: '2-digit', month: 'short', year: 'numeric',
      });
      const lines = [`- [${date}] ${inv.emoji ?? '🔍'} ${inv.titulo || 'Análisis sin título'} (${inv.area || 'General'})`];
      if (inv.resumen_sesion) lines.push(`  Resumen: "${inv.resumen_sesion}"`);
      if (inv.nuevos_insights?.length) lines.push(`  Insights: ${inv.nuevos_insights.slice(0, 2).map((s) => `"${s}"`).join(', ')}`);
      if (inv.decisiones_confirmadas?.length) lines.push(`  Decisiones: ${inv.decisiones_confirmadas.slice(0, 2).map((s) => `"${s}"`).join(', ')}`);
      return lines.join('\n');
    })
    .join('\n\n');
}

// ── System prompt ──────────────────────────────────────────────────────────

function buildSystemPrompt({ tenantName, bicText, kaiHistory, ariaHistory, investigationContext, currentDate, sourcesContext, dbSourcesContext }) {
  return `Eres Aria, la analista estratégica asignada a ${tenantName}.

Tu misión es transformar conocimiento, datos y contexto empresarial en inteligencia accionable.

Analizas.
Interpretas.
Detectas patrones.
Identificas riesgos.
Encuentras oportunidades.
Construyes hipótesis.
Generas recomendaciones.
Mides resultados.

No eres un chatbot genérico.
No eres una buscadora de respuestas.
No generas análisis vacíos.

Eres una analista senior que conoce profundamente este negocio y ayuda a tomar mejores decisiones.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IDENTIDAD DE ARIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cada instancia de Aria pertenece exclusivamente a un cliente.

Debes comportarte como una analista que lleva meses trabajando dentro de esta organización.

Nunca respondas como una IA genérica.

Cada análisis debe reflejar conocimiento profundo de:

- Objetivos.
- Procesos.
- Personas.
- Restricciones.
- Historial.
- Prioridades.
- Decisiones previas.
- Riesgos actuales.

El usuario debe sentir que conoces su negocio.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTEXTO DEL CLIENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Lo que sabes sobre ${tenantName}:

${bicText}

Historial generado por Kai:

${kaiHistory}

Historial de análisis anteriores:

${ariaHistory}

Contexto de la investigación actual:

${JSON.stringify(investigationContext ?? {}, null, 2)}

Fecha actual: ${currentDate}

Este contexto es tu fuente principal de verdad.

Debes utilizarlo en todas tus respuestas.

Nunca respondas como si estuvieras conociendo el negocio por primera vez.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FUENTES DE INTELIGENCIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${sourcesContext ?? ''}
${dbSourcesContext ? `\nBASES DE DATOS CONECTADAS:\n${dbSourcesContext}` : ''}

Cuando uses datos de un conector (Nivel 1), indica implícitamente que es evidencia directa — no una hipótesis.
Cuando uses Business Profile o historial (Nivel 2-3), es conocimiento validado — úsalo con confianza pero sin presentarlo como dato en tiempo real.
Cuando no haya evidencia directa disponible para una conclusión, formúlala como hipótesis razonada con nivel de confianza explícito.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROTOCOLO DE CONSULTA DE FUENTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Si una fuente aparece como activa en FUENTES DE INTELIGENCIA y la pregunta requiere datos observados de esa fuente, debes consultarla antes de responder. Nunca respondas indicando únicamente que la fuente existe o está configurada.

Proceso obligatorio cuando hay datos que consultar:
1. Identificar qué fuentes tienen los datos que necesita la pregunta.
2. Llamar a las herramientas de consulta correspondientes.
3. Analizar los resultados recibidos.
4. Responder con base en evidencia real.

Cuándo consultar GA4 (query_ga4):
- Preguntas sobre tráfico, sesiones, usuarios, canales de adquisición.
- Preguntas sobre conversiones, eventos, engagement.
- Preguntas sobre landing pages, páginas de mayor rendimiento.
- Preguntas sobre comportamiento de usuarios, dispositivos, países.

Cuándo consultar Search Console (query_search_console):
- Preguntas sobre visibilidad orgánica, queries de búsqueda, posicionamiento SEO.
- Preguntas sobre CTR orgánico, impresiones, demanda de búsqueda.

Cuándo consultar Google Ads (query_google_ads):
- Preguntas sobre campañas, inversión publicitaria, keywords pagadas, search terms.
- Preguntas sobre ROI de pauta, costo por conversión, CTR de anuncios.
- Preguntas sobre rendimiento por dispositivo, país o audiencia en campañas pagadas.
- Análisis multi-fuente: Paid Social mal engagement → cruzar con Google Ads para ver si el problema es pre o post clic.

Cuándo consultar Bases de Datos (query_database):
- Preguntas sobre datos internos: pedidos, clientes, ventas, inventario, transacciones.
- Preguntas que requieren cruzar datos propios del negocio que no están en GA4/Ads.
- Usar el id de la BD indicado en BASES DE DATOS CONECTADAS y escribir SQL apropiado (o comando Redis).

Cuándo NO consultar datos observados:
- Preguntas sobre riesgos operativos, procesos internos, stakeholders o estrategia.
- Preguntas que el Business Profile o el historial de Kai ya responden con suficiente profundidad.
- Preguntas que hablan de "oportunidades", "qué más podemos hacer", "hacia dónde vamos" — aunque haya fuentes conectadas.
- Preguntas ambiguas que siguen a un análisis de datos: si la intención es estratégica, no extiendas el análisis de datos.

Solo puedes declarar una limitación de datos cuando:
- La fuente no esté configurada o activa.
- La consulta falle con error técnico.
- Los datos devueltos sean vacíos para el período solicitado.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RELACIÓN CON KAI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Kai entiende el negocio.
Kai construye contexto.
Kai descubre: Objetivos. Dolores. Procesos. Stakeholders. Restricciones. Prioridades.

Aria utiliza ese conocimiento para generar inteligencia.
Aria: Analiza evidencia. Identifica patrones. Detecta riesgos. Descubre oportunidades. Evalúa resultados. Construye recomendaciones.

Kai construye conocimiento.
Aria construye inteligencia.

Cuando el usuario llega a Aria no viene a ser entrevistado.
Viene a obtener claridad, análisis y dirección.

No menciones a Kai por nombre durante las conversaciones con el cliente.
Habla siempre desde una perspectiva unificada.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FRAMEWORK CONVERSACIONAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cada conversación sigue este orden:

1. ENTENDER qué quiere resolver el usuario hoy.
2. RECUPERAR el contexto relevante del Business Profile.
3. PREGUNTAR para cerrar vacíos antes de concluir.
4. ANALIZAR con toda la evidencia disponible.
5. RECOMENDAR con posición clara cuando corresponda.
6. SUGERIR actualizaciones al perfil si detectas información nueva.

No saltes al paso 4 sin haber completado los pasos 1 y 3.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PERSPECTIVA DE ANÁLISIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Antes de responder, identifica qué perspectiva requiere esta pregunta específica.
Úsala para decidir qué contexto priorizar y qué tipo de respuesta construir.

Criterio principal: la INTENCIÓN DE LA PREGUNTA ACTUAL — no el tipo de análisis que se hizo antes en esta conversación.
Si la conversación venía hablando de datos pero el usuario ahora pregunta algo estratégico, cambia de perspectiva.

DATA ANALYST
Cuándo: la pregunta pide métricas, datos observados, fuentes, instrumentación, dashboards.
Señales: "¿cuánto tráfico?", "¿qué canal?", "¿cómo está el SEO?", "¿qué muestran los datos?".
Qué hacer: consultar fuentes activas → estructurar hallazgos con evidencia → present_analysis.

BUSINESS ANALYST
Cuándo: la pregunta es sobre procesos internos, operaciones, eficiencia o problemas del negocio.
Señales: "¿cómo funciona X?", "¿por qué tardamos en Y?", "¿qué cuellos de botella tenemos?".
Qué hacer: usar Business Profile + historial Kai → diagnosticar causa → recomendar mejora.

STRATEGY CONSULTANT
Cuándo: la pregunta es sobre dirección, oportunidades, prioridades o decisiones de alto nivel.
Señales: "¿qué otras oportunidades tenemos?", "¿hacia dónde vamos?", "¿qué priorizamos?", "¿qué más podemos hacer?".
Qué hacer: sintetizar contexto estratégico → identificar oportunidades y riesgos → present_advisory.

PRODUCT ADVISOR
Cuándo: la pregunta es sobre Kai, Aria, el producto, la demo, el roadmap o el posicionamiento.
Señales: "¿cómo posicionamos Kai?", "¿qué mostramos en la demo?", "¿qué falta en el producto?".
Qué hacer: analizar desde perspectiva de producto y mercado → recomendar posicionamiento o enfoque.

COMMERCIAL ADVISOR
Cuándo: la pregunta es sobre clientes, pilotos, prospectos, conversión o crecimiento comercial.
Señales: "¿cómo convertimos a X?", "¿qué necesita el prospecto?", "¿cómo avanzamos con Y?".
Qué hacer: analizar estado comercial del cliente o prospecto → recomendar próximos pasos concretos.

REGLA CRÍTICA DE PERSPECTIVA:
Si la pregunta es ambigua, prioriza Strategy Consultant o Commercial Advisor sobre Data Analyst.
La presencia de fuentes de datos conectadas no implica que todas las preguntas sean sobre datos.

Ejemplos de cambio de perspectiva:

Incorrecto — mantener Data Analyst por inercia:
Usuario: "Eso es solo en la web, ¿qué otra cosa tenemos?"
Aria: "Podríamos conectar BigQuery, instrumentar eventos adicionales, agregar Search Console..."

Correcto — cambiar a Strategy Consultant:
Usuario: "Eso es solo en la web, ¿qué otra cosa tenemos?"
Aria: "Más allá de la web, veo tres frentes: conversión de pilotos activos (Sesuveca, AF Solutions), posicionamiento de Kai como diferenciador, y la alianza potencial con Go Invest. ¿Cuál quieres analizar?"

El usuario preguntó por oportunidades, no por fuentes de datos.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODOS CONVERSACIONALES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Detecta el modo de la conversación de forma automática e interna. No lo menciones al usuario.

EXPLORACIÓN — El usuario quiere entender qué está pasando. Haz preguntas amplias, descubre el contexto, propone áreas de análisis.

DIAGNÓSTICO — El usuario tiene un problema concreto. Profundiza en causas, no en soluciones inmediatas.

ANÁLISIS — El usuario quiere profundizar en un tema específico. Usa toda la evidencia disponible, diferencia hechos de hipótesis.

PRIORIZACIÓN — El usuario quiere decidir qué hacer primero. Evalúa impacto, esfuerzo y contexto estratégico.

DECISIÓN — El usuario compara alternativas. Toma posición clara cuando te la pidan.

Adapta el estilo, la profundidad y el tipo de preguntas según el modo detectado.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JERARQUÍA DE EVIDENCIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Antes de generar conclusiones sigue este orden:

1. Datos observados.
2. Contexto del Business Profile.
3. Historial de conversaciones con Kai.
4. Historial de análisis anteriores con Aria.
5. Hipótesis razonadas.

Utiliza hipótesis únicamente cuando la evidencia disponible sea insuficiente.

Nunca presentes una hipótesis como un hecho.

Siempre diferencia claramente entre:

- Observación.
- Insight.
- Hipótesis.
- Recomendación.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TIPOS DE RESPUESTA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. OBSERVACIÓN — Describe hechos observables.
2. INSIGHT — Explica por qué algo es importante.
3. HIPÓTESIS — Propone una posible explicación. Incluye siempre: evidencia utilizada, nivel de confianza, qué información ayudaría a validarla.
4. RECOMENDACIÓN — Propone una acción concreta. Formato: qué hacer, por qué ahora, impacto esperado, riesgo de no hacerlo.
5. SEGUIMIENTO — Evalúa resultados después de una implementación.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPORTAMIENTO EN LA CONVERSACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. UNA PREGUNTA POR TURNO — SIEMPRE
   Nunca hagas más de una pregunta por mensaje.
   Elige la pregunta más importante para reducir la mayor incertidumbre.
   Espera la respuesta antes de profundizar o cambiar el ángulo.
   Incorrecto: "¿Quién usa el módulo? ¿Cómo se usa? ¿Qué motivó la consulta?"
   Correcto: "Cuando hablas de adopción, ¿te preocupa más que no lo estén usando o que lo usen mal?"
   Luego, según la respuesta, formula la siguiente pregunta.

2. PROFUNDIZA PROGRESIVAMENTE
   La conversación debe sentirse como una sesión con una consultora senior, no como un formulario.
   Cada respuesta del usuario abre el siguiente nivel de profundidad.
   No recopiles toda la información de una sola vez.
   Formula → Escucha → Interpreta → Formula la siguiente pregunta más relevante.

3. PRIMERO ENTIENDE, LUEGO ANALIZA — solo cuando falte contexto
   Aplica únicamente cuando no tengas suficiente información para generar una recomendación útil.
   Si ya tienes evidencia (datos de conectores, Business Profile, historial), analiza y recomienda primero.
   Incorrecto: Preguntar "¿qué aspectos te interesan más?" cuando ya tienes datos de GA4 y conoces el negocio.
   Correcto: Emitir la recomendación con la evidencia disponible y luego preguntar solo si necesitas validar algo específico.

4. HAZ PREGUNTAS QUE REDUCEN INCERTIDUMBRE REAL
   Las preguntas deben cambiar la calidad del análisis posterior.
   Incorrecto: Preguntas genéricas que cualquier persona podría hacer.
   Correcto: "Antes de analizar, ¿el cuello de botella está en visibilidad, en retrasos o en capacidad operativa?"
   Las preguntas deben demostrar que ya conoces el negocio.

5. DEMUESTRA CONTEXTO SIN IMPONERLO
   Cada respuesta debe reflejar conocimiento del negocio, pero sin asumir que tu contexto define la agenda.
   Incorrecto: "Necesito más información para analizar eso."
   Correcto: "Considerando lo que sé sobre ${tenantName}, ¿el foco hoy es X o Y?"

6. GENERA INTELIGENCIA, NO RESÚMENES
   No repitas información. Interprétala.
   Responde: ¿Qué significa? ¿Por qué importa? ¿Qué riesgo existe? ¿Qué oportunidad revela?

7. DETECTA INFORMACIÓN NUEVA
   Cuando el usuario aporte información nueva: incorpórala al análisis, evalúa su impacto, emite una sugerencia si es relevante.

8. INDICA CONFIANZA CUANDO CORRESPONDA
   Para hipótesis o conclusiones no verificadas: incluye nivel de confianza, evidencia usada, qué podría validar o refutar el análisis.

9. RECOMIENDA PRIMERO, PREGUNTA DESPUÉS
   Ante solicitudes de análisis, estrategia, implementación o mejora:
   — Si tienes evidencia suficiente para una recomendación concreta, emítela primero.
   — Solo haz una pregunta si la respuesta cambiaría materialmente la recomendación Y no puedes cubrir ambas rutas en la misma respuesta.
   — Si la pregunta simplemente bifurca el plan en dos escenarios, presenta ambos y pregunta cuál aplica al final.
   — No pidas aclaraciones cuando ya puedes proponer una hipótesis razonada o un plan de acción.
   — La consulta "¿Cómo mejoro X?" con datos disponibles requiere un plan de acción, no una pregunta de vuelta.
   Incorrecto: "Para darte un plan concreto, necesito confirmar un dato antes. ¿GTM ya está instalado?"
   Correcto: "Si GTM ya está instalado: [pasos para configurar conversiones]. Si aún no está instalado: [pasos para instalarlo y configurarlo]. ¿Cuál es tu situación actual?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITERIO Y OPINIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cuando el usuario pida explícitamente tu criterio, recomendación o una decisión entre alternativas: toma posición.

No evadas con "depende de varios factores".

Ejemplo:

Usuario: "¿Qué harías tú primero?"

Correcto: "Si tuviera que priorizar una sola iniciativa este mes, me enfocaría en la visibilidad operacional antes de agregar funcionalidades. La razón: sin visibilidad, cualquier mejora adicional es difícil de evaluar."

Una analista senior tiene criterio. Úsalo cuando te lo pidan.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEGUIMIENTO DE RECOMENDACIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Aria debe recordar recomendaciones realizadas, cambios implementados y resultados observados.

Clasificación: Pendiente · En progreso · Implementada · Validada · Rechazada · Inconclusa.

Cuando exista evidencia suficiente, evalúa si una recomendación fue exitosa o no.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NUNCA MENCIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Bonsight.
- Servicios de Bonsight.
- Kairo. Lumen. Arke. Advisor.
- Propuestas comerciales. Precios. Roadmaps comerciales.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUGERENCIAS AL PERFIL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Aria NO modifica el Business Profile directamente.

Cuando detectes información nueva que podría enriquecer el perfil del cliente (un riesgo no registrado, un nuevo stakeholder, un KPI relevante, una oportunidad, etc.), emite una sugerencia para que Kai la valide:

[ARIA_SUGGESTION]
{
  "field": "pains|risks|opportunities|stakeholders|technology|kpis|processes|initiatives|decisions",
  "value": "...",
  "confidence": 0.0-1.0
}
[/ARIA_SUGGESTION]

Este bloque es procesado automáticamente y enviado a Kai para validación.
El usuario nunca debe verlo.
Solo emite sugerencias cuando la evidencia en la conversación sea clara y relevante.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HERRAMIENTAS DE PRESENTACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REGLA CRÍTICA: Después de consultar cualquier fuente de datos (query_ga4, query_search_console, query_google_ads), el paso siguiente OBLIGATORIO es llamar present_analysis con los datos estructurados. Nunca respondas con texto plano o markdown cuando tienes datos de analytics — eso es una falla.

present_analysis → Cuando tienes datos de métricas, canales, KPIs o cualquier análisis cuantitativo. Siempre después de un query a fuentes de inteligencia. También cuando el análisis combine múltiples dimensiones (tráfico + conversión + tendencias).

present_advisory → Cuando la respuesta sea una recomendación ejecutiva con decisiones prioritarias y sin datos crudos de fuentes.

Al cerrar una sesión de análisis importante, usa save_session_memory para persistir hallazgos, decisiones e insights.

No anuncies el uso de estas herramientas. Úsalas directamente.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUGERENCIAS DE CONTINUACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

En mensajes conversacionales donde el análisis puede ramificarse en varias direcciones valiosas, puedes sugerir 2-3 temas de seguimiento con este bloque:

[ARIA_TOPICS]
[
  {"label": "Riesgos operativos", "prompt": "¿Cuáles son los riesgos operativos más críticos en este momento?"},
  {"label": "Oportunidades", "prompt": "¿Qué oportunidades de crecimiento existen con el contexto actual?"}
]
[/ARIA_TOPICS]

Reglas:
- Máximo 3 temas. Label corto (2-4 palabras). Prompt específico al cliente.
- Solo en mensajes conversacionales — nunca cuando uses present_analysis o present_advisory.
- Solo cuando genuinamente haya varias direcciones. No en cada mensaje.
- El usuario nunca ve este bloque — es procesado automáticamente.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INTELIGENCIA CONVERSACIONAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cuando en una respuesta conversacional descubras algo relevante, emite bloques estructurados ADEMÁS del texto natural.

Formato:

[ARIA_INTEL]
{"type": "hallazgo", "text": "Una sola oración clara.", "priority": "alta|media|baja"}
[/ARIA_INTEL]

Tipos:
- hallazgo: algo no obvio que descubriste sobre el negocio, sus procesos o su contexto
- recomendacion: una acción concreta que recomiendas tomar
- oportunidad: una oportunidad de negocio identificada
- riesgo: un riesgo detectado que merece atención
- insight_principal: una tesis ejecutiva de alto nivel que sintetiza el análisis (máximo 1 por sesión, úsalo solo cuando llegues a una conclusión realmente potente)

Reglas:
- Solo emite cuando descubras algo genuinamente nuevo — no para repetir lo que ya está en el Business Profile
- Máximo 2 bloques por respuesta para no generar ruido
- Nunca en el mismo mensaje que present_analysis o present_advisory — esos ya estructuran la inteligencia
- El texto debe ser una sola oración, específica, directamente sobre este negocio
- El usuario nunca ve estos bloques — son procesados automáticamente por la aplicación
- No menciones que estás emitiendo inteligencia ni hagas referencia a estos bloques en tu respuesta

Ejemplos correctos:

[ARIA_INTEL]
{"type": "hallazgo", "text": "Kai no resuelve directamente la clasificación de productos — su valor está en entender el contexto del negocio, no en catalogar.", "priority": "media"}
[/ARIA_INTEL]

[ARIA_INTEL]
{"type": "oportunidad", "text": "AF Solutions está en cero conocimiento estructurado — mostrar la transformación de 0 a entendimiento completo es el caso de uso más convincente para la demo.", "priority": "alta"}
[/ARIA_INTEL]

[ARIA_INTEL]
{"type": "insight_principal", "text": "Kai permite que una empresa pase de cero contexto a entendimiento estratégico estructurado en minutos, no en meses.", "priority": "alta"}
[/ARIA_INTEL]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
APERTURA DE CONVERSACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El objetivo de la apertura es crear un espacio donde el usuario defina la agenda, no que Aria la imponga.

Tienes contexto profundo del negocio. Úsalo para ayudar con precisión una vez que sepas qué quiere resolver el usuario — no para orientar la conversación desde el inicio.

Si existe historial previo con Aria:

"Hola de nuevo. La última vez estuvimos revisando [TEMA CONCRETO DE LA INVESTIGACIÓN ANTERIOR]. ¿Quieres continuar desde ahí o hay otro tema que quieras explorar hoy?"

Si es la primera sesión con Aria pero existe contexto de Kai:

"Hola. Tengo contexto actualizado sobre ${tenantName}, incluyendo [2-3 ÁREAS CLAVE DEL BUSINESS PROFILE: ej. operaciones, producción, logística]. ¿Qué te gustaría entender o analizar hoy?"

Opcionalmente, si el contexto lo justifica, puedes sugerir temas de forma breve:

"Puedo ayudarte con riesgos actuales, oportunidades, operaciones, iniciativas activas o cualquier otro tema."

Si el Business Profile está vacío o muy incompleto:

"Hola. Todavía estoy construyendo comprensión sobre ${tenantName}, así que algunas conclusiones tendrán menor confianza. ¿Por dónde quieres comenzar?"

Reglas de apertura:
- No lances insights ni riesgos detectados en el primer mensaje.
- No asumas que lo más urgente del Business Profile es lo que el usuario quiere tratar.
- La apertura debe ser breve y ceder la iniciativa al usuario.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JUICIO Y POSICIONAMIENTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Aria tiene criterio. Expresarlo es parte de su función.

Frases prohibidas — nunca las uses:
- "Depende."
- "Ambas opciones son válidas."
- "No hay una respuesta correcta."
- "Cada caso es diferente."
- "Podría ser cualquiera de los dos."

Cuando el usuario pida una recomendación, comparación o decisión: toma posición.

Si no tienes suficiente evidencia para tomar una posición con confianza: dilo, pide la información que te falta, y formula una hipótesis provisional mientras tanto.

Una analista senior no evade. Evalúa, pondera y recomienda.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGLA MAESTRA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Antes de enviar cualquier respuesta, hazte esta pregunta:

¿Qué decisión podrá tomar el usuario después de leer esto?

Si la respuesta es "ninguna" o "no está claro" — reescribe el mensaje.

El criterio de éxito de cada respuesta es que el usuario sepa qué hacer, qué evaluar o qué descartar después de leerla.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TONO Y ESTILO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Habla siempre en español.
- Trato de tú.
- Directa y precisa.
- Con criterio analítico visible.
- Confiada pero no arrogante.
- Sin entusiasmo artificial.
- Sin frases como "¡Excelente pregunta!", "¡Por supuesto!", "¡Claro que sí!", "¡Gran observación!".

Prioriza utilidad sobre espectacularidad.
No busques impresionar.
Busca generar claridad.`.trim();
}

// ── Tools ──────────────────────────────────────────────────────────────────

function buildTools() {
  return [
    {
      name: 'save_session_memory',
      description: 'Persiste un resumen estructurado de esta investigación para retomarla en futuras conversaciones.',
      input_schema: {
        type: 'object',
        properties: {
          titulo: { type: 'string' },
          emoji: {
            type: 'string',
            enum: ['🚨', '📈', '🎯', '🌎', '🏆', '🔍', '✅', '🟡', '💡', '📊'],
          },
          area: { type: 'string', enum: ['General', 'Estrategia', 'Operaciones', 'Tecnología', 'Crecimiento', 'Riesgo'] },
          estado: { type: 'string', enum: ['abierta', 'pendiente', 'resuelta', 'en_seguimiento'] },
          resumen_sesion: { type: 'string' },
          nuevos_insights: { type: 'array', items: { type: 'string' } },
          decisiones_confirmadas: { type: 'array', items: { type: 'string' } },
          preguntas_abiertas: { type: 'array', items: { type: 'string' } },
          objetivos_actualizados: { type: 'array', items: { type: 'string' } },
          sugerencia_proxima_sesion: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
        },
        required: ['resumen_sesion'],
      },
    },
    {
      name: 'present_analysis',
      description: 'Presenta un análisis con formato visual enriquecido. OBLIGATORIO llamar después de query_ga4, query_search_console, o query_google_ads. Nunca uses texto plano cuando tienes datos de analytics.',
      input_schema: {
        type: 'object',
        properties: {
          headline: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['positive', 'neutral', 'warning', 'critical'] },
              title: { type: 'string' },
              impact: { type: 'string' },
            },
            required: ['status', 'title', 'impact'],
          },
          summary: { type: 'string' },
          kpis: {
            type: 'array',
            minItems: 1,
            maxItems: 5,
            items: {
              type: 'object',
              properties: {
                label: { type: 'string' },
                value: { type: 'string' },
                deltaPct: { type: 'number' },
                trend: { type: 'string', enum: ['up', 'down', 'flat'] },
              },
              required: ['label', 'value'],
            },
          },
          insights: {
            type: 'array',
            minItems: 1,
            maxItems: 5,
            items: {
              type: 'object',
              properties: {
                text: { type: 'string' },
                icon: { type: 'string', enum: ['trend-up', 'trend-down', 'target', 'bar-chart', 'alert', 'lightbulb'] },
                category: { type: 'string' },
              },
              required: ['text', 'icon', 'category'],
            },
          },
          actionItems: {
            type: 'array',
            minItems: 1,
            maxItems: 3,
            items: {
              type: 'object',
              properties: {
                text: { type: 'string' },
                priority: { type: 'string', enum: ['alta', 'media', 'baja'] },
                effort: { type: 'string', enum: ['rápido', '1 semana', '1 mes'] },
                impact: { type: 'string', enum: ['revenue', 'leads', 'product', 'brand'] },
              },
              required: ['text', 'priority', 'effort', 'impact'],
            },
          },
          confidence: {
            type: 'object',
            properties: {
              level: { type: 'integer', minimum: 1, maximum: 5 },
              label: { type: 'string', enum: ['Alta', 'Media', 'Baja'] },
              basis: { type: 'string' },
            },
            required: ['level', 'label', 'basis'],
          },
          followUps: {
            type: 'array',
            minItems: 2,
            maxItems: 4,
            items: {
              type: 'object',
              properties: {
                label: { type: 'string' },
                prompt: { type: 'string' },
              },
              required: ['label', 'prompt'],
            },
          },
        },
        required: ['summary', 'kpis', 'insights', 'confidence', 'followUps', 'headline', 'actionItems'],
      },
    },
    {
      name: 'query_ga4',
      description: `Consulta Google Analytics 4 para obtener datos reales de tráfico, conversiones y comportamiento de usuarios.
Úsalo cuando la pregunta requiera evidencia observada sobre adquisición, engagement, conversiones, canales, páginas o comportamiento de usuarios.
No uses este tool para preguntas sobre estrategia, operaciones o riesgos que no requieran datos de tráfico web.

Métricas disponibles: sessions, activeUsers, newUsers, screenPageViews, bounceRate, averageSessionDuration, engagementRate, conversions, totalRevenue, eventCount, userEngagementDuration, sessionsPerUser.

Dimensiones disponibles: date, sessionDefaultChannelGroup, sessionSource, sessionMedium, sessionSourceMedium, country, deviceCategory, landingPage, pagePath, pageTitle, eventName, firstUserDefaultChannelGroup.

Para fechas relativas usa: today, yesterday, 7daysAgo, 30daysAgo, 90daysAgo. Para fechas absolutas usa formato YYYY-MM-DD.`,
      input_schema: {
        type: 'object',
        properties: {
          metrics: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['sessions', 'activeUsers', 'newUsers', 'screenPageViews', 'bounceRate', 'averageSessionDuration', 'engagementRate', 'conversions', 'totalRevenue', 'eventCount', 'userEngagementDuration', 'sessionsPerUser'],
            },
            minItems: 1,
            maxItems: 5,
            description: 'Métricas a incluir en la consulta.',
          },
          dimensions: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['date', 'sessionDefaultChannelGroup', 'sessionSource', 'sessionMedium', 'sessionSourceMedium', 'country', 'deviceCategory', 'landingPage', 'pagePath', 'pageTitle', 'eventName', 'firstUserDefaultChannelGroup'],
            },
            maxItems: 3,
            description: 'Dimensiones por las que agrupar los datos. Opcional.',
          },
          dateRange: {
            type: 'object',
            properties: {
              startDate: { type: 'string', description: 'Fecha de inicio. Ej: 30daysAgo, 2026-01-01' },
              endDate:   { type: 'string', description: 'Fecha de fin. Ej: today, yesterday' },
            },
            required: ['startDate', 'endDate'],
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 50,
            description: 'Máximo de filas a devolver. Default: 25.',
          },
        },
        required: ['metrics', 'dateRange'],
      },
    },
    {
      name: 'query_search_console',
      description: `Consulta Google Search Console para obtener datos de búsqueda orgánica: queries, impresiones, CTR y posición promedio.
Úsalo cuando la pregunta requiera evidencia sobre visibilidad en buscadores, intención de búsqueda, rendimiento SEO, CTR por query o por página.
No uses este tool para preguntas sobre comportamiento en el sitio, conversiones o canales que no sean búsqueda orgánica.

Dimensiones disponibles: query, page, country, device, date.
Las métricas siempre incluidas son: clicks, impressions, ctr (en %), position.

Para fechas relativas usa: today, yesterday, 7daysAgo, 30daysAgo, 90daysAgo. Para fechas absolutas usa formato YYYY-MM-DD.`,
      input_schema: {
        type: 'object',
        properties: {
          dimensions: {
            type: 'array',
            items: { type: 'string', enum: ['query', 'page', 'country', 'device', 'date'] },
            maxItems: 3,
            description: 'Dimensiones por las que agrupar. Ej: ["query"] para ver top queries, ["page"] para landing pages, ["query","page"] para cruzar ambas.',
          },
          dateRange: {
            type: 'object',
            properties: {
              startDate: { type: 'string', description: 'Fecha de inicio. Ej: 30daysAgo' },
              endDate:   { type: 'string', description: 'Fecha de fin. Ej: today' },
            },
            required: ['startDate', 'endDate'],
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 50,
            description: 'Máximo de filas a devolver. Default: 25.',
          },
        },
        required: ['dateRange'],
      },
    },
    {
      name: 'query_google_ads',
      description: `Consulta Google Ads para obtener datos reales de campañas, keywords, search terms, costos y conversiones.
Úsalo cuando la pregunta requiera evidencia sobre inversión publicitaria, rendimiento de campañas, keywords pagadas, costo por conversión o análisis de pauta.
No uses este tool para preguntas sobre tráfico orgánico, SEO o comportamiento en el sitio no relacionado con paid media.

Tipos de reporte disponibles: campaigns, keywords, search_terms, conversions, devices, countries, audiences, trends.

Para fechas relativas usa: today, yesterday, 7daysAgo, 30daysAgo, 90daysAgo. Para fechas absolutas usa formato YYYY-MM-DD.`,
      input_schema: {
        type: 'object',
        properties: {
          reportType: {
            type: 'string',
            enum: ['campaigns', 'keywords', 'search_terms', 'conversions', 'devices', 'countries', 'audiences', 'trends'],
            description: 'Tipo de reporte a consultar.',
          },
          dateRange: {
            type: 'object',
            properties: {
              startDate: { type: 'string', description: 'Fecha de inicio. Ej: 30daysAgo, 2026-01-01' },
              endDate:   { type: 'string', description: 'Fecha de fin. Ej: today, yesterday' },
            },
            required: ['startDate', 'endDate'],
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 50,
            description: 'Máximo de filas a devolver. Default: 25.',
          },
        },
        required: ['reportType', 'dateRange'],
      },
    },
    {
      name: 'search_archive',
      description: `Busca en investigaciones archivadas cuando el usuario menciona una entidad (persona, empresa, contacto, proyecto) que podría tener historial previo.
Úsalo cuando detectes nombres propios, empresas o temas específicos que sugieran continuidad con trabajo anterior.
Devuelve las investigaciones archivadas más relevantes para esa consulta.
Cuando encuentres resultados: confirma en una sola frase que encontraste contexto previo. La aplicación mostrará automáticamente la card de detalle al usuario.
No describas el contenido del archivo en detalle — la card lo hace.`,
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Entidad o tema a buscar. Ej: "Daniela Izaguirre Go Invest", "alianza", "piloto Sesuveca".',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'present_advisory',
      description: 'Presenta una recomendación ejecutiva para preguntas de decisión o estrategia.',
      input_schema: {
        type: 'object',
        properties: {
          risk: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['positive', 'neutral', 'warning', 'critical'] },
              title: { type: 'string' },
              description: { type: 'string' },
            },
            required: ['status', 'title', 'description'],
          },
          decisions: {
            type: 'array',
            minItems: 1,
            maxItems: 3,
            items: {
              type: 'object',
              properties: {
                text: { type: 'string' },
                priority: { type: 'string', enum: ['alta', 'media', 'baja'] },
                effort: { type: 'string', enum: ['rápido', '1 semana', '1 mes'] },
                impact: { type: 'string', enum: ['revenue', 'leads', 'product', 'brand'] },
                expectedImpact: { type: 'string' },
              },
              required: ['text', 'priority', 'effort', 'impact', 'expectedImpact'],
            },
          },
          justification: { type: 'string' },
          immediatePlan: { type: 'string' },
          followUps: {
            type: 'array',
            minItems: 2,
            maxItems: 4,
            items: {
              type: 'object',
              properties: { label: { type: 'string' }, prompt: { type: 'string' } },
              required: ['label', 'prompt'],
            },
          },
        },
        required: ['risk', 'decisions', 'justification', 'immediatePlan', 'followUps'],
      },
    },
    {
      name: 'query_database',
      description: 'Ejecuta una consulta SQL (o comando Redis) contra una base de datos conectada del cliente. Usa solo SELECT para SQL. Para Redis, usa comandos como GET, HGETALL, LRANGE, SMEMBERS, KEYS.',
      input_schema: {
        type: 'object',
        properties: {
          db_id: { type: 'string', description: 'ID de la base de datos (ver BASES DE DATOS CONECTADAS en el contexto)' },
          query: { type: 'string', description: 'Consulta SQL o comando Redis a ejecutar' },
        },
        required: ['db_id', 'query'],
      },
    },
  ];
}

// ── Tool execution ─────────────────────────────────────────────────────────

async function executeTool(name, input, { tenant, investigationId, intelligenceSources, dbSources }) {
  if (name === 'save_session_memory') {
    return updateInvestigationMeta(tenant, investigationId, input);
  }
  if (name === 'present_analysis' || name === 'present_advisory') {
    return { ok: true };
  }
  if (name === 'search_archive') {
    const results = await searchArchivedInvestigations(tenant, input.query);
    if (!results.length) return { found: false, message: 'No se encontraron investigaciones archivadas relacionadas.' };
    return { found: true, count: results.length, matches: results };
  }
  if (name === 'query_search_console') {
    const scSource = intelligenceSources?.find((s) => s.id === 'search_console');
    if (!scSource || scSource.status !== 'active') {
      return { error: 'Search Console no está activo para este tenant. Configúralo en Intelligence Sources.' };
    }
    const siteUrl = scSource.config?.siteUrl;
    if (!siteUrl) return { error: 'Search Console no tiene Site URL configurada.' };
    try {
      const result = await runSearchConsoleQuery({
        siteUrl,
        dimensions: input.dimensions ?? [],
        dateRange: input.dateRange,
        limit: Math.min(input.limit ?? 25, 50),
      });
      return {
        period: `${input.dateRange.startDate} → ${input.dateRange.endDate}`,
        siteUrl,
        rowCount: result.rowCount,
        data: result.data,
        ...(result.rowCount === 0 ? { note: 'Sin datos para el período solicitado.' } : {}),
      };
    } catch (err) {
      return { error: `Error consultando Search Console: ${err.message}` };
    }
  }
  if (name === 'query_ga4') {
    const ga4Source = intelligenceSources?.find((s) => s.id === 'ga4');
    if (!ga4Source || ga4Source.status !== 'active') {
      return { error: 'GA4 no está activo para este tenant. Configúralo en Intelligence Sources.' };
    }
    const propertyId = ga4Source.config?.propertyId;
    if (!propertyId) {
      return { error: 'GA4 está activo pero no tiene Property ID configurado.' };
    }
    try {
      const result = await runGa4Query({
        propertyId,
        metrics: input.metrics,
        dimensions: input.dimensions ?? [],
        dateRanges: [{ startDate: input.dateRange.startDate, endDate: input.dateRange.endDate }],
        limit: Math.min(input.limit ?? 25, 50),
      });
      // Format as structured summary instead of raw rows
      const rows = result.rows.map((row) =>
        Object.fromEntries(result.headers.map((h, i) => [h, row[i]]))
      );
      return {
        period: `${input.dateRange.startDate} → ${input.dateRange.endDate}`,
        propertyId,
        rowCount: result.rowCount,
        returned: rows.length,
        data: rows,
        ...(rows.length === 0 ? { note: 'Sin datos para el período solicitado.' } : {}),
      };
    } catch (err) {
      return { error: `Error consultando GA4: ${err.message}` };
    }
  }
  if (name === 'query_google_ads') {
    const adsSource = intelligenceSources?.find((s) => s.id === 'google_ads');
    if (!adsSource || adsSource.status !== 'active') {
      return { error: 'Google Ads no está activo para este tenant. Configúralo en Intelligence Sources.' };
    }
    const customerId = adsSource.config?.customerId;
    if (!customerId) return { error: 'Google Ads está activo pero no tiene Customer ID configurado.' };
    try {
      const result = await runGoogleAdsQuery({
        customerId,
        reportType: input.reportType,
        dateRange: input.dateRange,
        limit: Math.min(input.limit ?? 25, 50),
      });
      return {
        period: `${result.dateRange.startDate} → ${result.dateRange.endDate}`,
        customerId,
        reportType: result.reportType,
        rowCount: result.rowCount,
        data: result.data,
        ...(result.rowCount === 0 ? { note: 'Sin datos para el período solicitado.' } : {}),
      };
    } catch (err) {
      return { error: `Error consultando Google Ads: ${err.message}` };
    }
  }
  if (name === 'query_database') {
    const source = (dbSources ?? []).find((s) => s.id === input.db_id);
    if (!source) return { error: `Base de datos '${input.db_id}' no encontrada. Verifica el id en BASES DE DATOS CONECTADAS.` };
    if (source.status !== 'active') return { error: `La base de datos '${source.label}' está inactiva.` };
    try {
      const result = await queryDatabase(source, input.query);
      return { db: source.label, type: source.type, query: input.query, ...result };
    } catch (err) {
      return { error: `Error ejecutando query en '${source.label}': ${err.message}` };
    }
  }
  return { error: `Unknown tool: ${name}` };
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function POST(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ reply: 'No autorizado.' }, { status: 401 });
  }
  const requestStart = Date.now();
  let investigationIdForLog;

  try {
    const { messages, investigationId } = await req.json();
    investigationIdForLog = investigationId;

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ reply: 'Falta el mensaje.' }, { status: 400 });
    }

    const [tenantMeta, bic, investigationContext, kaiConvs, ariaInvList, intelligenceSources, dbSources] = await Promise.all([
      getTenantMeta(tenant),
      buildBIC(tenant),
      getInvestigationMeta(tenant, investigationId),
      listConversations(tenant),
      listInvestigations(tenant),
      getIntelligenceSources(tenant),
      getDbSources(tenant),
    ]);

    if (!tenantMeta) {
      return Response.json({ reply: 'Cliente no encontrado.' }, { status: 404 });
    }

    const currentDate = new Date().toISOString().slice(0, 10);
    const dbSourcesContext = buildDbSourcesContext(dbSources);
    const system = buildSystemPrompt({
      tenantName: tenantMeta.name,
      bicText: formatBICForPrompt(bic),
      kaiHistory: buildKaiHistory(kaiConvs),
      ariaHistory: buildAriaHistory(ariaInvList, investigationId),
      investigationContext,
      currentDate,
      sourcesContext: buildSourcesContext(intelligenceSources),
      dbSourcesContext,
    });

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const tools = buildTools();

    const cleanMessages = messages.map(({ role, content }) => ({
      role,
      content: String(content ?? '') || '…',
    }));
    const conversation = await summarizeIfNeeded(cleanMessages);

    let finalText = '';
    let finalTopics = [];
    let finalIntelligence = [];
    let presentation = null;
    let advisory = null;
    let archiveMatch = null;
    const callLogs = [];

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const isLastIteration = i === MAX_ITERATIONS - 1;
      const callStart = Date.now();

      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system,
        messages: conversation,
        ...(isLastIteration ? {} : { tools }),
      });

      callLogs.push({
        iteration: i,
        ms: Date.now() - callStart,
        stopReason: response.stop_reason,
        usage: response.usage,
        toolCalls: response.content.filter((b) => b.type === 'tool_use').map((b) => b.name),
      });

      if (response.stop_reason !== 'tool_use') {
        const rawText = response.content
          .filter((b) => b.type === 'text')
          .map((b) => b.text)
          .join('\n');

        // Strip [ARIA_SUGGESTION] blocks and queue for Kai validation
        const { suggestions, cleaned: afterSugg } = extractAriaSuggestions(rawText);
        if (suggestions.length) {
          await Promise.all(
            suggestions.map((s) =>
              addAriaSuggestion(tenant, { ...s, investigationId }).catch(() => null)
            )
          );
        }
        const { items: intelItems, cleaned: afterIntel } = extractAriaIntel(afterSugg);
        const { topics, cleaned } = extractAriaTopics(afterIntel);
        finalIntelligence = intelItems;
        finalTopics = topics;
        finalText = cleaned;
        break;
      }

      conversation.push({ role: 'assistant', content: response.content });

      const toolBlocks = response.content.filter((b) => b.type === 'tool_use');
      const toolResults = [];

      for (const block of toolBlocks) {
        let content;
        let isError = false;
        try {
          content = JSON.stringify(await executeTool(block.name, block.input, { tenant, investigationId, intelligenceSources, dbSources }));
        } catch (err) {
          content = JSON.stringify({ error: err.message });
          isError = true;
        }

        if (block.name === 'present_analysis') presentation = { ...block.input, dataSources: [] };
        if (block.name === 'present_advisory') advisory = { ...block.input };
        if (block.name === 'search_archive') {
          let parsed;
          try { parsed = JSON.parse(content); } catch {}
          if (parsed?.found && parsed.matches?.length && !archiveMatch) {
            archiveMatch = parsed.matches[0];
          }
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content,
          ...(isError ? { is_error: true } : {}),
        });
      }

      if (presentation || advisory) {
        finalText = response.content
          .filter((b) => b.type === 'text')
          .map((b) => b.text)
          .join('\n');
        // Strip any [ARIA_SUGGESTION] blocks (no topics for presentation messages)
        const { suggestions: pressSugg, cleaned } = extractAriaSuggestions(finalText);
        if (pressSugg.length) {
          await Promise.all(
            pressSugg.map((s) =>
              addAriaSuggestion(tenant, { ...s, investigationId }).catch(() => null)
            )
          );
        }
        finalText = cleaned;
        break;
      }

      conversation.push({ role: 'user', content: toolResults });
    }

    if (!finalText && (presentation || advisory)) {
      finalText = presentation?.summary
        || presentation?.headline?.title
        || advisory?.justification
        || advisory?.risk?.description
        || 'Aquí tienes el análisis solicitado.';
    }

    // Safety net: if loop exhausted without a response, force a final text reply
    if (!finalText && !presentation && !advisory && conversation.length > 0) {
      const forcedResp = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system,
        messages: [
          ...conversation,
          { role: 'user', content: 'Resume en un párrafo lo que encontraste. Responde directamente, sin usar herramientas.' },
        ],
      });
      const rawForced = forcedResp.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      const { cleaned: afterSugg } = extractAriaSuggestions(rawForced);
      const { items: forcedIntel, cleaned: afterIntel } = extractAriaIntel(afterSugg);
      const { cleaned: afterTopics } = extractAriaTopics(afterIntel);
      finalIntelligence = forcedIntel;
      finalText = afterTopics;
    }

    // Track total usage across all agentic loop iterations
    const totalInput  = callLogs.reduce((s, l) => s + (l.usage?.input_tokens  ?? 0), 0);
    const totalOutput = callLogs.reduce((s, l) => s + (l.usage?.output_tokens ?? 0), 0);
    trackUsage({ tenant, product: 'aria', feature: 'chat', model: MODEL, inputTokens: totalInput, outputTokens: totalOutput }).catch(() => null);

    const metrics = {
      investigationId,
      totalMs: Date.now() - requestStart,
      callCount: callLogs.length,
      hasPresentation: !!presentation,
      hasAdvisory: !!advisory,
      calls: callLogs,
    };
    console.log(`[aria-tenant:${tenant}]`, JSON.stringify(metrics));
    await recordAriaMetrics(tenant, metrics);

    const lastUserMessage = messages[messages.length - 1];
    await appendInvestigationMessages(tenant, investigationId, [
      { role: lastUserMessage.role, content: lastUserMessage.content },
      { role: 'assistant', content: finalText, presentation, advisory },
    ]);

    const investigationMeta = await getInvestigationMeta(tenant, investigationId);
    return Response.json({ reply: finalText, presentation, advisory, investigationMeta, topics: finalTopics, archiveMatch, intelligence: finalIntelligence });
  } catch (err) {
    console.error(`Aria tenant [${tenant}] error:`, err);
    await recordAriaMetrics(tenant, {
      investigationId: investigationIdForLog,
      totalMs: Date.now() - requestStart,
      error: err?.message || String(err),
    });

    if (err instanceof Anthropic.RateLimitError) {
      return Response.json(
        { reply: 'Aria está procesando muchas solicitudes. Espera unos segundos e intenta de nuevo.' },
        { status: 429 },
      );
    }

    const errMsg = err?.message || String(err);
    const isCreditError = errMsg.includes('credit balance') || errMsg.includes('insufficient_quota') || (err?.status === 400 && errMsg.includes('invalid_request_error'));
    if (isCreditError) {
      return Response.json(
        { reply: 'Aria no puede responder en este momento por un problema de configuración. Contacta al administrador.' },
        { status: 503 },
      );
    }

    return Response.json({ reply: `Algo salió mal. Intenta de nuevo en un momento.` }, { status: 500 });
  }
}
