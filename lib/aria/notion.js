const BASE = 'https://api.notion.com/v1';
const VERSION = '2022-06-28';

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Notion-Version': VERSION,
    'Content-Type': 'application/json',
  };
}

function richTextToString(richText = []) {
  return richText.map((t) => t.plain_text ?? '').join('');
}

function blockToText(block, depth = 0) {
  const indent = '  '.repeat(depth);
  const type = block.type;
  const b = block[type];
  const text = richTextToString(b?.rich_text ?? []);

  if (type === 'heading_1') return `${indent}# ${text}`;
  if (type === 'heading_2') return `${indent}## ${text}`;
  if (type === 'heading_3') return `${indent}### ${text}`;
  if (type === 'paragraph') return text ? `${indent}${text}` : '';
  if (type === 'bulleted_list_item') return `${indent}- ${text}`;
  if (type === 'numbered_list_item') return `${indent}1. ${text}`;
  if (type === 'to_do') return `${indent}- [${b?.checked ? 'x' : ' '}] ${text}`;
  if (type === 'toggle') return `${indent}▸ ${text}`;
  if (type === 'quote') return `${indent}> ${text}`;
  if (type === 'callout') return `${indent}📌 ${text}`;
  if (type === 'code') return `\`\`\`\n${richTextToString(b?.rich_text)}\n\`\`\``;
  if (type === 'divider') return '---';
  if (type === 'child_page') return `[Subpágina: ${b?.title ?? ''}]`;
  if (type === 'table_row') return (b?.cells ?? []).map((c) => richTextToString(c)).join(' | ');
  return text || '';
}

async function fetchBlocks(token, blockId, depth = 0) {
  if (depth > 3) return [];
  const res = await fetch(`${BASE}/blocks/${blockId}/children?page_size=100`, { headers: headers(token) });
  if (!res.ok) return [];
  const data = await res.json();
  const lines = [];
  for (const block of data.results ?? []) {
    const line = blockToText(block, depth);
    if (line) lines.push(line);
    if (block.has_children && depth < 2) {
      const children = await fetchBlocks(token, block.id, depth + 1);
      lines.push(...children);
    }
  }
  return lines;
}

function databaseRowToText(row) {
  const props = row.properties ?? {};
  const parts = [];
  for (const [key, val] of Object.entries(props)) {
    let v = '';
    if (val.type === 'title') v = richTextToString(val.title);
    else if (val.type === 'rich_text') v = richTextToString(val.rich_text);
    else if (val.type === 'select') v = val.select?.name ?? '';
    else if (val.type === 'multi_select') v = val.multi_select?.map((o) => o.name).join(', ');
    else if (val.type === 'date') v = val.date?.start ?? '';
    else if (val.type === 'checkbox') v = val.checkbox ? 'Sí' : 'No';
    else if (val.type === 'number') v = String(val.number ?? '');
    else if (val.type === 'url') v = val.url ?? '';
    else if (val.type === 'email') v = val.email ?? '';
    else if (val.type === 'phone_number') v = val.phone_number ?? '';
    else if (val.type === 'status') v = val.status?.name ?? '';
    if (v) parts.push(`${key}: ${v}`);
  }
  return parts.join(' | ');
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function validateNotionToken(token) {
  const res = await fetch(`${BASE}/search`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ page_size: 50 }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }

  const data = await res.json();
  const results = data.results ?? [];
  const databases = results.filter((r) => r.object === 'database').map((d) => ({
    id: d.id,
    title: richTextToString(d.title),
  }));
  const pages = results.filter((r) => r.object === 'page').map((p) => ({
    id: p.id,
    title: richTextToString(p.properties?.title?.title ?? p.properties?.Name?.title ?? []) || 'Sin título',
  }));

  return { databases, pages };
}

export async function searchNotion(token, query) {
  const res = await fetch(`${BASE}/search`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ query, page_size: 15, sort: { direction: 'descending', timestamp: 'last_edited_time' } }),
  });
  if (!res.ok) throw new Error(`Notion search error: HTTP ${res.status}`);
  const data = await res.json();

  const results = (data.results ?? []).map((r) => {
    const title = r.object === 'database'
      ? richTextToString(r.title)
      : richTextToString(r.properties?.title?.title ?? r.properties?.Name?.title ?? []) || 'Sin título';
    return { id: r.id, type: r.object, title, url: r.url, lastEdited: r.last_edited_time };
  });

  return { count: results.length, results };
}

export async function getNotionPage(token, pageId) {
  const [pageRes, blocksData] = await Promise.all([
    fetch(`${BASE}/pages/${pageId}`, { headers: headers(token) }),
    fetchBlocks(token, pageId),
  ]);

  if (!pageRes.ok) throw new Error(`No se pudo acceder a la página: HTTP ${pageRes.status}`);
  const page = await pageRes.json();

  const titleProp = Object.values(page.properties ?? {}).find((p) => p.type === 'title');
  const title = richTextToString(titleProp?.title ?? []) || 'Sin título';

  const content = blocksData.filter(Boolean).join('\n');
  return { title, url: page.url, lastEdited: page.last_edited_time, content: content.slice(0, 12000) };
}

export async function queryNotionDatabase(token, databaseId) {
  const res = await fetch(`${BASE}/databases/${databaseId}/query`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ page_size: 50 }),
  });
  if (!res.ok) throw new Error(`No se pudo consultar la base de datos: HTTP ${res.status}`);
  const data = await res.json();

  const rows = (data.results ?? []).map(databaseRowToText).filter(Boolean);
  return { rowCount: rows.length, rows: rows.slice(0, 80) };
}
