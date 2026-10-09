import { isAuthorizedForTenant } from '@/lib/kaiNext/auth';
import { getBusinessProfile, updateBusinessProfile } from '@/lib/kai/tenants';

// Editor genérico de un campo del Business Profile — mismo patrón que el PATCH de
// app/api/kai/[tenant]/route.js (el que usa el chat de Kai Legacy cuando el usuario acepta una
// propuesta de perfil), solo que con el auth de Kai Next. { field, action, value }: field admite
// un nivel de notación con punto (ej. "general.industry" o "objectives.shortTerm"); action
// "append" agrega a un array existente, cualquier otro valor sobreescribe.
export async function PATCH(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { field, action, value } = await req.json();
  if (!field || !action || value === undefined) {
    return Response.json({ error: 'Parámetros inválidos.' }, { status: 400 });
  }

  const profile = await getBusinessProfile(tenant);
  const parts = field.split('.');
  const update = {};

  if (parts.length === 1) {
    const current = profile[parts[0]];
    update[parts[0]] = action === 'append' && Array.isArray(current) ? [...current, value] : value;
  } else if (parts.length === 2) {
    const [parent, child] = parts;
    const parentObj = profile[parent] ?? {};
    const current = parentObj[child];
    update[parent] = { [child]: action === 'append' && Array.isArray(current) ? [...current, value] : value };
  } else {
    return Response.json({ error: 'Campo inválido.' }, { status: 400 });
  }

  const updated = await updateBusinessProfile(tenant, update);
  return Response.json({ ok: true, profile: updated });
}
