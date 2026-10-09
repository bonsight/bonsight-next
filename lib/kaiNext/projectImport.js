import Anthropic from '@anthropic-ai/sdk';
import { trackUsage } from '@/lib/kai/usage';
import { FASE_OPTIONS } from '@/lib/aria/board';

// Carga masiva de un documento de contexto (brief, propuesta técnica) hacia una Iniciativa de
// Proyecto de Desarrollo — mismo patrón que lib/kaiNext/projectContribution.js (Anthropic
// directo, prompt pidiendo JSON puro). A propósito NO se parsea el documento por su estructura
// (HTML/Markdown/clases CSS propias): se le pasa el texto plano a Claude para que extraiga la
// estructura, así sirve para cualquier documento razonablemente escrito, no solo uno con un
// formato exacto.
const MODEL = 'claude-sonnet-4-6';
const MAX_EXTRACT_CHARS = 20000;

function buildPrompt(text) {
  return `Sos el asistente de Proyectos de Kai — leés un documento de contexto (brief, propuesta técnica, discovery) de un proyecto de desarrollo de software, y extraés SOLO su sección de Épicas e historias para cargarlas en un tablero.

DOCUMENTO (texto plano, puede incluir restos de marcado):
"""
${text}
"""

IMPORTANTE — alcance: el documento puede tener muchas secciones (resumen ejecutivo, problema/objetivo, prototipos, modelo funcional, reglas de negocio, ruta de desarrollo, pendientes, etc.). Ignorá TODAS esas secciones por completo. Buscá específicamente la sección de "Épicas", "Épicas e historias", "Backlog" o equivalente, y extraé el contenido ÚNICAMENTE de ahí — no uses el resto del documento ni para las épicas ni para el objetivo.

Extraé:
- "objetivo": dejalo como string vacío SIEMPRE, salvo que la propia sección de Épicas e historias tenga una o dos líneas introductorias propias (no tomadas de otra sección) que valga la pena preservar como contexto — en ese caso un resumen de 1-2 oraciones.
- "epicas": la lista de épicas que aparecen en esa sección (suelen venir numeradas o con un id corto como "E1", "E2"). Para cada una:
  - "name": nombre corto de la épica, tal como aparece ahí (sin el id).
  - "notas": 1-3 oraciones de contexto/objetivo de esa épica específica, tomadas solo de lo que dice esa sección sobre ella (su badge de fase/prioridad, su descripción corta) — no inventes ni traigas contexto de otras secciones del documento.
  - "fase": tu mejor estimación de en qué etapa de desarrollo de software está HOY el trabajo que describen sus historias — una de estas 7 opciones exactas: ${FASE_OPTIONS.map((f) => `"${f}"`).join(', ')}. El default es "Desarrollo": una historia tipo "Consultar X", "Registrar Y", "Validar Z", "Calcular W" describe una FUNCIONALIDAD A CONSTRUIR, no un requerimiento a levantar — aunque esté redactada como una necesidad de negocio, es trabajo de Desarrollo. Usá otra fase SOLO cuando el texto hable explícitamente de la actividad previa/posterior a construir el software: "Preparación"/"Análisis" solo si habla de investigar, entrevistar, levantar/validar requerimientos o definir alcance (no de qué debe hacer el sistema); "Diseño" solo si habla de maquetar, prototipar o definir UX/UI; "Pruebas" solo si habla de QA/testing explícito; "Producción" solo si habla de desplegar/salir en vivo; "Monitoreo y Cierre" solo si habla de cerrar, documentar o medir resultados post-lanzamiento. Ante la duda entre Desarrollo y otra opción, elegí Desarrollo. Esto es independiente de cualquier "Fase 1/2/3" o prioridad que el documento mencione para la iniciativa completa — esa numeración es de otro eje (prioridad de entrega), no la uses para esto.
  - "historias": lista de historias de usuario o tareas puntuales listadas bajo esa épica en esa misma sección, cada una como un título corto y accionable (no copies el texto completo, resumila en una línea).

No inventes épicas ni historias que esa sección no liste explícitamente. Si el documento no tiene una sección de Épicas/historias identificable, devolvé "epicas": [].

Respondé ÚNICAMENTE con un objeto JSON válido, sin texto antes ni después, sin markdown, sin backticks:
{
  "objetivo": "string",
  "epicas": [ { "name": "string", "notas": "string", "fase": "string", "historias": ["string", ...] } ]
}`;
}

function truncate(text, max) {
  if (!text) return text;
  return text.length > max ? `${text.slice(0, max)}\n[...truncado]` : text;
}

export async function extractIniciativaFromText(tenant, text) {
  if (!text?.trim()) throw new Error('El documento está vacío.');

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: buildPrompt(truncate(text.trim(), MAX_EXTRACT_CHARS)) }],
  });
  trackUsage({ tenant, product: 'kai-next', feature: 'project_import_extract', model: MODEL, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens }).catch(() => null);

  const raw = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
  const parsed = JSON.parse(cleaned);

  const epicas = Array.isArray(parsed.epicas) ? parsed.epicas : [];
  return {
    objetivo: typeof parsed.objetivo === 'string' ? parsed.objetivo : '',
    epicas: epicas
      .filter((e) => e?.name?.trim())
      .map((e) => ({
        name: e.name.trim(),
        notas: typeof e.notas === 'string' ? e.notas.trim() : '',
        fase: FASE_OPTIONS.includes(e.fase) ? e.fase : '',
        historias: (Array.isArray(e.historias) ? e.historias : []).filter((h) => typeof h === 'string' && h.trim()).map((h) => h.trim()),
      })),
  };
}
