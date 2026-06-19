import { isKaiAuthorized } from '@/lib/kai/auth';
import {
  listAriaSuggestions,
  updateSuggestionStatus,
  applySuggestionToProfile,
} from '@/lib/kai/suggestions';

export async function GET(req, { params }) {
  if (!(await isKaiAuthorized())) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const { tenant } = await params;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? null;
  const suggestions = await listAriaSuggestions(tenant, status);
  return Response.json({ suggestions });
}

export async function POST(req, { params }) {
  if (!(await isKaiAuthorized())) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const { tenant } = await params;
  const { id, action } = await req.json();

  if (!id || !['accept', 'reject'].includes(action)) {
    return Response.json({ error: 'id y action (accept|reject) son requeridos.' }, { status: 400 });
  }

  const all = await listAriaSuggestions(tenant);
  const suggestion = all.find((s) => s.id === id);
  if (!suggestion) {
    return Response.json({ error: 'Sugerencia no encontrada.' }, { status: 404 });
  }

  if (action === 'accept') {
    await Promise.all([
      applySuggestionToProfile(tenant, suggestion),
      updateSuggestionStatus(tenant, id, 'validated', 'admin'),
    ]);
  } else {
    await updateSuggestionStatus(tenant, id, 'rejected', 'admin');
  }

  return Response.json({ ok: true });
}
