import { isKaiAuthorized } from '@/lib/kai/auth';
import { deduplicateLearnings } from '@/lib/kai/learnings';
import { getCachedParticipantInsights, regenerateAllArtifacts } from '@/lib/kai/artifacts';

// POST /api/kai/[tenant]/cleanup
// Deduplicates existing learnings and regenerates all cached artifacts.
export async function POST(req, { params }) {
  if (!(await isKaiAuthorized())) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  const { tenant } = await params;

  const dedup = await deduplicateLearnings(tenant);
  await regenerateAllArtifacts(tenant);

  return Response.json({ ok: true, ...dedup });
}
