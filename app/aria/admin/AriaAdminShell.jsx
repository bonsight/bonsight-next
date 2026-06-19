'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

function initials(name = '') {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

const AriaLogo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M12 3L13.4 8.6L19 10L13.4 11.4L12 17L10.6 11.4L5 10L10.6 8.6L12 3Z" fill="#8B6FF0"/>
    <path d="M5 3L5.8 5.4L8.2 6.2L5.8 7L5 9.4L4.2 7L1.8 6.2L4.2 5.4L5 3Z" fill="#8B6FF0" opacity="0.5"/>
    <path d="M19 17L19.5 19L21.5 19.5L19.5 20L19 22L18.5 20L16.5 19.5L18.5 19L19 17Z" fill="#8B6FF0" opacity="0.5"/>
  </svg>
);

export default function AriaAdminShell({ tenants, children }) {
  const params = useParams();
  const activeTenant = params?.tenant;
  const [kaiAdminUrl, setKaiAdminUrl] = useState('https://kai.bonsight.co/kai/admin');

  useEffect(() => {
    const isLocal = window.location.hostname.includes('localhost');
    setKaiAdminUrl(isLocal ? 'http://kai.localhost:3000/kai/admin' : 'https://kai.bonsight.co/kai/admin');
  }, []);

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      background: '#f7f7f5',
      fontFamily: 'var(--font-inter, system-ui, sans-serif)',
      color: '#111',
    }}>
      {/* Sidebar */}
      <aside style={{
        width: 232, background: '#fff',
        borderRight: '0.5px solid #e0e0dc',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0,
        height: '100vh', overflowY: 'auto', zIndex: 10,
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '18px 16px 14px',
          borderBottom: '0.5px solid #e0e0dc', flexShrink: 0,
        }}>
          <div style={{
            width: 30, height: 30, background: '#1a1040',
            border: '0.5px solid #6B4FE8', borderRadius: 7,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <AriaLogo />
          </div>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#111', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              Aria Admin
            </div>
            <div style={{ fontSize: 10, color: '#aaa', letterSpacing: '0.02em', marginTop: 1 }}>BONSIGHT LLC</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '10px 8px 6px', flexShrink: 0 }}>
          <Link
            href="/aria/admin"
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '7px 9px', borderRadius: 7,
              fontSize: 12.5, textDecoration: 'none',
              color: !activeTenant ? '#4B2FBE' : '#666',
              background: !activeTenant ? '#f5f2ff' : 'transparent',
              fontWeight: !activeTenant ? 500 : 400,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            Dashboard
          </Link>
        </nav>

        <div style={{ fontSize: 9.5, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '10px 16px 4px', fontWeight: 500, flexShrink: 0 }}>
          Clientes
        </div>

        {/* Tenant list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '2px 8px 8px' }}>
          {tenants.length === 0 && (
            <div style={{ padding: '12px 10px', fontSize: 11.5, color: '#ccc' }}>Sin clientes</div>
          )}
          {tenants.map((t) => (
            <Link
              key={t.slug}
              href={`/aria/admin/${t.slug}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '7px 9px', borderRadius: 8,
                textDecoration: 'none',
                background: activeTenant === t.slug ? '#f5f2ff' : 'transparent',
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 7,
                background: activeTenant === t.slug ? '#6B4FE8' : '#9B7FFF',
                color: '#fff', fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, letterSpacing: '-0.01em',
              }}>
                {initials(t.name)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 12, fontWeight: 500,
                  color: activeTenant === t.slug ? '#4B2FBE' : '#222',
                  lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {t.name}
                </div>
                <div style={{ fontSize: 10.5, color: '#999', marginTop: 0.5 }}>
                  {[t.country, t.industry].filter(Boolean).join(' · ') || t.slug}
                </div>
              </div>
              {t.status === 'active' && (
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6B4FE8', marginLeft: 'auto', flexShrink: 0 }} />
              )}
            </Link>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: 10, borderTop: '0.5px solid #e0e0dc', flexShrink: 0 }}>
          <a
            href={kaiAdminUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 10px', borderRadius: 7,
              fontSize: 11.5, color: '#888', textDecoration: 'none',
              border: '0.5px solid #e0e0dc', background: '#fafaf8',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            Ir a Kai Admin
          </a>
        </div>
      </aside>

      <main style={{ flex: 1, marginLeft: 232, minHeight: '100vh', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {children}
      </main>
    </div>
  );
}
