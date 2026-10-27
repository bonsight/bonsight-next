// Tool de solo lectura para que el chat general de Kai Next pueda considerar las reuniones de
// proyecto (ver app/kai-next/[tenant]/KaiNextMeetings.jsx, Redis vía lib/kaiNext/devMeetings.js)
// al responder — hasta ahora esa información solo vivía en la pantalla de Reuniones, sin forma
// de que Kai la trajera a un resumen, un informe o cualquier otra respuesta del chat.
import { listDevMeetings } from '@/lib/kaiNext/devMeetings';

export const QUERY_MEETINGS_TOOL = {
  name: 'query_meetings',
  description: 'Consulta las reuniones de proyecto agendadas en Kai Next (sección Reuniones): título, tipo, fecha/hora, asistentes, organizador, y las notas/decisiones cargadas después de cada una. Sin project_name devuelve las reuniones más recientes de todo el tenant. Con project_name filtra solo las de ese proyecto. Úsala cuando la pregunta sea sobre qué se habló o decidió en una reunión, el historial de reuniones de un proyecto, o para incorporar ese contexto en un resumen/informe que estés armando.',
  input_schema: {
    type: 'object',
    properties: {
      project_name: { type: 'string', description: 'Nombre (o parte del nombre) del proyecto para filtrar sus reuniones. Si se omite, trae las más recientes de todo el tenant.' },
      limit: { type: 'number', description: 'Cuántas reuniones devolver como máximo (default 15, tope 50).' },
    },
  },
};

export async function executeQueryMeetingsTool(input, { tenant }) {
  const all = await listDevMeetings(tenant); // ya viene ordenado por fecha desc, ver listDevMeetings
  if (!all.length) return { error: 'Todavía no hay reuniones agendadas para este tenant.' };

  const projectName = input?.project_name?.trim().toLowerCase();
  const filtered = projectName
    ? all.filter((m) => m.projectName?.toLowerCase().includes(projectName))
    : all;
  if (projectName && !filtered.length) {
    return { error: `No encontré reuniones de ningún proyecto que coincida con "${input.project_name}".` };
  }

  const limit = Math.min(Math.max(input?.limit ?? 15, 1), 50);
  return {
    meetings: filtered.slice(0, limit).map((m) => ({
      titulo: m.title,
      tipo: m.tipo,
      inicio: m.start,
      fin: m.end,
      proyecto: m.projectName,
      organizador: m.createdByName,
      asistentes: (m.attendees ?? []).map((a) => a.name || a.email).filter(Boolean),
      notas: m.notes || null,
      documentos: (m.documentLinks ?? []).map((d) => d.name || d.url).filter(Boolean),
    })),
  };
}
