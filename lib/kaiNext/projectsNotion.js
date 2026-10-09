import { getIntelligenceSources } from '@/lib/kai/intelligenceSources';
import {
  listClientesReal, createProyecto, createIniciativa, loadIniciativasMap, loadEpicasMap,
  listEpicasByIniciativa, createEpica, updateEpica, getEpica, listTareasByEpica, updateIniciativaObjetivo,
  renameIniciativa, deleteIniciativa,
  listTareasByIniciativas,
  PROYECTOS_DB_ID, INICIATIVAS_DB_ID,
} from '@/lib/aria/board';
import { queryDatabasePages, getNotionPageRaw, pageToFields } from '@/lib/aria/notion';

// Capa de orquestación para "Proyecto de Desarrollo" (Kai Next) — reusa Proyectos/Iniciativas/
// Tareas de Notion tal cual (createProyecto/createIniciativa/createTask ya existían para
// Sprints), sumando Clientes real y Épicas (ver lib/aria/board.js y el plan en
// /Users/itriagor/.claude/plans/serene-spinning-mochi.md). Esta rama de Proyectos NO pasa por
// lib/kaiNext/projects.js: su contenido vive en Notion, se lee en vivo cada vez, sin caché.

export async function getNotionToken(tenant) {
  const sources = await getIntelligenceSources(tenant);
  const notionSource = sources.find((s) => s.id === 'notion');
  if (!notionSource || notionSource.status !== 'active' || !notionSource.config?.integrationToken) return null;
  return notionSource.config.integrationToken;
}

export async function listClientes(token) {
  return listClientesReal(token);
}

export async function createDevProyecto(token, { name, clienteId }) {
  const id = await createProyecto(token, { name, clienteId });
  return { id, name };
}

export async function getProyecto(token, proyectoId) {
  const page = await getNotionPageRaw(token, proyectoId);
  if (!page) return null;
  const { fields } = pageToFields(page);
  return {
    id: page.id,
    name: fields['Proyecto'] ?? 'Sin nombre',
    clienteId: fields['Cliente']?.[0] ?? null,
    estado: fields['Estado'] ?? null,
    fechaInicio: fields['Fecha de Inicio'] ?? null,
    fechaFin: fields['Fecha de Finalización'] ?? null,
  };
}

export async function listIniciativasForProyecto(token, proyectoId) {
  const pages = await queryDatabasePages(token, INICIATIVAS_DB_ID, {
    filter: { property: 'Proyecto', relation: { contains: proyectoId } },
  });
  return pages.map((page) => {
    const { fields } = pageToFields(page);
    return {
      id: page.id,
      name: fields['Iniciativa'] ?? 'Sin nombre',
      objetivo: fields['Objetivo'] ?? '',
      estado: fields['Estado'] ?? null,
    };
  });
}

export async function createDevIniciativa(token, { name, proyectoId }) {
  const id = await createIniciativa(token, { name, proyectoId });
  return { id, name };
}

export async function updateDevIniciativaObjetivo(token, iniciativaId, objetivo) {
  return updateIniciativaObjetivo(token, iniciativaId, objetivo);
}

export async function renameDevIniciativa(token, iniciativaId, name) {
  return renameIniciativa(token, iniciativaId, name);
}

export async function deleteDevIniciativa(token, iniciativaId) {
  return deleteIniciativa(token, iniciativaId);
}

export async function listEpicas(token, iniciativaId) {
  return listEpicasByIniciativa(token, iniciativaId);
}

export async function getDevEpica(token, epicaId) {
  return getEpica(token, epicaId);
}

export async function createDevEpica(token, payload) {
  return createEpica(token, payload);
}

export async function updateDevEpica(token, epicaId, patch) {
  return updateEpica(token, epicaId, patch);
}

export async function listTareas(token, epicaId) {
  return listTareasByEpica(token, epicaId);
}

// Todas las tareas de todas las Iniciativas de un proyecto, en un solo viaje — insumo para el
// rollup de cabecera y para los tabs Tablero/Sprints.
export async function listTareasDelProyecto(token, proyectoId) {
  const iniciativas = await listIniciativasForProyecto(token, proyectoId);
  return listTareasByIniciativas(token, iniciativas.map((i) => i.id));
}

// Para el Roadmap: todas las iniciativas + todas sus épicas de un proyecto, en un solo viaje.
export async function getRoadmap(token, proyectoId) {
  const iniciativas = await listIniciativasForProyecto(token, proyectoId);
  const epicasMap = await loadEpicasMap(token, iniciativas.map((i) => i.id));
  const epicas = [...epicasMap.values()];
  return {
    iniciativas: iniciativas.map((ini) => ({
      ...ini,
      epicas: epicas.filter((e) => e.iniciativaId === ini.id),
    })),
  };
}

export { PROYECTOS_DB_ID, INICIATIVAS_DB_ID };
