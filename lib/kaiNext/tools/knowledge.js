import { searchDocuments } from '@/lib/kaiNext/documentSearch';

export const QUERY_KNOWLEDGE_TOOL = {
  name: 'query_knowledge',
  description: 'Busca y LEE documentos escritos del cliente: lo cargado en Fuentes (estrategia, procesos, contexto de negocio) y los documentos y entregables subidos a los proyectos que esta persona puede ver (manuales, informes, actas, cotizaciones, planos en PDF/Word/Excel/Google Docs). Devuelve el contenido real de los documentos más relevantes, cada uno con su id, su origen (Fuentes o qué proyecto/tarea) y su enlace. Úsalo siempre que pregunten por un documento, un manual, un informe o por algo que debería estar escrito; no respondas con la descripción de una tarea si el documento existe.',
  input_schema: {
    type: 'object',
    properties: {
      topic: { type: 'string', description: 'Lo que buscas, con las palabras clave del documento o del tema (ej. "manual de servidores Proxmox", "informe de respaldo LIMS Labinorte", "objetivos de la empresa"). Incluye el nombre del documento si lo mencionaron, aunque sea aproximado.' },
    },
    required: ['topic'],
  },
};

// La búsqueda (qué se ve, cómo se ordena, cómo se lee de Drive) vive en lib/kaiNext/documentSearch.js.
// La cita en el chat (app/api/kai-next/[tenant]/route.js) sale de los `documents` que devuelve esto.
export async function executeKnowledgeTool(input, { tenant, identity }) {
  const result = await searchDocuments(tenant, identity ?? {}, String(input?.topic ?? ''));
  const { searched } = result;
  const where = `Fuentes (${searched.fuentes}) y documentos de los proyectos que esta persona ve (${searched.documentos_de_proyectos})`;

  if (!result.documents.length) {
    if (!searched.fuentes && !searched.documentos_de_proyectos) {
      return {
        error: 'No hay documentos cargados que esta persona pueda ver: ni en Fuentes ni en sus proyectos.',
        que_decir: 'Dilo así de simple. Sugiere subir el documento a la Documentación del proyecto que corresponda o pedirle a quien administra Kai que lo agregue a Fuentes. No menciones pantallas de Admin ni estados de indexación.',
      };
    }
    return {
      documents: [],
      sin_coincidencias: true,
      buscado_en: where,
      palabras_buscadas: result.keywords,
      documentos_disponibles: result.available,
      que_decir: 'Ninguno coincide con lo pedido. Si en documentos_disponibles hay uno que parece ser el que buscan (otro nombre, otra versión), vuelve a llamar a query_knowledge con su nombre. Si no, dile a la persona en qué buscaste (buscado_en), menciona los más parecidos si los hay, y sugiere subir el documento a la Documentación del proyecto o a Fuentes. Nunca la mandes a pantallas de Admin, nunca inventes estados como "indexado" o "en proceso" y no le pidas el nombre exacto del archivo.',
    };
  }

  const unreadable = result.documents.filter((d) => !d.content);
  return {
    documents: result.documents,
    buscado_en: where,
    ...(unreadable.length ? { nota: 'Hay documentos que se encontraron pero no se pudieron leer (no_se_pudo_leer dice por qué). Dilo tal cual, con su enlace, en vez de suponer su contenido.' } : {}),
  };
}
