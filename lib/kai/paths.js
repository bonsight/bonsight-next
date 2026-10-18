// Kai legacy se movió de la raíz de kai.bonsight.co a /legacy cuando Kai Next pasó a ser el
// default (ver proxy.js). En dev sigue accediéndose directo por carpeta (/kai/{tenant}, sin
// pasar por el proxy), igual que kaiNextBasePath hace para Kai Next.
export function kaiBasePath(host) {
  return host?.startsWith('kai.') ? '/legacy' : '/kai';
}
