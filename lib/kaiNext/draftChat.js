// Módulo puro (sin Redis) — seguro de importar desde componentes cliente. Construye el link que
// abre el chat de Kai Next con un primer mensaje pre-armado, enviado solo (ver
// KaiNextClientChat.jsx, ?draft=...). `ref` (opcional) = { type: 'learning'|'eje', refId, label }
// — viaja hasta el system prompt para que Kai pueda llamar mark_resolved si corresponde.
export function draftChatUrl(basePath, tenant, prompt, ref) {
  const url = `${basePath}/${tenant}?draft=${encodeURIComponent(prompt)}`;
  return ref ? `${url}&ref=${encodeURIComponent(JSON.stringify(ref))}` : url;
}
