'use client';

import { useState } from 'react';

function formatList(items) {
  if (!Array.isArray(items) || items.length === 0) return '—';
  return items.join(', ');
}

function formatDateRanges(dateRanges) {
  if (!Array.isArray(dateRanges) || dateRanges.length === 0) return '—';
  return dateRanges.map((r) => `${r.startDate} → ${r.endDate}`).join(' · ');
}

export default function DataSourcesPanel({ dataSources, basisMetrics }) {
  const [open, setOpen] = useState(false);

  if (!Array.isArray(dataSources) || dataSources.length === 0) return null;

  return (
    <div className="aria-data-sources">
      <button type="button" className="aria-data-sources-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? 'Ocultar fuentes de datos' : 'Ver fuentes de datos'}
      </button>
      {open && (
        <div className="aria-data-sources-panel">
          {basisMetrics && (
            <div className="aria-confidence-metrics">
              {basisMetrics.periodAnalyzed && (
                <span className="aria-confidence-metric">Período: {basisMetrics.periodAnalyzed}</span>
              )}
              <span className="aria-confidence-metric">{basisMetrics.queriesRun} consulta(s)</span>
              <span className="aria-confidence-metric">{basisMetrics.dimensionsAnalyzed} dimensión(es)</span>
              <span className="aria-confidence-metric">{basisMetrics.metricsAnalyzed} métrica(s)</span>
            </div>
          )}
          {dataSources.map((source, i) => (
            <div key={i} className="aria-data-source">
              <p className="aria-data-source-label">
                Métricas: <span>{formatList(source.metrics)}</span>
              </p>
              <p className="aria-data-source-label">
                Dimensiones: <span>{formatList(source.dimensions)}</span>
              </p>
              <p className="aria-data-source-label">
                Período: <span>{formatDateRanges(source.dateRanges)}</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
