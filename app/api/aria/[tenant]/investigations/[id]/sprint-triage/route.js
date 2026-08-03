import { isAuthorizedForTenant } from '@/lib/aria/auth';
import { generateSprintTriage } from '@/lib/aria/sprintDraft';

export const maxDuration = 60;

export async function POST(req, { params }) {
  const { tenant, id } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  try {
    const triage = await generateSprintTriage(tenant, id);
    return Response.json(triage);
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo generar el triage.' }, { status: 400 });
  }
}
