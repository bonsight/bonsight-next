'use client';

import { useState, useTransition } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const Isotipo = () => (
  <svg width="18" height="15" viewBox="0 0 72 58" fill="none">
    <circle cx="22" cy="38" r="20" fill="#9FDBC8"/>
    <circle cx="36" cy="22" r="20" fill="#085041"/>
    <circle cx="50" cy="38" r="20" fill="#2EBF8E"/>
  </svg>
);

function initials(name = '') {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

function statusBadge(s) {
  if (s === 'active') return '●';
  if (s === 'paused') return '○';
  return '·';
}

function CopyButton({ text, label = 'Copiar' }) {
  const [done, setDone] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    });
  };
  return (
    <button className={`admin-success-copy-btn${done ? ' admin-success-copy-btn--done' : ''}`} onClick={copy} type="button">
      {done ? '✓' : label}
    </button>
  );
}

function SuccessScreen({ meta, onView }) {
  const kaiUrl = `kai.bonsight.co/${meta.slug}`;
  const ariaUrl = `aria.bonsight.co/${meta.slug}`;
  return (
    <div className="admin-modal-body admin-success-body">
      <div className="admin-success-check">✓</div>
      <div className="admin-success-name">{meta.name}</div>
      <div className="admin-success-subtitle">Cliente creado. Comparte los accesos:</div>

      <div className="admin-success-group">
        <div className="admin-success-label">Kai</div>
        <div className="admin-success-row">
          <span className="admin-success-url">{kaiUrl}</span>
          <CopyButton text={`https://${kaiUrl}`} />
        </div>
      </div>

      <div className="admin-success-group">
        <div className="admin-success-label">Aria</div>
        <div className="admin-success-row">
          <span className="admin-success-url">{ariaUrl}</span>
          <CopyButton text={`https://${ariaUrl}`} />
        </div>
      </div>

      <div className="admin-success-group">
        <div className="admin-success-label">Código de acceso</div>
        <div className="admin-success-row">
          <span className="admin-success-code">{meta.accessCode}</span>
          <CopyButton text={meta.accessCode} />
        </div>
        <div className="admin-success-hint">Válido para Kai y Aria. Compártelo con el cliente.</div>
      </div>

      <button className="admin-btn admin-btn--primary admin-success-view-btn" onClick={onView}>
        Ver perfil del cliente →
      </button>
    </div>
  );
}

function NewClientModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', slug: '', country: '', industry: '', status: 'active' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdMeta, setCreatedMeta] = useState(null);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (k === 'name' && !form.slug) {
      const auto = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      setForm((f) => ({ ...f, name: e.target.value, slug: auto }));
    }
  };

  const submit = async () => {
    setError('');
    if (!form.name.trim() || !form.slug.trim()) {
      setError('Nombre y slug son requeridos.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/kai/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error creando cliente.'); return; }
      setCreatedMeta(data.meta);
    } catch {
      setError('Error de red. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (createdMeta) {
    return (
      <div className="admin-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="admin-modal">
          <div className="admin-modal-header">
            <div className="admin-modal-title">Cliente creado</div>
            <button className="admin-modal-close" onClick={onClose}>×</button>
          </div>
          <SuccessScreen meta={createdMeta} onView={() => onCreate(createdMeta)} />
        </div>
      </div>
    );
  }

  return (
    <div className="admin-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="admin-modal">
        <div className="admin-modal-header">
          <div className="admin-modal-title">Nuevo cliente</div>
          <button className="admin-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="admin-modal-body">
          {error && <div className="admin-form-error">{error}</div>}
          <div className="admin-form-group">
            <label className="admin-form-label">Nombre de la empresa *</label>
            <input className="admin-form-input" placeholder="Acme Corp" value={form.name} onChange={set('name')} disabled={loading} />
          </div>
          <div className="admin-form-row">
            <div className="admin-form-group">
              <label className="admin-form-label">Slug (URL) *</label>
              <input className="admin-form-input" placeholder="acme" value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                disabled={loading} />
              <span className="admin-form-hint">kai.bonsight.co/{form.slug || '…'}</span>
            </div>
            <div className="admin-form-group">
              <label className="admin-form-label">País</label>
              <input className="admin-form-input" placeholder="México" value={form.country} onChange={set('country')} disabled={loading} />
            </div>
          </div>
          <div className="admin-form-row">
            <div className="admin-form-group">
              <label className="admin-form-label">Industria</label>
              <input className="admin-form-input" placeholder="Retail, SaaS, …" value={form.industry} onChange={set('industry')} disabled={loading} />
            </div>
            <div className="admin-form-group">
              <label className="admin-form-label">Estado</label>
              <select className="admin-form-select" value={form.status} onChange={set('status')} disabled={loading}>
                <option value="active">Activo</option>
                <option value="paused">Pausado</option>
                <option value="prospect">Prospecto</option>
              </select>
            </div>
          </div>
        </div>
        <div className="admin-modal-footer">
          <button className="admin-btn" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="admin-btn admin-btn--primary" onClick={submit} disabled={loading}>
            {loading ? 'Creando…' : 'Crear cliente'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminShell({ tenants: initialTenants, children }) {
  const [tenants, setTenants] = useState(initialTenants);
  const [showModal, setShowModal] = useState(false);
  const params = useParams();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const activeTenant = params?.tenant;
  const pathname = usePathname();

  const handleCreate = (meta) => {
    setTenants((prev) => [...prev, meta]);
    setShowModal(false);
    startTransition(() => router.push(`/kai/admin/${meta.slug}`));
    router.refresh();
  };

  return (
    <>
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-header">
            <div className="admin-sidebar-mark">
              <Isotipo />
            </div>
            <div>
              <div className="admin-sidebar-title">Kai Admin</div>
              <div className="admin-sidebar-sub">BONSIGHT LLC</div>
            </div>
          </div>

          <nav className="admin-nav">
            <Link
              href="/kai/admin"
              className={`admin-nav-item${!activeTenant ? ' admin-nav-item--active' : ''}`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
              Dashboard
            </Link>
            <Link
              href="/kai/admin/costs"
              className={`admin-nav-item${pathname?.includes('/costs') ? ' admin-nav-item--active' : ''}`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              Costos IA
            </Link>
          </nav>

          <div className="admin-section-label">Clientes</div>

          <div className="admin-tenant-list">
            {tenants.length === 0 && (
              <div style={{ padding: '12px 10px', fontSize: 11.5, color: '#ccc' }}>
                Sin clientes aún
              </div>
            )}
            {tenants.map((t) => (
              <Link
                key={t.slug}
                href={`/kai/admin/${t.slug}`}
                className={`admin-tenant-item${activeTenant === t.slug ? ' admin-tenant-item--active' : ''}`}
              >
                <div className="admin-tenant-avatar">{initials(t.name)}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="admin-tenant-name">{t.name}</div>
                  <div className="admin-tenant-country">{[t.country, t.industry].filter(Boolean).join(' · ') || t.slug}</div>
                </div>
                {t.status === 'active' && (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1D9E75', marginLeft: 'auto', flexShrink: 0 }} />
                )}
              </Link>
            ))}
          </div>

          <div className="admin-sidebar-footer">
            <button className="admin-new-btn" onClick={() => setShowModal(true)}>
              + Nuevo cliente
            </button>
          </div>
        </aside>

        <main className="admin-main">
          {children}
        </main>
      </div>

      {showModal && (
        <NewClientModal onClose={() => setShowModal(false)} onCreate={handleCreate} />
      )}
    </>
  );
}
