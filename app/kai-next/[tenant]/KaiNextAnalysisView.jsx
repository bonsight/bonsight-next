'use client';

import { useState } from 'react';
import { draftChatUrl } from '@/lib/kaiNext/draftChat';

const SEVERITY_TAG = {
  critical: 'Atención',
  warning: 'Atención',
  success: 'Oportunidad',
  neutral: 'Contexto',
};

// Si llega `onAsk` (el dashboard de Análisis, que mantiene un panel lateral propio), el link se
// vuelve un botón que alimenta ese panel en vez de navegar — ahí "Preguntar sobre esto" no debe
// sacar al usuario de Análisis. Sin `onAsk` (el chat normal) sigue siendo un link real que abre
// una conversación nueva, igual que el resto de los activadores de la app.
function AskIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.5 8.5 0 0 1-11.9 7.8L4 21l1.7-5.1A8.5 8.5 0 1 1 21 11.5Z" />
    </svg>
  );
}

function FollowUpLink({ followUp, basePath, tenant, onAsk }) {
  if (!followUp?.prompt) return null;
  if (onAsk) {
    return (
      <button type="button" className="knx-block-ask" onClick={() => onAsk(followUp.prompt)}>
        <AskIcon />{followUp.label || 'Preguntar sobre esto'}
      </button>
    );
  }
  return (
    <a className="knx-block-ask" href={draftChatUrl(basePath, tenant, followUp.prompt)}>
      <AskIcon />{followUp.label || 'Preguntar sobre esto'}
    </a>
  );
}

function BlockHeader({ title, followUp, basePath, tenant, onAsk }) {
  if (!title && !followUp) return null;
  return (
    <div className="knx-block-header">
      {title && <h4>{title}</h4>}
      <FollowUpLink followUp={followUp} basePath={basePath} tenant={tenant} onAsk={onAsk} />
    </div>
  );
}

// Agrupa insight_banner consecutivos en una sola tarjeta "Lectura de Kai" (como en el mockup:
// una tarjeta con una fila por hallazgo, no una tarjeta separada por cada uno).
function LecturaDeKaiCard({ items, basePath, tenant, onAsk }) {
  return (
    <div className="knx-lectura-card">
      <div className="knx-lectura-header">
        <span className="knx-lectura-dot" />
        <span className="knx-lectura-title">Lectura de Kai</span>
      </div>
      <div className="knx-lectura-rows">
        {items.map((block) => (
          <div className="knx-lectura-row" key={block.id}>
            <span className={`knx-lectura-tag knx-lectura-tag--${block.severity || 'neutral'}`}>
              {SEVERITY_TAG[block.severity] || 'Contexto'}
            </span>
            <p className="knx-lectura-text">{block.description || block.title}</p>
            <FollowUpLink followUp={block.followUp} basePath={basePath} tenant={tenant} onAsk={onAsk} />
          </div>
        ))}
      </div>
    </div>
  );
}

function KpiGridBlock({ title, data, followUp, basePath, tenant, onAsk }) {
  const items = Array.isArray(data) ? data : [];
  if (!items.length) return null;
  return (
    <div className="knx-kpi-grid-wrap">
      <BlockHeader title={title} followUp={followUp} basePath={basePath} tenant={tenant} onAsk={onAsk} />
      <div className="knx-kpi-grid">
        {items.map((k, i) => (
          <div key={i} className={`knx-kpi-card knx-kpi-card--${k.status || 'neutral'}`}>
            <span className="knx-kpi-label">{k.label}</span>
            <span className="knx-kpi-value">{k.value}</span>
            {k.note ? (
              <span className="knx-kpi-note">{k.note}</span>
            ) : k.change ? (
              <span className={`knx-kpi-change knx-kpi-change--${k.trend || 'flat'}`}>
                {k.trend === 'up' ? '↑' : k.trend === 'down' ? '↓' : '→'} {k.change}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatChartValue(v) {
  return typeof v === 'number' ? v.toLocaleString('es') : v;
}

function LineChartBlock({ title, subtitle, data, followUp, basePath, tenant, onAsk }) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const series = data?.series;
  if (!Array.isArray(series) || !series.length) return null;
  const previousSeries = Array.isArray(data?.previousSeries) ? data.previousSeries : null;
  const annotations = Array.isArray(data?.annotations) ? data.annotations : [];

  const WIDTH = 600, HEIGHT = 160, PAD = { top: 14, right: 16, bottom: 10, left: 16 };
  const values = series.map((d) => d.value);
  const prevValues = previousSeries ? previousSeries.map((d) => d.value) : [];
  const allValues = [...values, ...prevValues];
  const minValue = Math.min(0, ...allValues);
  const maxValue = Math.max(1, ...allValues);
  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const lastIdx = Math.max(series.length - 1, 1);
  const xScale = (i) => PAD.left + (i / lastIdx) * innerW;
  const yScale = (v) => PAD.top + innerH - ((v - minValue) / (maxValue - minValue || 1)) * innerH;
  const buildPath = (vals) => vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(v)}`).join(' ');
  const currentPath = buildPath(values);
  const previousPath = prevValues.length ? buildPath(prevValues) : null;

  function handleMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const ratio = (x - PAD.left) / innerW;
    setHoverIndex(Math.max(0, Math.min(series.length - 1, Math.round(ratio * lastIdx))));
  }

  const hovered = hoverIndex !== null ? series[hoverIndex] : null;
  const hoveredPrev = hoverIndex !== null ? previousSeries?.[hoverIndex] : null;

  return (
    <div className="knx-analysis-block">
      <BlockHeader title={title} followUp={followUp} basePath={basePath} tenant={tenant} onAsk={onAsk} />
      {subtitle && <p className="knx-chart-subtitle">{subtitle}</p>}
      <svg className="knx-chart-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} onMouseMove={handleMove} onMouseLeave={() => setHoverIndex(null)}>
        {previousPath && <path d={previousPath} fill="none" className="knx-chart-line knx-chart-line--previous" />}
        <path d={currentPath} fill="none" className="knx-chart-line knx-chart-line--current" />
        {hoverIndex !== null && (
          <line x1={xScale(hoverIndex)} x2={xScale(hoverIndex)} y1={PAD.top} y2={HEIGHT - PAD.bottom} className="knx-chart-hover-line" />
        )}
        {hovered && <circle cx={xScale(hoverIndex)} cy={yScale(hovered.value)} r="4" className="knx-chart-dot" />}
        {hoveredPrev && <circle cx={xScale(hoverIndex)} cy={yScale(hoveredPrev.value)} r="4" className="knx-chart-dot knx-chart-dot--previous" />}
        {annotations.map((a, idx) => series[a.index] && (
          <line
            key={`guide-${idx}`}
            x1={xScale(a.index)} x2={xScale(a.index)}
            y1={yScale(series[a.index].value)} y2={HEIGHT - PAD.bottom}
            className="knx-chart-annotation-guide"
          />
        ))}
        {annotations.map((a, idx) => series[a.index] && (
          <g key={idx}>
            <circle cx={xScale(a.index)} cy={yScale(series[a.index].value)} r="8" className="knx-chart-annotation-dot" />
            <text x={xScale(a.index)} y={yScale(series[a.index].value) + 3} textAnchor="middle" className="knx-chart-annotation-label">K</text>
          </g>
        ))}
      </svg>
      {hovered && (
        <div className="knx-chart-tooltip">
          {hovered.date}: <strong>{formatChartValue(hovered.value)}</strong>
          {hoveredPrev && <span className="knx-chart-tooltip-prev"> · anterior: {formatChartValue(hoveredPrev.value)}</span>}
        </div>
      )}
      {annotations.map((a, idx) => (
        <div className="knx-chart-annotation-note" key={idx}>
          <span className="knx-chart-annotation-avatar">K</span>
          <span>{a.note}{a.source ? ` · ${a.source}` : ''}</span>
        </div>
      ))}
    </div>
  );
}

function BarChartBlock({ title, subtitle, data, followUp, basePath, tenant, onAsk }) {
  const series = data?.series;
  if (!Array.isArray(series) || !series.length) return null;
  const maxValue = Math.max(1, ...series.map((d) => d.value));
  const total = series.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
  return (
    <div className="knx-analysis-block">
      <BlockHeader title={title} followUp={followUp} basePath={basePath} tenant={tenant} onAsk={onAsk} />
      {subtitle ? <p className="knx-chart-subtitle">{subtitle}</p> : (title && <p className="knx-chart-subtitle">Total {formatChartValue(total)}</p>)}
      <div className="knx-bar-chart">
        {series.map((d, i) => (
          <div className="knx-bar-row" key={i}>
            <span className="knx-bar-label">{d.label}</span>
            <div className="knx-bar-track">
              <div className={`knx-bar-fill${d.tone === 'alt' ? ' knx-bar-fill--alt' : ''}`} style={{ width: `${(d.value / maxValue) * 100}%` }} />
            </div>
            <span className="knx-bar-value">{formatChartValue(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DataTableBlock({ title, subtitle, columns, rows, followUp, basePath, tenant, onAsk }) {
  if (!Array.isArray(columns) || !columns.length || !Array.isArray(rows)) return null;
  return (
    <div className="knx-analysis-block">
      <BlockHeader title={title} followUp={followUp} basePath={basePath} tenant={tenant} onAsk={onAsk} />
      {subtitle && <p className="knx-chart-subtitle">{subtitle}</p>}
      <div className="knx-table-wrap">
        <table className="knx-table">
          <thead>
            <tr>{columns.map((c) => <th key={c.key} className={c.align === 'right' ? 'knx-table-num' : ''}>{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {columns.map((c, ci) => (
                  <td key={c.key} className={c.align === 'right' ? 'knx-table-num' : ''}>
                    {String(row[c.key] ?? '—')}
                    {ci === 0 && row._flag && (
                      <span className={`knx-table-flag knx-table-flag--${row._flag.tone || 'critical'}`}>{row._flag.label}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PinnedCardBlock({ title, description, followUp, basePath, tenant, onAsk }) {
  if (!title && !description) return null;
  return (
    <div className="knx-pinned-card">
      <div className="knx-pinned-card-top">
        {title && <span className="knx-pinned-card-title">{title}</span>}
        <FollowUpLink followUp={followUp} basePath={basePath} tenant={tenant} onAsk={onAsk} />
      </div>
      {description && <p className="knx-pinned-card-desc">{description}</p>}
    </div>
  );
}

function renderBlock(block, basePath, tenant, onAsk) {
  const props = { ...block, basePath, tenant, onAsk };
  if (block.type === 'chart') {
    const ChartComp = block.chart_type === 'bar' ? BarChartBlock : LineChartBlock;
    return <ChartComp key={block.id} {...props} />;
  }
  if (block.type === 'kpi_grid') return <KpiGridBlock key={block.id} {...props} />;
  if (block.type === 'data_table') return <DataTableBlock key={block.id} {...props} />;
  if (block.type === 'pinned_card') return <PinnedCardBlock key={block.id} {...props} />;
  return null;
}

// Vista genérica por `type` de bloque — nuevo tipo de reporte = nuevo case acá, no una pantalla
// nueva. Se usa tanto inline en el chat (KaiNextClientChat.jsx) como en el dashboard por área
// de Análisis (KaiNextAnalisis.jsx).
export default function KaiNextAnalysisView({ presentation, basePath, tenant, onAsk }) {
  if (!presentation) return null;
  const { summary, data_source: dataSource, components } = presentation;
  const blocks = components ?? [];

  const grouped = [];
  let i = 0;
  while (i < blocks.length) {
    if (blocks[i].type === 'insight_banner') {
      const group = [];
      while (i < blocks.length && blocks[i].type === 'insight_banner') {
        group.push(blocks[i]);
        i += 1;
      }
      grouped.push({ kind: 'lectura', id: group[0].id, items: group });
    } else {
      grouped.push({ kind: 'block', id: blocks[i].id, block: blocks[i] });
      i += 1;
    }
  }

  return (
    <div className="knx-analysis-view">
      {summary && <p className="knx-analysis-summary">{summary}</p>}
      {dataSource?.provider && (
        <div className="knx-analysis-source">
          {dataSource.provider}
          {dataSource.dataset ? ` · ${dataSource.dataset}` : ''}
          {dataSource.records_analyzed ? ` · ${Number(dataSource.records_analyzed).toLocaleString('es')} registros` : ''}
        </div>
      )}
      <div className="knx-analysis-blocks">
        {grouped.map((g) => (g.kind === 'lectura'
          ? <LecturaDeKaiCard key={g.id} items={g.items} basePath={basePath} tenant={tenant} onAsk={onAsk} />
          : renderBlock(g.block, basePath, tenant, onAsk)))}
      </div>
    </div>
  );
}
