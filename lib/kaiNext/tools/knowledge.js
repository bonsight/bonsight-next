import { listSources, getSourceContent } from '@/lib/kai/knowledgeSources';

const MAX_TOTAL_CHARS = 40000; // ~10k tokens, mismo tope que el digest viejo
const MAX_DOCUMENTS = 4;

export const QUERY_KNOWLEDGE_TOOL = {
  name: 'query_knowledge',
  description: 'Busca en el conocimiento organizacional del cliente — documentos, páginas y notas que el equipo cargó en Knowledge Sources (estrategia, procesos, decisiones, contexto de negocio). Te devuelve solo los documentos más relevantes al tema que pasaste, cada uno con su id real. Úsalo cuando la pregunta necesite ese contexto, no datos de analytics.',
  input_schema: {
    type: 'object',
    properties: {
      topic: { type: 'string', description: 'El tema o pregunta puntual sobre la que necesitas contexto (ej. "objetivos de la empresa", "mapeo del Drive") — se usa para traer solo los documentos relevantes, no toda la base de conocimiento.' },
    },
    required: ['topic'],
  },
};

// Antes esto devolvía un único digest pre-mezclado (getKnowledgeDigest) con TODA la base de
// conocimiento en cada llamada — ni era preciso (una pregunta puntual traía documentos
// irrelevantes) ni dejaba saber qué documento puntual sostenía una afirmación. Ahora: (1) lee
// los documentos individuales directo de knowledgeSources.js (mismo backend, cero storage
// nuevo), (2) los filtra por relevancia simple (coincidencia de palabras del `topic` en el
// nombre/contenido) para traer solo lo pertinente. La cita en el chat (ver app/api/kai-next/
// [tenant]/route.js) se arma a partir de QUÉ documentos devolvió esta llamada — no depende de
// que el modelo se acuerde de reportarlo aparte en el texto, que resultó poco confiable.
export async function executeKnowledgeTool(input, { tenant }) {
  const sources = await listSources(tenant);
  const ready = sources.filter((s) => s.status === 'ready');
  if (!ready.length) {
    return { error: 'Todavía no hay conocimiento cargado para este cliente. Se configura en el admin de Kai, pestaña Knowledge.' };
  }

  const contents = await Promise.all(ready.map((s) => getSourceContent(tenant, s.id)));
  const topic = String(input?.topic ?? '').toLowerCase();
  const keywords = topic.split(/[^a-záéíóúñü0-9]+/i).filter((w) => w.length > 2);

  const scored = ready.map((s, i) => {
    const content = contents[i] ?? '';
    const haystack = `${s.name} ${content}`.toLowerCase();
    const score = keywords.reduce((acc, kw) => acc + (haystack.includes(kw) ? 1 : 0), 0);
    return { source: s, content, score };
  });

  // Prioriza los que de verdad matchean el tema; si ninguno matchea literal (pregunta más
  // conceptual que textual), mejor mandar todos que devolver vacío.
  const withMatches = scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
  const chosen = (withMatches.length ? withMatches : scored).slice(0, MAX_DOCUMENTS);

  let remaining = MAX_TOTAL_CHARS;
  const documents = [];
  for (const { source: s, content } of chosen) {
    if (!content || remaining <= 0) continue;
    const slice = content.slice(0, remaining);
    remaining -= slice.length;
    documents.push({
      id: s.id,
      name: s.name,
      type: s.sourceType,
      url: s.url ?? null,
      date: s.processedAt,
      content: slice,
    });
  }

  if (!documents.length) {
    return { error: 'Todavía no hay conocimiento procesado para este cliente.' };
  }

  return { documents };
}
