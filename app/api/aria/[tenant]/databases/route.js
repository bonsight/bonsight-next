import { isAuthorizedForTenant } from '@/lib/aria/auth';
import { getDbSources, saveDbSources, testAndIntrospect } from '@/lib/aria/databases';
import { randomBytes } from 'crypto';

function newId() {
  return randomBytes(6).toString('hex');
}

export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) return Response.json({ error: 'No autorizado.' }, { status: 401 });
  const sources = await getDbSources(tenant);
  return Response.json({ sources });
}

export async function POST(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  const { action, source } = await req.json();

  if (action === 'test') {
    const { type, connectionString, label } = source ?? {};
    if (!type || !connectionString) return Response.json({ error: 'Faltan type y connectionString.' }, { status: 400 });
    try {
      const schema = await testAndIntrospect({ type, connectionString });
      const tableCount = schema.tables?.length ?? 0;
      const msg = type === 'redis'
        ? `Redis conectado. ${schema.redisInfo?.totalKeys ?? 0} keys encontradas.`
        : `Conectado. ${tableCount} tabla${tableCount !== 1 ? 's' : ''} encontrada${tableCount !== 1 ? 's' : ''}.`;
      return Response.json({ ok: true, message: msg, schema });
    } catch (err) {
      return Response.json({ ok: false, error: err.message });
    }
  }

  if (action === 'add') {
    const { type, connectionString, label } = source ?? {};
    if (!type || !connectionString || !label) return Response.json({ error: 'Faltan campos.' }, { status: 400 });
    let schema = null;
    try {
      schema = await testAndIntrospect({ type, connectionString });
    } catch { /* connection failed, still save but mark as error */ }
    const sources = await getDbSources(tenant);
    const newSource = {
      id: newId(),
      type,
      label,
      connectionString,
      schema,
      status: schema ? 'active' : 'error',
      createdAt: new Date().toISOString(),
    };
    await saveDbSources(tenant, [...sources, newSource]);
    return Response.json({ ok: true, source: newSource });
  }

  if (action === 'refresh') {
    const { id } = source ?? {};
    const sources = await getDbSources(tenant);
    const target = sources.find((s) => s.id === id);
    if (!target) return Response.json({ error: 'No encontrado.' }, { status: 404 });
    try {
      const schema = await testAndIntrospect(target);
      const updated = sources.map((s) => s.id === id ? { ...s, schema, status: 'active' } : s);
      await saveDbSources(tenant, updated);
      return Response.json({ ok: true, source: { ...target, schema, status: 'active' } });
    } catch (err) {
      return Response.json({ ok: false, error: err.message });
    }
  }

  if (action === 'toggle') {
    const { id } = source ?? {};
    const sources = await getDbSources(tenant);
    const updated = sources.map((s) => s.id === id ? { ...s, status: s.status === 'active' ? 'inactive' : 'active' } : s);
    await saveDbSources(tenant, updated);
    return Response.json({ ok: true });
  }

  if (action === 'delete') {
    const { id } = source ?? {};
    const sources = await getDbSources(tenant);
    await saveDbSources(tenant, sources.filter((s) => s.id !== id));
    return Response.json({ ok: true });
  }

  return Response.json({ error: 'Acción desconocida.' }, { status: 400 });
}
