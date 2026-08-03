import { isAuthorizedForTenant } from '@/lib/aria/auth';
import { getIntelligenceSources } from '@/lib/kai/intelligenceSources';
import { generateSprintDraft } from '@/lib/aria/sprintDraft';
import { getBoardData } from '@/lib/aria/board';

export const maxDuration = 120;

async function getNotionToken(tenant) {
  const sources = await getIntelligenceSources(tenant);
  const notionSource = sources.find((s) => s.id === 'notion');
  if (!notionSource || notionSource.status !== 'active' || !notionSource.config?.integrationToken) return null;
  return notionSource.config.integrationToken;
}

export async function POST(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const token = await getNotionToken(tenant);
  if (!token) {
    return Response.json({ error: 'Notion no está configurado para este tenant.' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));

  try {
    const [draft, board] = await Promise.all([
      generateSprintDraft(tenant, token, id, body?.groupIds),
      getBoardData(token, {}),
    ]);
    const currentSprint = (board.sprints ?? []).find((s) => s.status === 'En curso') ?? null;
    return Response.json({ ...draft, currentSprint });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo generar el borrador.' }, { status: 400 });
  }
}
