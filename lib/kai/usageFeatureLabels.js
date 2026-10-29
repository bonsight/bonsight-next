// Separado de lib/kai/usage.js a propósito: ese archivo instancia un cliente de Redis a nivel de
// módulo (env vars de servidor), así que no se puede importar desde un componente de cliente
// como CostsTab (TenantDetail.jsx) sin arrastrar eso al bundle del browser. Esto es solo datos.
export const FEATURE_LABELS = {
  chat:              'Discovery Chat',
  executive_summary: 'Executive Summary',
  diagnosis:         'Diagnóstico',
  summary:           'Resumen',
  insights:          'Insights',
  transversals:      'Patrones Transversales',
  supervisor_summary:             'Resumen Supervisor',
  director_brief:                 'Brief Director',
  contribution_interpret:         'Interpretar Aporte',
  report_draft:                   'Borrador de Reporte',
  civil_report_draft:             'Borrador de Reporte (Civil/Seguimiento)',
  feedback_conversion_suggestion: 'Sugerencia de Conversión',
  activity_chat:                  'Chat de Activities',
  analysis_area:                  'Análisis por área',
  memory_capture:                 'Captura de memoria',
  profile_autofill:               'Autocompletar perfil',
  project_contribution_interpret: 'Interpretar aporte (Proyecto)',
  project_epica_ask:              'Pregunta sobre épica',
  project_import_extract:         'Importar proyecto',
  project_suggest_fechas:         'Sugerir fechas (Proyecto)',
};
