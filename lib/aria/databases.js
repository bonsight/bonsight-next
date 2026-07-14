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

    // Group keys by pattern (replace variable segments like tenant names / hex IDs with *)
    const patternMap = {};
    for (const key of keys) {
      const pattern = redisKeyPattern(key);
      if (!patternMap[pattern]) patternMap[pattern] = [];
      patternMap[pattern].push(key);
    }

    // For each pattern, sample one key to get type + internal structure
    const patterns = [];
    const patternEntries = Object.entries(patternMap).sort((a, b) => b[1].length - a[1].length).slice(0, 40);
    for (const [pattern, patternKeys] of patternEntries) {
      const sampleKey = patternKeys[0];
      try {
        const type = await client.type(sampleKey);
        const fields = await sampleRedisFields(client, type, sampleKey);
        patterns.push({ pattern, type, count: patternKeys.length, fields });
      } catch { /* skip on error */ }
    }

    return {
      tables: [],
      redisInfo: { totalKeys: keys.length, patterns },
    };
  } finally {
    client.disconnect();
  }
}

function redisKeyPattern(key) {
  const parts = key.split(':');
  if (parts.length === 1) return key;
  return parts.map((p, i) => {
    if (i === 0) return p;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-/.test(p)) return '*'; // UUID
    if (/^[0-9a-f]{6,}$/i.test(p) && p.length >= 8) return '*'; // hex ID
    if (i === 1 && parts.length >= 3) return '*'; // tenant position
    return p;
  }).join(':');
}

async function sampleRedisFields(client, type, key) {
  try {
    if (type === 'hash') {
      const data = await client.hgetall(key);
      return Object.keys(data ?? {}).slice(0, 25);
    }
    if (type === 'string') {
      const val = await client.get(key);
      try {
        const obj = JSON.parse(val);
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) return Object.keys(obj).slice(0, 25);
        if (Array.isArray(obj) && obj.length > 0 && typeof obj[0] === 'object') return Object.keys(obj[0]).slice(0, 25);
      } catch { /* not JSON */ }
      return null;
    }
    if (type === 'list') {
      const [first] = await client.lrange(key, 0, 0);
      if (first) {
        try {
          const obj = JSON.parse(first);
          if (obj && typeof obj === 'object') return Object.keys(obj).slice(0, 25);
        } catch { /* not JSON */ }
      }
      return null;
    }
    if (type === 'zset') {
      const members = await client.zrange(key, 0, 1);
      return members.length ? ['(sorted set — use ZRANGE/ZRANGEBYSCORE to query)'] : null;
    }
    if (type === 'set') {
      const members = await client.smembers(key);
      return members.slice(0, 5);
    }
  } catch { /* ignore */ }
  return null;
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
    const label = `[BD db_id="${s.id}" label="${s.label}" type=${s.type}]`;
    if (s.type === 'redis') {
      const info = s.schema?.redisInfo;
      if (!info) return `${label}: conectado, sin schema cacheado.`;
      if (info.patterns?.length) {
        const lines = info.patterns.map((p) => {
          const fieldStr = p.fields?.length ? ` → [${p.fields.join(', ')}]` : '';
          return `  - ${p.pattern} (${p.type}, ${p.count} keys)${fieldStr}`;
        }).join('\n');
        return `${label}: ${info.totalKeys} keys totales.\nPatrones detectados:\n${lines}`;
      }
      return `${label}: ${info.totalKeys} keys.`;
    }
    const tables = s.schema?.tables ?? [];
    if (!tables.length) return `${label}: conectado, sin schema cacheado.`;
    const tableLines = tables.map((t) => `  - ${t.name}: ${t.columns.map((c) => `${c.column} (${c.type})`).join(', ')}`).join('\n');
    return `${label}:\n${tableLines}`;
  }).join('\n\n');
}
