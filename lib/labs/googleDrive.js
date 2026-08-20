import { google } from 'googleapis';
import { Readable } from 'node:stream';

// Separado de lib/kai/googleDrive.js a propósito: ese módulo es de solo lectura
// (drive.readonly) para los Knowledge Sources de Kai — nunca necesita escribir.
// Labs sí necesita crear carpetas y subir archivos, así que usa su propio cliente con
// scope de escritura en vez de ampliarle el permiso a algo que Kai nunca usa.
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

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

// Idempotente — si ya existe una subcarpeta con ese nombre bajo parentId, la reusa en vez
// de crear una duplicada. Así "crear el proyecto" / "crear la prueba" se puede llamar más
// de una vez (reintentos, reprocesos) sin ensuciar Drive con carpetas repetidas.
export async function ensureSubfolder(parentId, name) {
  const drive = getDriveClient();
  const safeName = name.replace(/'/g, "\\'");
  const existing = await drive.files.list({
    q: `'${parentId}' in parents and name = '${safeName}' and mimeType = '${FOLDER_MIME}' and trashed = false`,
    fields: 'files(id,name)',
    pageSize: 1,
  });
  if (existing.data.files?.length) return existing.data.files[0].id;

  const created = await drive.files.create({
    requestBody: { name, mimeType: FOLDER_MIME, parents: [parentId] },
    fields: 'id',
  });
  return created.data.id;
}

// data: base64 string (mismo formato que ya viaja del cliente para evidencia/adjuntos).
export async function uploadFile(parentId, { name, mimeType, data }) {
  const drive = getDriveClient();
  const buffer = Buffer.from(data, 'base64');
  const res = await drive.files.create({
    requestBody: { name, parents: [parentId] },
    media: { mimeType, body: Readable.from(buffer) },
    fields: 'id,name,webViewLink',
  });
  return res.data;
}
