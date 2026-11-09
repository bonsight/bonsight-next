import { getVisibleSharedDocument } from '@/lib/kaiNext/sharedDocuments';

const MAX_CONTENT_CHARS = 30000;

export const READ_SHARED_DOCUMENT_TOOL = {
  name: 'read_shared_document',
  description: 'Lee un documento que otra persona compartió con quien está chateando y se lo entrega para descargar. Usa solo un id de la lista DOCUMENTOS COMPARTIDOS CON ESTA PERSONA.',
  input_schema: {
    type: 'object',
    properties: {
      document_id: { type: 'string', description: 'El id exacto del documento.' },
    },
    required: ['document_id'],
  },
};

export async function executeReadSharedDocumentTool(input, { tenant, identity, attachDocument }) {
  const found = await getVisibleSharedDocument(tenant, input?.document_id, identity);
  if (!found) return { error: 'Ese documento no existe o no está compartido con esta persona.' };

  attachDocument?.({ ...found.document, sharedId: found.share.id });
  return {
    titulo: found.share.title,
    compartido_por: found.share.sharedByName,
    contenido: JSON.stringify(found.document).slice(0, MAX_CONTENT_CHARS),
  };
}
