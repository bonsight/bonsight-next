import { google } from 'googleapis';
import { Readable } from 'node:stream';
import { Redis } from '@upstash/redis';

// Port directo de lib/labs/googleDrive.js — mismo service account (GOOGLE_SERVICE_ACCOUNT_JSON,
// ya configurado en Vercel para Aria/Labs) y mismo scope de escritura, pero con su PROPIA config
// por tenant (kainext:{tenant}:projects:drive:config) — un tenant de Kai Next conecta su propia
// carpeta para Proyectos, independiente de cualquier config de Labs para ese mismo cliente.
const kv = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
const configKey = (t) => `kainext:${t}:projects:drive:config`;

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
