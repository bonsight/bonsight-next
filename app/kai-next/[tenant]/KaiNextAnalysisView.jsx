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

const isNumeric = (v) => typeof v === 'number' || (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim()));

// El modelo a veces manda el KPI ya formateado ("$68,6M", "-23%") y a veces crudo (89213760,
// -23.2): lo crudo se formatea acá con el mismo criterio que los gráficos; lo que ya viene como
// texto se respeta tal cual.
function kpiValue(k) {
  return isNumeric(k.value) ? formatCompact(Number(k.value), k.unit) : k.value;
}

// change numérico = variación porcentual (es lo que el modelo manda cuando no lo formatea).
function kpiChange(k) {
  if (!isNumeric(k.change)) return { text: k.change, trend: k.trend };
  const n = Number(k.change);
  const text = `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toLocaleString('es', { maximumFractionDigits: 1 })}%`;
  return { text, trend: k.trend || (n > 0 ? 'up' : n < 0 ? 'down' : 'flat') };
}

// Filas parejas: 6 KPIs van 3 + 3, no 5 + 1 con una tarjeta sola abajo.
function kpiColumns(n) {
  if (n <= 4) return n;
  return n % 3 === 0 || n === 5 ? 3 : 4;
}

function KpiGridBlock({ title, data, followUp, basePath, tenant, onAsk }) {
  const items = Array.isArray(data) ? data : [];
  if (!items.length) return null;
  return (
    <div className="knx-kpi-grid-wrap">
      <BlockHeader title={title} followUp={followUp} basePath={basePath} tenant={tenant} onAsk={onAsk} />
      <div className="knx-kpi-grid" style={{ '--knx-kpi-cols': kpiColumns(items.length) }}>
        {items.map((k, i) => {
          const change = kpiChange(k);
          return (
            <div key={i} className={`knx-kpi-card knx-kpi-card--${k.status || 'neutral'}`}>
              <span className="knx-kpi-label">{k.label}</span>
              <span className="knx-kpi-value">{kpiValue(k)}</span>
              {k.note ? (
                <span className="knx-kpi-note">{k.note}</span>
              ) : change.text ? (
                <span className={`knx-kpi-change knx-kpi-change--${change.trend || 'flat'}`}>
                  {change.trend === 'up' ? '↑' : change.trend === 'down' ? '↓' : '→'} {change.text}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatChartValue(v) {
  return typeof v === 'number' ? v.toLocaleString('es') : v;
}

// Mismo formato compacto que los KPIs ("$68,6M"): sin esto el gráfico decía "-13.158.110" justo
// debajo de una tarjeta que decía "$68,6M", la misma unidad escrita de dos formas.
function formatCompact(v, unit) {
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  if (unit === 'percent') return `${n.toLocaleString('es', { maximumFractionDigits: 1 })}%`;
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  const money = unit === 'currency' ? '$' : '';
  if (abs >= 1e9) return `${sign}${money}${(abs / 1e9).toLocaleString('es', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MM`;
  if (abs >= 1e6) return `${sign}${money}${(abs / 1e6).toLocaleString('es', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
  if (abs >= 1e4) return `${sign}${money}${(abs / 1e3).toLocaleString('es', { maximumFractionDigits: 1 })}k`;
  return `${sign}${money}${abs.toLocaleString('es', { maximumFractionDigits: 2, useGrouping: 'always' })}`;
}

// % de cambio calculado acá, nunca escrito por el modelo: solo si la barra trae `previous`, que
// es la MISMA métrica en el periodo base (value = actual). Antes se interpretaba como base de una
// variación y salía "+73,7%" para una categoría que había caído 26%.
function pctChange(value, previous) {
  const v = Number(value), p = Number(previous);
  if (!Number.isFinite(v) || !Number.isFinite(p) || p === 0) return null;
  const pct = ((v - p) / Math.abs(p)) * 100;
  return `${pct > 0 ? '+' : pct < 0 ? '−' : ''}${Math.abs(pct).toLocaleString('es', { maximumFractionDigits: 1 })}%`;
}

function LineChartBlock({ title, subtitle, data, followUp, basePath, tenant, onAsk, half }) {
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
    <div className={`knx-analysis-block${half ? ' knx-analysis-block--half' : ''}`}>
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

function BarChartBlock({ title, subtitle, data, followUp, basePath, tenant, onAsk, half }) {
  const series = data?.series;
  if (!Array.isArray(series) || !series.length) return null;
  // Escala por magnitud: con variaciones (oct vs. sep) hay valores negativos, y antes el ancho
  // salía negativo (CSS lo ignora → barra llena), así una caída se veía igual que una subida.
  const maxValue = Math.max(1, ...series.map((d) => Math.abs(Number(d.value) || 0)));
  const total = series.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
  const unit = data?.unit;
  // Con subidas y bajadas mezcladas (una variación) el dato que importa es el neto, y antes solo
  // aparecía si el modelo no escribía su propio subtítulo — ahora va siempre, al pie.
  const mixedSigns = series.some((d) => d.value < 0) && series.some((d) => d.value > 0);
  return (
    <div className={`knx-analysis-block${half ? ' knx-analysis-block--half' : ''}`}>
      <BlockHeader title={title} followUp={followUp} basePath={basePath} tenant={tenant} onAsk={onAsk} />
      {subtitle ? <p className="knx-chart-subtitle">{subtitle}</p> : (title && !mixedSigns && <p className="knx-chart-subtitle">Total {formatCompact(total, unit)}</p>)}
      <div className="knx-bar-chart">
        {series.map((d, i) => (
          <div className="knx-bar-row" key={i}>
            <span className="knx-bar-label">{d.label}</span>
            <div className="knx-bar-track">
              <div className={`knx-bar-fill${d.value < 0 ? ' knx-bar-fill--neg' : d.tone === 'alt' ? ' knx-bar-fill--alt' : ''}`} style={{ width: `${(Math.abs(Number(d.value) || 0) / maxValue) * 100}%` }} />
            </div>
            <span className={`knx-bar-value${d.value < 0 ? ' knx-bar-value--neg' : ''}`}>
              {formatCompact(d.value, unit)}
              {pctChange(d.value, d.previous) && (
                <span className={`knx-bar-pct${Number(d.value) < Number(d.previous) ? ' knx-bar-pct--neg' : ''}`}>{pctChange(d.value, d.previous)}</span>
              )}
            </span>
          </div>
        ))}
      </div>
      {mixedSigns && (
        <div className={`knx-bar-net${total < 0 ? ' knx-bar-net--neg' : ''}`}>
          <span>Neto</span>
          <strong>{formatCompact(total, unit)}</strong>
        </div>
      )}
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

function renderBlock(block, basePath, tenant, onAsk, half = false) {
  const props = { ...block, basePath, tenant, onAsk, half };
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

  // Un gráfico va a media columna solo si tiene otro gráfico al lado; solo, ocupa todo el ancho
  // (antes iba siempre a media columna y quedaba un hueco al lado con el título aplastado).
  const isChart = (g) => g?.kind === 'block' && g.block.type === 'chart';
  const half = new Set();
  for (let j = 0; j < grouped.length; j += 1) {
    if (isChart(grouped[j]) && isChart(grouped[j + 1])) { half.add(j); half.add(j + 1); j += 1; }
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
        {grouped.map((g, j) => (g.kind === 'lectura'
          ? <LecturaDeKaiCard key={g.id} items={g.items} basePath={basePath} tenant={tenant} onAsk={onAsk} />
          : renderBlock(g.block, basePath, tenant, onAsk, half.has(j))))}
      </div>
    </div>
  );
}
