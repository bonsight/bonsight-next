import { google } from 'googleapis';
import Anthropic from '@anthropic-ai/sdk';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import zlib from 'zlib';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

const EXPORTABLE_MIME = {
  'application/vnd.google-apps.document':     'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.google-apps.spreadsheet':  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.google-apps.presentation': 'application/pdf',
};

const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  PPTX_MIME,
  ...Object.keys(EXPORTABLE_MIME),
]);

// ── ZIP/PPTX text extraction (no external deps) ───────────────────────────

function parsePptxText(buffer) {
  // Find End of Central Directory (EOCD): signature PK\x05\x06
  let eocd = -1;
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer[i] === 0x50 && buffer[i + 1] === 0x4b && buffer[i + 2] === 0x05 && buffer[i + 3] === 0x06) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) return '';

  const cdOffset = buffer.readUInt32LE(eocd + 16);
  const cdSize   = buffer.readUInt32LE(eocd + 12);

  const slides = [];
  let pos = cdOffset;

  while (pos < cdOffset + cdSize) {
    if (buffer.readUInt32LE(pos) !== 0x02014b50) break; // central dir signature
    const compression = buffer.readUInt16LE(pos + 10);
    const compSize    = buffer.readUInt32LE(pos + 20);
    const nameLen     = buffer.readUInt16LE(pos + 28);
    const extraLen    = buffer.readUInt16LE(pos + 30);
    const commentLen  = buffer.readUInt16LE(pos + 32);
    const localOffset = buffer.readUInt32LE(pos + 42);
    const name        = buffer.slice(pos + 46, pos + 46 + nameLen).toString('utf8');
    pos += 46 + nameLen + extraLen + commentLen;

    if (!/^ppt\/slides\/slide\d+\.xml$/.test(name)) continue;

    const lhNameLen  = buffer.readUInt16LE(localOffset + 26);
    const lhExtraLen = buffer.readUInt16LE(localOffset + 28);
    const dataStart  = localOffset + 30 + lhNameLen + lhExtraLen;
    const compressed = buffer.slice(dataStart, dataStart + compSize);

    let xml;
    if (compression === 0) {
      xml = compressed.toString('utf8');
    } else if (compression === 8) {
      try { xml = zlib.inflateRawSync(compressed).toString('utf8'); } catch { continue; }
    } else continue;

    const matches = xml.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g) ?? [];
    const texts   = matches.map((m) => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean);
    if (texts.length) slides.push(texts.join(' '));
  }

  return slides.join('\n\n');
}

// ── Drive helpers ─────────────────────────────────────────────────────────

function getDriveClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({ credentials, scopes: [DRIVE_SCOPE] });
  return google.drive({ version: 'v3', auth });
}

export function extractFolderId(input) {
  const match = input.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  return input.trim();
}

export async function getFolderMetadata(folderId) {
  const drive = getDriveClient();
  const res = await drive.files.get({ fileId: folderId, fields: 'id,name,mimeType' });
  return res.data;
}

// Recursively lists all compatible files under folderId (including subfolders).
// Returns flat array; each file has an optional folderPath property.
export async function listDriveFiles(folderId, _depth = 0, _path = '') {
  if (_depth > 5) return [];
  const drive = getDriveClient();
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id,name,mimeType,modifiedTime,size)',
    pageSize: 200,
  });

  const items   = res.data.files ?? [];
  const results = [];

  // Process folders and files in parallel
  await Promise.all(items.map(async (item) => {
    if (item.mimeType === FOLDER_MIME) {
      const subPath = _path ? `${_path}/${item.name}` : item.name;
      const sub     = await listDriveFiles(item.id, _depth + 1, subPath);
      results.push(...sub);
    } else if (ALLOWED_MIME.has(item.mimeType)) {
      results.push({ ...item, folderPath: _path || null });
    }
  }));

  return results;
}

export async function getFileMetadata(fileId) {
  const drive = getDriveClient();
  const res = await drive.files.get({ fileId, fields: 'id,name,modifiedTime' });
  return res.data;
}

async function downloadDriveFile(fileId, mimeType) {
  const drive     = getDriveClient();
  const exportMime = EXPORTABLE_MIME[mimeType];
  if (exportMime) {
    const res = await drive.files.export({ fileId, mimeType: exportMime }, { responseType: 'arraybuffer' });
    return { buffer: Buffer.from(res.data), resolvedMime: exportMime };
  }
  const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' });
  return { buffer: Buffer.from(res.data), resolvedMime: mimeType };
}

// ── Text extraction ────────────────────────────────────────────────────────

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function extractFromDriveFile(fileId, mimeType) {
  const { buffer, resolvedMime } = await downloadDriveFile(fileId, mimeType);

  if (resolvedMime === 'application/pdf') {
    const base64 = buffer.toString('base64');
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
          { type: 'text', text: 'Extrae todo el contenido textual de este documento de forma limpia y estructurada. Preserva títulos, secciones y listas. No agregues explicaciones ni comentarios — solo el contenido extraído.' },
        ],
      }],
    });
    return response.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
  }

  if (resolvedMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value?.trim() ?? '';
  }

  if (resolvedMime === PPTX_MIME) {
    return parsePptxText(buffer);
  }

  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const parts = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    return `## Hoja: ${name}\n${XLSX.utils.sheet_to_csv(sheet, { blankrows: false })}`;
  });
  return parts.join('\n\n').trim();
}
