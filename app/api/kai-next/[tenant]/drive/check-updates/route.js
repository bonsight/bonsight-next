import { isAuthorizedForTenant } from '@/lib/kaiNext/auth';
import { getFileMetadata } from '@/lib/kai/googleDrive';
import { listSources, updateSourceMeta } from '@/lib/kai/knowledgeSources';

export async function POST(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  const sources = await listSources(tenant);
  const driveSources = sources.filter((s) => s.sourceType === 'drive' && s.driveFileId && s.status !== 'stale');

  let updatedCount = 0;
  await Promise.all(driveSources.map(async (source) => {
    try {
      const meta = await getFileMetadata(source.driveFileId);
      if (meta.modifiedTime && source.driveModifiedTime && meta.modifiedTime !== source.driveModifiedTime) {
        await updateSourceMeta(tenant, source.id, { status: 'stale' });
        updatedCount++;
      }
    } catch {
      // se omite en silencio si el archivo quedó inaccesible
    }
  }));

  return Response.json({ ok: true, updatedCount });
}
