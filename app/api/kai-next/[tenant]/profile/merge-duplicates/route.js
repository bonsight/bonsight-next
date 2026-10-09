import { isAuthorizedForTenant } from '@/lib/kaiNext/auth';
import { getBusinessProfile, updateBusinessProfile } from '@/lib/kai/tenants';

const VALID_CATEGORIES = new Set(['pains', 'risks', 'opportunities']);

function tagText(x) {
  return typeof x === 'string' ? x : (x?.label ?? x?.name ?? '');
}

// Fusiona un grupo de ítems casi-duplicados (detectados por el diagnóstico de Kai, ver
// lib/kai/diagnosis.js) en una sola entrada consolidada dentro del Business Profile — el mismo
// perfil que usa Kai Legacy y que alimenta buildBIC. "items" puede mezclar categorías (ej. 4
// dolores + 2 riesgos que dicen lo mismo); cada categoría afectada se reescribe sin los textos
// fusionados, y "resumen" se agrega una sola vez, a la primera categoría del grupo.
export async function POST(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { resumen, items } = await req.json();
  const resumenText = String(resumen ?? '').trim();
  if (!resumenText || !Array.isArray(items) || items.length < 2) {
    return Response.json({ error: 'Se requiere un resumen y al menos 2 ítems.' }, { status: 400 });
  }

  const byCategoria = {};
  for (const it of items) {
    const cat = it?.categoria;
    const texto = String(it?.texto ?? '').trim();
    if (!VALID_CATEGORIES.has(cat) || !texto) continue;
    (byCategoria[cat] ??= new Set()).add(texto);
  }
  const categorias = Object.keys(byCategoria);
  if (categorias.length === 0) {
    return Response.json({ error: 'Ningún ítem tiene una categoría válida.' }, { status: 400 });
  }

  const profile = await getBusinessProfile(tenant);
  const patch = {};
  for (const cat of categorias) {
    const toRemove = byCategoria[cat];
    patch[cat] = (profile[cat] ?? []).filter((x) => !toRemove.has(tagText(x).trim()));
  }
  const primaryCat = categorias[0];
  patch[primaryCat] = [...patch[primaryCat], resumenText];

  const updated = await updateBusinessProfile(tenant, patch);
  return Response.json({ ok: true, profile: updated });
}
