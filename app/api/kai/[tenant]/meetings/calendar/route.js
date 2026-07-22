import { isAuthorizedForTenant } from '@/lib/kai/auth';
import { listUpcomingMeetings } from '@/lib/kai/calendar';

export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  try {
    const meetings = await listUpcomingMeetings();
    return Response.json({ meetings });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo consultar el calendario.' }, { status: 400 });
  }
}
