import Anthropic from '@anthropic-ai/sdk';
import { QUERY_GA4_TOOL, executeGa4Tool } from './tools/ga4';
import { QUERY_SEARCH_CONSOLE_TOOL, executeSearchConsoleTool } from './tools/searchConsole';
import { QUERY_GOOGLE_ADS_TOOL, executeGoogleAdsTool } from './tools/googleAds';
import { QUERY_DATABASE_TOOL, executeDatabaseTool } from './tools/database';
import { REMEMBER_TOOL, executeRememberTool } from './tools/remember';
import { QUERY_KNOWLEDGE_TOOL, executeKnowledgeTool } from './tools/knowledge';
import { SEARCH_ARCHIVE_TOOL, executeSearchArchiveTool } from './tools/archive';
import { MARK_RESOLVED_TOOL, executeMarkResolvedTool } from './tools/resolve';
import { PRESENT_ANALYSIS_TOOL, executePresentAnalysisTool } from './tools/presentAnalysis';
import {
  GENERATE_PDF_REPORT_TOOL, GENERATE_EXCEL_REPORT_TOOL,
  executeGeneratePdfReportTool, executeGenerateExcelReportTool,
} from './tools/generateDocument';
import { QUERY_PROJECTS_TOOL, executeQueryProjectsTool } from './tools/projects';
import { QUERY_ACTIVITIES_TOOL, executeQueryActivitiesTool } from './tools/activities';
import { SOURCE_CATALOG } from './sourceCatalog';

// Extraído de app/api/kai-next/[tenant]/route.js para que la generación de análisis por área
// (app/api/kai-next/[tenant]/analysis/[areaId]/generate/route.js) pueda correr el mismo agentic
// loop con las mismas tools, sin duplicar la lista ni arriesgar que las dos copias diverjan.
export const MODEL = 'claude-sonnet-4-6';
export const TOOLS = [QUERY_GA4_TOOL, QUERY_SEARCH_CONSOLE_TOOL, QUERY_GOOGLE_ADS_TOOL, QUERY_DATABASE_TOOL, QUERY_KNOWLEDGE_TOOL, SEARCH_ARCHIVE_TOOL, REMEMBER_TOOL, MARK_RESOLVED_TOOL, QUERY_PROJECTS_TOOL, QUERY_ACTIVITIES_TOOL, PRESENT_ANALYSIS_TOOL, GENERATE_PDF_REPORT_TOOL, GENERATE_EXCEL_REPORT_TOOL];
export const DATA_TOOLS = new Set(['query_ga4', 'query_search_console', 'query_google_ads', 'query_database']);

// Catálogo de fuentes "de datos" seleccionables por área en Análisis — separado de TOOLS (el
// chat libre sigue con acceso a todas). Generar un área con las 4 fuentes de datos + archive +
// remember + mark_resolved habilitadas es lo que hacía que tardara mucho Y que dos áreas
// distintas terminaran mirando lo mismo (Kai siempre caía en GA4 por default). Acá cada área
// declara qué fuentes le aplican (ver lib/kaiNext/analysisAreas.js) y el generate route arma un
// tools[] recortado solo con esas — no es una sugerencia en el prompt, es una restricción real.
export const TOOLS_BY_SOURCE = {
  ga4: QUERY_GA4_TOOL,
  search_console: QUERY_SEARCH_CONSOLE_TOOL,
  google_ads: QUERY_GOOGLE_ADS_TOOL,
  database: QUERY_DATABASE_TOOL,
};

export { SOURCE_CATALOG };

export const TOOL_LABELS = {
  query_ga4: 'Consultando Google Analytics 4',
  query_search_console: 'Consultando Search Console',
  query_google_ads: 'Consultando Google Ads',
  query_database: 'Consultando base de datos',
  query_knowledge: 'Consultando conocimiento de la organización',
  search_archive: 'Buscando en análisis archivados',
  remember: 'Guardando en memoria',
  mark_resolved: 'Actualizando estado',
  query_projects: 'Consultando Proyectos',
  query_activities: 'Consultando Activities',
  present_analysis: 'Preparando análisis',
  generate_pdf_report: 'Generando PDF',
  generate_excel_report: 'Generando Excel',
};

export { QUERY_KNOWLEDGE_TOOL, PRESENT_ANALYSIS_TOOL };

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function executeTool(name, input, ctx) {
  if (name === 'query_ga4') return executeGa4Tool(input, ctx);
  if (name === 'query_search_console') return executeSearchConsoleTool(input, ctx);
  if (name === 'query_google_ads') return executeGoogleAdsTool(input, ctx);
  if (name === 'query_database') return executeDatabaseTool(input, ctx);
  if (name === 'query_knowledge') return executeKnowledgeTool(input, ctx);
  if (name === 'search_archive') return executeSearchArchiveTool(input, ctx);
  if (name === 'remember') return executeRememberTool(input, ctx);
  if (name === 'mark_resolved') return executeMarkResolvedTool(input, ctx);
  if (name === 'present_analysis') return executePresentAnalysisTool(input, ctx);
  if (name === 'generate_pdf_report') return executeGeneratePdfReportTool(input, ctx);
  if (name === 'generate_excel_report') return executeGenerateExcelReportTool(input, ctx);
  if (name === 'query_projects') return executeQueryProjectsTool(input, ctx);
  if (name === 'query_activities') return executeQueryActivitiesTool(input, ctx);
  return { error: `Herramienta desconocida: ${name}` };
}
