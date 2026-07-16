'use client';
import { useState } from 'react';

const FORMAT_META = {
  pdf: { label: 'PDF', icon: '📄', color: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
  excel: { label: 'Excel', icon: '📊', color: '#22C55E', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)' },
  gtm_json: { label: 'GTM JSON', icon: '🏷️', color: '#3B82F6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
};

export default function AriaDocumentCard({ doc, tenant }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const meta = FORMAT_META[doc.format] ?? FORMAT_META.pdf;

  const download = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/aria/${tenant}/generate-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `Error ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.filename ?? `aria-document`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      marginTop: 12,
      background: meta.bg,
      border: `1px solid ${meta.border}`,
      borderRadius: 10,
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
    }}>
      <div style={{ fontSize: 28, flexShrink: 0, lineHeight: 1 }}>{meta.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--aria-text, #E5E7EB)', fontFamily: 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {doc.title}
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, color: meta.color, background: meta.bg, border: `1px solid ${meta.border}`, borderRadius: 4, padding: '1px 6px', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {meta.label}
          </span>
        </div>
        {doc.description && (
          <div style={{ fontSize: 11, color: 'var(--aria-text-muted, #9CA3AF)', fontFamily: 'inherit', lineHeight: 1.4 }}>
            {doc.description}
          </div>
        )}
        {error && (
          <div style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>{error}</div>
        )}
      </div>
      <button
        onClick={download}
        disabled={loading}
        style={{
          flexShrink: 0,
          padding: '7px 16px',
          background: loading ? 'transparent' : meta.color,
          border: `1px solid ${meta.color}`,
          borderRadius: 7,
          color: loading ? meta.color : '#fff',
          fontSize: 12,
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
          fontFamily: 'inherit',
          transition: 'all 0.15s',
          whiteSpace: 'nowrap',
        }}
      >
        {loading ? 'Generando…' : 'Descargar'}
      </button>
    </div>
  );
}
