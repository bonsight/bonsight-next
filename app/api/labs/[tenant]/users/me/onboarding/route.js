import { isAuthorizedForTenant, getCurrentLabsUser } from '@/lib/labs/auth';
import { markKaiOnboarding, setKaiAvisos, sanitizeUser } from '@/lib/labs/users';

// Autoservicio del propio estado de onboarding de Kai (ver lib/labs/users.js#markKaiOnboarding).
// Ruta propia en vez de sumarse a PATCH /users/me: ese endpoint valida campo por campo
// (name/email/password) y mezclar ahí un merge arbitrario de kaiOnboarding lo complica sin
// necesidad — acá el único campo que importa es moduleKey + patch.
//
// También acepta { avisos } (preferencia global, no por-módulo — ver setKaiAvisos) en vez de
// sumar una ruta nueva solo para un campo.
export async function PATCH(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const currentUser = await getCurrentLabsUser(tenant);
  if (!currentUser) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  const { moduleKey, patch, avisos } = await req.json();

  if (avisos !== undefined) {
    try {
      const user = await setKaiAvisos(tenant, currentUser.id, avisos);
      return Response.json({ ok: true, user: sanitizeUser(user) });
    } catch (err) {
      return Response.json({ error: err.message || 'No se pudo actualizar.' }, { status: 400 });
    }
  }

  if (!moduleKey || typeof moduleKey !== 'string') {
    return Response.json({ error: 'Falta moduleKey.' }, { status: 400 });
  }
  if (!patch || typeof patch !== 'object') {
    return Response.json({ error: 'Falta patch.' }, { status: 400 });
  }

  try {
    const user = await markKaiOnboarding(tenant, currentUser.id, moduleKey, patch);
    return Response.json({ ok: true, user: sanitizeUser(user) });
  } catch (err) {
    return Response.json({ error: err.message || 'No se pudo actualizar.' }, { status: 400 });
  }
}
