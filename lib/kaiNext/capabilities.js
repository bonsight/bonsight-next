// Rollout por tiers para Kai Next — dos niveles, no uno:
// 1. Secciones (las páginas del nav: Chat/Empresa/Fuentes/Análisis) — deciden qué puede VER la
//    persona.
// 2. Capacidades, anidadas dentro de su sección — deciden qué puede HACER una vez adentro (ej.
//    "Fuentes" habilitada pero sin Google Ads conectable).
// Una capacidad queda apagada si su sección está apagada, aunque la capacidad en sí esté
// marcada — no tiene sentido ofrecer GA4 en el chat si la persona ni puede ver Fuentes para
// conectarlo. Es por PERSONA, no por tenant: vive en access.kaiNextSections/
// access.kaiNextCapabilities de cada tenant-user (ver lib/kai/tenantUsers.js), editado desde su
// fila en Equipo — el equipo de Bonsight (team user) nunca queda restringido por esto. Vacío/
// ausente en cualquiera de los dos = sin restricción (todo permitido), mismo criterio que
// allowedProjectKinds de Labs, para que una persona recién creada no pierda nada por default
// mientras nadie haya tocado este toggle.
export const KAI_NEXT_SECTIONS = [
  {
    id: 'chat',
    label: 'Chat',
    description: 'Conversar con Kai.',
    capabilities: [
      { id: 'pdf_export', label: 'Exportar PDF' },
      { id: 'excel_export', label: 'Exportar Excel' },
    ],
  },
  {
    id: 'empresa',
    label: 'Empresa',
    description: 'Perfil de negocio, diagnóstico y prioridades.',
    capabilities: [],
  },
  {
    id: 'fuentes',
    label: 'Fuentes',
    description: 'Conectar datos y conocimiento de la organización.',
    capabilities: [
      { id: 'ga4', label: 'Google Analytics 4' },
      { id: 'search_console', label: 'Search Console' },
      { id: 'google_ads', label: 'Google Ads' },
      { id: 'database', label: 'Bases de datos propias' },
      { id: 'knowledge_drive', label: 'Conocimiento desde Google Drive' },
    ],
  },
  {
    id: 'analisis',
    label: 'Análisis',
    description: 'Dashboard por área con KPIs, gráficos y tablas.',
    capabilities: [],
  },
  {
    id: 'sprints',
    label: 'Sprints',
    description: 'Tablero de tareas por sprint (Notion).',
    capabilities: [],
  },
  {
    id: 'activities',
    label: 'Activities',
    description: 'Actividades hechas con el equipo y sus resultados.',
    capabilities: [],
  },
  {
    id: 'proyectos',
    label: 'Proyectos',
    description: 'Proyectos de innovación, obra civil y seguimiento — tareas, presupuesto y pruebas.',
    capabilities: [
      { id: 'proyectos_supervisor', label: 'Supervisar proyectos asignados (crear pruebas, presupuesto, documentación, generar borrador de reporte)' },
      { id: 'proyectos_director', label: 'Administrar todos los proyectos (reasignar equipo, editar detalles, aprobar reportes)' },
    ],
  },
];

function sectionOf(capId) {
  return KAI_NEXT_SECTIONS.find((s) => s.capabilities.some((c) => c.id === capId));
}

// Para server components que ya resolvieron teamUser/tenantUser (evita una vuelta extra a
// Redis que haría getCurrentKaiNextAccess — ver lib/kaiNext/auth.js, usado en las API routes
// donde la identidad todavía no está resuelta).
export function accessFromUsers(teamUser, tenantUser) {
  if (teamUser) return { sections: [], capabilities: [] };
  return {
    sections: tenantUser?.access?.kaiNextSections ?? [],
    capabilities: tenantUser?.access?.kaiNextCapabilities ?? [],
  };
}

export function isSectionAllowed(access, sectionId) {
  const sections = access?.sections;
  if (!Array.isArray(sections) || sections.length === 0) return true;
  return sections.includes(sectionId);
}

export function isCapabilityAllowed(access, capId) {
  const section = sectionOf(capId);
  if (section && !isSectionAllowed(access, section.id)) return false;
  const caps = access?.capabilities;
  if (!Array.isArray(caps) || caps.length === 0) return true;
  return caps.includes(capId);
}

// Qué capacidad gatea cada tool — las que no aparecen acá (query_knowledge, search_archive,
// remember, mark_resolved, present_analysis) son núcleo de Kai Next y nunca se apagan por tier.
const TOOL_CAPABILITY = {
  query_ga4: 'ga4',
  query_search_console: 'search_console',
  query_google_ads: 'google_ads',
  query_database: 'database',
  generate_pdf_report: 'pdf_export',
  generate_excel_report: 'excel_export',
};

// Tools que gatean directo por SECCIÓN (no tienen una capacidad anidada propia, a diferencia de
// las de arriba) — si la sección está apagada para esta persona, la tool ni se ofrece.
const TOOL_SECTION = {
  query_projects: 'proyectos',
  query_activities: 'activities',
};

// Filtra un tools[] (array de tool defs con `.name`) dejando solo las permitidas para el tenant.
export function filterToolsByCapabilities(tools, access) {
  return tools.filter((t) => {
    const section = TOOL_SECTION[t.name];
    if (section && !isSectionAllowed(access, section)) return false;
    const cap = TOOL_CAPABILITY[t.name];
    return !cap || isCapabilityAllowed(access, cap);
  });
}
