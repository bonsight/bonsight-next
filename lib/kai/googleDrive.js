import { google } from 'googleapis';
import Anthropic from '@anthropic-ai/sdk';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

const EXPORTABLE_MIME = {
  'application/vnd.google-apps.document':    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.google-apps.spreadsheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  ...Object.keys(EXPORTABLE_MIME),
]);

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

export async function listDriveFiles(folderId) {
  const drive = getDriveClient();
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id,name,mimeType,modifiedTime,size)',
    pageSize: 100,
  });
  return (res.data.files ?? []).filter((f) => ALLOWED_MIME.has(f.mimeType));
}

export async function getFileMetadata(fileId) {
  const drive = getDriveClient();
  const res = await drive.files.get({ fileId, fields: 'id,name,modifiedTime' });
  return res.data;
}

async function downloadDriveFile(fileId, mimeType) {
  const drive = getDriveClient();
  const exportMime = EXPORTABLE_MIME[mimeType];
  if (exportMime) {
    const res = await drive.files.export({ fileId, mimeType: exportMime }, { responseType: 'arraybuffer' });
    return { buffer: Buffer.from(res.data), resolvedMime: exportMime };
  }
  const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' });
  return { buffer: Buffer.from(res.data), resolvedMime: mimeType };
}

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

  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const parts = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    return `## Hoja: ${name}\n${XLSX.utils.sheet_to_csv(sheet, { blankrows: false })}`;
  });
  return parts.join('\n\n').trim();
}
