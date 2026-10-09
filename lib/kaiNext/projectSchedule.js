import Anthropic from '@anthropic-ai/sdk';
import { trackUsage } from '@/lib/kai/usage';
import { FASE_OPTIONS } from '@/lib/aria/board';

// Sugerencia de fechas para épicas sin agendar — a diferencia del mockup original ("propuesta vs
// confirmada" con barras punteadas), acá Kai propone, el usuario revisa/edita en un modal y al
// confirmar se escribe DIRECTO en Fecha inicio/fin (mismo PATCH que ya existe en
// /dev/epicas/[epicaId]) — sin estado dual nuevo ni cambio de schema en Notion.
const MODEL = 'claude-sonnet-4-6';

function buildPrompt({ today, epicasSinFecha, epicasConFecha }) {
  const sinFechaList = epicasSinFecha.map((e) => `- id:${e.id} · "${e.name}" · fase: ${e.fase || 'sin fase'}`).join('\n');
  const conFechaList = epicasConFecha.length
    ? epicasConFecha.map((e) => `- "${e.name}" · fase: ${e.fase || 'sin fase'} · ${e.startDate} → ${e.endDate}`).join('\n')
    : '(ninguna todavía)';

  return `Sos el asistente de Proyectos de Kai — proponés fecha de inicio y fin para épicas de un proyecto de desarrollo de software que todavía no tienen fecha, para armar un Roadmap razonable.

HOY: ${today}

ORDEN NATURAL DE FASES (de más temprana a más tardía): ${FASE_OPTIONS.join(' → ')}

ÉPICAS YA CON FECHA CONFIRMADA (no las toques, son contexto para no pisarlas ni solaparlas sin sentido):
${conFechaList}

ÉPICAS SIN FECHA (proponé inicio/fin para cada una, identificadas por su "id"):
${sinFechaList}

Criterio: ordená las épicas sin fecha respetando el orden natural de fases (una épica en "Diseño" debería empezar antes que una en "Desarrollo", salvo que el contexto de las ya confirmadas sugiera otra cosa). Dentro de una misma fase está bien secuenciarlas o superponerlas parcialmente si tiene sentido (equipos distintos en paralelo) — usá tu criterio. Asumí una duración razonable por épica (entre 1 y 4 semanas corridas de calendario, no hábiles) según la complejidad que sugiera su nombre. Ninguna fecha de inicio debería ser anterior a HOY.

Para cada épica agregá también "reason": una oración corta (máx. 20 palabras) que explique el motivo concreto de esas fechas — de qué depende (otra épica/fase que la precede), por qué esa duración (alcance que sugiere el nombre), o por qué ese orden dentro de la fase. Sin relleno genérico tipo "fechas razonables".

Respondé ÚNICAMENTE con un objeto JSON válido, sin texto antes ni después, sin markdown, sin backticks:
{ "epicas": [ { "id": "string", "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "reason": "string" } ] }`;
}

export async function suggestFechas(tenant, { epicasSinFecha, epicasConFecha }) {
  if (!epicasSinFecha?.length) return [];

  const today = new Date().toISOString().slice(0, 10);
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: buildPrompt({ today, epicasSinFecha, epicasConFecha: epicasConFecha || [] }) }],
  });
  trackUsage({ tenant, product: 'kai-next', feature: 'project_suggest_fechas', model: MODEL, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens }).catch(() => null);

  const raw = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
  const parsed = JSON.parse(cleaned);

  const validIds = new Set(epicasSinFecha.map((e) => e.id));
  const isoDate = /^\d{4}-\d{2}-\d{2}$/;
  return (Array.isArray(parsed.epicas) ? parsed.epicas : [])
    .filter((e) => validIds.has(e?.id) && isoDate.test(e.startDate) && isoDate.test(e.endDate) && e.startDate <= e.endDate)
    .map((e) => ({ id: e.id, startDate: e.startDate, endDate: e.endDate, reason: typeof e.reason === 'string' ? e.reason.trim() : '' }));
}
