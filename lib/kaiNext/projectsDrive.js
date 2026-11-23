import { google } from 'googleapis';
import { Readable } from 'node:stream';
import { listConnections, addConnection, removeConnection, migrateLegacyConnections } from '@/lib/kai/driveConnections';

// La config de "Proyectos" ya no vive en su propia key — es la conexión con role:'write' dentro
// de lib/kai/driveConnections.js (lista compartida con las de lectura, ver app/api/kai/[tenant]/
// drive-connections/route.js). Estas tres funciones quedan como fachada para que el resto de
// Proyectos (que llama getDriveConfig/setDriveConfig/clearDriveConfig) no tenga que cambiar.
export async function getDriveConfig(tenant) {
  const connections = await migrateLegacyConnections(tenant);
  return connections.find((c) => c.role === 'write') ?? null;
}
export async function setDriveConfig(tenant, config) {
  await migrateLegacyConnections(tenant);
  const existing = (await listConnections(tenant)).find((c) => c.role === 'write');
  if (existing) await removeConnection(tenant, existing.id);
  return addConnection(tenant, { folderId: config.folderId, folderName: config.folderName, role: 'write', clientDomains: config.clientDomains ?? existing?.clientDomains });
}
export async function clearDriveConfig(tenant) {
  const existing = (await listConnections(tenant)).find((c) => c.role === 'write');
  if (existing) await removeConnection(tenant, existing.id);
}

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const GDOC_MIME = 'application/vnd.google-apps.document';

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  return new google.auth.GoogleAuth({ credentials, scopes: [DRIVE_SCOPE] });
}

function getDriveClient() {
  return google.drive({ version: 'v3', auth: getAuth() });
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

// Idempotente — si ya existe una subcarpeta con ese nombre, la reusa en vez de duplicarla.
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

// Papelera, no borrado permanente — recuperable desde Drive si alguien se arrepiente, mismo
// criterio que el soft-delete de Notion en el resto de Kai Next (deleteEpica, etc.).
// Comparte un archivo o carpeta con todo un dominio (ej. sesuvecadelperu.com), como hace Labs al
// crear la carpeta de cada proyecto.
export async function shareWithDomain(fileId, domain, role = 'writer') {
  const drive = getDriveClient();
  await drive.permissions.create({
    fileId,
    supportsAllDrives: true,
    requestBody: { type: 'domain', domain, role },
  });
}

export async function trashFile(fileId) {
  const drive = getDriveClient();
  await drive.files.update({ fileId, requestBody: { trashed: true }, supportsAllDrives: true });
}

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

// El navegador sube directo a esta URL (sin pasar por el backend) — necesario para video, ver
// mismo mecanismo en Labs. Se deja portado para cuando Fase 4 (Experimental) lo necesite.
export async function initiateResumableUpload(parentId, { name, mimeType }) {
  const client = await getAuth().getClient();
  const { token } = await client.getAccessToken();
  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': mimeType || 'application/octet-stream',
      },
      body: JSON.stringify({ name, parents: [parentId] }),
    }
  );
  if (!res.ok) throw new Error(`No se pudo iniciar la subida a Drive (${res.status}).`);
  const uploadUrl = res.headers.get('location');
  if (!uploadUrl) throw new Error('Drive no devolvió una URL de subida.');
  return uploadUrl;
}

// Para cuando Fase 5 (Reportes) necesite subir el reporte aprobado como Google Doc nativo.
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

// ── Leer el texto de un archivo de proyecto (para que el chat pueda citarlo) ─────────────────
// Los documentos y entregables de Proyectos viven en la unidad del tenant (a veces una unidad
// compartida, por eso supportsAllDrives). Google Docs/Sheets/Slides se exportan a texto; Word,
// PowerPoint y Excel pasan por lib/fileExtract.js; PDF se extrae con Claude (mismo criterio que
// Fuentes); HTML se limpia de etiquetas. Imágenes y video no tienen texto: devuelve null.
const EXPORT_AS = {
  'application/vnd.google-apps.document': 'text/plain',
  'application/vnd.google-apps.presentation': 'text/plain',
  'application/vnd.google-apps.spreadsheet': 'text/csv',
};
const MAX_READ_BYTES = 15 * 1024 * 1024;

function htmlToText(html) {
  return String(html)
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim();
}

export async function getFileInfo(fileId) {
  const drive = getDriveClient();
  const res = await drive.files.get({ fileId, fields: 'id,name,mimeType,size,modifiedTime,webViewLink,trashed', supportsAllDrives: true });
  return res.data;
}

// Devuelve { text } o { text: null, reason } si el archivo no tiene texto que se pueda leer.
export async function readFileText(fileId, info = null) {
  const meta = info ?? await getFileInfo(fileId);
  if (meta.trashed) return { text: null, reason: 'El archivo está en la papelera de Drive.' };
  const mime = meta.mimeType || '';
  const drive = getDriveClient();
  if (EXPORT_AS[mime]) {
    const res = await drive.files.export({ fileId, mimeType: EXPORT_AS[mime] }, { responseType: 'arraybuffer' });
    return { text: Buffer.from(res.data).toString('utf8').trim() };
  }
  if (/^(image|video|audio)\//.test(mime)) return { text: null, reason: 'Es una imagen o un video: no tiene texto que leer.' };
  if (Number(meta.size) > MAX_READ_BYTES) return { text: null, reason: 'El archivo es demasiado grande para leerlo desde el chat.' };
  const res = await drive.files.get({ fileId, alt: 'media', supportsAllDrives: true }, { responseType: 'arraybuffer' });
  const buffer = Buffer.from(res.data);
  if (mime === 'application/pdf') {
    const { extractPdfText } = await import('@/lib/fileExtract');
    return { text: await extractPdfText(buffer) };
  }
  if (mime === 'text/html') return { text: htmlToText(buffer.toString('utf8')) };
  if (mime.startsWith('text/') || mime === 'application/json') return { text: buffer.toString('utf8').trim() };
  const { extractTextFromBuffer, OFFICE_MIMES } = await import('@/lib/fileExtract');
  if (!OFFICE_MIMES.has(mime)) return { text: null, reason: `Kai todavía no sabe leer archivos de este tipo (${mime || 'desconocido'}).` };
  return { text: await extractTextFromBuffer(buffer, mime) };
}

// Subida en streaming (videos de reuniones de Kai, ver lib/kaiNext/meetingBot.js): no carga el
// archivo entero en memoria, va pasando de la descarga a Drive.
export async function uploadStream(parentId, { name, mimeType, stream }) {
  const drive = getDriveClient();
  const res = await drive.files.create({
    requestBody: { name, parents: [parentId] },
    media: { mimeType, body: stream },
    fields: 'id,name,webViewLink',
    supportsAllDrives: true,
  });
  return res.data;
}
