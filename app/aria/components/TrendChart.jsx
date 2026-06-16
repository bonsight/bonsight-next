'use client';

import { useState } from 'react';

const WIDTH = 600;
const HEIGHT = 140;
const PADDING = { top: 10, right: 16, bottom: 18, left: 16 };

function formatNumber(value) {
  if (typeof value !== 'number') return value;
  return value.toLocaleString('es');
}

function buildPath(values, xScale, yScale) {
  return values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(v)}`).join(' ');
}

export default function TrendChart({ trendChart }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (!trendChart || !Array.isArray(trendChart.series) || trendChart.series.length === 0) return null;

  const { title, metricLabel, currentPeriodLabel, previousPeriodLabel, series, previousSeries } = trendChart;

  const values = series.map((d) => d.value);
  const prevValues = Array.isArray(previousSeries) ? previousSeries.map((d) => d.value) : [];
  const allValues = [...values, ...prevValues];
  const minValue = Math.min(0, ...allValues);
  const maxValue = Math.max(1, ...allValues);

  const innerWidth = WIDTH - PADDING.left - PADDING.right;
  const innerHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const lastIndex = Math.max(series.length - 1, 1);

  const xScale = (i) => PADDING.left + (i / lastIndex) * innerWidth;
  const yScale = (v) => PADDING.top + innerHeight - ((v - minValue) / (maxValue - minValue || 1)) * innerHeight;

  const currentPath = buildPath(values, xScale, yScale);
  const previousPath = prevValues.length ? buildPath(prevValues, xScale, yScale) : null;

  function handleMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const ratio = (x - PADDING.left) / innerWidth;
    const index = Math.round(ratio * lastIndex);
    setHoverIndex(Math.max(0, Math.min(series.length - 1, index)));
  }

  function handleMouseLeave() {
    setHoverIndex(null);
  }

  const hovered = hoverIndex !== null ? series[hoverIndex] : null;
  const hoveredPrev = hoverIndex !== null ? previousSeries?.[hoverIndex] : null;

  return (
    <div className="aria-card">
      {title && <p className="aria-card-title">{title}</p>}
      {metricLabel && <p className="aria-trend-title">{metricLabel}</p>}

      <svg
        className="aria-trend-svg"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {previousPath && <path d={previousPath} className="aria-trend-line-previous" fill="none" />}
        <path d={currentPath} className="aria-trend-line-current" fill="none" />

        {hoverIndex !== null && (
          <line
            x1={xScale(hoverIndex)}
            x2={xScale(hoverIndex)}
            y1={PADDING.top}
            y2={HEIGHT - PADDING.bottom}
            className="aria-trend-hover-line"
          />
        )}

        {hovered && (
          <circle cx={xScale(hoverIndex)} cy={yScale(hovered.value)} r="4" className="aria-trend-dot-current" />
        )}
        {hoveredPrev && (
          <circle cx={xScale(hoverIndex)} cy={yScale(hoveredPrev.value)} r="4" className="aria-trend-dot-previous" />
        )}
      </svg>

      {hovered && (
        <div className="aria-tooltip">
          <p className="aria-tooltip-date">{hovered.date}</p>
          <p className="aria-trend-legend-item">
            <span className="aria-trend-legend-swatch aria-trend-legend-swatch-current" />
            {currentPeriodLabel || 'Período actual'}: <strong>{formatNumber(hovered.value)}</strong>
          </p>
          {hoveredPrev && (
            <p className="aria-trend-legend-item">
              <span className="aria-trend-legend-swatch aria-trend-legend-swatch-previous" />
              {previousPeriodLabel || 'Período anterior'}: <strong>{formatNumber(hoveredPrev.value)}</strong>
            </p>
          )}
        </div>
      )}

      <div className="aria-trend-legend">
        <span className="aria-trend-legend-item">
          <span className="aria-trend-legend-swatch aria-trend-legend-swatch-current" />
          {currentPeriodLabel || 'Período actual'}
        </span>
        {previousPath && (
          <span className="aria-trend-legend-item">
            <span className="aria-trend-legend-swatch aria-trend-legend-swatch-previous" />
            {previousPeriodLabel || 'Período anterior'}
          </span>
        )}
      </div>
    </div>
  );
}
