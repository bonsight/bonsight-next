import { buildGoogleAuthUrl } from '@/lib/kaiNext/googleOAuth';

// Sin auth previa — este es el punto de entrada del login, no algo que requiera sesión.
export async function GET(req, { params }) {
  const { tenant } = await params;
  try {
    const url = buildGoogleAuthUrl(tenant);
    return Response.redirect(url);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
