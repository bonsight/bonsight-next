import { cookies } from 'next/headers';

// Cierra la sesión personal (labs_user_{tenant}) — vuelve a la pantalla de login directo
// (usuario + contraseña, sin código de tenant).
export async function POST(req, { params }) {
  const { tenant } = await params;
  (await cookies()).delete(`labs_user_${tenant}`);
  return Response.json({ ok: true });
}
