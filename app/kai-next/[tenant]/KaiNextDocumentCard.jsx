'use client';

import { useState } from 'react';

const FORMAT_META = {
  pdf: { label: 'PDF', className: 'knx-doc-card--pdf' },
  excel: { label: 'Excel', className: 'knx-doc-card--excel' },
};

function DocIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" /><path d="M14 3v5h5" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
    </svg>
  );
}

// Mismo patrón que AriaDocumentCard.jsx (tool-call → spec guardado en el mensaje → el archivo de
// verdad se genera recién al clickear "Descargar", ver /api/kai-next/[tenant]/generate-document)
// pero con clases .knx-* en vez de estilos inline, consistente con el resto de Kai Next.
export default function KaiNextDocumentCard({ doc, tenant }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const meta = FORMAT_META[doc.format] ?? FORMAT_META.pdf;

  const download = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/generate-document`, {
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
      a.download = doc.filename ?? 'kai-documento';
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
    <div className={`knx-doc-card ${meta.className}`}>
      <span className="knx-doc-card-icon"><DocIcon /></span>
      <div className="knx-doc-card-body">
        <div className="knx-doc-card-top">
          <span className="knx-doc-card-title">{doc.title}</span>
          <span className="knx-doc-card-badge">{meta.label}</span>
        </div>
        {doc.description && <p className="knx-doc-card-desc">{doc.description}</p>}
        {error && <p className="knx-doc-card-error">{error}</p>}
      </div>
      <button type="button" className="knx-doc-card-btn" onClick={download} disabled={loading}>
        <DownloadIcon />{loading ? 'Generando…' : 'Descargar'}
      </button>
    </div>
  );
}
