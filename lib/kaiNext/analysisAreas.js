import { Redis } from '@upstash/redis';

const kv = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });

// La sección "Análisis" es un dashboard vivo por área (Resumen/Web/Comercial, o las que el
// tenant defina), no una galería de mensajes de chat — cada área guarda un único snapshot
// (el último panel que generó Kai), que se pisa en cada regeneración. Namespace propio
// (kainext:), separado de aria: y de la galería por conversación en lib/kaiNext/analyses.js.
const areasKey = (tenant) => `kainext:${tenant}:analysis:areas`;
const snapshotKey = (tenant, areaId) => `kainext:${tenant}:analysis:area:${areaId}`;

// `sources` acota qué tools de datos puede usar present_analysis para esa área (ver
// TOOLS_BY_SOURCE en lib/kaiNext/agentShared.js) — sin esto, Kai generaba lo mismo para
// cualquier área (siempre caía en GA4 por default) y tardaba de más explorando fuentes que no
// aplicaban. "resumen" sí mira todo a propósito; las demás quedan acotadas.
// `kpis` fija qué KPIs exactos se muestran y en qué orden (ver generate/route.js, que le pide a
// Kai calcular EXACTAMENTE esta lista — no elegir libremente) — sin esto, cada regeneración
// mostraba una cantidad y selección distinta de KPIs, lo que hacía la página sentirse
// impredecible. Vacío = todavía sin configurar, el área sigue con KPIs elegidos por Kai (ver
// updateAreaKpis en la página de Análisis para configurarlos).
const DEFAULT_AREAS = [
  { id: 'resumen', label: 'Resumen', sources: ['ga4', 'search_console', 'google_ads', 'database'], kpis: [] },
  { id: 'web', label: 'Web', sources: ['ga4', 'search_console'], kpis: [] },
  { id: 'comercial', label: 'Comercial', sources: ['google_ads', 'database'], kpis: [] },
];

// Heurística solo para el default de un área nueva — el usuario siempre puede corregirlo
// después desde el selector de fuentes en la página (updateAreaSources).
function guessSources(label) {
  const l = label.toLowerCase();
  const sources = new Set();
  if (/web|sitio|tr[aá]fico|seo|organic/.test(l)) { sources.add('ga4'); sources.add('search_console'); }
  if (/comerc|venta|ads|campa|marketing|publicidad/.test(l)) sources.add('google_ads');
  if (/producci[oó]n|laborator|transporte|operac|log[ií]stic|planta/.test(l)) sources.add('database');
  return [...sources];
}

function slugify(label) {
  return label
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function listAreas(tenant) {
  const areas = await kv.get(areasKey(tenant));
  if (!Array.isArray(areas) || !areas.length) {
    await kv.set(areasKey(tenant), DEFAULT_AREAS);
    return DEFAULT_AREAS;
  }

  // Migración liviana: áreas creadas antes de que existiera `sources`/`kpis` (ver changelog de
  // este archivo) no tienen esos campos — sin esto, cualquier tenant que ya tuviera áreas se
  // quedaría con el tools[] vacío para todas (el mensaje de "no hay fuente conectada" en todas
  // partes), o sin forma de configurar KPIs fijos.
  let migrated = false;
  const next = areas.map((a) => {
    if (Array.isArray(a.sources) && Array.isArray(a.kpis)) return a;
    migrated = true;
    const preset = DEFAULT_AREAS.find((d) => d.id === a.id);
    return {
      ...a,
      sources: Array.isArray(a.sources) ? a.sources : (preset?.sources ?? guessSources(a.label)),
      kpis: Array.isArray(a.kpis) ? a.kpis : [],
    };
  });
  if (migrated) await kv.set(areasKey(tenant), next);
  return next;
}

export async function addArea(tenant, label, sources) {
  const areas = await listAreas(tenant);
  const id = slugify(label) || `area-${Date.now()}`;
  if (areas.some((a) => a.id === id)) return areas;
  const next = [...areas, { id, label: label.trim(), sources: Array.isArray(sources) ? sources : guessSources(label), kpis: [] }];
  await kv.set(areasKey(tenant), next);
  return next;
}

export async function updateAreaSources(tenant, areaId, sources) {
  const areas = await listAreas(tenant);
  const next = areas.map((a) => (a.id === areaId ? { ...a, sources: Array.isArray(sources) ? sources : [] } : a));
  await kv.set(areasKey(tenant), next);
  return next;
}

// `kpis`: array de {id, label} en el orden exacto en que deben mostrarse — ver el uso en
// generate/route.js (instrucción + normalización post-generación).
export async function updateAreaKpis(tenant, areaId, kpis) {
  const areas = await listAreas(tenant);
  const clean = Array.isArray(kpis)
    ? kpis.filter((k) => k?.label?.trim()).map((k) => ({ id: k.id || slugify(k.label) || `kpi-${Date.now()}`, label: k.label.trim() }))
    : [];
  const next = areas.map((a) => (a.id === areaId ? { ...a, kpis: clean } : a));
  await kv.set(areasKey(tenant), next);
  return next;
}

export async function removeArea(tenant, areaId) {
  const areas = await listAreas(tenant);
  const next = areas.filter((a) => a.id !== areaId);
  await Promise.all([kv.set(areasKey(tenant), next), kv.del(snapshotKey(tenant, areaId))]);
  return next;
}

export async function getAreaSnapshot(tenant, areaId) {
  return kv.get(snapshotKey(tenant, areaId));
}

export async function saveAreaSnapshot(tenant, areaId, { presentation, period, compare, generatedAt }) {
  const snapshot = { presentation, period, compare: !!compare, generatedAt };
  await kv.set(snapshotKey(tenant, areaId), snapshot);
  return snapshot;
}
