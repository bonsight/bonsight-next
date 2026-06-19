import { isKaiAuthorized } from '@/lib/kai/auth';
import { getCachedParticipantInsights, regenerateAllArtifacts } from '@/lib/kai/artifacts';

export async function GET(req, { params }) {
  if (!(await isKaiAuthorized())) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { tenant } = await params;

  const cached = await getCachedParticipantInsights(tenant);
  if (cached) return Response.json(cached);

  // Cold start: no cache yet — generate on-demand
  const { participants, ...rest } = await regenerateAllArtifacts(tenant);
  return Response.json({ participants, ...rest });
}

// Force cache invalidation + regeneration (called by the refresh button)
export async function POST(req, { params }) {
  if (!(await isKaiAuthorized())) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { tenant } = await params;
  const result = await regenerateAllArtifacts(tenant);
  return Response.json(result);
}
