import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { isAuthorizedForTenant } from '@/lib/kaiNext/auth';
import { getTenantMeta } from '@/lib/kai/tenants';
import { getIntelligenceSources } from '@/lib/kai/intelligenceSources';
import { getDbSources } from '@/lib/aria/databases';
import { listSources } from '@/lib/kai/knowledgeSources';
import { kaiNextBasePath } from '@/lib/kaiNext/paths';

export async function generateMetadata({ params }) {
  const { tenant } = await params;
  const meta = await getTenantMeta(tenant);
  return {
    title: meta ? `Kai Next Admin · ${meta.name}` : 'Kai Next Admin',
    robots: { index: false, follow: false },
  };
}

export default async function KaiNextAdminPage({ params }) {
  const { tenant } = await params;
  const meta = await getTenantMeta(tenant);
  if (!meta) notFound();
  if (!(await isAuthorizedForTenant(tenant))) redirect('/team');

  const host = (await headers()).get('host') ?? '';
  const basePath = kaiNextBasePath(host);

  const [sources, dbSources, knowledgeSources] = await Promise.all([
    getIntelligenceSources(tenant),
    getDbSources(tenant),
    listSources(tenant),
  ]);
  const readyKnowledge = knowledgeSources.filter((s) => s.status === 'ready');
  const tracked = [
    { id: 'ga4', label: 'Google Analytics 4' },
    { id: 'search_console', label: 'Search Console' },
    { id: 'google_ads', label: 'Google Ads' },
  ].map((t) => ({ ...t, active: sources.find((s) => s.id === t.id)?.status === 'active' }));
  const anyMissing = tracked.some((t) => !t.active);
  const activeDbs = dbSources.filter((s) => s.status === 'active');

  return (
    <div className="knx-admin">
      <h1>Admin · {meta.name}</h1>
      <h2>Sources</h2>
      {tracked.map((t) => (
        <div className="knx-admin-row" key={t.id}>
          <span className={`knx-badge ${t.active ? 'knx-badge--active' : 'knx-badge--off'}`}>
            {t.active ? 'Activo' : 'No configurado'}
          </span>
          <span>{t.label}</span>
        </div>
      ))}
      {anyMissing && (
        <p>
          Configúralo desde el <a href={`/admin/${tenant}`}>admin existente de Kai</a> — Kai Next
          reutiliza la misma configuración de Intelligence Sources del tenant.
        </p>
      )}

      <h2>Bases de datos</h2>
      {activeDbs.length === 0 && <p>Ninguna conectada.</p>}
      {activeDbs.map((db) => (
        <div className="knx-admin-row" key={db.id}>
          <span className="knx-badge knx-badge--active">Activa</span>
          <span>{db.label} ({db.type})</span>
        </div>
      ))}
      {activeDbs.length > 0 && (
        <p>
          Consultables desde el chat vía query_database — misma configuración que{' '}
          <a href={`https://aria.bonsight.co/admin/${tenant}`} target="_blank" rel="noopener noreferrer">Aria admin</a>.
        </p>
      )}

      <h2>Knowledge</h2>
      <div className="knx-admin-row">
        <span className={`knx-badge ${readyKnowledge.length ? 'knx-badge--active' : 'knx-badge--off'}`}>
          {readyKnowledge.length ? `${readyKnowledge.length} fuente${readyKnowledge.length > 1 ? 's' : ''}` : 'Vacío'}
        </span>
        <span>Documentos y notas consultables vía query_knowledge</span>
      </div>
      <p>
        Se carga desde el <a href={`/admin/${tenant}`}>admin existente de Kai</a>, pestaña Knowledge — mismo digest que ya usa Kai.
      </p>

      <p><a href={`${basePath}/${tenant}`}>← Volver al chat</a></p>
    </div>
  );
}
