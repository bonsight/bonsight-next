import { searchArchivedInvestigations } from '@/lib/aria/memory';

// Reusa tal cual la búsqueda de investigaciones archivadas de Aria (decisiones confirmadas,
// insights, recomendaciones de análisis previos) — mismo patrón "search_archive" que ya usa
// Aria, no una reescritura.
export const SEARCH_ARCHIVE_TOOL = {
  name: 'search_archive',
  description: `Busca en análisis e investigaciones archivadas cuando el usuario menciona una entidad (persona, empresa, contacto, proyecto) que podría tener historial previo, o pregunta por decisiones o recomendaciones anteriores.
Devuelve las investigaciones archivadas más relevantes para esa consulta.`,
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Entidad o tema a buscar. Ej: "piloto Sesuveca", "alianza con Growlat".',
      },
    },
    required: ['query'],
  },
};

export async function executeSearchArchiveTool(input, { tenant }) {
  const results = await searchArchivedInvestigations(tenant, input.query);
  if (!results.length) return { note: 'Sin resultados en el archivo para esa búsqueda.' };
  return {
    results: results.map((r) => ({
      title: r.title, date: r.date, area: r.area, summary: r.summary,
      insights: r.insights, decisions: r.decisions,
    })),
  };
}
