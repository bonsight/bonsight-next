import { Redis } from '@upstash/redis';
import { listSources, getSourceContent } from '@/lib/kai/knowledgeSources';
import { empresaAllows } from '@/lib/kaiNext/empresas';
import { listProjectsForPerson, resolveProjectAccessLevel, supervisesProject, getProject } from '@/lib/kaiNext/projects';
import { listTasks as listDevTasks } from '@/lib/kaiNext/devStore';
import { getFileInfo, readFileText } from '@/lib/kaiNext/projectsDrive';

// Búsqueda única sobre todo lo escrito que Kai puede leer para una persona:
// - Fuentes (Knowledge Sources), filtradas por empresa.
// - Documentos de los proyectos que la persona ve (pestaña Documentación y los adjuntos a
//   tareas) y entregables de las tareas de Desarrollo.
// Antes el chat solo miraba Fuentes: un manual subido a un proyecto era invisible y Kai terminaba
// respondiendo con la descripción de la tarea (caso Luis Lezama, 2026-11-21).
//
// Visibilidad: la misma de la pantalla de Proyectos. Quien supervisa el proyecto ve toda su
// Documentación; el resto, solo lo adjunto a tareas y los entregables (lo que ve en sus tareas).
const kv = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
const textKey = (tenant, fileId) => `kainext:${tenant}:doctext:${fileId}`;

const MAX_TOTAL_CHARS = 40000;
const MAX_DOCUMENTS = 4;
const CHUNK = 1200;

const STOPWORDS = new Set([
  'que', 'los', 'las', 'del', 'por', 'para', 'con', 'una', 'uno', 'unos', 'unas', 'sus', 'este', 'esta', 'estos', 'estas',
  'ese', 'esa', 'como', 'sobre', 'hay', 'mas', 'muy', 'pero', 'sin', 'entre', 'cual', 'cuales', 'donde', 'cuando', 'tiene',
  'tengo', 'tienes', 'sabes', 'puedes', 'dime', 'dame', 'quiero', 'necesito', 'algo', 'todo', 'todos', 'the', 'and', 'for',
]);

export const normalize = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const stem = (w) => (/\d/.test(w) ? w : w.length > 5 && w.endsWith('es') ? w.slice(0, -2) : w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w);

// "Manual de servidores v2.0" → ["manual", "servidor", "v2"]: con dígitos alcanza con 2 letras,
// así "v2.0" encuentra "V2.1".
export function keywordsOf(text) {
  const words = normalize(text).split(/[^a-z0-9]+/).filter(Boolean);
  const out = [];
  for (const w of words) {
    const ok = w.length >= 3 || (w.length >= 2 && /\d/.test(w) && /[a-z]/.test(w));
    if (!ok || STOPWORDS.has(w) || /^\d+$/.test(w)) continue;
    const s = stem(w);
    if (!out.includes(s)) out.push(s);
  }
  return out;
}

const countHits = (haystack, kw) => {
  let n = 0;
  let i = haystack.indexOf(kw);
  while (i !== -1 && n < 20) { n++; i = haystack.indexOf(kw, i + kw.length); }
  return n;
};

// Puntaje: el nombre del documento pesa más que su contexto (proyecto/tarea), y ambos más que
// el texto. Cubrir más palabras de la pregunta suma aparte.
export function scoreCandidate(keywords, { name, context = '', text = '' }) {
  if (!keywords.length) return 0;
  const n = normalize(name);
  const c = normalize(context);
  const t = normalize(text);
  let score = 0;
  let covered = 0;
  for (const kw of keywords) {
    if (n.includes(kw)) { score += 3; covered++; continue; }
    if (c.includes(kw)) { score += 1.5; covered++; continue; }
    const hits = t ? countHits(t, kw) : 0;
    if (hits) { score += 0.5 + 0.1 * Math.min(hits, 10); covered++; }
  }
  return covered ? score + 2 * (covered / keywords.length) : 0;
}

// Si el texto no entra en el tope, se queda con los pedazos que más hablan del tema (siempre
// con el comienzo, que suele tener título e índice), en su orden original.
export function excerpt(text, keywords, cap) {
  if (text.length <= cap) return text;
  const chunks = [];
  for (let i = 0; i < text.length; i += CHUNK) chunks.push({ i, s: text.slice(i, i + CHUNK) });
  const scored = chunks.map((ch, idx) => ({ ...ch, idx, score: idx === 0 ? 1e6 : keywords.reduce((a, kw) => a + countHits(normalize(ch.s), kw), 0) }));
  const picked = [];
  let used = 0;
  for (const ch of [...scored].sort((a, b) => b.score - a.score || a.idx - b.idx)) {
    if (used + ch.s.length > cap) continue;
    picked.push(ch);
    used += ch.s.length;
  }
  picked.sort((a, b) => a.idx - b.idx);
  return picked.map((ch, k) => (k > 0 && picked[k - 1].idx !== ch.idx - 1 ? `\n[…]\n${ch.s}` : ch.s)).join('');
}

const fileIdFromUrl = (url) => String(url || '').match(/\/d\/([\w-]{10,})|[?&]id=([\w-]{10,})/)?.slice(1).find(Boolean) ?? null;

// Texto de un archivo de Drive, guardado en Redis mientras el archivo no cambie.
async function cachedFileText(tenant, fileId) {
  const cached = await kv.get(textKey(tenant, fileId));
  let info = null;
  try {
    info = await getFileInfo(fileId);
  } catch (err) {
    if (cached?.text) return cached;
    return { text: null, reason: err?.code === 404 ? 'El archivo ya no existe en Drive o Kai no tiene acceso a él.' : `No se pudo abrir en Drive (${err.message}).` };
  }
  if (cached && cached.modifiedTime === info.modifiedTime) return cached;
  let result;
  try {
    result = await readFileText(fileId, info);
  } catch (err) {
    return { text: null, reason: `No se pudo leer el archivo (${err.message}).` };
  }
  const entry = { text: result.text ? result.text.slice(0, 400000) : null, reason: result.reason ?? null, modifiedTime: info.modifiedTime, at: new Date().toISOString() };
  await kv.set(textKey(tenant, fileId), entry).catch(() => {});
  return entry;
}

// Al subir un documento se lee una vez (después de responder, con after()) para que desde el
// primer momento se pueda encontrar también por lo que dice, no solo por su nombre.
export async function warmDocumentText(tenant, fileId) {
  if (!fileId) return;
  try { await cachedFileText(tenant, fileId); } catch (err) { console.error('[kai-next documentSearch] warm:', err.message); }
}

export { fileIdFromUrl };

// Candidatos de proyectos: { key, fileId, name, url, projectName, where, context, cachedText }.
async function projectCandidates(tenant, identity) {
  const level = resolveProjectAccessLevel(identity);
  const metas = await listProjectsForPerson(tenant, { ...level, personId: identity.personId, empresaIds: identity.empresaIds });
  const out = [];
  await Promise.all(metas.map(async (meta) => {
    const supervises = supervisesProject(identity, meta);
    if (meta.projectKind === 'desarrollo') {
      const tasks = await listDevTasks(tenant, meta.id).catch(() => []);
      for (const t of tasks) {
        for (const [i, e] of (t.entregables ?? []).entries()) {
          const fileId = fileIdFromUrl(e.url);
          if (!fileId) continue;
          out.push({ key: `pdoc:${meta.id}:${t.id}:${i}`, fileId, name: e.label || 'Entregable', url: e.url, projectName: meta.name, where: `entregable de la tarea «${t.title}»`, context: `${meta.name} ${t.title}` });
        }
      }
    }
    const p = await getProject(tenant, meta.id);
    for (const d of p?.documents ?? []) {
      if (!d.driveFileId) continue;
      if (!supervises && !d.taskId) continue;
      const task = d.taskId ? p.tasks.find((t) => t.id === d.taskId) : null;
      out.push({
        key: `pdoc:${meta.id}:${d.id}`, fileId: d.driveFileId, name: d.name, url: d.driveUrl ?? `https://drive.google.com/open?id=${d.driveFileId}`,
        projectName: meta.name, where: task ? `adjunto a la tarea «${task.nombre}»` : `Documentación${d.category ? ` · ${d.category}` : ''}`,
        context: `${meta.name} ${task?.nombre ?? ''} ${d.category ?? ''}`, date: d.createdAt, uploadedBy: d.uploadedBy,
      });
    }
  }));
  // El texto ya leído alguna vez también entra al puntaje (sin volver a Drive).
  const cached = out.length ? await kv.mget(...out.map((c) => textKey(tenant, c.fileId))) : [];
  out.forEach((c, i) => { c.cachedText = cached[i]?.text ?? ''; });
  return out;
}

export async function searchDocuments(tenant, identity, topic) {
  const keywords = keywordsOf(topic);
  const [sources, projDocs] = await Promise.all([
    listSources(tenant).then((list) => list.filter((s) => s.status === 'ready' && empresaAllows(identity?.empresaIds, s))),
    projectCandidates(tenant, identity).catch((err) => { console.error('[kai-next documentSearch] proyectos:', err.message); return []; }),
  ]);
  const sourceTexts = await Promise.all(sources.map((s) => getSourceContent(tenant, s.id).then((c) => c ?? '')));

  const candidates = [
    ...sources.map((s, i) => ({ kind: 'fuente', key: s.id, name: s.name, url: s.url ?? (s.driveFileId ? `https://drive.google.com/open?id=${s.driveFileId}` : null), type: s.sourceType, date: s.processedAt, text: sourceTexts[i], context: 'Fuentes' })),
    ...projDocs.map((d) => ({ kind: 'proyecto', ...d, type: 'project_document', text: d.cachedText })),
  ].map((c) => ({ ...c, score: scoreCandidate(keywords, c) }));

  const ranked = candidates.filter((c) => c.score > 0).sort((a, b) => b.score - a.score);
  const top = ranked[0]?.score ?? 0;
  const chosen = ranked.filter((c) => c.score >= top * 0.4).slice(0, MAX_DOCUMENTS);

  const searched = { fuentes: sources.length, documentos_de_proyectos: projDocs.length };
  if (!chosen.length) {
    return { documents: [], searched, keywords, available: candidates.slice(0, 40).map((c) => (c.kind === 'proyecto' ? `${c.name} (proyecto ${c.projectName})` : `${c.name} (Fuentes)`)) };
  }

  // Leer de Drive los documentos de proyecto elegidos (con caché) y repartir el espacio parejo.
  for (const c of chosen) {
    if (c.kind !== 'proyecto') continue;
    const r = await cachedFileText(tenant, c.fileId);
    c.text = r.text ?? '';
    c.unreadable = r.text ? null : r.reason;
  }
  const readable = chosen.filter((c) => c.text);
  const cap = Math.floor(MAX_TOTAL_CHARS / Math.max(1, readable.length));
  const documents = chosen.map((c) => ({
    id: c.key,
    name: c.name,
    type: c.type,
    url: c.url,
    date: c.date ?? null,
    origen: c.kind === 'proyecto' ? `Proyecto ${c.projectName} — ${c.where}` : 'Fuentes',
    ...(c.text ? { content: excerpt(c.text, keywords, cap), recortado: c.text.length > cap } : { content: null, no_se_pudo_leer: c.unreadable }),
  }));
  return { documents, searched, keywords };
}
