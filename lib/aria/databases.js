import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const KEY = (tenant) => `aria:${tenant}:db_sources`;
const QUERY_TIMEOUT_MS = 8000;
const ROW_LIMIT = 200;

// ── Persistence ────────────────────────────────────────────────────────────

export async function getDbSources(tenant) {
  const data = await kv.get(KEY(tenant));
  if (!data) return [];
  return Array.isArray(data) ? data : [];
}

export async function saveDbSources(tenant, sources) {
  await kv.set(KEY(tenant), sources);
}

// ── Connection + schema ────────────────────────────────────────────────────

export async function testAndIntrospect(source) {
  const { type, connectionString } = source;
  if (type === 'postgres') return introspectPostgres(connectionString);
  if (type === 'mysql' || type === 'mariadb') return introspectMysql(connectionString);
  if (type === 'redis') return introspectRedis(connectionString);
  throw new Error(`Tipo de BD no soportado: ${type}`);
}

async function introspectPostgres(connectionString) {
  const { Client } = await import('pg');
  const client = new Client({ connectionString, connectionTimeoutMillis: QUERY_TIMEOUT_MS });
  await client.connect();
  try {
    const { rows } = await client.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);
    return buildRelationalSchema(rows, 'table_name', 'column_name', 'data_type');
  } finally {
    await client.end();
  }
}

async function introspectMysql(connectionString) {
  const mysql = await import('mysql2/promise');
  const conn = await mysql.createConnection(connectionString);
  try {
    const dbName = new URL(connectionString).pathname.slice(1);
    const [rows] = await conn.execute(`
      SELECT TABLE_NAME as table_name, COLUMN_NAME as column_name, DATA_TYPE as data_type
      FROM information_schema.columns
      WHERE table_schema = ?
      ORDER BY table_name, ordinal_position
    `, [dbName]);
    return buildRelationalSchema(rows, 'table_name', 'column_name', 'data_type');
  } finally {
    await conn.end();
  }
}

async function introspectRedis(connectionString) {
  const { default: IORedis } = await import('ioredis');
  const client = new IORedis(connectionString, { lazyConnect: true, connectTimeout: QUERY_TIMEOUT_MS, enableReadyCheck: false });
  await client.connect();
  try {
    const keys = await client.keys('*');
    const sample = keys.slice(0, 30);
    const types = await Promise.all(sample.map((k) => client.type(k)));
    const byType = {};
    sample.forEach((k, i) => {
      const t = types[i];
      if (!byType[t]) byType[t] = [];
      byType[t].push(k);
    });
    return {
      tables: [],
      redisInfo: { totalKeys: keys.length, sampleByType: byType },
    };
  } finally {
    client.disconnect();
  }
}

function buildRelationalSchema(rows, tableCol, columnCol, typeCol) {
  const tables = {};
  for (const row of rows) {
    const t = row[tableCol];
    if (!tables[t]) tables[t] = [];
    tables[t].push({ column: row[columnCol], type: row[typeCol] });
  }
  return { tables: Object.entries(tables).map(([name, columns]) => ({ name, columns })) };
}

// ── Query execution ────────────────────────────────────────────────────────

export async function queryDatabase(source, sql) {
  const { type, connectionString } = source;
  if (type === 'postgres') return queryPostgres(connectionString, sql);
  if (type === 'mysql' || type === 'mariadb') return queryMysql(connectionString, sql);
  if (type === 'redis') return queryRedis(connectionString, sql);
  throw new Error(`Tipo no soportado: ${type}`);
}

async function queryPostgres(connectionString, sql) {
  const { Client } = await import('pg');
  const client = new Client({ connectionString, connectionTimeoutMillis: QUERY_TIMEOUT_MS });
  await client.connect();
  try {
    const result = await client.query(sql);
    return { rows: result.rows.slice(0, ROW_LIMIT), rowCount: result.rowCount, fields: result.fields?.map((f) => f.name) };
  } finally {
    await client.end();
  }
}

async function queryMysql(connectionString, sql) {
  const mysql = await import('mysql2/promise');
  const conn = await mysql.createConnection(connectionString);
  try {
    const [rows, fields] = await conn.execute(sql);
    const limited = Array.isArray(rows) ? rows.slice(0, ROW_LIMIT) : rows;
    return { rows: limited, rowCount: Array.isArray(rows) ? rows.length : 0, fields: fields?.map((f) => f.name) };
  } finally {
    await conn.end();
  }
}

async function queryRedis(connectionString, command) {
  const { default: IORedis } = await import('ioredis');
  const client = new IORedis(connectionString, { lazyConnect: true, connectTimeout: QUERY_TIMEOUT_MS, enableReadyCheck: false });
  await client.connect();
  try {
    const parts = command.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    const result = await client[cmd](...args);
    return { result, command };
  } finally {
    client.disconnect();
  }
}

// ── Schema context for system prompt ──────────────────────────────────────

export function buildDbSourcesContext(sources) {
  const active = sources.filter((s) => s.status === 'active');
  if (!active.length) return null;

  return active.map((s) => {
    const label = `[BD] ${s.label} (${s.type})`;
    if (s.type === 'redis') {
      const info = s.schema?.redisInfo;
      if (!info) return `${label}: conectado, sin schema cacheado.`;
      return `${label}: ${info.totalKeys} keys. Tipos presentes: ${Object.keys(info.sampleByType).join(', ')}.`;
    }
    const tables = s.schema?.tables ?? [];
    if (!tables.length) return `${label}: conectado, sin schema cacheado.`;
    const tableLines = tables.map((t) => `  - ${t.name}: ${t.columns.map((c) => `${c.column} (${c.type})`).join(', ')}`).join('\n');
    return `${label}:\n${tableLines}`;
  }).join('\n\n');
}
