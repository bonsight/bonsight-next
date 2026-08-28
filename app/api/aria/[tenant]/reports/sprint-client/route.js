import { isAuthorizedForTenant } from '@/lib/aria/auth';
import { getIntelligenceSources } from '@/lib/kai/intelligenceSources';
import { listSprints, getTasksForSprints, listClientesConProyectos } from '@/lib/aria/board';
import { generateSprintClientReportDraft } from '@/lib/aria/generators/sprintClientReport';

async function getNotionToken(tenant) {
  const sources = await getIntelligenceSources(tenant);
  const notionSource = sources.find((s) => s.id === 'notion');
  if (!notionSource || notionSource.status !== 'active' || !notionSource.config?.integrationToken) return null;
  return notionSource.config.integrationToken;
}

function formatPeriodLabel(sprints) {
  const starts = sprints.map((s) => s.startDate).filter(Boolean).sort();
  const ends = sprints.map((s) => s.endDate).filter(Boolean).sort();
  if (!starts.length || !ends.length) return sprints.map((s) => s.title).join(' · ');
  const fmt = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${fmt(starts[0])} – ${fmt(ends[ends.length - 1])}`;
}

// Picker: sprints cerrados (más reciente primero) + clientes con proyectos, para armar la
// pantalla de selección antes de generar el reporte.
export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const token = await getNotionToken(tenant);
  if (!token) return Response.json({ error: 'Notion no está configurado para este tenant.' }, { status: 400 });

  try {
    const [sprints, clientes] = await Promise.all([listSprints(token), listClientesConProyectos(token)]);
    const closedSprints = sprints.filter((s) => s.status === 'Cerrado');
    return Response.json({ sprints: closedSprints, clientes });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo cargar el selector.' }, { status: 400 });
  }
}

// Genera el borrador narrativo (JSON editable) para un cliente sobre un set de sprints
// elegidos a mano — no se persiste server-side, la edición pasa toda en el cliente hasta
// que se pide el PDF final (ver /pdf).
export async function POST(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const token = await getNotionToken(tenant);
  if (!token) return Response.json({ error: 'Notion no está configurado para este tenant.' }, { status: 400 });

  const { sprintIds, clienteName } = await req.json();
  if (!Array.isArray(sprintIds) || !sprintIds.length) {
    return Response.json({ error: 'Elegí al menos un sprint.' }, { status: 400 });
  }
  if (!clienteName?.trim()) {
    return Response.json({ error: 'Elegí un cliente.' }, { status: 400 });
  }

  try {
    const allSprints = await listSprints(token);
    const sprints = allSprints.filter((s) => sprintIds.includes(s.id));
    if (!sprints.length) throw new Error('Esos sprints ya no existen.');

    const allTasks = await getTasksForSprints(token, sprintIds);
    const tasks = allTasks.filter((t) => t.clienteName === clienteName);
    if (!tasks.length) throw new Error(`No hay tareas de ${clienteName} en los sprints elegidos.`);

    const periodLabel = formatPeriodLabel(sprints);
    const sprintTitles = sprints.map((s) => s.title);
    const draft = await generateSprintClientReportDraft({ clienteName, periodLabel, sprintTitles, tasks });

    const metrics = {
      total: tasks.length,
      completadas: tasks.filter((t) => t.status === 'Done').length,
      sprints: sprints.length,
    };

    return Response.json({ ok: true, draft, clienteName, periodLabel, sprintTitles, metrics });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo generar el reporte.' }, { status: 400 });
  }
}
