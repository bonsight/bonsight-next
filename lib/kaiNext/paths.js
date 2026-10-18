// Kai Next es el default de kai.bonsight.co/{tenant} (proxy.js reescribe la raíz a
// /kai-next/{tenant} internamente) — sin prefijo público en prod. Probado sin subdominio (el
// atajo localhost:3000/kai-next/{tenant}, útil para no tener que armar el subdominio en dev)
// cae en la lógica de idioma del sitio principal y tira 404, porque "next" no está excluido de
// esa lógica como si lo está "kai" — por eso en dev sigue haciendo falta el prefijo /kai-next.
// Esta función hace que cualquier link/redirect interno elija la ruta correcta según cómo se
// llegó, en vez de asumir siempre el subdominio.
export function kaiNextBasePath(host) {
  return host?.startsWith('kai.') ? '' : '/kai-next';
}
