import { isAuthorizedForTenant } from '@/lib/kaiNext/auth';
import { getActivePriorities, setActivePriorities } from '@/lib/kai/activePriorities';

// Mismo backend que app/api/kai/[tenant]/active-priorities/route.js (lib/kai/activePriorities.js,
// mismo Redis key — editar acá también se refleja en el admin de Kai y viceversa). La única
// diferencia es el gate de auth: access.kaiNext, no access.kai.
export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const priorities = await getActivePriorities(tenant);
  return Response.json({ priorities });
}

export async function PUT(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const { priorities } = await req.json();
  if (!Array.isArray(priorities)) {
    return Response.json({ error: 'priorities debe ser un array.' }, { status: 400 });
  }
  // link (opcional): a qué proyecto, prueba o tarea apunta la prioridad. Se guarda solo lo necesario
  // para encontrarlo y nombrarlo; el estado se lee al día desde priority-links.
  const cleanLink = (l) => (l && ['proyecto', 'prueba', 'tarea'].includes(l.type) && typeof l.id === 'string' && typeof l.projectId === 'string'
    ? { type: l.type, id: l.id.slice(0, 80), projectId: l.projectId.slice(0, 80), label: String(l.label ?? '').slice(0, 200), projectName: l.projectName ? String(l.projectName).slice(0, 200) : null }
    : null);
  const cleaned = priorities
    .map((p) => (typeof p === 'string'
      ? { text: p.trim(), done: false }
      : { text: String(p?.text ?? '').trim(), done: !!p?.done, ...(cleanLink(p?.link) ? { link: cleanLink(p.link) } : {}) }))
    .filter((p) => p.text)
    .slice(0, 10);
  await setActivePriorities(tenant, cleaned);
  return Response.json({ priorities: cleaned });
}
