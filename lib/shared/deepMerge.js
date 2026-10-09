// Merge recursivo genérico — objetos se combinan en profundidad, arrays/primitivos se
// reemplazan enteros. Copia standalone del patrón que ya usa lib/kai/tenants.js (no se
// importa de ahí para no tocar ese archivo); cero lógica específica de producto.
export function deepMerge(target, source) {
  const out = { ...target };
  for (const k of Object.keys(source ?? {})) {
    if (
      source[k] !== null && typeof source[k] === 'object' && !Array.isArray(source[k]) &&
      typeof target?.[k] === 'object' && target[k] !== null && !Array.isArray(target[k])
    ) {
      out[k] = deepMerge(target[k], source[k]);
    } else {
      out[k] = source[k];
    }
  }
  return out;
}
