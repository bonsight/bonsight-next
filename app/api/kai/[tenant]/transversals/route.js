import { isKaiAuthorized } from '@/lib/kai/auth';
import { getCachedTransversalLearnings, regenerateAllArtifacts } from '@/lib/kai/artifacts';

export async function GET(req, { params }) {
  if (!(await isKaiAuthorized())) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { tenant } = await params;

  const cached = await getCachedTransversalLearnings(tenant);
  if (cached !== null) return Response.json({ transversals: cached });

  // Cold start: generate on-demand (happens once per tenant until first conversation)
  const { transversals } = await regenerateAllArtifacts(tenant);
  return Response.json({ transversals });
}
