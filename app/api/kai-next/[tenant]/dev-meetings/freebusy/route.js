import { isAuthorizedForTenant, getCurrentKaiNextIdentity } from '@/lib/kaiNext/auth';
import { isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { resolveProjectAccessLevel } from '@/lib/kaiNext/projects';
import { getFreeBusy } from '@/lib/kai/calendar';

// Mismo nivel de permiso que dev-meetings (Supervisor-level), sin chequeo de proyecto — esto se
// pide ANTES de que exista la reunión, en el modal de agendar, así que no hay projectId todavía
// en juego acá (ver gate() de dev-meetings/route.js para el caso con proyecto).
export async function POST(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const identity = await getCurrentKaiNextIdentity(tenant);
  if (!isSectionAllowed(identity.access, 'reuniones')) {
    return Response.json({ error: 'Reuniones no está habilitado para tu usuario.' }, { status: 403 });
  }
  if (!resolveProjectAccessLevel(identity).isSupervisorLevel) {
    return Response.json({ error: 'No tenés permiso para gestionar reuniones.' }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }
  const { emails, timeMin, timeMax } = body;
  if (!Array.isArray(emails) || !emails.length) return Response.json({ error: 'emails es requerido.' }, { status: 400 });
  if (!timeMin || !timeMax) return Response.json({ error: 'timeMin/timeMax son requeridos.' }, { status: 400 });

  try {
    const busy = await getFreeBusy(emails, timeMin, timeMax);
    return Response.json({ busy });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
