import { google } from 'googleapis';
import { Readable } from 'node:stream';
import { Redis } from '@upstash/redis';

const kv = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
const configKey = (t) => `labs:${t}:drive:config`;

export async function getDriveConfig(tenant) {
  return kv.get(configKey(tenant));
}
export async function setDriveConfig(tenant, config) {
  await kv.set(configKey(tenant), config);
  return config;
}
export async function clearDriveConfig(tenant) {
  await kv.del(configKey(tenant));
}

// Separado de lib/kai/googleDrive.js a propósito: ese módulo es de solo lectura
// (drive.readonly) para los Knowledge Sources de Kai — nunca necesita escribir.
// Labs sí necesita crear carpetas y subir archivos, así que usa su propio cliente con
// scope de escritura en vez de ampliarle el permiso a algo que Kai nunca usa.
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const GDOC_MIME = 'application/vnd.google-apps.document';

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
  const res = await drive.files.get({ fileId: folderId, fields: 'id,name,mimeType', supportsAllDrives: true });
  return res.data;
}

// Idempotente — si ya existe una subcarpeta con ese nombre bajo parentId, la reusa en vez
// de crear una duplicada. Así "crear el proyecto" / "crear la prueba" se puede llamar más
// de una vez (reintentos, reprocesos) sin ensuciar Drive con carpetas repetidas.
//
// supportsAllDrives/includeItemsFromAllDrives/corpora: sin esto, la API v3 de Drive ignora
// por completo el contexto de Unidad compartida — la carpeta del cliente vive en una, así
// que hace falta pedirlo explícito en cada llamada (list, get y create).
export async function ensureSubfolder(parentId, name) {
  const drive = getDriveClient();
  const safeName = name.replace(/'/g, "\\'");
  const existing = await drive.files.list({
    q: `'${parentId}' in parents and name = '${safeName}' and mimeType = '${FOLDER_MIME}' and trashed = false`,
    fields: 'files(id,name)',
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    corpora: 'allDrives',
  });
  if (existing.data.files?.length) return existing.data.files[0].id;

  const created = await drive.files.create({
    requestBody: { name, mimeType: FOLDER_MIME, parents: [parentId] },
    fields: 'id',
    supportsAllDrives: true,
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
    supportsAllDrives: true,
  });
  return res.data;
}

// Sube texto plano pero pidiéndole a Drive que lo convierta a Google Doc nativo (mimeType
// de destino distinto del de origen) — así el reporte queda editable/comentable directo en
// Drive, sin necesidad de generar PDF ni sumar una librería nueva al proyecto.
export async function uploadTextAsDoc(parentId, name, text) {
  const drive = getDriveClient();
  const res = await drive.files.create({
    requestBody: { name, parents: [parentId], mimeType: GDOC_MIME },
    media: { mimeType: 'text/plain', body: Readable.from(Buffer.from(text, 'utf-8')) },
    fields: 'id,name,webViewLink',
    supportsAllDrives: true,
  });
  return res.data;
}
