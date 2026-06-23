import { Redis } from '@upstash/redis';

const kv = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
const KEY = (tenant) => `kai:${tenant}:intelligence_sources`;

export const SOURCE_DEFINITIONS = [
  // ── Nivel 2: Siempre disponibles ─────────────────────────────────────────
  {
    id: 'business_profile',
    label: 'Business Profile',
    description: 'Conocimiento validado por Kai: objetivos, procesos, stakeholders, riesgos, oportunidades.',
    category: 'always',
    evidenceLevel: 2,
    capabilities: ['Objetivos estratégicos', 'Procesos críticos', 'Riesgos activos', 'Oportunidades', 'KPIs', 'Iniciativas'],
    alwaysActive: true,
  },
  {
    id: 'kai_conversations',
    label: 'Conversaciones Kai',
    description: 'Historial completo de discovery sessions con Kai y aprendizajes generados.',
    category: 'always',
    evidenceLevel: 2,
    capabilities: ['Historial de sesiones', 'Aprendizajes detectados', 'Contexto cualitativo'],
    alwaysActive: true,
  },
  {
    id: 'aria_history',
    label: 'Historial Aria',
    description: 'Investigaciones anteriores, decisiones confirmadas y recomendaciones emitidas.',
    category: 'always',
    evidenceLevel: 3,
    capabilities: ['Recomendaciones anteriores', 'Decisiones confirmadas', 'Preguntas abiertas', 'Seguimiento de implementaciones'],
    alwaysActive: true,
  },

  // ── Nivel 1: Conectores configurables ─────────────────────────────────────
  {
    id: 'ga4',
    label: 'Google Analytics 4',
    description: 'Datos de tráfico web, conversiones y comportamiento de usuarios en tiempo real.',
    category: 'configurable',
    evidenceLevel: 1,
    capabilities: [
      'Sesiones y usuarios activos',
      'Conversiones y eventos',
      'Tráfico por canal, país y dispositivo',
      'Performance de landing pages',
      'Análisis de funnels',
      'Series temporales y comparación de períodos',
    ],
    fields: [
      { key: 'propertyId', label: 'Property ID', placeholder: 'Ej: 123456789', type: 'text' },
    ],
    comingSoon: false,
  },
  {
    id: 'search_console',
    label: 'Google Search Console',
    description: 'Datos de búsqueda orgánica: queries, impresiones, CTR y posición promedio.',
    category: 'configurable',
    evidenceLevel: 1,
    capabilities: ['Queries de búsqueda', 'Impresiones y CTR', 'Posición promedio', 'Landing pages SEO', 'Tendencias de búsqueda'],
    fields: [
      { key: 'siteUrl', label: 'Site URL', placeholder: 'Ej: sc-domain:bonsight.co o https://bonsight.co/', type: 'text' },
    ],
    comingSoon: false,
  },
  {
    id: 'google_ads',
    label: 'Google Ads',
    description: 'Datos de campañas, keywords, costos, clics, conversiones y rendimiento publicitario.',
    category: 'configurable',
    evidenceLevel: 1,
    capabilities: ['Campañas', 'Keywords', 'Search Terms', 'Conversiones', 'Costos', 'CTR', 'Dispositivos', 'Geografía', 'Audiencias', 'Tendencias'],
    fields: [
      { key: 'customerId', label: 'Customer ID', placeholder: 'Ej: 123-456-7890', type: 'text' },
    ],
    comingSoon: false,
  },
  {
    id: 'bigquery',
    label: 'BigQuery',
    description: 'Consultas SQL sobre datos operacionales y analíticos a escala empresarial.',
    category: 'configurable',
    evidenceLevel: 1,
    capabilities: ['Datos operacionales', 'Consultas personalizadas', 'Histórico completo', 'Análisis a escala'],
    comingSoon: true,
  },
  {
    id: 'hubspot',
    label: 'HubSpot CRM',
    description: 'Pipeline comercial, contactos, deals y actividad de ventas.',
    category: 'configurable',
    evidenceLevel: 1,
    capabilities: ['Pipeline de ventas', 'Estado de deals', 'Contactos y empresas', 'Actividad comercial'],
    comingSoon: true,
  },
  {
    id: 'notion',
    label: 'Notion',
    description: 'Documentos internos, wikis y bases de conocimiento de la empresa.',
    category: 'configurable',
    evidenceLevel: 2,
    capabilities: ['Documentos internos', 'Wikis y manuales', 'Bases de conocimiento'],
    comingSoon: true,
  },
  {
    id: 'erp',
    label: 'ERP',
    description: 'Datos financieros, inventario y operaciones centrales del negocio.',
    category: 'configurable',
    evidenceLevel: 1,
    capabilities: ['Finanzas y contabilidad', 'Inventario', 'Operaciones', 'Órdenes y proveedores'],
    comingSoon: true,
  },
  {
    id: 'documents',
    label: 'Documentos',
    description: 'Archivos subidos: reportes, presentaciones, contratos, datos internos.',
    category: 'configurable',
    evidenceLevel: 2,
    capabilities: ['Reportes', 'Presentaciones', 'Contratos', 'Archivos internos'],
    comingSoon: true,
  },
];

export async function getIntelligenceSources(tenant) {
  const stored = (await kv.get(KEY(tenant))) ?? {};

  return SOURCE_DEFINITIONS.map((def) => {
    if (def.alwaysActive) {
      return { ...def, status: 'active', config: {} };
    }
    if (def.comingSoon) {
      return { ...def, status: 'soon', config: {} };
    }
    const saved = stored[def.id];
    if (!saved) {
      return { ...def, status: 'inactive', config: {} };
    }
    return {
      ...def,
      status: saved.enabled ? 'active' : 'inactive',
      config: saved.config ?? {},
      lastSync: saved.lastSync ?? null,
    };
  });
}

export async function updateIntelligenceSource(tenant, sourceId, { enabled, config }) {
  const stored = (await kv.get(KEY(tenant))) ?? {};
  stored[sourceId] = {
    ...stored[sourceId],
    enabled: !!enabled,
    config: config ?? stored[sourceId]?.config ?? {},
    updatedAt: new Date().toISOString(),
  };
  await kv.set(KEY(tenant), stored);
}

// Builds the FUENTES DE INTELIGENCIA section for Aria's system prompt
export function buildSourcesContext(sources) {
  const active = sources.filter((s) => s.status === 'active');
  const inactive = sources.filter((s) => s.status === 'inactive' && !s.alwaysActive);

  const level1 = active.filter((s) => s.evidenceLevel === 1);
  const level2Always = active.filter((s) => s.evidenceLevel === 2 && s.alwaysActive);
  const level3 = active.filter((s) => s.evidenceLevel === 3);

  const lines = [];

  lines.push('FUENTES DE INTELIGENCIA ACTIVAS:\n');

  if (level1.length) {
    lines.push('Nivel 1 — Conectores de datos (mayor peso, evidencia directa):');
    for (const s of level1) {
      lines.push(`  ✅ ${s.label} — ${s.capabilities.slice(0, 3).join(', ')}`);
    }
    lines.push('');
  } else {
    lines.push('Nivel 1 — Conectores de datos: ninguno configurado.');
    lines.push('');
  }

  if (level2Always.length) {
    lines.push('Nivel 2 — Conocimiento validado por Kai:');
    for (const s of level2Always) {
      lines.push(`  ✅ ${s.label} — ${s.capabilities.slice(0, 3).join(', ')}`);
    }
    lines.push('');
  }

  if (level3.length) {
    lines.push('Nivel 3 — Historial de decisiones:');
    for (const s of level3) {
      lines.push(`  ✅ ${s.label} — ${s.capabilities.slice(0, 2).join(', ')}`);
    }
    lines.push('');
  }

  if (inactive.length) {
    lines.push(`Fuentes no configuradas (no disponibles para este análisis): ${inactive.map((s) => s.label).join(', ')}.`);
    lines.push('');
  }

  return lines.join('\n');
}
