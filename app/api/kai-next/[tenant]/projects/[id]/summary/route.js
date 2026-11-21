import { projectContext } from '@/lib/kaiNext/projectAccess';
import { getProject, getCachedSummary, saveCachedSummary } from '@/lib/kaiNext/projects';
import { generateDirectorBrief, generateSupervisorSummary } from '@/lib/kaiNext/projectAI';

export const maxDuration = 60;

// Tarjeta de análisis de Kai en el Resumen (solo experimentales): el Director ve titular + 5
// dimensiones; el Supervisor, qué cambió + prioridades. Se guarda y se regenera a pedido.
function roleOf(ctx) {
  return ctx.isDirector ? 'director' : ctx.supervises ? 'supervisor' : null;
}

export async function GET(req, { params }) {
  const { tenant, id } = await params;
  const ctx = await projectContext(tenant, id);
  if (ctx.error) return ctx.error;
  const role = roleOf(ctx);
  if (!role) return Response.json({ summary: null, role: null });
  return Response.json({ summary: await getCachedSummary(tenant, id, role), role });
}

export async function POST(req, { params }) {
  const { tenant, id } = await params;
  const ctx = await projectContext(tenant, id);
  if (ctx.error) return ctx.error;
  const role = roleOf(ctx);
  if (!role) return Response.json({ error: 'No autorizado.' }, { status: 403 });
  if (ctx.meta.projectKind !== 'experimental') return Response.json({ error: 'El análisis de Kai es para proyectos experimentales.' }, { status: 400 });
  try {
    const project = await getProject(tenant, id);
    const data = role === 'director' ? await generateDirectorBrief(tenant, project) : await generateSupervisorSummary(tenant, project);
    return Response.json({ summary: await saveCachedSummary(tenant, id, role, data), role });
  } catch (err) {
    console.error(`[kai-next/summary:${tenant}/${id}]`, err.message);
    return Response.json({ error: 'No se pudo generar el análisis. Intenta de nuevo en unos segundos.' }, { status: 500 });
  }
}
