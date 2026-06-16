'use client';

import { useState } from 'react';
import { renderMessage } from '@/lib/aria/markdown';

export default function FullAnalysisPanel({ summary }) {
  const [open, setOpen] = useState(false);
  if (!summary) return null;

  return (
    <div className="aria-full-analysis">
      <button type="button" className="aria-full-analysis-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? 'Ocultar análisis completo' : 'Ver análisis completo'}
      </button>
      {open && <div className="aria-msg-content aria-full-analysis-panel">{renderMessage(summary)}</div>}
    </div>
  );
}
