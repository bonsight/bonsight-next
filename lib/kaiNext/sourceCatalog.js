// Módulo puro (sin Redis, sin SDKs) — seguro de importar tanto desde server (agentShared.js,
// analysisAreas.js) como desde componentes cliente (el selector de fuentes por área en
// KaiNextAnalisis.jsx). No vive en agentShared.js porque ese módulo arrastra @anthropic-ai/sdk
// y las tools, que no deben terminar en el bundle del cliente.
export const SOURCE_CATALOG = [
  { id: 'ga4', label: 'Google Analytics 4' },
  { id: 'search_console', label: 'Search Console' },
  { id: 'google_ads', label: 'Google Ads' },
  { id: 'database', label: 'Bases de datos' },
];
