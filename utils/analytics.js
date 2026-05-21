/**
 * Normalizes a string for dataLayer: lowercase, no accents, no special chars, spaces → underscores.
 * "Ver servicios →"      → "ver_servicios"
 * "Estrategia de datos"  → "estrategia_de_datos"
 * "Agendar conversación" → "agendar_conversacion"
 */
export function normalize(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/\p{M}/gu, '')           // drop all combining diacritical marks
    .replace(/[^a-zA-Z0-9\s_-]/g, '') // drop arrows, symbols, punctuation
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');            // spaces → underscores
}
