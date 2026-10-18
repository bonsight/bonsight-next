// Links entre bonsight.co (marketing) y kai.bonsight.co (Kai Next) — en prod son dos
// subdominios reales (orígenes distintos); en local dev comparten el mismo origin
// (localhost:3000) y se diferencian por carpeta (/kai-next) en vez de host. Sin esto, cualquier
// link hardcodeado a un dominio de prod te saca de localhost apenas lo cliqueás ahí — estas
// funciones arman la URL correcta mirando el host actual de la request, para poder navegar de
// punta a punta tanto en local como en prod.

function isLocalHost(host) {
  return !!host && (host.includes('localhost') || host.includes('127.0.0.1'));
}

// Desde cualquier página (de bonsight.co o de Kai Next), arma un link al sitio principal.
// `path` incluye la barra inicial, ej. '/es' o '/es/services/cro'.
export function mainSiteUrl(host, path = '') {
  if (isLocalHost(host)) {
    const bareHost = host.startsWith('kai.') ? host.slice('kai.'.length) : host;
    return `http://${bareHost}${path}`;
  }
  return `https://bonsight.co${path}`;
}

// Desde cualquier página, arma un link a Kai Next. `path` es relativo a la raíz PÚBLICA de Kai
// Next (ej. '' para la landing, '/entrar' para el login genérico) — no al basePath interno
// (eso ya lo resuelve kaiNextBasePath para links dentro de la propia app).
export function kaiNextUrl(host, path = '') {
  if (isLocalHost(host)) {
    return `http://${host}/kai-next${path || '/landing'}`;
  }
  return `https://kai.bonsight.co${path}`;
}
