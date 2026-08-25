import { cookies } from 'next/headers';

// Solo cierra la sesión personal (labs_user_{tenant}) — el código compartido del tenant
// (labs_auth_{tenant}) queda, así la próxima persona no tiene que reingresarlo, solo su
// código individual.
export async function POST(req, { params }) {
  const { tenant } = await params;
  (await cookies()).delete(`labs_user_${tenant}`);
  return Response.json({ ok: true });
}
