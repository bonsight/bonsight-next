import { queryDatabase } from '@/lib/aria/databases';
import { applyFieldMeta } from './format';

// Schema extraído literal de buildTools() en app/api/aria/[tenant]/route.js.
export const QUERY_DATABASE_TOOL = {
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
};

// Mismo patrón que executeTool()'s query_database branch en Aria — reusa queryDatabase
// (lib/aria/databases.js) tal cual, sin reescribir el driver de Postgres/MySQL/Redis/BigQuery.
// Normaliza `rows` a `data` (mismo nombre que usan los demás tools de Kai Next) para que la
// tabla de salida visible funcione igual sin importar la fuente — Redis no es tabular, así que
// ahí simplemente no hay `data` y no se renderiza tabla.
export async function executeDatabaseTool(input, { dbSources, tenant }) {
  const source = (dbSources ?? []).find((s) => s.id === input.db_id);
  if (!source) {
    return { error: `Base de datos '${input.db_id}' no encontrada. Verifica el id en BASES DE DATOS CONECTADAS.` };
  }
  if (source.status !== 'active') {
    return { error: `La base de datos '${source.label}' está inactiva.` };
  }

  try {
    const result = await queryDatabase(source, input.query);
    console.log(`[kai-next-db:${tenant}] db=${source.id} type=${source.type} rows=${result.rowCount ?? result.rows?.length ?? '?'}`);
    return {
      db: source.label,
      type: source.type,
      query: input.query,
      ...result,
      // Nombres de columna SQL humanizados (snake_case/camelCase → "Nombre de columna"); sin
      // diccionario fijo porque el schema es del tenant, no algo que podamos anticipar acá.
      ...(result.rows ? { data: applyFieldMeta(result.rows, {}) } : {}),
    };
  } catch (err) {
    console.error(`[kai-next-db:${tenant}] db=${source.id} type=${source.type} error="${err.message}"`);
    return { error: `Error ejecutando query en '${source.label}': ${err.message}` };
  }
}
