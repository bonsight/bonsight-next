import { getAllTenantsMeta } from '@/lib/kai/tenants';
import Link from 'next/link';

function initials(name = '') {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

export default async function AriaAdminPage() {
  const tenants = await getAllTenantsMeta();

  return (
    <div style={{ padding: 28, fontFamily: 'var(--font-inter, system-ui, sans-serif)' }}>
      <div style={{ fontSize: 18, fontWeight: 600, color: '#111', letterSpacing: '-0.02em', marginBottom: 4 }}>
        Aria Admin
      </div>
      <div style={{ fontSize: 12.5, color: '#888', marginBottom: 28 }}>
        ¿Qué puede analizar Aria por cliente?
      </div>

      {tenants.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#bbb', fontSize: 13 }}>
          Sin clientes configurados.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {tenants.map((t) => (
            <Link
              key={t.slug}
              href={`/aria/admin/${t.slug}`}
              style={{
                background: '#fff', border: '0.5px solid #e0e0dc',
                borderRadius: 12, padding: 18,
                textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 12,
                transition: 'border-color 0.12s, box-shadow 0.12s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9,
                  background: '#6B4FE8', color: '#fff',
                  fontSize: 14, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {initials(t.name)}
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#111', letterSpacing: '-0.01em' }}>
                    {t.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#aaa', fontFamily: 'monospace', marginTop: 1 }}>
                    {t.slug}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {t.country && (
                  <span style={{ fontSize: 10.5, fontWeight: 500, padding: '2px 8px', borderRadius: 20, background: '#f0f0ed', color: '#666' }}>
                    {t.country}
                  </span>
                )}
                {t.industry && (
                  <span style={{ fontSize: 10.5, fontWeight: 500, padding: '2px 8px', borderRadius: 20, background: '#f5f2ff', color: '#4B2FBE' }}>
                    {t.industry}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
