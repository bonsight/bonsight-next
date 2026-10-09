// La URL pública de Kai Next es kai.bonsight.co/next/{tenant} (proxy.js la reescribe a
// /kai-next/{tenant} internamente) — pero esa ruta /next/* SOLO resuelve bien bajo el
// subdominio kai.; probada sin subdominio (el atajo localhost:3000/kai-next/{tenant}, útil
// para no tener que armar el subdominio en dev) cae en la lógica de idioma del sitio
// principal y tira 404, porque "next" no está excluido de esa lógica como si lo está "kai".
// Esta función hace que cualquier link/redirect interno elija la ruta correcta según cómo se
// llegó, en vez de asumir siempre el subdominio.
export function kaiNextBasePath(host) {
  return host?.startsWith('kai.') ? '/next' : '/kai-next';
}
