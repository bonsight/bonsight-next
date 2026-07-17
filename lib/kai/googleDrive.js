import { google } from 'googleapis';
import Anthropic from '@anthropic-ai/sdk';
import { extractTextFromBuffer, PPTX_MIME } from '@/lib/fileExtract';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

const EXPORTABLE_MIME = {
  'application/vnd.google-apps.document':     'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.google-apps.spreadsheet':  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.google-apps.presentation': 'application/pdf',
};

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

  return extractTextFromBuffer(buffer, resolvedMime);
}
