import { isKaiAuthorized } from '@/lib/kai/auth';
import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export async function GET(req, { params }) {
  if (!(await isKaiAuthorized())) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  const { tenant } = await params;
  const status = await kv.get(`kai:${tenant}:discovery_status`);
  return Response.json({ status });
}

export async function POST(req, { params }) {
  if (!(await isKaiAuthorized())) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  const { tenant } = await params;
  const body = await req.json();
  await kv.set(`kai:${tenant}:discovery_status`, body);
  return Response.json({ ok: true });
}
